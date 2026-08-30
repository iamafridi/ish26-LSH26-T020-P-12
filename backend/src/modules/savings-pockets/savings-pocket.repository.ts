import { SavingsPocketModel, type SavingsPocketDocument } from "./savings-pocket.model.js";

export interface PocketWrite {
  name: string;
  itemDetails: string;
  targetPaisa: number;
  currentSavedPaisa: number;
  monthlyContributionPaisa: number;
  annualRateBasisPoints: number;
}

export function listOwnedPockets(firebaseUid: string): Promise<SavingsPocketDocument[]> {
  return SavingsPocketModel.find({ firebaseUid }).sort({ createdAt: 1 }).lean<SavingsPocketDocument[]>().exec();
}

export function findOwnedPocket(firebaseUid: string, id: string): Promise<SavingsPocketDocument | null> {
  return SavingsPocketModel.findOne({ _id: id, firebaseUid }).lean<SavingsPocketDocument>().exec();
}

export async function createOwnedPocket(firebaseUid: string, input: PocketWrite): Promise<SavingsPocketDocument> {
  const pocket = await SavingsPocketModel.create({ firebaseUid, ...input });
  return pocket.toObject() as SavingsPocketDocument;
}

export function updateOwnedPocket(firebaseUid: string, id: string, input: Partial<PocketWrite>): Promise<SavingsPocketDocument | null> {
  return SavingsPocketModel.findOneAndUpdate({ _id: id, firebaseUid }, { $set: input }, { new: true, runValidators: true })
    .lean<SavingsPocketDocument>().exec();
}

export async function deleteOwnedPocket(firebaseUid: string, id: string): Promise<boolean> {
  const result = await SavingsPocketModel.deleteOne({ _id: id, firebaseUid }).exec();
  return result.deletedCount === 1;
}
