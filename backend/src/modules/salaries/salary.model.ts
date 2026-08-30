import { model, models, Schema, type InferSchemaType } from "mongoose";

const salarySchema = new Schema(
  {
    firebaseUid: { type: String, required: true, trim: true },
    month: { type: String, required: true, match: /^\d{4}-(?:0[1-9]|1[0-2])$/ },
    amountPaisa: { type: Number, required: true, min: 1 },
  },
  { timestamps: true, versionKey: false },
);

salarySchema.index({ firebaseUid: 1, month: 1 }, { unique: true });

export type SalaryDocument = InferSchemaType<typeof salarySchema> & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export const SalaryModel = models.Salary ?? model("Salary", salarySchema);
