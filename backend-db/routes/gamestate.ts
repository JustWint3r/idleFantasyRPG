import express, { Response } from "express";
import GameState from "../models/GameState";
import authMiddleware, { AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

// GET /api/gamestate — load player's save data
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const gameState = await GameState.findOne({ playerId: req.playerId })
      .populate("heroesOwned")
      .populate("deployedHero");

    if (!gameState) {
      res.status(404).json({ message: "Game state not found" });
      return;
    }

    res.json(gameState);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// POST /api/gamestate/save — save current game state
router.post("/save", async (req: AuthRequest, res: Response) => {
  try {
    const { heroesOwned, deployedHero, farmZone, prestigeCount } = req.body;

    const gameState = await GameState.findOneAndUpdate(
      { playerId: req.playerId },
      {
        ...(heroesOwned !== undefined && { heroesOwned }),
        ...(deployedHero !== undefined && { deployedHero }),
        ...(farmZone !== undefined && { farmZone }),
        ...(prestigeCount !== undefined && { prestigeCount }),
        lastSavedAt: new Date(),
      },
      { new: true, upsert: true } // create if doesn't exist
    );

    res.json({ message: "Game saved successfully", gameState });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH /api/gamestate/deploy — change deployed hero
router.patch("/deploy", async (req: AuthRequest, res: Response) => {
  try {
    const { heroId } = req.body;

    const gameState = await GameState.findOneAndUpdate(
      { playerId: req.playerId },
      { deployedHero: heroId, lastSavedAt: new Date() },
      { new: true }
    );

    if (!gameState) {
      res.status(404).json({ message: "Game state not found" });
      return;
    }

    res.json({ message: "Hero deployed", gameState });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH /api/gamestate/zone — change farm zone
router.patch("/zone", async (req: AuthRequest, res: Response) => {
  try {
    const { farmZone } = req.body;

    const gameState = await GameState.findOneAndUpdate(
      { playerId: req.playerId },
      { farmZone, lastSavedAt: new Date() },
      { new: true }
    );

    if (!gameState) {
      res.status(404).json({ message: "Game state not found" });
      return;
    }

    res.json({ message: "Farm zone updated", gameState });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;