import assert from "node:assert/strict";

import { readAdventurePackage } from "../../../packages/content-schema/dist/index.js";
import { sampleAdventureData } from "../../../apps/web/dist/sampleAdventure.js";

export function loadSampleAdventure() {
  return readAdventurePackage(sampleAdventureData);
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function mapById(pkg, mapId) {
  const map = pkg.maps.find((candidate) => candidate.id === mapId);
  assert.ok(map, `Expected map '${mapId}' to exist.`);
  return map;
}

export function eventTypes(events) {
  return events.map((event) => event.type);
}

export function assertHasEvent(events, type) {
  assert.ok(
    events.some((event) => event.type === type),
    `Expected event '${type}', saw: ${eventTypes(events).join(", ")}`
  );
}
