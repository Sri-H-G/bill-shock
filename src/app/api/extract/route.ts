import { uploadProblem } from "@/lib/validation";
import { activeProvider, ExtractError, extractBill, type UploadType } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); }
  catch { return Response.json({ error: "The upload could not be read. Choose the file again." }, { status: 400 }); }
  const keyValue = form.get("apiKey");
  const apiKey = typeof keyValue === "string" ? keyValue.trim() : undefined;
  const requestedProvider = form.get("provider");
  if (apiKey && requestedProvider !== "openai" && requestedProvider !== "anthropic") {
    return Response.json({ error: "Choose OpenAI or Anthropic for your API key." }, { status: 400 });
  }
  const file = form.get("bill");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded. Choose a photo or PDF." }, { status: 400 });
  const problem = uploadProblem(file);
  if (problem) return Response.json({ error: problem }, { status: file.size > MAX_BYTES ? 413 : 400 });
  const provider = apiKey && (requestedProvider === "openai" || requestedProvider === "anthropic") ? requestedProvider : activeProvider();
  if (!provider) return Response.json({ error: "Add an API key below to read a real bill, or try the sample bill." }, { status: 503 });

  try {
    // The file is sent to the model and discarded; nothing is stored.
    const bill = await extractBill(
      {
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mediaType: file.type as UploadType,
        filename: file.name,
      },
      provider,
      apiKey || undefined,
    );
    if (!bill) return Response.json({ error: "We couldn't read this bill. Try a clearer photo." }, { status: 422 });
    if (!bill.isElectricBill) {
      return Response.json({ error: "That doesn't look like an electricity bill." }, { status: 422 });
    }
    return Response.json({ bill, provider });
  } catch (err) {
    if (err instanceof ExtractError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: "We could not finish reading this bill. Try again, choose a clearer photo, or use the sample bill." }, { status: 502 });
  }
}
