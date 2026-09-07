import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MessageInput } from "../shared/messages";
import { AppError } from "./errors";
const exec = promisify(execFile);
export async function inspectAttachment(
  input: NonNullable<MessageInput["attachment"]>,
) {
  const data = Buffer.from(input.data, "base64");
  const max = input.kind === "video" ? 32 : input.kind === "audio" ? 12 : 8;
  if (
    !data.length ||
    data.length > max * 1024 * 1024 ||
    data.toString("base64") !== input.data
  )
    throw new AppError(
      "INVALID_MEDIA",
      `Please use a file smaller than ${max} MB.`,
    );
  const dir = await mkdtemp(join(tmpdir(), "homebase-media-"));
  try {
    const path = join(dir, "attachment");
    await writeFile(path, data);
    // Inspect actual bytes, codecs and packet timestamps, never browser duration/MIME claims.
    const { stdout } = await exec(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-format_whitelist",
        "png_pipe,jpeg_pipe,webp_pipe,matroska,webm,mov,mp4,m4a,3gp,3g2,mj2,mp3,wav",
        "-show_streams",
        "-show_format",
        "-show_packets",
        "-show_entries",
        "packet=pts_time,duration_time:stream=codec_type,codec_name,duration:format=format_name,duration",
        "-of",
        "json",
        path,
      ],
      { timeout: 20000, maxBuffer: 16 * 1024 * 1024 },
    );
    const info = JSON.parse(stdout) as {
      streams: { codec_type: string; codec_name: string; duration?: string }[];
      format: { format_name: string; duration?: string };
      packets?: { pts_time?: string; duration_time?: string }[];
    };
    const codecs = info.streams?.map((s) => s.codec_name) ?? [];
    let contentType = "";
    let durationSeconds: number | undefined;
    if (input.kind === "photo" || input.kind === "doodle") {
      if (
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        codecs[0] === "png"
      )
        contentType = "image/png";
      else if (data[0] === 255 && data[1] === 216 && codecs[0] === "mjpeg")
        contentType = "image/jpeg";
      else if (data.toString("ascii", 8, 12) === "WEBP" && codecs[0] === "webp")
        contentType = "image/webp";
    } else {
      const video = info.streams.some((s) => s.codec_type === "video");
      const audio = info.streams.some((s) => s.codec_type === "audio");
      if (
        (input.kind === "video" && !video) ||
        (input.kind === "audio" && (!audio || video))
      )
        throw new Error("Wrong media");
      const times = [
        Number(info.format.duration),
        ...info.streams.map((s) => Number(s.duration)),
        ...(info.packets ?? []).map(
          (p) => Number(p.pts_time) + Number(p.duration_time || 0),
        ),
      ].filter(Number.isFinite);
      durationSeconds = Math.max(0, ...times);
      if (
        durationSeconds <= 0 ||
        durationSeconds > (input.kind === "video" ? 120 : 300) + 0.15
      )
        throw new Error("Duration");
      const format = info.format.format_name;
      if (
        format.includes("webm") &&
        codecs.every((c) => ["vp8", "vp9", "av1", "opus", "vorbis"].includes(c))
      )
        contentType = input.kind === "audio" ? "audio/webm" : "video/webm";
      else if (
        format.includes("mp4") &&
        codecs.every((c) => ["h264", "hevc", "aac", "av1"].includes(c))
      )
        contentType = input.kind === "audio" ? "audio/mp4" : "video/mp4";
      else if (format === "mp3" && input.kind === "audio")
        contentType = "audio/mpeg";
      else if (format === "wav" && input.kind === "audio")
        contentType = "audio/wav";
    }
    if (!contentType) throw new Error("Unsupported format");
    return {
      data,
      metadata: {
        contentType,
        bytes: data.length,
        altText: input.altText,
        ...(durationSeconds ? { durationSeconds } : {}),
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new AppError(
        "MEDIA_UNAVAILABLE",
        "Media needs a little setup on our server. You can still send a written note.",
        503,
      );
    throw new AppError(
      "INVALID_MEDIA",
      "Choose a JPEG, PNG or WebP photo, audio up to 5 minutes, or an MP4/WebM video up to 2 minutes.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
