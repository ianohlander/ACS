import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createGameEngine } from "../../packages/runtime-core/dist/index.js";
import { assertHasEvent, loadSampleAdventure } from "./helpers/sample-adventure.mjs";

describe("runtime-core engine", () => {
  it("loads the adventure at the authored start state", () => {
    const adventure = loadSampleAdventure();
    const session = createGameEngine().loadAdventure(adventure);
    const state = session.getState();

    assert.equal(state.currentMapId, adventure.startState.mapId);
    assert.equal(state.player.x, adventure.startState.x);
    assert.equal(state.player.y, adventure.startState.y);
    assert.deepEqual(state.player.party, adventure.startState.party);
  });

  it("fires dialogue, cue, flag, and quest events when interacting with the Oracle", () => {
    const session = createGameEngine().loadAdventure(loadSampleAdventure());
    session.dispatch({ type: "move", direction: "east" });
    session.dispatch({ type: "move", direction: "south" });

    const result = session.dispatch({ type: "interact", direction: "east" });

    assertHasEvent(result.events, "interactionTargetFound");
    assertHasEvent(result.events, "triggerFired");
    assertHasEvent(result.events, "mediaCuePlayed");
    assertHasEvent(result.events, "soundCuePlayed");
    assertHasEvent(result.events, "dialogueStarted");
    assert.equal(result.state.flags.quest_started, true);
    assert.equal(result.state.questStages.quest_solar_seal, 1);
  });

  it("applies stacked trigger effects when the shrine reward tile is entered", () => {
    const adventure = loadSampleAdventure();
    const snapshot = createGameEngine().loadAdventure(adventure).serializeSnapshot();
    snapshot.currentMapId = "map_shrine";
    snapshot.player.x = 4;
    snapshot.player.y = 1;
    snapshot.flags.quest_started = true;

    const result = createGameEngine()
      .loadAdventure(adventure, snapshot)
      .dispatch({ type: "move", direction: "south" });

    assertHasEvent(result.events, "triggerFired");
    assertHasEvent(result.events, "soundCuePlayed");
    assertHasEvent(result.events, "dialogueStarted");
    assertHasEvent(result.events, "itemGranted");
    assertHasEvent(result.events, "tileChanged");
    assert.equal(result.state.inventory.item_solar_seal, 1);
    assert.equal(result.state.questStages.quest_solar_seal, 2);
  });

  it("traverses map exits without changing the authored map graph", () => {
    const adventure = loadSampleAdventure();
    const snapshot = createGameEngine().loadAdventure(adventure).serializeSnapshot();
    snapshot.currentMapId = "map_meadow";
    snapshot.player.x = 6;
    snapshot.player.y = 5;

    const result = createGameEngine()
      .loadAdventure(adventure, snapshot)
      .dispatch({ type: "move", direction: "south" });

    assertHasEvent(result.events, "teleported");
    assert.equal(result.state.currentMapId, "map_shrine");
    assert.equal(result.state.player.x, 1);
    assert.equal(result.state.player.y, 4);
  });
});
