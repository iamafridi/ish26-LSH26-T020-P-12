import { AppError } from "../../shared/errors/app-error.js";
import { GoogleVisionProvider } from "./providers/google-vision.provider.js";
import { parseReceiptText } from "./receipt.parser.js";
import type { OcrProvider, ReceiptExtraction } from "./receipt.types.js";

const MAX_RAW_TEXT_LENGTH = 10_000;
let provider: OcrProvider | undefined;

function getProvider(): OcrProvider {
  provider ??= new GoogleVisionProvider();
  return provider;
}

function detectedMimeType(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function extractReceipt(file: Express.Multer.File | undefined): Promise<ReceiptExtraction> {
  if (!file) throw new AppError(400, "VALIDATION_ERROR", "Choose a receipt image to continue.");
  const detected = detectedMimeType(file.buffer);
  if (!detected || detected !== file.mimetype) {
    throw new AppError(400, "UNSUPPORTED_RECEIPT_TYPE", "Upload a JPEG, PNG, or WebP receipt image.");
  }

  try {
    const selectedProvider = getProvider();
    const rawText = await selectedProvider.extractText(file.buffer);
    if (!rawText) throw new AppError(422, "OCR_EXTRACTION_FAILED", "No readable text was found. Enter the expense manually.");
    const fields = parseReceiptText(rawText);
    return { ...fields, rawText: rawText.slice(0, MAX_RAW_TEXT_LENGTH), provider: selectedProvider.name };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "OCR_EXTRACTION_FAILED", "The receipt could not be read. Try a clearer photo or enter it manually.");
  }
}
