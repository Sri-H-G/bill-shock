import { activeProvider, ExtractError, extractBill, IMAGE_TYPES, type UploadType } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const provider = activeProvider();
  if (!provider) {
    return Response.json(
      { error: "Bill reading isn't configured on this server. Try the sample bill instead." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("bill");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File is over 10 MB." }, { status: 413 });
  if (file.type !== "application/pdf" && !(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return Response.json({ error: "Upload a photo (JPG, PNG, WebP) or a PDF." }, { status: 415 });
  }

  try {
    // The file is sent to the model and discarded; nothing is stored.
    const bill = await extractBill(
      {
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mediaType: file.type as UploadType,
        filename: file.name,
      },
      provider,
    );
    if (!bill) return Response.json({ error: "We couldn't read this bill. Try a clearer photo." }, { status: 422 });
    if (!bill.isElectricBill) {
      return Response.json({ error: "That doesn't look like an electricity bill." }, { status: 422 });
    }
    return Response.json({ bill, provider });
  } catch (err) {
    if (err instanceof ExtractError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
