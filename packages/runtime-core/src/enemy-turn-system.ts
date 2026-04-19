import type {
  EntityBehaviorProfile,
  EntityDefinition,
  EntityInstance,
  MapDefinition,
  MapId
} from "@acs/domain";

import { assertNever } from "./assert.js";
import {
  isWithinBounds,
  manhattanDistance,
  prioritizedDirections,
  rotateDirectionsBySeed,
  type GridStep
} from "./movement.js";
import type { EngineEvent, GameSessionState, RuntimeEntityState } from "./types.js";

interface EnemyTurnSystemOptions {
  state: GameSessionState;
  mapsById: Map<MapId, MapDefinition>;
  entityDefinitionsById: Map<EntityDefinition["id"], EntityDefinition>;
  entityInstancesById: Map<EntityInstance["id"], EntityInstance>;
}

interface EnemyStep {
  x: number;
  y: number;
  reason: string;
}

export class EnemyTurnSystem {
  private readonly state: GameSessionState;
  private readonly mapsById: Map<MapId, MapDefinition>;
  private readonly entityDefinitionsById: Map<EntityDefinition["id"], EntityDefinition>;
  private readonly entityInstancesById: Map<EntityInstance["id"], EntityInstance>;

  constructor(options: EnemyTurnSystemOptions) {
    this.state = options.state;
    this.mapsById = options.mapsById;
    this.entityDefinitionsById = options.entityDefinitionsById;
    this.entityInstancesById = options.entityInstancesById;
  }

  resolveEnemyPhase(): EngineEvent[] {
    return this.state.entities.flatMap((entity) => this.resolveEnemyTurn(entity));
  }

  private resolveEnemyTurn(entity: RuntimeEntityState): EngineEvent[] {
    const definition = this.entityDefinitionsById.get(entity.definitionId);
    if (!this.canActThisTurn(entity, definition)) {
      return [];
    }

    const behavior = normalizeBehavior(definition.behavior);
    if (!isScheduledTurn(this.state.turn, behavior.turnInterval)) {
      return [];
    }

    const distanceToPlayer = this.distanceToPlayer(entity);
    if (distanceToPlayer <= 1) {
      return this.threatenPlayer(entity, behavior, distanceToPlayer);
    }

    return this.moveOrWait(entity, behavior, distanceToPlayer);
  }

  private canActThisTurn(entity: RuntimeEntityState, definition: EntityDefinition | undefined): definition is EntityDefinition {
    return Boolean(definition && definition.kind === "enemy" && entity.active && entity.mapId === this.state.currentMapId);
  }

  private distanceToPlayer(entity: RuntimeEntityState): number {
    return manhattanDistance(entity.x, entity.y, this.state.player.x, this.state.player.y);
  }

  private threatenPlayer(
    entity: RuntimeEntityState,
    behavior: EntityBehaviorProfile,
    distance: number
  ): EngineEvent[] {
    return [
      { type: "enemyIntentChosen", entityId: entity.id, mode: behavior.mode, action: "threaten" },
      { type: "enemyThreatened", entityId: entity.id, distance }
    ];
  }

  private moveOrWait(
    entity: RuntimeEntityState,
    behavior: EntityBehaviorProfile,
    distanceToPlayer: number
  ): EngineEvent[] {
    const step = this.chooseEnemyStep(entity, behavior, distanceToPlayer);
    if (!step) {
      return [
        { type: "enemyIntentChosen", entityId: entity.id, mode: behavior.mode, action: "wait" },
        { type: "enemyWaited", entityId: entity.id, reason: "No valid movement option." }
      ];
    }

    entity.x = step.x;
    entity.y = step.y;
    return [
      { type: "enemyIntentChosen", entityId: entity.id, mode: behavior.mode, action: `move:${step.reason}` },
      { type: "enemyMoved", entityId: entity.id, mapId: entity.mapId, x: entity.x, y: entity.y }
    ];
  }

  private chooseEnemyStep(
    entity: RuntimeEntityState,
    behavior: EntityBehaviorProfile,
    distanceToPlayer: number
  ): EnemyStep | undefined {
    const origin = this.entityInstancesById.get(entity.id);
    const detectionRange = behavior.detectionRange ?? 4;
    const leashRange = behavior.leashRange ?? 6;
    const wanderRadius = behavior.wanderRadius ?? 2;

    switch (behavior.mode) {
      case "idle":
        return undefined;
      case "pursue":
        return distanceToPlayer <= detectionRange ? this.findStepTowardPlayer(entity, "pursue") : undefined;
      case "guard":
        return this.chooseGuardStep(entity, origin, detectionRange, distanceToPlayer);
      case "wander":
        return this.chooseWanderStep(entity, origin, detectionRange, leashRange, wanderRadius, distanceToPlayer);
      default:
        return assertNever(behavior.mode);
    }
  }

  private chooseGuardStep(
    entity: RuntimeEntityState,
    origin: EntityInstance | undefined,
    detectionRange: number,
    distanceToPlayer: number
  ): EnemyStep | undefined {
    if (distanceToPlayer <= detectionRange) {
      return this.findStepTowardPlayer(entity, "guard");
    }

    if (origin && manhattanDistance(entity.x, entity.y, origin.x, origin.y) > 0) {
      return this.findStepTowardPoint(entity, origin.x, origin.y, "return-home");
    }

    return undefined;
  }

  private chooseWanderStep(
    entity: RuntimeEntityState,
    origin: EntityInstance | undefined,
    detectionRange: number,
    leashRange: number,
    wanderRadius: number,
    distanceToPlayer: number
  ): EnemyStep | undefined {
    if (distanceToPlayer <= detectionRange) {
      return this.findStepTowardPlayer(entity, "wander-alert");
    }

    if (origin && manhattanDistance(entity.x, entity.y, origin.x, origin.y) > leashRange) {
      return this.findStepTowardPoint(entity, origin.x, origin.y, "wander-return");
    }

    return this.findWanderStep(entity, origin?.x ?? entity.x, origin?.y ?? entity.y, wanderRadius);
  }

  private findStepTowardPlayer(entity: RuntimeEntityState, reason: string): EnemyStep | undefined {
    return this.findStepTowardPoint(entity, this.state.player.x, this.state.player.y, reason);
  }

  private findStepTowardPoint(
    entity: RuntimeEntityState,
    targetX: number,
    targetY: number,
    reason: string
  ): EnemyStep | undefined {
    return prioritizedDirections(entity.x, entity.y, targetX, targetY)
      .map((option) => toEnemyStep(entity, option, reason))
      .find((step) => this.canEntityMoveTo(entity.id, entity.mapId, step.x, step.y));
  }

  private findWanderStep(
    entity: RuntimeEntityState,
    originX: number,
    originY: number,
    wanderRadius: number
  ): EnemyStep | undefined {
    return rotateDirectionsBySeed(entity.id, this.state.turn)
      .map((option) => toEnemyStep(entity, option, "wander"))
      .find((step) => this.canWanderTo(entity.id, entity.mapId, step, originX, originY, wanderRadius));
  }

  private canWanderTo(
    entityId: RuntimeEntityState["id"],
    mapId: MapId,
    step: EnemyStep,
    originX: number,
    originY: number,
    wanderRadius: number
  ): boolean {
    return (
      this.canEntityMoveTo(entityId, mapId, step.x, step.y) &&
      manhattanDistance(step.x, step.y, originX, originY) <= wanderRadius
    );
  }

  private canEntityMoveTo(entityId: RuntimeEntityState["id"], mapId: MapId, x: number, y: number): boolean {
    const map = this.mapsById.get(mapId);
    return Boolean(
      map &&
        isWithinBounds(map, x, y) &&
        !this.isPlayerAt(mapId, x, y) &&
        !this.isEntityAt(entityId, mapId, x, y)
    );
  }

  private isPlayerAt(mapId: MapId, x: number, y: number): boolean {
    return this.state.player.x === x && this.state.player.y === y && this.state.currentMapId === mapId;
  }

  private isEntityAt(entityId: RuntimeEntityState["id"], mapId: MapId, x: number, y: number): boolean {
    return this.state.entities.some(
      (entity) => entity.id !== entityId && entity.active && entity.mapId === mapId && entity.x === x && entity.y === y
    );
  }
}

function normalizeBehavior(behavior: EntityDefinition["behavior"]): EntityBehaviorProfile {
  if (!behavior) {
    return { mode: "idle", turnInterval: 1 };
  }

  if (typeof behavior === "string") {
    return { mode: behavior, turnInterval: 1 };
  }

  return behavior;
}

function isScheduledTurn(turn: number, turnInterval: number | undefined): boolean {
  return turn % normalizeTurnInterval(turnInterval) === 0;
}

function normalizeTurnInterval(turnInterval: number | undefined): number {
  if (!Number.isFinite(turnInterval) || typeof turnInterval !== "number") {
    return 1;
  }

  return Math.max(1, Math.floor(turnInterval));
}

function toEnemyStep(entity: RuntimeEntityState, option: GridStep, reason: string): EnemyStep {
  return { x: entity.x + option.x, y: entity.y + option.y, reason };
}
