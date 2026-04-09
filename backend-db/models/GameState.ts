import mongoose, { Schema, Document } from "mongoose";

export interface IGameState extends Document {
  playerId: mongoose.Types.ObjectId;
  heroesOwned: mongoose.Types.ObjectId[];
  deployedHero: mongoose.Types.ObjectId | null;
  farmZone: string;
  lastSavedAt: Date;
  prestigeCount: number;
  summonPityCount: number;
  summonPityACount: number;
  summonEventStates: Map<string, { pityCount: number; pityACount: number }>;
}

const GameStateSchema = new Schema<IGameState>({
  playerId:     { type: Schema.Types.ObjectId, ref: "Player", required: true, unique: true },
  heroesOwned:  [{ type: Schema.Types.ObjectId, ref: "ItemTemplate" }],
  deployedHero: { type: Schema.Types.ObjectId, ref: "ItemTemplate", default: null },
  farmZone:     { type: String, default: "zone_1" },
  lastSavedAt:  { type: Date, default: Date.now },
  prestigeCount:{ type: Number, default: 0 },
  summonPityCount: { type: Number, default: 0 },
  summonPityACount: { type: Number, default: 0 },
  summonEventStates: {
    type: Map,
    of: new Schema(
      {
        pityCount: { type: Number, default: 0 },
        pityACount: { type: Number, default: 0 },
      },
      { _id: false },
    ),
    default: {},
  },
});

export default mongoose.model<IGameState>("GameState", GameStateSchema);