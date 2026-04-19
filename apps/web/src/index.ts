import { readAdventurePackage, type RawAdventurePackage } from "@acs/content-schema";
import type { AdventurePackage, DialogueNode } from "@acs/domain";
import { createIndexedDbPersistence, type RuntimeSaveRecord } from "@acs/persistence";
import { createProjectApiClient, type ReleaseRecord } from "@acs/project-api";
import { createGameEngine, type EngineEvent, type GameSession, type GameSessionState } from "@acs/runtime-core";
import { CanvasGameRenderer, type RuntimeVisualMode } from "@acs/runtime-2d";
import { sampleAdventureData } from "./sampleAdventure.js";

const sampleAdventure = readAdventurePackage(sampleAdventureData as RawAdventurePackage);
const APP_VERSION = "Milestone 20";
const DEFAULT_VISUAL_MODE: RuntimeVisualMode = "classic-acs";
const VISUAL_MODE_STORAGE_KEY = "acs:runtime-visual-mode";
const DEFAULT_SAVE_SLOT_ID = `${sampleAdventure.metadata.id}:latest`;

const canvas = requireElement<HTMLCanvasElement>("game-canvas");
const mapName = requireElement<HTMLElement>("map-name");
const playerPos = requireElement<HTMLElement>("player-pos");
const turnCount = requireElement<HTMLElement>("turn-count");
const partySummary = requireElement<HTMLElement>("party-summary");
const profileSummary = requireElement<HTMLElement>("profile-summary");
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
const sourceStatus = requireElement<HTMLElement>("source-status");
const appVersion = requireElement<HTMLElement>("app-version");
const visualModeSelect = requireElement<HTMLSelectElement>("visual-mode");

const engine = createGameEngine();
const persistence = createIndexedDbPersistence();
const projectApi = createProjectApiClient();
const eventHistory: string[] = [];
const params = new URLSearchParams(window.location.search);
const draftKey = params.get("draft");
const releaseId = params.get("release");
let activeAdventure: AdventurePackage = sampleAdventure;
let activeRelease: ReleaseRecord | null = null;
let saveSlotId = DEFAULT_SAVE_SLOT_ID;
let activeVisualMode = readVisualModePreference();
let renderer = new CanvasGameRenderer(canvas, activeAdventure, { tileSize: 56, mode: activeVisualMode });
let session: GameSession = engine.loadAdventure(activeAdventure);
let classicDialogueScrollOffset = 0;
let activeDialogueKey = "";

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

visualModeSelect.addEventListener("change", () => {
  activeVisualMode = readVisualModeValue(visualModeSelect.value);
  window.localStorage.setItem(VISUAL_MODE_STORAGE_KEY, activeVisualMode);
  renderer.setMode(activeVisualMode);
  renderEverything(session.getState());
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (session.getState().activeDialogue) {
    if (activeVisualMode === "classic-acs" && isDialogueScrollKey(event.key)) {
      event.preventDefault();
      scrollClassicDialogue(event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (isDialogueAdvanceKey(event.key)) {
      event.preventDefault();
      advanceDialogue();
      return;
    }

    if (isGameplayKey(event.key)) {
      event.preventDefault();
      return;
    }
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

function isDialogueAdvanceKey(key: string): boolean {
  return key === "Enter" || key === " " || key === "e" || key === "E";
}

function isGameplayKey(key: string): boolean {
  return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D", "e", "E", "q", "Q"].includes(key);
}

function isDialogueScrollKey(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
}
void bootstrap();

async function bootstrap(): Promise<void> {
  appVersion.textContent = APP_VERSION;
  visualModeSelect.value = activeVisualMode;
  eventHistory.push("Checking for a local save...");

  if (releaseId) {
    try {
      activeRelease = await projectApi.getRelease(releaseId);
      activeAdventure = activeRelease.package;
      saveSlotId = `${activeAdventure.metadata.id}:release:${activeRelease.id}`;
      renderer = new CanvasGameRenderer(canvas, activeAdventure, { tileSize: 56, mode: activeVisualMode });
      session = engine.loadAdventure(activeAdventure);
      sourceStatus.textContent = `Playing published release ${activeRelease.label} (${activeRelease.id}).`;
      eventHistory.push(`Loaded published release '${activeRelease.id}'.`);
      setSaveStatus(`Loaded published release ${activeRelease.label}.`);
    } catch (error) {
      eventHistory.push(`Release '${releaseId}' could not be loaded. Falling back to the sample adventure.`);
      sourceStatus.textContent = `Published release unavailable: ${toErrorMessage(error)}`;
      setSaveStatus(`Published release unavailable: ${toErrorMessage(error)}`);
    }
  } else if (draftKey) {
    const draftRecord = await persistence.getDraft<AdventurePackage>(draftKey);
    if (draftRecord) {
      activeAdventure = draftRecord.value;
      saveSlotId = `${activeAdventure.metadata.id}:draft-playtest`;
      renderer = new CanvasGameRenderer(canvas, activeAdventure, { tileSize: 56, mode: activeVisualMode });
      session = engine.loadAdventure(activeAdventure);
      sourceStatus.textContent = `Playing local playtest draft ${draftKey}.`;
      eventHistory.push(`Loaded playtest draft '${draftKey}'.`);
      setSaveStatus(`Loaded playtest draft updated ${formatTimestamp(draftRecord.updatedAt)}.`);
    } else {
      eventHistory.push(`Draft '${draftKey}' was not found. Falling back to sample adventure.`);
      sourceStatus.textContent = `Draft ${draftKey} not found. Using the built-in sample adventure.`;
      setSaveStatus(`Draft '${draftKey}' was not found. Playing the sample adventure.`);
    }
  } else {
    sourceStatus.textContent = "Playing the built-in sample adventure.";
  }

  try {
    const existing = await persistence.loadSession(saveSlotId);
    if (existing) {
      eventHistory.push(`Local save available from ${formatTimestamp(existing.savedAt)}. Press Load to restore it.`);
      setSaveStatus(`Local save available from ${formatTimestamp(existing.savedAt)}. Press Load to restore it.`);
    } else if (!draftKey && !releaseId) {
      eventHistory.push("No local save found. Starting a fresh session.");
      setSaveStatus("No local save yet. Use Save to capture your progress.");
    } else if (releaseId) {
      setSaveStatus("No local save yet for this published release.");
    } else if (draftKey) {
      setSaveStatus("No local save yet for this draft playtest.");
    }
  } catch (error) {
    eventHistory.push(`Local save unavailable: ${toErrorMessage(error)}`);
    setSaveStatus(`Local save unavailable: ${toErrorMessage(error)}`);
  }

  renderEverything(session.getState());
}

function scrollClassicDialogue(delta: number): void {
  classicDialogueScrollOffset = Math.max(0, classicDialogueScrollOffset + delta);
  renderer.setClassicDialogueScrollOffset(classicDialogueScrollOffset);
  renderEverything(session.getState());
}

function resetClassicDialogueScroll(): void {
  classicDialogueScrollOffset = 0;
  renderer.setClassicDialogueScrollOffset(0);
}

function advanceDialogue(): void {
  const node = getActiveDialogueNode(session.getState());
  const choice = node?.choices?.[0];
  if (!choice) {
    return;
  }

  resetClassicDialogueScroll();
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
      label: releaseId ? "Latest published release save" : draftKey ? "Latest draft playtest save" : "Latest local save",
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
  syncDialogueState(state);
  renderer.render(state as GameSessionState);
  const map = activeAdventure.maps.find((candidate) => candidate.id === state.currentMapId);
  mapName.textContent = map?.name ?? "Unknown Map";
  playerPos.textContent = `(${state.player.x}, ${state.player.y})`;
  turnCount.textContent = String(state.turn);
  partySummary.textContent = summarizeParty(state);
  profileSummary.textContent = summarizePartyProfile(state);
  flagSummary.textContent = summarizeRecord(state.flags);
  inventorySummary.textContent = summarizeInventory(state.inventory);
  renderDialogue(state);
  renderEventLog();
}

function syncDialogueState(state: Readonly<GameSessionState>): void {
  const dialogueKey = state.activeDialogue ? `${state.activeDialogue.dialogueId}:${state.activeDialogue.nodeId}` : "";
  if (dialogueKey !== activeDialogueKey) {
    activeDialogueKey = dialogueKey;
    resetClassicDialogueScroll();
  }
}

function renderDialogue(state: Readonly<GameSessionState>): void {
  const node = getActiveDialogueNode(state);
  if (!node || activeVisualMode === "classic-acs") {
    dialogueOverlay.classList.add("hidden");
    dialogueSpeaker.textContent = "";
    dialogueText.textContent = "";
    return;
  }

  dialogueOverlay.classList.remove("hidden");
  dialogueSpeaker.textContent = `${node.speaker ?? "Dialogue"} says`;
  dialogueText.textContent = node.text;
  dialogueContinue.textContent = node.choices?.[0]?.label ? `${node.choices[0].label} (Enter / E)` : "Continue (Enter / E)";
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

function summarizeParty(state: Readonly<GameSessionState>): string {
  const names = state.player.party.map((definitionId) => findEntityDefinitionName(definitionId));
  return names.length > 0 ? names.join(", ") : "none";
}

function summarizePartyProfile(state: Readonly<GameSessionState>): string {
  const parts = state.player.party.flatMap((definitionId) => {
    const definition = activeAdventure.entityDefinitions.find((candidate) => candidate.id === definitionId);
    if (!definition?.profile) {
      return [];
    }

    const stats = definition.profile.stats;
    const statText = [
      stats?.life !== undefined ? `life ${stats.life}` : "",
      stats?.power !== undefined ? `power ${stats.power}` : "",
      stats?.speed !== undefined ? `speed ${stats.speed}` : ""
    ].filter((part) => part.length > 0).join(" / ");
    const skillText = definition.profile.skillIds?.length ? `skills ${definition.profile.skillIds.map((skillId) => activeAdventure.skillDefinitions.find((skill) => skill.id === skillId)?.name ?? skillId).join(", ")}` : "";
    return [`${definition.name}: ${[statText, skillText].filter((part) => part.length > 0).join("; ")}`];
  });

  return parts.length > 0 ? parts.join(" | ") : "none";
}

function summarizeInventory(record: Record<string, number>): string {
  const entries = Object.entries(record).filter(([, quantity]) => quantity > 0);
  if (entries.length === 0) {
    return "empty";
  }

  return entries.map(([itemId, quantity]) => `${findItemDefinitionName(itemId)}: ${quantity}`).join(", ");
}

function findEntityDefinitionName(definitionId: string): string {
  return activeAdventure.entityDefinitions.find((definition) => definition.id === definitionId)?.name ?? definitionId;
}

function findItemDefinitionName(itemId: string): string {
  return activeAdventure.itemDefinitions.find((item) => item.id === itemId)?.name ?? itemId;
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

function readVisualModePreference(): RuntimeVisualMode {
  return readVisualModeValue(window.localStorage.getItem(VISUAL_MODE_STORAGE_KEY));
}

function readVisualModeValue(value: string | null): RuntimeVisualMode {
  return value === "debug-grid" || value === "classic-acs" ? value : DEFAULT_VISUAL_MODE;
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
