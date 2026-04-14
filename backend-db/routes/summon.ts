import express, { Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/authMiddleware';
import Player from '../models/Player';
import GameState from '../models/GameState';
import {
  getSummonBannerById,
  performSummon,
  SUMMON_BANNERS,
  type SummonResult,
  type SummonState,
} from '../../src/engine/summonEngine';

const router = express.Router();

router.use(authMiddleware);

function eventStatesToObject(
  eventStates: Map<string, { pityCount: number; pityACount: number }> | undefined,
) {
  const out: Record<string, { pityCount: number; pityACount: number }> = {};
  if (!eventStates) return out;
  for (const [eventId, state] of eventStates.entries()) {
    out[eventId] = {
      pityCount: state?.pityCount ?? 0,
      pityACount: state?.pityACount ?? 0,
    };
  }
  return out;
}

router.get('/state', async (req: AuthRequest, res: Response) => {
  try {
    const [player, gameState] = await Promise.all([
      Player.findById(req.playerId).select('gold diamonds summonScrolls'),
      GameState.findOne({ playerId: req.playerId }).select('summonPityCount summonPityACount'),
    ]);

    if (!player) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    const eventStates = eventStatesToObject(gameState?.summonEventStates);

    // Backward-compat migration for users with old single-event pity fields.
    if (!eventStates.event_1) {
      eventStates.event_1 = {
        pityCount: gameState?.summonPityCount ?? 0,
        pityACount: gameState?.summonPityACount ?? 0,
      };
    }

    res.json({
      events: SUMMON_BANNERS.map((banner) => ({ id: banner.id, name: banner.name })),
      eventStates,
      currencies: {
        gold: player.gold,
        diamonds: player.diamonds,
        summonScrolls: player.summonScrolls,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/pull', async (req: AuthRequest, res: Response) => {
  try {
    const { count, eventId } = req.body as { count?: number; eventId?: string };

    if (count !== 1 && count !== 10) {
      res.status(400).json({ message: 'count must be 1 or 10' });
      return;
    }

    if (!eventId) {
      res.status(400).json({ message: 'eventId is required' });
      return;
    }

    const banner = getSummonBannerById(eventId);
    if (!banner) {
      res.status(400).json({ message: 'Invalid eventId' });
      return;
    }

    const player = await Player.findById(req.playerId);
    if (!player) {
      res.status(404).json({ message: 'Player not found' });
      return;
    }

    if (player.summonScrolls < count) {
      res.status(400).json({ message: 'Not enough summon scrolls' });
      return;
    }

    const gameState = await GameState.findOneAndUpdate(
      { playerId: req.playerId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const existingState = gameState?.summonEventStates?.get(eventId);
    let state: SummonState = {
      pityCount: existingState?.pityCount ?? 0,
      pityACount: existingState?.pityACount ?? 0,
    };

    const results: SummonResult[] = [];
    for (let index = 0; index < count; index += 1) {
      const outcome = performSummon(state, banner);
      results.push(outcome.result);
      state = outcome.newState;

      console.log(
        `[DB] Summon pull (${req.playerId}) eventId=${banner.id} eventName=${banner.name} [${index + 1}/${count}]: character=${outcome.result.character.name} (${outcome.result.character.rarity}), isPity=${outcome.result.isPity}, isPityA=${outcome.result.isPityA}, pity=${state.pityCount}, pityA=${state.pityACount}`,
      );
    }

    player.summonScrolls -= count;
    await player.save();

    if (gameState) {
      if (!gameState.summonEventStates) {
        gameState.summonEventStates = new Map();
      }
      gameState.summonEventStates.set(eventId, {
        pityCount: state.pityCount,
        pityACount: state.pityACount,
      });
      // Keep these for legacy compatibility, tied to event_1.
      if (eventId === 'event_1') {
        gameState.summonPityCount = state.pityCount;
        gameState.summonPityACount = state.pityACount;
      }
      gameState.lastSavedAt = new Date();
      await gameState.save();
    }

    console.log(
      `[DB] Summon batch complete (${req.playerId}) eventId=${banner.id} eventName=${banner.name}: pulls=${count}, remainingScrolls=${player.summonScrolls}, pity=${state.pityCount}, pityA=${state.pityACount}`,
    );

    res.json({
      event: { id: banner.id, name: banner.name },
      results,
      eventState: state,
      currencies: {
        gold: player.gold,
        diamonds: player.diamonds,
        summonScrolls: player.summonScrolls,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
