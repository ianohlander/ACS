import { readAdventurePackage } from "../packages/content-schema/dist/index.js";
import { createGameEngine } from "../packages/runtime-core/dist/index.js";
import { validateAdventure } from "../packages/validation/dist/index.js";
import { sampleAdventureData } from "../apps/web/dist/sampleAdventure.js";

const adventure = readAdventurePackage(sampleAdventureData);
const validation = validateAdventure(adventure);
assert(!validation.blocking, `sample adventure has ${validation.summary.errorCount} blocking validation error(s)`);

const engine = createGameEngine();
const startSession = engine.loadAdventure(adventure);
assertState(startSession.getState().currentMapId === adventure.startState.mapId, "start map matches package start state");
assertState(startSession.getState().player.x === adventure.startState.x, "start x matches package start state");
assertState(startSession.getState().player.y === adventure.startState.y, "start y matches package start state");

const oracleSession = engine.loadAdventure(adventure);
dispatchAll(oracleSession, [
  { type: "move", direction: "east" },
  { type: "move", direction: "south" }
]);
const oracleEvents = oracleSession.dispatch({ type: "interact", direction: "east" }).events;
assertEvent(oracleEvents, "interactionTargetFound", "oracle can be targeted by interaction");
assertEvent(oracleEvents, "triggerFired", "oracle interaction fires a trigger");
assertEvent(oracleEvents, "dialogueStarted", "oracle interaction starts dialogue");
assertState(oracleSession.getState().flags.quest_started === true, "oracle interaction sets quest_started flag");
assertState(oracleSession.getState().questStages.quest_solar_seal === 1, "oracle interaction advances quest stage");

const shrineSnapshot = startSession.serializeSnapshot();
shrineSnapshot.currentMapId = "map_shrine";
shrineSnapshot.player.x = 4;
shrineSnapshot.player.y = 1;
shrineSnapshot.flags.quest_started = true;
const shrineSession = engine.loadAdventure(adventure, shrineSnapshot);
const shrineEvents = shrineSession.dispatch({ type: "move", direction: "south" }).events;
assertEvent(shrineEvents, "triggerFired", "shrine tile fires reward trigger");
assertEvent(shrineEvents, "itemGranted", "shrine reward grants item");
assertEvent(shrineEvents, "tileChanged", "shrine reward changes altar tile");
assertState(shrineSession.getState().inventory.item_solar_seal === 1, "solar seal is in inventory after shrine reward");

const exitSnapshot = startSession.serializeSnapshot();
exitSnapshot.currentMapId = "map_meadow";
exitSnapshot.player.x = 6;
exitSnapshot.player.y = 5;
const exitSession = engine.loadAdventure(adventure, exitSnapshot);
const exitEvents = exitSession.dispatch({ type: "move", direction: "south" }).events;
assertEvent(exitEvents, "teleported", "meadow exit teleports to shrine");
assertState(exitSession.getState().currentMapId === "map_shrine", "exit changes current map to shrine");
assertState(exitSession.getState().player.x === 1 && exitSession.getState().player.y === 4, "exit places player at shrine target coordinates");

console.log("ACS playtest smoke passed: validation, start state, oracle trigger, shrine reward, and exit travel.");

function dispatchAll(session, commands) {
  for (const command of commands) {
    session.dispatch(command);
  }
}

function assertEvent(events, type, message) {
  assert(events.some((event) => event.type === type), `${message}; saw events: ${events.map((event) => event.type).join(", ")}`);
}

function assertState(condition, message) {
  assert(condition, message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Smoke test failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
}
