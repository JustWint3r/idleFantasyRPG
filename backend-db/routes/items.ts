import express, { Request, Response } from "express";
import ItemTemplate from "../models/ItemTemplate";

const router = express.Router();

// GET /api/items — get all item templates
router.get("/", async (req: Request, res: Response) => {
  try {
    const items = await ItemTemplate.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// GET /api/items/:id — get single item template
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await ItemTemplate.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: "Item template not found" });
      return;
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// GET /api/items/type/:type — get items by type (hero, gear, etc.)
router.get("/type/:type", async (req: Request, res: Response) => {
  try {
    const items = await ItemTemplate.find({ type: req.params.type });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// POST /api/items — create item template (admin/seeding use)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, type, stats, description } = req.body;

    if (!name || !type) {
      res.status(400).json({ message: "Name and type are required" });
      return;
    }

    const item = await ItemTemplate.create({ name, type, stats, description });
    res.status(201).json({ message: "Item template created", item });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// POST /api/items/seed — bulk insert item templates
router.post("/seed", async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Provide an array of items to seed" });
      return;
    }

    const inserted = await ItemTemplate.insertMany(items, { ordered: false });
    res.status(201).json({ message: `${inserted.length} items seeded`, inserted });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// DELETE /api/items/:id — delete item template
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const item = await ItemTemplate.findByIdAndDelete(req.params.id);
    if (!item) {
      res.status(404).json({ message: "Item template not found" });
      return;
    }
    res.json({ message: "Item template deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;