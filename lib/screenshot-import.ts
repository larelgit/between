import { z } from "zod";
import type { Message } from "./types";

export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_SCREENSHOT_REQUEST_BYTES = Math.ceil(MAX_SCREENSHOT_BYTES / 3) * 4 + 8000;
export const screenshotImageSchema = z.object({
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  data: z.string().min(1).max(Math.ceil(MAX_SCREENSHOT_BYTES / 3) * 4),
});
export type ScreenshotImage = z.infer<typeof screenshotImageSchema>;
export const transcriptionSchema = z.object({
  messages: z.array(z.object({
    text: z.string().trim().min(1).max(15000),
    side: z.enum(["left", "right", "unknown"]),
    timestamp: z.string().max(100),
  })).max(200),
  warnings: z.array(z.string().max(1000)).max(12),
});
export type Transcription = z.infer<typeof transcriptionSchema>;
export type ImportMessage = {
  id: string;
  text: string;
  speaker: "you" | "her" | "unknown";
  date: string;
  included: boolean;
};

/** Check bytes as well as browser-reported MIME; no URLs or SVG are accepted. */
export function validateScreenshotImage(value: unknown): ScreenshotImage {
  const image = screenshotImageSchema.parse(value);
  if (image.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))
    throw Error("The screenshot could not be read. Choose the image again.");
  const bytes = atob(image.data);
  if (!bytes.length || bytes.length > MAX_SCREENSHOT_BYTES)
    throw Error("Choose a screenshot smaller than 8 MB.");
  const png = bytes.startsWith("\x89PNG\r\n\x1a\n");
  const jpeg = bytes.startsWith("\xff\xd8\xff");
  const webp = bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  if (!(image.mimeType === "image/png" ? png : image.mimeType === "image/jpeg" ? jpeg : webp))
    throw Error("This file is not a readable PNG, JPEG, or WebP screenshot.");
  return image;
}

export function prepareScreenshotMessages(rows: ImportMessage[], existing: Message[]) {
  const selected = rows.filter((row) => row.included);
  if (!selected.length) throw Error("Select at least one message to add.");
  const messages: Message[] = [];
  let duplicates = 0;
  for (const row of selected) {
    if (row.speaker === "unknown") throw Error("Choose who sent each selected message.");
    const text = row.text.trim();
    if (!text || text.length > 15000) throw Error("Each selected message needs readable text (up to 15,000 characters).");
    if (row.date && !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(row.date)) throw Error("Check the message date, or leave it blank.");
    const message: Message = { id: row.id, text, speaker: row.speaker, date: row.date, kind: "Message", source: "screenshot" };
    if ([...existing, ...messages].some((m) => m.speaker === message.speaker && m.text === text && (!m.date || !message.date || m.date === message.date))) {
      duplicates++;
    } else messages.push(message);
  }
  if (existing.length + messages.length > 500) throw Error("This connection can hold 500 messages. Export and remove older messages first.");
  return { messages, duplicates };
}
