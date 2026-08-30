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

export interface ReceiptExtractionResponse {
  success: true;
  data: { extraction: ReceiptExtraction };
}
