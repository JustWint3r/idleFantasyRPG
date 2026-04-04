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

// JSON error handler — must be last, catches anything Express throws
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[ERROR]", err.message || err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

export default app;