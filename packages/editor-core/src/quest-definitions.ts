import type {
  AdventurePackage,
  QuestDefinition,
  QuestObjectiveDefinition,
  QuestRewardDefinition
} from "@acs/domain";

export interface CreateQuestDefinitionInput {
  idSeed: string;
  name: string;
  summary?: string;
  categoryId?: QuestDefinition["categoryId"];
  objectives?: QuestObjectiveDefinition[];
  rewards?: QuestRewardDefinition[];
  sourceReferences?: string[];
}

export function listQuestDefinitions(pkg: AdventurePackage): QuestDefinition[] {
  return [...(pkg.questDefinitions ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function createQuestDefinition(pkg: AdventurePackage, input: CreateQuestDefinitionInput): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const id = createQuestDefinitionId(next, questIdSeed(input));
  next.questDefinitions = [...(next.questDefinitions ?? []), sanitizeQuestDefinition(createQuestDefinitionValue(id, input))];
  next.startState.initialQuestStages = { ...(next.startState.initialQuestStages ?? {}), [id]: 0 };
  return next;
}

export function updateQuestDefinition(
  pkg: AdventurePackage,
  questId: QuestDefinition["id"],
  updates: Partial<QuestDefinition>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const definition = next.questDefinitions.find((candidate) => candidate.id === questId);
  if (!definition) {
    return next;
  }

  Object.assign(definition, sanitizeQuestDefinition({ ...definition, ...updates }));
  return next;
}

export function createQuestObjectiveDefinition(
  quest: QuestDefinition,
  title: string,
  kind: QuestObjectiveDefinition["kind"] = "story"
): QuestObjectiveDefinition {
  const id = createNestedQuestObjectId(quest.objectives, title || "objective", "objective");
  return sanitizeQuestObjectiveDefinition({
    id,
    title: title || "New Objective",
    description: title || "Describe the objective.",
    kind,
    completionStage: quest.objectives.length
  });
}

export function createQuestRewardDefinition(
  quest: QuestDefinition,
  label: string,
  kind: QuestRewardDefinition["kind"] = "story"
): QuestRewardDefinition {
  const id = createNestedQuestObjectId(quest.rewards ?? [], label || "reward", "reward");
  return sanitizeQuestRewardDefinition({
    id,
    label: label || "New Reward",
    kind,
    description: label || "Describe the reward."
  });
}

function createQuestDefinitionValue(id: QuestDefinition["id"], input: CreateQuestDefinitionInput): QuestDefinition {
  const definition: QuestDefinition = {
    id,
    name: input.name,
    summary: input.summary ?? "New quest.",
    objectives: input.objectives ?? [createInitialQuestObjective()],
    rewards: input.rewards ?? [],
    sourceReferences: input.sourceReferences ?? []
  };
  if (input.categoryId) {
    definition.categoryId = input.categoryId;
  }
  return definition;
}

function createInitialQuestObjective(): QuestObjectiveDefinition {
  return {
    id: "objective_1",
    title: "Begin the quest",
    description: "Begin the quest.",
    kind: "story",
    completionStage: 0
  };
}

function sanitizeQuestDefinition(definition: QuestDefinition): QuestDefinition {
  const objectives = (definition.objectives ?? []).map((objective, index) => sanitizeQuestObjectiveDefinition(objective, index));
  const sanitized: QuestDefinition = {
    id: definition.id,
    name: definition.name.trim() || String(definition.id),
    summary: definition.summary.trim(),
    objectives: objectives.length > 0 ? objectives : [createInitialQuestObjective()],
    rewards: (definition.rewards ?? []).map((reward) => sanitizeQuestRewardDefinition(reward)),
    sourceReferences: (definition.sourceReferences ?? []).map((reference) => reference.trim()).filter((reference) => reference.length > 0)
  };
  if (definition.categoryId) {
    sanitized.categoryId = definition.categoryId;
  }
  if (definition.stages && definition.stages.length > 0) {
    sanitized.stages = definition.stages.map((stage) => stage.trim()).filter((stage) => stage.length > 0);
  }
  return sanitized;
}

function sanitizeQuestObjectiveDefinition(
  objective: QuestObjectiveDefinition,
  index = objective.completionStage ?? 0
): QuestObjectiveDefinition {
  const sanitized: QuestObjectiveDefinition = {
    id: objective.id.trim() || `objective_${index + 1}`,
    title: objective.title.trim() || `Objective ${index + 1}`,
    description: objective.description.trim() || objective.title.trim() || `Objective ${index + 1}`,
    kind: objective.kind ?? "story",
    completionStage: Math.max(0, Math.floor(objective.completionStage ?? index))
  };
  if (objective.categoryId) {
    sanitized.categoryId = objective.categoryId;
  }
  if (objective.targetMapId) {
    sanitized.targetMapId = objective.targetMapId;
  }
  if (objective.targetItemId) {
    sanitized.targetItemId = objective.targetItemId;
  }
  return sanitized;
}

function sanitizeQuestRewardDefinition(reward: QuestRewardDefinition): QuestRewardDefinition {
  const sanitized: QuestRewardDefinition = {
    id: reward.id.trim() || "reward_1",
    label: reward.label.trim() || "Reward",
    kind: reward.kind ?? "story"
  };
  if (reward.description?.trim()) {
    sanitized.description = reward.description.trim();
  }
  if (reward.itemId) {
    sanitized.itemId = reward.itemId;
  }
  if (reward.quantity !== undefined) {
    sanitized.quantity = Math.max(1, Math.floor(reward.quantity));
  }
  return sanitized;
}

function createQuestDefinitionId(pkg: AdventurePackage, seed: string): QuestDefinition["id"] {
  const baseSlug = slugify(seed || "quest");
  const existingIds = new Set((pkg.questDefinitions ?? []).map((definition) => definition.id));
  let index = 1;
  let candidate = `quest_${baseSlug}` as QuestDefinition["id"];

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `quest_${baseSlug}_${index}` as QuestDefinition["id"];
  }

  return candidate;
}

function createNestedQuestObjectId(values: Array<{ id: string }>, seed: string, prefix: string): string {
  const baseSlug = `${prefix}_${slugify(seed)}`;
  const existingIds = new Set(values.map((value) => value.id));
  let index = 1;
  let candidate = baseSlug;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${baseSlug}_${index}`;
  }

  return candidate;
}

function questIdSeed(input: CreateQuestDefinitionInput): string {
  return input.idSeed || input.name || "quest";
}

function cloneAdventurePackage(pkg: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(pkg)) as AdventurePackage;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "quest";
}