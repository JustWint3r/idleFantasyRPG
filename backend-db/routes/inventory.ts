import express, { Response } from "express";
import Inventory from "../models/Inventory";
import authMiddleware, { AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

// GET /api/inventory — get all items for the player
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await Inventory.find({ playerId: req.playerId }).populate(
      "itemTemplateId"
    );

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// GET /api/inventory?type=gear — filter by item type
router.get("/filter", async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.query;

    const query: any = { playerId: req.playerId };
    if (type) query.type = type;

    const inventory = await Inventory.find(query).populate("itemTemplateId");

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// POST /api/inventory/add — add item to inventory (e.g. after dungeon drop)
router.post("/add", async (req: AuthRequest, res: Response) => {
  try {
    const { itemTemplateId, type, quantity = 1 } = req.body;

    if (!itemTemplateId || !type) {
      res.status(400).json({ message: "itemTemplateId and type are required" });
      return;
    }

    // If item already exists, increment quantity
    const existingItem = await Inventory.findOne({
      playerId: req.playerId,
      itemTemplateId,
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
      console.log(`[DB] Inventory quantity updated for player (${req.playerId}): itemTemplateId=${itemTemplateId}, newQty=${existingItem.quantity}`);
      res.json({ message: "Item quantity updated", item: existingItem });
      return;
    }

    const newItem = await Inventory.create({
      playerId: req.playerId,
      itemTemplateId,
      type,
      quantity,
    });
    console.log(`[DB] New item added to inventory for player (${req.playerId}): itemTemplateId=${itemTemplateId}, type=${type}, qty=${quantity}`);
    res.status(201).json({ message: "Item added to inventory", item: newItem });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// PATCH /api/inventory/:id/use — consume/use an item (decrement quantity)
router.patch("/:id/use", async (req: AuthRequest, res: Response) => {
  try {
    const { quantity = 1 } = req.body;

    const item = await Inventory.findOne({ _id: req.params.id, playerId: req.playerId });

    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    if (item.quantity < quantity) {
      res.status(400).json({ message: "Not enough quantity" });
      return;
    }

    item.quantity -= quantity;

    // Remove item from inventory if quantity reaches 0
    if (item.quantity === 0) {
      await item.deleteOne();
      console.log(`[DB] Item fully consumed and removed for player (${req.playerId}): itemId=${req.params.id}`);
      res.json({ message: "Item fully consumed and removed" });
      return;
    }

    await item.save();
    console.log(`[DB] Item used for player (${req.playerId}): itemId=${req.params.id}, remainingQty=${item.quantity}`);
    res.json({ message: "Item used", item });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// DELETE /api/inventory/:id — remove item from inventory
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const item = await Inventory.findOneAndDelete({
      _id: req.params.id,
      playerId: req.playerId,
    });

    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    console.log(`[DB] Item removed from inventory for player (${req.playerId}): itemId=${req.params.id}`);
    res.json({ message: "Item removed from inventory" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;