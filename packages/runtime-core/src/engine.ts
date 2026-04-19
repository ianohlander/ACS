import { migrateAdventurePackage } from "@acs/content-schema";
import type { AdventurePackage } from "@acs/domain";

import { RuntimeGameSession } from "./game-session.js";
import type { GameEngine, GameSession, RuntimeSnapshot } from "./types.js";

export function createGameEngine(): GameEngine {
  return {
    loadAdventure(pkg: AdventurePackage, snapshot?: RuntimeSnapshot): GameSession {
      const adventure = migrateAdventurePackage(pkg);
      return new RuntimeGameSession(adventure, snapshot);
    }
  };
}
