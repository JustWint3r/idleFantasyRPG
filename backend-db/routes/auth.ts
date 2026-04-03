import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Player from "../models/Player";
import GameState from "../models/GameState";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const existingPlayer = await Player.findOne({ email });
    if (existingPlayer) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const player = await Player.create({
      email,
      password: hashedPassword,
    });

    // Auto-create an empty game state for the new player
    await GameState.create({ playerId: player._id });

    const token = jwt.sign({ id: player._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Player registered successfully",
      token,
      player: {
        id: player._id,
        email: player.email,
        gold: player.gold,
        diamonds: player.diamonds,
        summonScrolls: player.summonScrolls,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const player = await Player.findOne({ email });
    if (!player) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, player.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: player._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      player: {
        id: player._id,
        email: player.email,
        gold: player.gold,
        diamonds: player.diamonds,
        summonScrolls: player.summonScrolls,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;