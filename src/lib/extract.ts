// Bill extraction behind one interface, with two interchangeable providers.
// Both return JSON validated against the same fixed BillSchema.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { type Bill, BillSchema } from "./bill";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export type UploadType = ImageType | "application/pdf";

export interface Upload {
  base64: string;
  mediaType: UploadType;
  filename: string;
}

export type Provider = "anthropic" | "openai";

export class ExtractError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const PROMPT = `You are reading a photo or PDF of a US residential electricity bill (usually Georgia Power).
Fill every field of the schema from what is printed. Rules:
- Copy numbers exactly; never estimate a number that is not on the bill. Use null where the schema allows it and the value is not shown.
- Do not read or repeat the customer's name, address or account number.
- For each charge line, write plainLanguage as one short, friendly sentence for someone with no energy background. No jargon.
- usageHistory comes from the monthly usage bar chart or table, oldest first, if the bill has one. Read each bar's value as closely as you can.
- If this is not an electricity bill, set isElectricBill to false and fill the rest with empty values.`;

// Explicit BILL_AI_PROVIDER wins; otherwise use whichever key is configured (Anthropic first).
export function activeProvider(): Provider | null {
  const forced = process.env.BILL_AI_PROVIDER;
  if (forced === "anthropic" || forced === "openai") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

async function extractWithAnthropic(file: Upload, apiKey?: string): Promise<Bill | null> {
  const source: Anthropic.Beta.BetaImageBlockParam | Anthropic.Beta.BetaRequestDocumentBlock =
    file.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.base64 } }
      : { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.base64 } };

  const client = new Anthropic(apiKey ? { apiKey } : undefined);
  try {
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(BillSchema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: [source, { type: "text", text: PROMPT }] }],
    });
    if (response.stop_reason === "refusal") return null;
    return response.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new ExtractError("Too many requests right now. Try again in a minute.", 429);
    if (err instanceof Anthropic.AuthenticationError) throw new ExtractError("The Anthropic API key is invalid.", 502);
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status);
      throw new ExtractError("Bill reading failed. Please try again.", 502);
    }
    throw err;
  }
}

async function extractWithOpenAI(file: Upload, apiKey?: string): Promise<Bill | null> {
  const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
  const media: OpenAI.Responses.ResponseInputContent =
    file.mediaType === "application/pdf"
      ? { type: "input_file", filename: file.filename || "bill.pdf", file_data: dataUrl }
      : { type: "input_image", image_url: dataUrl, detail: "high" };

  const client = new OpenAI(apiKey ? { apiKey } : undefined);
  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [{ role: "user", content: [media, { type: "input_text", text: PROMPT }] }],
      text: { format: zodTextFormat(BillSchema, "electricity_bill") },
    });
    return response.output_parsed;
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) throw new ExtractError("Too many requests right now. Try again in a minute.", 429);
    if (err instanceof OpenAI.AuthenticationError) throw new ExtractError("The OpenAI API key is invalid.", 502);
    if (err instanceof OpenAI.APIError) {
      console.error("OpenAI API error", err.status);
      throw new ExtractError("Bill reading failed. Please try again.", 502);
    }
    throw err;
  }
}

export async function extractBill(file: Upload, provider: Provider, apiKey?: string): Promise<Bill | null> {
  return provider === "openai" ? extractWithOpenAI(file, apiKey) : extractWithAnthropic(file, apiKey);
}
