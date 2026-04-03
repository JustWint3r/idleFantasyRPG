import mongoose, { Schema, Document } from "mongoose";

export interface IItemTemplate extends Document {
  name: string;
  type: "hero" | "gear" | "material" | "xp_book" | "dungeon";
  stats: Record<string, number>;
  description: string;
}

const ItemTemplateSchema = new Schema<IItemTemplate>({
  name:        { type: String, required: true, unique: true },
  type:        { type: String, enum: ["hero", "gear", "material", "xp_book", "dungeon"], required: true },
  stats:       { type: Map, of: Number, default: {} },
  description: { type: String, default: "" },
});

export default mongoose.model<IItemTemplate>("ItemTemplate", ItemTemplateSchema);