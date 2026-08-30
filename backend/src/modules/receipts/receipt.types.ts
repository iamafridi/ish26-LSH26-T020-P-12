export interface ExtractedField {
  value: string | null;
  confidence: number;
}

export interface ReceiptExtraction {
  amount: ExtractedField;
  date: ExtractedField;
  shop: ExtractedField;
  rawText: string;
  provider: string;
}

export interface OcrProvider {
  readonly name: string;
  extractText(image: Buffer): Promise<string>;
}
