import { readAdventurePackage, type RawAdventurePackage } from "@acs/content-schema";
import type { AdventurePackage, DialogueNode } from "@acs/domain";
import { createIndexedDbPersistence, type RuntimeSaveRecord } from "@acs/persistence";
import { createProjectApiClient, type ReleaseRecord } from "@acs/project-api";
import { createGameEngine, type EngineEvent, type GameSession, type GameSessionState } from "@acs/runtime-core";
import { CanvasGameRenderer, type RuntimeVisualMode } from "@acs/runtime-2d";
import { sampleAdventureData } from "./sampleAdventure.js";

const sampleAdventure = readAdventurePackage(sampleAdventureData as RawAdventurePackage);
const APP_VERSION = "Milestone 32E";
const DEFAULT_VISUAL_MODE: RuntimeVisualMode = "classic-acs";
const VISUAL_MODE_STORAGE_KEY = "acs:runtime-visual-mode";
const CLASSIC_SCALE_STORAGE_KEY = "acs:runtime-classic-scale";
const DEFAULT_CLASSIC_SCALE = 2;
const DEFAULT_SAVE_SLOT_ID = `${sampleAdventure.metadata.id}:latest`;
const MOVEMENT_KEYS: Record<string, "north" | "south" | "west" | "east"> = {
  ArrowUp: "north",
  w: "north",
  W: "north",
  ArrowDown: "south",
  s: "south",
  S: "south",
  ArrowLeft: "west",
  a: "west",
  A: "west",
  ArrowRight: "east",
  d: "east",
  D: "east"
};
const DIALOGUE_ADVANCE_KEYS = new Set(["Enter", " ", "e", "E"]);
const DIALOGUE_SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

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
const objectiveText = requireElement<HTMLElement>("objective-text");
const presentationSummary = requireElement<HTMLElement>("presentation-summary");
const appVersion = requireElement<HTMLElement>("app-version");
const visualModeSelect = requireElement<HTMLSelectElement>("visual-mode");
const classicScaleSelect = requireElement<HTMLSelectElement>("classic-scale");

const engine = createGameEngine();
const persistence = createIndexedDbPersistence();
const projectApi = createProjectApiClient();
const eventHistory: string[] = [];
const params = new URLSearchParams(window.location.search);
const draftKey = params.get("draft");
const releaseId = params.get("release");
const packageUrl = params.get("package");
let activeAdventure: AdventurePackage = sampleAdventure;
let activeRelease: ReleaseRecord | null = null;
let saveSlotId = DEFAULT_SAVE_SLOT_ID;
let activeVisualMode = readVisualModePreference();
let activeClassicScale = readClassicScalePreference();
let renderer = createRenderer(activeAdventure);
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

classicScaleSelect.addEventListener("change", () => {
  activeClassicScale = readClassicScaleValue(classicScaleSelect.value);
  window.localStorage.setItem(CLASSIC_SCALE_STORAGE_KEY, String(activeClassicScale));
  renderer.setClassicScale(activeClassicScale);
  renderEverything(session.getState());
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  if (session.getState().activeDialogue && handleDialogueKey(event)) {
    return;
  }

  handleGameplayKey(event);
});

function isDialogueAdvanceKey(key: string): boolean {
  return DIALOGUE_ADVANCE_KEYS.has(key);
}

function isGameplayKey(key: string): boolean {
  return key in MOVEMENT_KEYS || key === "e" || key === "E" || key === "q" || key === "Q";
}

function isDialogueScrollKey(key: string): boolean {
  return DIALOGUE_SCROLL_KEYS.has(key);
}

function handleDialogueKey(event: KeyboardEvent): boolean {
  if (activeVisualMode === "classic-acs" && isDialogueScrollKey(event.key)) {
    event.preventDefault();
    scrollClassicDialogue(event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1);
    return true;
  }

  if (isDialogueAdvanceKey(event.key)) {
    event.preventDefault();
    advanceDialogue();
    return true;
  }

  if (isGameplayKey(event.key)) {
    event.preventDefault();
    return true;
  }

  return false;
}

function handleGameplayKey(event: KeyboardEvent): void {
  const direction = MOVEMENT_KEYS[event.key];
  if (direction) {
    event.preventDefault();
    runCommand(() => session.dispatch({ type: "move", direction }));
    return;
  }

  if (event.key === "e" || event.key === "E") {
    event.preventDefault();
    runCommand(() => session.dispatch({ type: "interact" }));
    return;
  }

  if (event.key === "q" || event.key === "Q") {
    event.preventDefault();
    runCommand(() => session.dispatch({ type: "inspect" }));
  }
}
void bootstrap();

async function bootstrap(): Promise<void> {
  appVersion.textContent = APP_VERSION;
  visualModeSelect.value = activeVisualMode;
  classicScaleSelect.value = String(activeClassicScale);
  eventHistory.push("Checking for a local save...");

  if (packageUrl) {
    await loadStandalonePackage(packageUrl);
  } else if (releaseId) {
    await loadPublishedRelease(releaseId);
  } else if (draftKey) {
    await loadDraftAdventure(draftKey);
  } else {
    sourceStatus.textContent = "Playing the built-in sample adventure.";
  }

  renderEverything(session.getState());

  try {
    const existing = await persistence.loadSession(saveSlotId);
    if (existing) {
      eventHistory.push(`Local save available from ${formatTimestamp(existing.savedAt)}. Press Load to restore it.`);
      setSaveStatus(`Local save available from ${formatTimestamp(existing.savedAt)}. Press Load to restore it.`);
    } else {
      setEmptySaveStatus();
    }
  } catch (error) {
    eventHistory.push(`Local save unavailable: ${toErrorMessage(error)}`);
    setSaveStatus(`Local save unavailable: ${toErrorMessage(error)}`);
  }

  renderEverything(session.getState());
}

async function loadStandalonePackage(rawPackageUrl: string): Promise<void> {
  try {
    const response = await fetch(rawPackageUrl);
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}.`);
    }

    const rawAdventure = (await response.json()) as RawAdventurePackage;
    const standaloneAdventure = readAdventurePackage(rawAdventure);
    activeRelease = null;
    activateAdventure(standaloneAdventure, `${standaloneAdventure.metadata.id}:standalone`);
    sourceStatus.textContent = "Playing a standalone exported adventure bundle.";
    eventHistory.push(`Loaded standalone package '${rawPackageUrl}'.`);
    setSaveStatus("Standalone bundle loaded. Local saves stay on this device.");
  } catch (error) {
    eventHistory.push(`Standalone package '${rawPackageUrl}' could not be loaded. Falling back to the sample adventure.`);
    sourceStatus.textContent = `Standalone package unavailable: ${toErrorMessage(error)}`;
    setSaveStatus(`Standalone package unavailable: ${toErrorMessage(error)}`);
  }
}

async function loadPublishedRelease(requestedReleaseId: string): Promise<void> {
  try {
    activeRelease = await projectApi.getRelease(requestedReleaseId);
    activateAdventure(activeRelease.package, `${activeRelease.package.metadata.id}:release:${activeRelease.id}`);
    sourceStatus.textContent = `Playing published release ${activeRelease.label} (${activeRelease.id}).`;
    eventHistory.push(`Loaded published release '${activeRelease.id}'.`);
    setSaveStatus(`Loaded published release ${activeRelease.label}.`);
  } catch (error) {
    eventHistory.push(`Release '${requestedReleaseId}' could not be loaded. Falling back to the sample adventure.`);
    sourceStatus.textContent = `Published release unavailable: ${toErrorMessage(error)}`;
    setSaveStatus(`Published release unavailable: ${toErrorMessage(error)}`);
  }
}

async function loadDraftAdventure(requestedDraftKey: string): Promise<void> {
  const draftRecord = await persistence.getDraft<AdventurePackage>(requestedDraftKey);
  if (draftRecord) {
    activeRelease = null;
    activateAdventure(draftRecord.value, `${draftRecord.value.metadata.id}:draft-playtest`);
    sourceStatus.textContent = `Playing local playtest draft ${requestedDraftKey}.`;
    eventHistory.push(`Loaded playtest draft '${requestedDraftKey}'.`);
    setSaveStatus(`Loaded playtest draft updated ${formatTimestamp(draftRecord.updatedAt)}.`);
    return;
  }

  eventHistory.push(`Draft '${requestedDraftKey}' was not found. Falling back to sample adventure.`);
  sourceStatus.textContent = `Draft ${requestedDraftKey} not found. Using the built-in sample adventure.`;
  setSaveStatus(`Draft '${requestedDraftKey}' was not found. Playing the sample adventure.`);
}

function activateAdventure(adventure: AdventurePackage, nextSaveSlotId: string): void {
  activeAdventure = adventure;
  saveSlotId = nextSaveSlotId;
  renderer = createRenderer(activeAdventure);
  session = engine.loadAdventure(activeAdventure);
}

function setEmptySaveStatus(): void {
  if (packageUrl) {
    setSaveStatus("No local save yet for this standalone bundle.");
    return;
  }

  if (releaseId) {
    setSaveStatus("No local save yet for this published release.");
    return;
  }

  if (draftKey) {
    setSaveStatus("No local save yet for this draft playtest.");
    return;
  }

  eventHistory.push("No local save found. Starting a fresh session.");
  setSaveStatus("No local save yet. Use Save to capture your progress.");
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
  objectiveText.textContent = summarizeCurrentObjective(state);
  presentationSummary.textContent = summarizePresentation(activeAdventure);
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

function summarizePresentation(adventure: AdventurePackage): string {
  const splash = adventure.presentation.splashAssetId ?? "no splash selected";
  const music = adventure.presentation.startingMusicAssetId ?? "no music selected";
  const intro = adventure.presentation.introText ?? adventure.metadata.description;
  return `${intro} Splash: ${splash}. Music: ${music}.`;
}
function summarizeCurrentObjective(state: Readonly<GameSessionState>): string {
  const quest = activeAdventure.questDefinitions[0];
  if (!quest) {
    return activeAdventure.metadata.description || "Explore the adventure.";
  }

  const objectives = quest.objectives.length > 0
    ? quest.objectives
    : (quest.stages ?? []).map((stage, index) => ({ id: `legacy_${index}`, title: stage, description: stage, kind: "story" as const }));
  const rawStage = state.questStages[quest.id] ?? 0;
  const stage = Math.max(0, Math.min(rawStage, objectives.length - 1));
  const objective = objectives[stage];
  const stageText = objective ? `${objective.title}: ${objective.description}` : quest.summary;
  const rewardText = quest.rewards?.length ? ` Rewards: ${quest.rewards.map((reward) => reward.label).join(", ")}.` : "";
  return `${quest.name}: ${stageText}. ${quest.summary}${rewardText}`;
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

const EVENT_DESCRIBERS: Record<EngineEvent["type"], (event: any) => string> = {
  playerMoved: (event) => `Moved to ${event.mapId} (${event.x}, ${event.y}).`,
  movementBlocked: (event) => describeMovementBlocked(event.reason),
  interactionTargetFound: (event) => `Interacted with ${event.entityId}.`,
  inspectResult: (event) => event.message,
  menuOpened: (event) => `Opened ${event.menu} menu.`,
  dialogueStarted: (event) => `Dialogue started: ${event.dialogueId}.`,
  dialogueAdvanced: (event) => `Dialogue advanced to ${event.nodeId}.`,
  dialogueEnded: (event) => `Dialogue ended: ${event.dialogueId}.`,
  triggerFired: (event) => `Trigger fired: ${event.triggerId}.`,
  flagSet: (event) => `Flag ${event.flag} set to ${String(event.value)}.`,
  itemGranted: (event) => `Received ${event.quantity} x ${event.itemId}.`,
  teleported: (event) => `Teleported to ${event.mapId} (${event.x}, ${event.y}).`,
  tileChanged: (event) => `Tile changed at ${event.mapId} (${event.x}, ${event.y}) to ${event.tileId}.`,
  mediaCuePlayed: (event) => `Media cue: ${mediaCueLabel(event.cueId)}.`,
  soundCuePlayed: (event) => `Sound cue: ${soundCueLabel(event.cueId)}.`,
  questStageSet: (event) => `Quest ${event.questId} advanced to stage ${event.stage}.`,
  turnEnded: (event) => `Turn advanced to ${event.turn}.`,
  commandIgnored: (event) => event.reason,
  enemyIntentChosen: (event) => `Enemy ${event.entityId} chose ${event.mode}:${event.action}.`,
  enemyMoved: (event) => `Enemy ${event.entityId} moved to (${event.x}, ${event.y}).`,
  enemyWaited: (event) => `Enemy ${event.entityId} waited. ${event.reason}`,
  enemyThreatened: (event) => `Enemy ${event.entityId} closes in and threatens the player.`
};

function describeEvent(event: EngineEvent): string {
  return EVENT_DESCRIBERS[event.type]?.(event) ?? `Unknown event: ${JSON.stringify(event)}`;
}

function describeMovementBlocked(reason: "bounds" | "occupied" | "terrain"): string {
  if (reason === "bounds") {
    return "Movement blocked by the map edge.";
  }
  if (reason === "terrain") {
    return "Movement blocked by terrain.";
  }
  return "Movement blocked by an entity.";
}

function createRenderer(adventure: AdventurePackage): CanvasGameRenderer {
  return new CanvasGameRenderer(canvas, adventure, {
    tileSize: 56,
    mode: activeVisualMode,
    classicScale: activeClassicScale
  });
}

function readVisualModePreference(): RuntimeVisualMode {
  return readVisualModeValue(window.localStorage.getItem(VISUAL_MODE_STORAGE_KEY));
}

function readVisualModeValue(value: string | null): RuntimeVisualMode {
  return value === "debug-grid" || value === "classic-acs" ? value : DEFAULT_VISUAL_MODE;
}

function readClassicScalePreference(): number {
  return readClassicScaleValue(window.localStorage.getItem(CLASSIC_SCALE_STORAGE_KEY));
}

function readClassicScaleValue(value: string | null): number {
  const parsed = Number(value);
  if (parsed === 1.5 || parsed === 2 || parsed === 2.5) {
    return parsed;
  }
  return DEFAULT_CLASSIC_SCALE;
}

function mediaCueLabel(cueId: string): string {
  const cue = activeAdventure.mediaCues.find((candidate) => candidate.id === cueId);
  return cue ? `${cue.name} (${cue.kind})` : cueId;
}

function soundCueLabel(cueId: string): string {
  const cue = activeAdventure.soundCues.find((candidate) => candidate.id === cueId);
  return cue ? `${cue.name} (${cue.kind})` : cueId;
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
