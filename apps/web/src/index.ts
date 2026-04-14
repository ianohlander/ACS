import type { DialogueNode, AdventurePackage } from "@acs/domain";
import { createIndexedDbPersistence, type RuntimeSaveRecord } from "@acs/persistence";
import { createGameEngine, type EngineEvent, type GameSession, type GameSessionState } from "@acs/runtime-core";
import { CanvasGameRenderer } from "@acs/runtime-2d";
import { sampleAdventure } from "./sampleAdventure.js";

const DEFAULT_SAVE_SLOT_ID = `${sampleAdventure.metadata.id}:latest`;

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
const saveButton = requireElement<HTMLButtonElement>("save-button");
const loadButton = requireElement<HTMLButtonElement>("load-button");
const resetButton = requireElement<HTMLButtonElement>("reset-button");
const saveStatus = requireElement<HTMLElement>("save-status");

const engine = createGameEngine();
const persistence = createIndexedDbPersistence();
const eventHistory: string[] = [];
const draftKey = new URLSearchParams(window.location.search).get("draft");
let activeAdventure: AdventurePackage = sampleAdventure;
let saveSlotId = DEFAULT_SAVE_SLOT_ID;
let renderer = new CanvasGameRenderer(canvas, activeAdventure, { tileSize: 56 });
let session: GameSession = engine.loadAdventure(activeAdventure);

saveButton.addEventListener("click", () => {
  void saveCurrentSession();
});

loadButton.addEventListener("click", () => {
  void loadSavedSession();
});

resetButton.addEventListener("click", () => {
  resetSession();
});

dialogueContinue.addEventListener("click", () => {
  advanceDialogue();
});

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

void bootstrap();

async function bootstrap(): Promise<void> {
  eventHistory.push("Checking for a local save...");

  if (draftKey) {
    const draftRecord = await persistence.getDraft<AdventurePackage>(draftKey);
    if (draftRecord) {
      activeAdventure = draftRecord.value;
      saveSlotId = `${activeAdventure.metadata.id}:draft-playtest`;
      renderer = new CanvasGameRenderer(canvas, activeAdventure, { tileSize: 56 });
      session = engine.loadAdventure(activeAdventure);
      eventHistory.push(`Loaded playtest draft '${draftKey}'.`);
      setSaveStatus(`Loaded playtest draft updated ${formatTimestamp(draftRecord.updatedAt)}.`);
    } else {
      eventHistory.push(`Draft '${draftKey}' was not found. Falling back to sample adventure.`);
      setSaveStatus(`Draft '${draftKey}' was not found. Playing the sample adventure.`);
    }
  }

  try {
    const existing = await persistence.loadSession(saveSlotId);
    if (existing) {
      session = engine.loadAdventure(activeAdventure, existing.snapshot);
      eventHistory.push(`Loaded local save from ${formatTimestamp(existing.savedAt)}.`);
      setSaveStatus(`Loaded local save from ${formatTimestamp(existing.savedAt)}.`);
    } else if (!draftKey) {
      eventHistory.push("No local save found. Starting a fresh session.");
      setSaveStatus("No local save yet. Use Save to capture your progress.");
    }
  } catch (error) {
    eventHistory.push(`Local save unavailable: ${toErrorMessage(error)}`);
    setSaveStatus(`Local save unavailable: ${toErrorMessage(error)}`);
  }

  renderEverything(session.getState());
}

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

async function saveCurrentSession(): Promise<void> {
  try {
    const record = await persistence.saveSession({
      id: saveSlotId,
      label: draftKey ? "Latest draft playtest save" : "Latest local save",
      adventureId: activeAdventure.metadata.id,
      adventureTitle: activeAdventure.metadata.title,
      snapshot: session.serializeSnapshot()
    });

    eventHistory.push(`Saved session at ${formatTimestamp(record.savedAt)}.`);
    setSaveStatus(`Saved at ${formatTimestamp(record.savedAt)}.`);
    renderEventLog();
  } catch (error) {
    const message = `Failed to save locally: ${toErrorMessage(error)}`;
    eventHistory.push(message);
    setSaveStatus(message);
    renderEventLog();
  }
}

async function loadSavedSession(): Promise<void> {
  try {
    const record = await persistence.loadSession(saveSlotId);
    if (!record) {
      const message = "No local save is available to load.";
      eventHistory.push(message);
      setSaveStatus(message);
      renderEventLog();
      return;
    }

    restoreSession(record, `Loaded save from ${formatTimestamp(record.savedAt)}.`);
  } catch (error) {
    const message = `Failed to load locally: ${toErrorMessage(error)}`;
    eventHistory.push(message);
    setSaveStatus(message);
    renderEventLog();
  }
}

function resetSession(): void {
  session = engine.loadAdventure(activeAdventure);
  eventHistory.push("Session reset to the adventure start state.");
  setSaveStatus("Session reset. Existing local save is unchanged.");
  renderEverything(session.getState());
}

function restoreSession(record: RuntimeSaveRecord, message: string): void {
  session = engine.loadAdventure(activeAdventure, record.snapshot);
  eventHistory.push(message);
  setSaveStatus(message);
  renderEverything(session.getState());
}

function renderEverything(state: Readonly<GameSessionState>): void {
  renderer.render(state as GameSessionState);
  const map = activeAdventure.maps.find((candidate) => candidate.id === state.currentMapId);
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

  for (const line of eventHistory.slice(-12).reverse()) {
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

  const dialogue = activeAdventure.dialogue.find((candidate) => candidate.id === active.dialogueId);
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
    case "enemyIntentChosen":
      return `Enemy ${event.entityId} chose ${event.mode}:${event.action}.`;
    case "enemyMoved":
      return `Enemy ${event.entityId} moved to (${event.x}, ${event.y}).`;
    case "enemyWaited":
      return `Enemy ${event.entityId} waited. ${event.reason}`;
    case "enemyThreatened":
      return `Enemy ${event.entityId} closes in and threatens the player.`;
    default:
      return assertNever(event);
  }
}

function setSaveStatus(message: string): void {
  saveStatus.textContent = message;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
