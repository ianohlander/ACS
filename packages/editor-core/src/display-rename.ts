import type { AdventurePackage } from "@acs/domain";

export type DisplayRenameScope =
  | "adventure"
  | "regions"
  | "maps"
  | "libraries"
  | "entities"
  | "items"
  | "tiles"
  | "quests"
  | "dialogue";

export interface DisplayRenameRequest {
  search: string;
  replacement: string;
  scopes?: DisplayRenameScope[];
  caseSensitive?: boolean;
}

export interface DisplayRenameMatch {
  scope: DisplayRenameScope;
  objectType: string;
  objectId: string;
  field: string;
  before: string;
  after: string;
}

type MatchCollector = (match: DisplayRenameMatch) => void;

const ALL_SCOPES: DisplayRenameScope[] = [
  "adventure",
  "regions",
  "maps",
  "libraries",
  "entities",
  "items",
  "tiles",
  "quests",
  "dialogue"
];

export function previewDisplayRename(pkg: AdventurePackage, request: DisplayRenameRequest): DisplayRenameMatch[] {
  const normalized = normalizeRenameRequest(request);
  if (!normalized) {
    return [];
  }

  const matches: DisplayRenameMatch[] = [];
  collectDisplayRenameMatches(pkg, normalized, (match) => matches.push(match));
  return matches;
}

export function applyDisplayRename(pkg: AdventurePackage, request: DisplayRenameRequest): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const normalized = normalizeRenameRequest(request);
  if (!normalized) {
    return next;
  }

  applyAdventureRename(next, normalized);
  applyRegionRenames(next, normalized);
  applyMapRenames(next, normalized);
  applyLibraryRenames(next, normalized);
  applyEntityRenames(next, normalized);
  applyItemRenames(next, normalized);
  applyTileRenames(next, normalized);
  applyQuestRenames(next, normalized);
  applyDialogueRenames(next, normalized);
  return next;
}

function collectDisplayRenameMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  collectAdventureMatches(pkg, request, collect);
  collectRegionMatches(pkg, request, collect);
  collectMapMatches(pkg, request, collect);
  collectLibraryMatches(pkg, request, collect);
  collectEntityMatches(pkg, request, collect);
  collectItemMatches(pkg, request, collect);
  collectTileMatches(pkg, request, collect);
  collectQuestMatches(pkg, request, collect);
  collectDialogueMatches(pkg, request, collect);
}

interface NormalizedRenameRequest {
  search: string;
  replacement: string;
  scopes: Set<DisplayRenameScope>;
  matcher: RegExp;
}

function normalizeRenameRequest(request: DisplayRenameRequest): NormalizedRenameRequest | undefined {
  const search = request.search.trim();
  if (!search) {
    return undefined;
  }

  return {
    search,
    replacement: request.replacement,
    scopes: new Set(request.scopes && request.scopes.length > 0 ? request.scopes : ALL_SCOPES),
    matcher: new RegExp(escapeRegExp(search), request.caseSensitive ? "g" : "gi")
  };
}

function collectAdventureMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  inspectField(request, collect, "adventure", "Adventure", pkg.metadata.id, "title", pkg.metadata.title);
  inspectField(request, collect, "adventure", "Adventure", pkg.metadata.id, "description", pkg.metadata.description);
  inspectField(request, collect, "adventure", "Presentation", pkg.metadata.id, "introText", pkg.presentation.introText);
}

function collectRegionMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const region of pkg.regions) {
    inspectField(request, collect, "regions", "Region", region.id, "name", region.name);
    inspectField(request, collect, "regions", "Region", region.id, "description", region.description);
    inspectField(request, collect, "regions", "Region", region.id, "loreNotes", region.loreNotes);
  }
}

function collectMapMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const map of pkg.maps) {
    inspectField(request, collect, "maps", "Map", map.id, "name", map.name);
  }
}

function collectLibraryMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const category of pkg.libraryCategories) {
    inspectField(request, collect, "libraries", "Library Category", category.id, "name", category.name);
    inspectField(request, collect, "libraries", "Library Category", category.id, "description", category.description);
  }
}

function collectEntityMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const definition of pkg.entityDefinitions) {
    inspectField(request, collect, "entities", "Entity Definition", definition.id, "name", definition.name);
    inspectField(request, collect, "entities", "Entity Definition", definition.id, "faction", definition.faction);
  }
  for (const instance of pkg.entityInstances) {
    inspectField(request, collect, "entities", "Entity Instance", instance.id, "displayName", instance.displayName);
  }
}

function collectItemMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const item of pkg.itemDefinitions) {
    inspectField(request, collect, "items", "Item", item.id, "name", item.name);
    inspectField(request, collect, "items", "Item", item.id, "description", item.description);
  }
}

function collectTileMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const tile of pkg.tileDefinitions) {
    inspectField(request, collect, "tiles", "Tile", tile.id, "name", tile.name);
    inspectField(request, collect, "tiles", "Tile", tile.id, "description", tile.description);
    inspectField(request, collect, "tiles", "Tile", tile.id, "interactionHint", tile.interactionHint);
  }
}

function collectQuestMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const quest of pkg.questDefinitions) {
    inspectField(request, collect, "quests", "Quest", quest.id, "name", quest.name);
    inspectField(request, collect, "quests", "Quest", quest.id, "summary", quest.summary);
    quest.objectives.forEach((objective) => {
      inspectField(request, collect, "quests", "Quest Objective", `${quest.id}/${objective.id}`, "title", objective.title);
      inspectField(request, collect, "quests", "Quest Objective", `${quest.id}/${objective.id}`, "description", objective.description);
    });
    quest.rewards?.forEach((reward) => {
      inspectField(request, collect, "quests", "Quest Reward", `${quest.id}/${reward.id}`, "label", reward.label);
      inspectField(request, collect, "quests", "Quest Reward", `${quest.id}/${reward.id}`, "description", reward.description);
    });
  }
}

function collectDialogueMatches(pkg: AdventurePackage, request: NormalizedRenameRequest, collect: MatchCollector): void {
  for (const dialogue of pkg.dialogue) {
    dialogue.nodes.forEach((node) => {
      inspectField(request, collect, "dialogue", "Dialogue Node", `${dialogue.id}/${node.id}`, "speaker", node.speaker);
      inspectField(request, collect, "dialogue", "Dialogue Node", `${dialogue.id}/${node.id}`, "text", node.text);
      node.choices?.forEach((choice) => inspectField(request, collect, "dialogue", "Dialogue Choice", `${dialogue.id}/${node.id}/${choice.id}`, "label", choice.label));
    });
  }
}

function inspectField(
  request: NormalizedRenameRequest,
  collect: MatchCollector,
  scope: DisplayRenameScope,
  objectType: string,
  objectId: string,
  field: string,
  value: string | undefined
): void {
  if (!value || !request.scopes.has(scope) || !request.matcher.test(value)) {
    request.matcher.lastIndex = 0;
    return;
  }

  request.matcher.lastIndex = 0;
  collect({
    scope,
    objectType,
    objectId,
    field,
    before: value,
    after: value.replace(request.matcher, request.replacement)
  });
  request.matcher.lastIndex = 0;
}

function applyAdventureRename(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("adventure")) {
    return;
  }
  pkg.metadata.title = renameText(pkg.metadata.title, request);
  pkg.metadata.description = renameText(pkg.metadata.description, request);
  renameOptionalField(pkg.presentation, "introText", pkg.presentation.introText, request);
}

function applyRegionRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("regions")) {
    return;
  }
  for (const region of pkg.regions) {
    region.name = renameText(region.name, request);
    region.description = renameText(region.description, request);
    renameOptionalField(region, "loreNotes", region.loreNotes, request);
  }
}

function applyMapRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("maps")) {
    return;
  }
  for (const map of pkg.maps) {
    map.name = renameText(map.name, request);
  }
}

function applyLibraryRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("libraries")) {
    return;
  }
  for (const category of pkg.libraryCategories) {
    category.name = renameText(category.name, request);
    renameOptionalField(category, "description", category.description, request);
  }
}

function applyEntityRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("entities")) {
    return;
  }
  for (const definition of pkg.entityDefinitions) {
    definition.name = renameText(definition.name, request);
    renameOptionalField(definition, "faction", definition.faction, request);
  }
  for (const instance of pkg.entityInstances) {
    renameOptionalField(instance, "displayName", instance.displayName, request);
  }
}

function applyItemRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("items")) {
    return;
  }
  for (const item of pkg.itemDefinitions) {
    item.name = renameText(item.name, request);
    item.description = renameText(item.description, request);
  }
}

function applyTileRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("tiles")) {
    return;
  }
  for (const tile of pkg.tileDefinitions) {
    tile.name = renameText(tile.name, request);
    tile.description = renameText(tile.description, request);
    renameOptionalField(tile, "interactionHint", tile.interactionHint, request);
  }
}

function applyQuestRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("quests")) {
    return;
  }
  for (const quest of pkg.questDefinitions) {
    quest.name = renameText(quest.name, request);
    quest.summary = renameText(quest.summary, request);
    quest.objectives.forEach((objective) => {
      objective.title = renameText(objective.title, request);
      objective.description = renameText(objective.description, request);
    });
    quest.rewards?.forEach((reward) => {
      reward.label = renameText(reward.label, request);
      renameOptionalField(reward, "description", reward.description, request);
    });
  }
}

function applyDialogueRenames(pkg: AdventurePackage, request: NormalizedRenameRequest): void {
  if (!request.scopes.has("dialogue")) {
    return;
  }
  for (const dialogue of pkg.dialogue) {
    dialogue.nodes.forEach((node) => {
      renameOptionalField(node, "speaker", node.speaker, request);
      node.text = renameText(node.text, request);
      node.choices?.forEach((choice) => {
        choice.label = renameText(choice.label, request);
      });
    });
  }
}

function renameText(value: string, request: NormalizedRenameRequest): string {
  request.matcher.lastIndex = 0;
  return value.replace(request.matcher, request.replacement);
}

function renameOptionalField<T extends object>(target: T, field: keyof T, value: string | undefined, request: NormalizedRenameRequest): void {
  if (value === undefined) {
    delete target[field];
    return;
  }

  (target as Record<string, string>)[String(field)] = renameText(value, request);
}

function cloneAdventurePackage(pkg: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(pkg)) as AdventurePackage;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
