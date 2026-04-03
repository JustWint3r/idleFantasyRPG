import express from "express";
import authRoutes from "./routes/auth";
import playerRoutes from "./routes/player";
import gameStateRoutes from "./routes/gamestate";
import inventoryRoutes from "./routes/inventory";
import itemRoutes from "./routes/items";

const app = express();

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/gamestate", gameStateRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/items", itemRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "IdleFantasyRPG API running" });
});

export default app;