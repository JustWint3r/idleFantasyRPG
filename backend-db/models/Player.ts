import mongoose, { Schema, Document } from "mongoose";

export interface IPlayer extends Document {
  email: string;
  password: string;
  gold: number;
  diamonds: number;
  summonScrolls: number;
  created_at: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  gold:          { type: Number, default: 0 },
  diamonds:      { type: Number, default: 0 },
  summonScrolls: { type: Number, default: 0 },
  created_at:    { type: Date, default: Date.now },
});

export default mongoose.model<IPlayer>("Player", PlayerSchema);