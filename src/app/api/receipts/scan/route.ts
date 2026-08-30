/**
 * POST /api/receipts/scan — required item 1, the "upload a photo of a bill" path.
 *
 * Returns an extraction for the user to CHECK AND CORRECT. It is never written
 * to the ledger here; the client renders it into a review form and the user
 * saves. See docs/ARCHITECTURE.md §4.
 */
import { NextResponse } from "next/server";
import { ClaudeVisionOcr } from "@/lib/ocr/claude-vision";
import { EMPTY_EXTRACTION } from "@/lib/ocr/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ...EMPTY_EXTRACTION, error: "Could not read the upload." },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ...EMPTY_EXTRACTION, error: "No image was attached." },
      { status: 400 },
    );
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { ...EMPTY_EXTRACTION, error: `Unsupported image type "${file.type}". Use JPEG, PNG, WebP or GIF.` },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ...EMPTY_EXTRACTION, error: "That image is larger than 8 MB. Try a smaller photo." },
      { status: 413 },
    );
  }

  // Degrade honestly rather than crashing: without a key the app still works,
  // the user just types the three fields in by hand.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json({
      ...EMPTY_EXTRACTION,
      error:
        "Receipt scanning is switched off because ANTHROPIC_API_KEY is not set. " +
        "You can still enter the expense manually below.",
    });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extraction = await new ClaudeVisionOcr().extract({
      base64,
      mediaType: file.type,
    });
    return NextResponse.json(extraction);
  } catch (error) {
    // Never leak the key or a stack trace to the browser.
    console.error("[receipts/scan]", error);
    return NextResponse.json(
      { ...EMPTY_EXTRACTION, error: "Could not read that receipt. Enter the details manually." },
      { status: 502 },
    );
  }
}
