import type { MapDefinition } from "@acs/domain";

import { assertNever } from "./assert.js";
import type { CardinalDirection, RuntimeEntityState } from "./types.js";

export interface GridStep {
  x: number;
  y: number;
}

export function directionToDelta(direction: CardinalDirection): GridStep {
  switch (direction) {
    case "north":
      return { x: 0, y: -1 };
    case "south":
      return { x: 0, y: 1 };
    case "east":
      return { x: 1, y: 0 };
    case "west":
      return { x: -1, y: 0 };
    default:
      return assertNever(direction);
  }
}

export function isWithinBounds(map: MapDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function manhattanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function prioritizedDirections(fromX: number, fromY: number, targetX: number, targetY: number): GridStep[] {
  const horizontal = targetX === fromX ? [] : [{ x: Math.sign(targetX - fromX), y: 0 }];
  const vertical = targetY === fromY ? [] : [{ x: 0, y: Math.sign(targetY - fromY) }];

  if (Math.abs(targetX - fromX) >= Math.abs(targetY - fromY)) {
    return [...horizontal, ...vertical];
  }

  return [...vertical, ...horizontal];
}

export function rotateDirectionsBySeed(entityId: RuntimeEntityState["id"], turn: number): GridStep[] {
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];
  const seed = [...String(entityId)].reduce((total, character) => total + character.charCodeAt(0), 0);
  const offset = (seed + turn) % directions.length;
  return [...directions.slice(offset), ...directions.slice(0, offset)];
}
