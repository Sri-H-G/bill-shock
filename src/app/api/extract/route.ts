import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { BillSchema } from "@/lib/bill";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_BYTES = 10 * 1024 * 1024;

const PROMPT = `You are reading a photo or PDF of a US residential electricity bill (usually Georgia Power).
Fill every field of the schema from what is printed. Rules:
- Copy numbers exactly; never estimate a number that is not on the bill. Use null where the schema allows it and the value is not shown.
- Do not read or repeat the customer's name, address or account number.
- For each charge line, write plainLanguage as one short, friendly sentence for someone with no energy background. No jargon.
- usageHistory comes from the monthly usage bar chart or table, oldest first, if the bill has one.
- If this is not an electricity bill, set isElectricBill to false and fill the rest with empty values.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Bill reading isn't configured on this server. Try the sample bill instead." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("bill");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File is over 10 MB." }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  let source: Anthropic.Beta.BetaImageBlockParam | Anthropic.Beta.BetaRequestDocumentBlock;
  if (file.type === "application/pdf") {
    source = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  } else if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
    source = { type: "image", source: { type: "base64", media_type: file.type as ImageType, data } };
  } else {
    return Response.json({ error: "Upload a photo (JPG, PNG, WebP) or a PDF." }, { status: 415 });
  }

  const client = new Anthropic();
  try {
    // The file is sent to the model and discarded; nothing is stored.
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(BillSchema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: [source, { type: "text", text: PROMPT }] }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "We couldn't read this file. Try a clearer photo." }, { status: 422 });
    }
    const bill = response.parsed_output;
    if (!bill) return Response.json({ error: "We couldn't read this bill. Try a clearer photo." }, { status: 422 });
    if (!bill.isElectricBill) {
      return Response.json({ error: "That doesn't look like an electricity bill." }, { status: 422 });
    }
    return Response.json({ bill });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests right now. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return Response.json({ error: "Bill reading failed. Please try again." }, { status: 502 });
    }
    throw err;
  }
}
