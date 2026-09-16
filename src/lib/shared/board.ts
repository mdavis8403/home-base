import { z } from "zod";
import { messageInput } from "./messages";
import type { MediaAsset } from "./types";
export const categories = [
  "silly",
  "imaginative",
  "reflective",
  "family planning",
] as const;
// Creatable Family Board activities. Drawing was retired: only these two can be
// selected for new daily boards or created as custom prompts.
export const boardTypes = ["question", "photo"] as const;
export type BoardType = (typeof boardTypes)[number];
// Boards created before Drawing was retired may still carry "drawing". It is
// read-only legacy data — never creatable — kept so Past Boards can render it.
export type StoredBoardType = BoardType | "drawing";
export const boardLabels: Record<StoredBoardType, string> = {
  question: "Question of the Day",
  photo: "Photo Drop",
  drawing: "Drawing Challenge",
};
export const responseInput = z
  .object({
    boardId: z.uuid(),
    text: z.string().trim().max(3000),
    attachment: messageInput.shape.attachment,
  })
  .strict();
export const promptInput = z
  .object({
    id: z.uuid(),
    type: z.enum(boardTypes),
    text: z.string().trim().min(5).max(300),
    category: z.enum(categories),
  })
  .strict();
export const settingsInput = z
  .object({
    revealTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    categories: z
      .array(z.enum(categories))
      .min(1)
      .max(4)
      .refine((a) => new Set(a).size === a.length),
  })
  .strict();
export interface BoardItem {
  id: string;
  date: string;
  type: StoredBoardType;
  prompt: string;
  category: string;
  revealAt: string;
  revealed: boolean;
  today: boolean;
  responses: {
    name: string;
    own: boolean;
    text: string;
    media: Pick<MediaAsset, "id" | "metadata" | "mediaType"> | null;
  }[];
}
export interface BoardData {
  boards: BoardItem[];
  timezone: string;
  revealTime: string;
  categories: (typeof categories)[number][];
  customPrompts: {
    id: string;
    text: string;
    type: StoredBoardType;
    category: string;
  }[];
}
