import type { DialogueNode } from "@acs/domain";
import { createGameEngine, type EngineEvent, type GameSessionState } from "@acs/runtime-core";
import { CanvasGameRenderer } from "@acs/runtime-2d";
import { sampleAdventure } from "./sampleAdventure.js";

const canvas = requireElement<HTMLCanvasElement>("game-canvas");
const mapName = requireElement<HTMLElement>("map-name");
const playerPos = requireElement<HTMLElement>("player-pos");
const turnCount = requireElement<HTMLElement>("turn-count");
const flagSummary = requireElement<HTMLElement>("flag-summary");
const inventorySummary = requireElement<HTMLElement>("inventory-summary");
const eventLog = requireElement<HTMLOListElement>("event-log");
const dialogueOverlay = requireElement<HTMLElement>("dialogue-overlay");
const dialogueSpeaker = requireElement<HTMLElement>("dialogue-speaker");
const dialogueText = requireElement<HTMLElement>("dialogue-text");
const dialogueContinue = requireElement<HTMLButtonElement>("dialogue-continue");

const engine = createGameEngine();
const session = engine.loadAdventure(sampleAdventure);
const renderer = new CanvasGameRenderer(canvas, sampleAdventure, { tileSize: 56 });
const eventHistory: string[] = ["Session started. Speak with the Oracle to begin."];

renderEverything(session.getState());

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (session.getState().activeDialogue && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    advanceDialogue();
    return;
  }

  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "move", direction: "north" }));
      break;
    case "ArrowDown":
    case "s":
    case "S":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "move", direction: "south" }));
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "move", direction: "west" }));
      break;
    case "ArrowRight":
    case "d":
    case "D":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "move", direction: "east" }));
      break;
    case "e":
    case "E":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "interact" }));
      break;
    case "q":
    case "Q":
      event.preventDefault();
      runCommand(() => session.dispatch({ type: "inspect" }));
      break;
    default:
      break;
  }
});

dialogueContinue.addEventListener("click", () => {
  advanceDialogue();
});

function advanceDialogue(): void {
  const node = getActiveDialogueNode(session.getState());
  const choice = node?.choices?.[0];
  if (!choice) {
    return;
  }

  runCommand(() => session.dispatch({ type: "selectDialogueChoice", choiceId: choice.id }));
}

function runCommand(execute: () => { state: Readonly<GameSessionState>; events: EngineEvent[] }): void {
  const result = execute();
  appendEvents(result.events);
  renderEverything(result.state);
}

function renderEverything(state: Readonly<GameSessionState>): void {
  renderer.render(state as GameSessionState);
  const map = sampleAdventure.maps.find((candidate) => candidate.id === state.currentMapId);
  mapName.textContent = map?.name ?? "Unknown Map";
  playerPos.textContent = `(${state.player.x}, ${state.player.y})`;
  turnCount.textContent = String(state.turn);
  flagSummary.textContent = summarizeRecord(state.flags);
  inventorySummary.textContent = summarizeRecord(state.inventory);
  renderDialogue(state);
  renderEventLog();
}

function renderDialogue(state: Readonly<GameSessionState>): void {
  const node = getActiveDialogueNode(state);
  if (!node) {
    dialogueOverlay.classList.add("hidden");
    dialogueSpeaker.textContent = "";
    dialogueText.textContent = "";
    return;
  }

  dialogueOverlay.classList.remove("hidden");
  dialogueSpeaker.textContent = node.speaker ?? "Dialogue";
  dialogueText.textContent = node.text;
}

function renderEventLog(): void {
  eventLog.innerHTML = "";

  for (const line of eventHistory.slice(-8).reverse()) {
    const item = document.createElement("li");
    item.textContent = line;
    eventLog.append(item);
  }
}

function appendEvents(events: EngineEvent[]): void {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    eventHistory.push(describeEvent(event));
  }
}

function getActiveDialogueNode(state: Readonly<GameSessionState>): DialogueNode | undefined {
  const active = state.activeDialogue;
  if (!active) {
    return undefined;
  }

  const dialogue = sampleAdventure.dialogue.find((candidate) => candidate.id === active.dialogueId);
  return dialogue?.nodes.find((candidate) => candidate.id === active.nodeId);
}

function summarizeRecord(record: Record<string, string | number | boolean>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return "none";
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

function describeEvent(event: EngineEvent): string {
  switch (event.type) {
    case "playerMoved":
      return `Moved to ${event.mapId} (${event.x}, ${event.y}).`;
    case "movementBlocked":
      return event.reason === "bounds" ? "Movement blocked by the map edge." : "Movement blocked by an entity.";
    case "interactionTargetFound":
      return `Interacted with ${event.entityId}.`;
    case "inspectResult":
      return event.message;
    case "menuOpened":
      return `Opened ${event.menu} menu.`;
    case "dialogueStarted":
      return `Dialogue started: ${event.dialogueId}.`;
    case "dialogueAdvanced":
      return `Dialogue advanced to ${event.nodeId}.`;
    case "dialogueEnded":
      return `Dialogue ended: ${event.dialogueId}.`;
    case "triggerFired":
      return `Trigger fired: ${event.triggerId}.`;
    case "flagSet":
      return `Flag ${event.flag} set to ${String(event.value)}.`;
    case "itemGranted":
      return `Received ${event.quantity} x ${event.itemId}.`;
    case "teleported":
      return `Teleported to ${event.mapId} (${event.x}, ${event.y}).`;
    case "tileChanged":
      return `Tile changed at ${event.mapId} (${event.x}, ${event.y}) to ${event.tileId}.`;
    case "turnEnded":
      return `Turn advanced to ${event.turn}.`;
    case "commandIgnored":
      return event.reason;
    default:
      return assertNever(event);
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element '${id}'.`);
  }

  return element as T;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected event: ${JSON.stringify(value)}`);
}
