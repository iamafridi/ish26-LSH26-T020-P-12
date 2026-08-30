import { model, models, Schema, type InferSchemaType } from "mongoose";

const savingsPocketSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    itemDetails: { type: String, required: true, trim: true, maxlength: 300 },
    targetPaisa: { type: Number, required: true, min: 1 },
    currentSavedPaisa: { type: Number, required: true, min: 0, default: 0 },
    monthlyContributionPaisa: { type: Number, required: true, min: 1 },
    annualRateBasisPoints: { type: Number, required: true, min: 0, max: 5000 },
  },
  { timestamps: true, versionKey: false },
);

savingsPocketSchema.index({ firebaseUid: 1, createdAt: 1 });

export type SavingsPocketDocument = InferSchemaType<typeof savingsPocketSchema> & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export const SavingsPocketModel = models.SavingsPocket ?? model("SavingsPocket", savingsPocketSchema);
