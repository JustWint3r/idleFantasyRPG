import express, { Response } from "express";
import Player from "../models/Player";
import authMiddleware, { AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();

// All player routes are protected
router.use(authMiddleware);

// GET /api/player/me — get current player info
router.get("/me", async (req: AuthRequest, res: Response) => {
  try {
    const player = await Player.findById(req.playerId).select("-password");
    if (!player) {
      res.status(404).json({ message: "Player not found" });
      return;
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH /api/player/me — update currencies (gold, diamonds, scrolls)
router.patch("/me", async (req: AuthRequest, res: Response) => {
  try {
    const { gold, diamonds, summonScrolls } = req.body;

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.playerId,
      {
        ...(gold !== undefined && { gold }),
        ...(diamonds !== undefined && { diamonds }),
        ...(summonScrolls !== undefined && { summonScrolls }),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedPlayer) {
      res.status(404).json({ message: "Player not found" });
      return;
    }

    console.log(`[DB] Player updated (${req.playerId}): gold=${updatedPlayer.gold}, diamonds=${updatedPlayer.diamonds}, scrolls=${updatedPlayer.summonScrolls}`);
    res.json(updatedPlayer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH /api/player/me/add-currency — safely increment currencies (e.g. after battle reward)
router.patch("/me/add-currency", async (req: AuthRequest, res: Response) => {
  try {
    const { gold = 0, diamonds = 0, summonScrolls = 0 } = req.body;

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.playerId,
      {
        $inc: { gold, diamonds, summonScrolls },
      },
      { new: true }
    ).select("-password");

    if (!updatedPlayer) {
      res.status(404).json({ message: "Player not found" });
      return;
    }

    console.log(`[DB] Currency added for player (${req.playerId}): +gold=${gold}, +diamonds=${diamonds}, +scrolls=${summonScrolls} → gold=${updatedPlayer.gold}, diamonds=${updatedPlayer.diamonds}, scrolls=${updatedPlayer.summonScrolls}`);
    res.json(updatedPlayer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;