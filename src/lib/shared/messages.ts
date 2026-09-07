import { z } from "zod";
import type { MediaAsset, ProfileKey } from "./types";
export const messageInput = z
  .object({
    id: z.uuid(),
    recipients: z
      .array(z.enum(["mom", "dad", "mia"]))
      .min(1)
      .max(3),
    everyone: z.boolean(),
    text: z.string().trim().max(3000),
    sendAt: z.iso.datetime().nullable(),
    attachment: z
      .object({
        kind: z.enum(["photo", "audio", "video", "doodle"]),
        data: z.string().max(45_000_000),
        altText: z.string().trim().min(1).max(1000),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (!m.text && !m.attachment)
      ctx.addIssue({
        code: "custom",
        message: "Leave a note or add something.",
      });
    if (new Set(m.recipients).size !== m.recipients.length)
      ctx.addIssue({ code: "custom", message: "Choose each person once." });
  });
export type MessageInput = z.infer<typeof messageInput>;
export interface MessageItem {
  scheduled: boolean;
  id: string;
  sender: ProfileKey;
  senderName: string;
  text: string;
  sendAt: string;
  recipients: string[];
  read: boolean;
  favorite: boolean;
  loved: boolean;
  hearts: string[];
  isRecipient: boolean;
  media: Pick<MediaAsset, "id" | "mediaType" | "metadata">[];
}
