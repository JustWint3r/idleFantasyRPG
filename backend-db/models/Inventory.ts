import mongoose, { Schema, Document } from "mongoose";

export interface IInventory extends Document {
  playerId: mongoose.Types.ObjectId;
  itemTemplateId: mongoose.Types.ObjectId;
  type: "gear" | "material" | "xp_book";
  quantity: number;
}

const InventorySchema = new Schema<IInventory>({
  playerId:       { type: Schema.Types.ObjectId, ref: "Player", required: true },
  itemTemplateId: { type: Schema.Types.ObjectId, ref: "ItemTemplate", required: true },
  type:           { type: String, enum: ["gear", "material", "xp_book"], required: true },
  quantity:       { type: Number, default: 1 },
});

export default mongoose.model<IInventory>("Inventory", InventorySchema);