import "server-only";
import {
  Input,
  BufferSource,
  EncodedPacketSink,
  MP4,
  WEBM,
  MP3,
  WAVE,
} from "mediabunny";
import { imageSize } from "image-size";
import type { MessageInput } from "../shared/messages";
import { AppError } from "./errors";
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
  try {
    let contentType: string;
    let durationSeconds: number | undefined;
    if (input.kind === "photo" || input.kind === "doodle") {
      const size = imageSize(data);
      if (!size.width || !size.height || size.width * size.height > 50_000_000)
        throw new Error("Image dimensions");
      if (size.type === "png") {
        // Walk complete chunks; reject incomplete/trailing content and header-only files.
        let at = 8,
          pixels = false,
          ended = false;
        while (at + 12 <= data.length) {
          const length = data.readUInt32BE(at),
            kind = data.toString("ascii", at + 4, at + 8);
          if (at + length + 12 > data.length)
            throw new Error("Truncated image");
          if (kind === "IDAT" && length > 0) pixels = true;
          at += length + 12;
          if (kind === "IEND") {
            ended = length === 0 && at === data.length;
            break;
          }
        }
        if (!pixels || !ended) throw new Error("Incomplete PNG");
        contentType = "image/png";
      } else if (
        size.type === "jpg" &&
        data[0] === 255 &&
        data[1] === 216 &&
        data.at(-2) === 255 &&
        data.at(-1) === 217
      )
        contentType = "image/jpeg";
      else if (
        size.type === "webp" &&
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.readUInt32LE(4) + 8 === data.length
      )
        contentType = "image/webp";
      else throw new Error("Unsupported image");
    } else {
      const media = new Input({
        source: new BufferSource(data),
        formats: [MP4, WEBM, MP3, WAVE],
      });
      try {
        const tracks = await media.getTracks();
        if (!tracks.length || tracks.length > 8) throw new Error("Tracks");
        const video = tracks.some((t) => t.isVideoTrack()),
          audio = tracks.some((t) => t.isAudioTrack());
        if (input.kind === "video" ? !video : !audio || video)
          throw new Error("Wrong media kind");
        const format = await media.getFormat();
        const codecs = await Promise.all(tracks.map((t) => t.getCodec()));
        const allowed =
          format === WEBM
            ? ["vp8", "vp9", "av1", "opus", "vorbis"]
            : format === MP4
              ? ["avc", "hevc", "aac", "av1"]
              : format === MP3
                ? ["mp3"]
                : [
                    "pcm-s16",
                    "pcm-s24",
                    "pcm-s32",
                    "pcm-f32",
                    "pcm-u8",
                    "pcm-s16be",
                    "pcm-s24be",
                    "pcm-s32be",
                    "ulaw",
                    "alaw",
                  ];
        if (codecs.some((c) => !c || !allowed.includes(c)))
          throw new Error("Codec");
        durationSeconds = await media.computeDuration();
        let packets = 0;
        // Inspect every encoded packet without decoding or trusting browser/container duration.
        for (const track of tracks)
          for await (const packet of new EncodedPacketSink(track).packets()) {
            if (
              ++packets > 100000 ||
              !Number.isFinite(packet.timestamp) ||
              !Number.isFinite(packet.duration)
            )
              throw new Error("Packet bounds");
            durationSeconds = Math.max(
              durationSeconds,
              packet.timestamp + packet.duration,
            );
          }
        if (
          !packets ||
          !Number.isFinite(durationSeconds) ||
          durationSeconds <= 0 ||
          durationSeconds > (input.kind === "video" ? 120 : 300) + 0.15
        )
          throw new Error("Duration");
        contentType =
          format === WEBM
            ? `${input.kind}/webm`
            : format === MP4
              ? `${input.kind}/mp4`
              : format === MP3
                ? "audio/mpeg"
                : "audio/wav";
      } finally {
        media.dispose();
      }
    }
    return {
      data,
      metadata: {
        contentType,
        bytes: data.length,
        altText: input.altText,
        ...(durationSeconds ? { durationSeconds } : {}),
      },
    };
  } catch {
    throw new AppError(
      "INVALID_MEDIA",
      "Choose a JPEG, PNG or WebP photo, audio up to 5 minutes, or an MP4/WebM video up to 2 minutes.",
    );
  }
}
