import vision from "@google-cloud/vision";

import { getEnvironment } from "../../../config/env.js";
import type { OcrProvider } from "../receipt.types.js";

export class GoogleVisionProvider implements OcrProvider {
  readonly name = "google-vision";
  private readonly client: vision.ImageAnnotatorClient;

  constructor() {
    const environment = getEnvironment();
    this.client = new vision.ImageAnnotatorClient({
      projectId: environment.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: environment.FIREBASE_CLIENT_EMAIL,
        private_key: environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    });
  }

  async extractText(image: Buffer): Promise<string> {
    const [result] = await this.client.textDetection({ image: { content: image } });
    return result.fullTextAnnotation?.text?.trim() ?? result.textAnnotations?.[0]?.description?.trim() ?? "";
  }
}
