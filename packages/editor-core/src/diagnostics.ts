import type {
  Action,
  AdventurePackage,
  EntityBehaviorProfile,
  EntityDefinition,
  MapDefinition,
  TriggerDefinition
} from "@acs/domain";

export type AuthoringDiagnosticArea =
  | "triggers"
  | "entities"
  | "flags"
  | "inventory"
  | "quests"
  | "exits"
  | "maps"
  | "playtest";

export type AuthoringDiagnosticSeverity = "info" | "warning" | "error";

export interface AuthoringDiagnostic {
  area: AuthoringDiagnosticArea;
  severity: AuthoringDiagnosticSeverity;
  message: string;
  reference?: string;
}

export interface PlaytestScenario {
  id: string;
  name: string;
  startMapId: MapDefinition["id"];
  x: number;
  y: number;
  goal: string;
  checks: string[];
}

export interface AuthoringDiagnosticsSummary {
  triggerCount: number;
  mapTriggerCount: number;
  exitCount: number;
  entityCount: number;
  enemyCount: number;
  flaggedStateCount: number;
  inventoryItemCount: number;
  questCount: number;
  scenarioCount: number;
  warningCount: number;
  errorCount: number;
}

export interface AuthoringDiagnosticsReport {
  summary: AuthoringDiagnosticsSummary;
  diagnostics: AuthoringDiagnostic[];
  scenarios: PlaytestScenario[];
}

export function createAuthoringDiagnostics(pkg: AdventurePackage): AuthoringDiagnosticsReport {
  const diagnostics = collectDiagnostics(pkg);
  const scenarios = createPlaytestScenarios(pkg);
  return {
    summary: summarizeDiagnostics(pkg, diagnostics, scenarios),
    diagnostics,
    scenarios
  };
}

function collectDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  return [
    ...buildTriggerDiagnostics(pkg),
    ...buildEntityDiagnostics(pkg),
    ...buildStateDiagnostics(pkg),
    ...buildExitDiagnostics(pkg),
    ...buildQuestDiagnostics(pkg)
  ];
}

function summarizeDiagnostics(
  pkg: AdventurePackage,
  diagnostics: AuthoringDiagnostic[],
  scenarios: PlaytestScenario[]
): AuthoringDiagnosticsSummary {
  return {
    triggerCount: pkg.triggers.length,
    mapTriggerCount: pkg.triggers.filter((trigger) => trigger.mapId).length,
    exitCount: pkg.maps.reduce((total, map) => total + map.exits.length, 0),
    entityCount: pkg.entityInstances.length,
    enemyCount: pkg.entityDefinitions.filter((definition) => definition.kind === "enemy").length,
    flaggedStateCount: Object.keys(pkg.startState.initialFlags ?? {}).length,
    inventoryItemCount: pkg.itemDefinitions.length,
    questCount: pkg.questDefinitions.length,
    scenarioCount: scenarios.length,
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  };
}

function buildTriggerDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  const diagnostics = pkg.triggers.map((trigger) => describeTrigger(trigger));
  if (!pkg.triggers.some((trigger) => hasAction(trigger, "giveItem"))) {
    diagnostics.push(warning("triggers", "No trigger currently grants an item reward."));
  }
  if (!pkg.triggers.some((trigger) => hasAction(trigger, "teleport"))) {
    diagnostics.push(info("triggers", "No authored teleport action yet; exits currently handle map travel."));
  }
  return diagnostics;
}

function describeTrigger(trigger: TriggerDefinition): AuthoringDiagnostic {
  if (trigger.actions.length === 0) {
    return warning("triggers", `${trigger.id} has no actions.`, trigger.id);
  }

  const effects = trigger.actions.map((action) => action.type).join(", ");
  const location = trigger.mapId ? ` at ${trigger.mapId} (${trigger.x ?? "?"}, ${trigger.y ?? "?"})` : "";
  return info("triggers", `${trigger.id} fires ${effects}${location}.`, trigger.id);
}

function hasAction(trigger: TriggerDefinition, actionType: Action["type"]): boolean {
  return trigger.actions.some((action) => action.type === actionType);
}

function buildEntityDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  const diagnostics = pkg.entityDefinitions.map((definition) => describeEntityDefinition(definition));
  for (const definition of pkg.entityDefinitions) {
    const behavior = readBehaviorProfile(definition);
    if (behavior?.turnInterval && behavior.turnInterval <= 1) {
      diagnostics.push(warning("entities", `${definition.name} acts every player move and may feel sticky.`, definition.id));
    }
  }
  return diagnostics;
}

function describeEntityDefinition(definition: EntityDefinition): AuthoringDiagnostic {
  const placement = definition.placement ?? "multiple";
  const behavior = readBehaviorProfile(definition);
  const behaviorLabel = behavior?.mode ?? definition.behavior ?? "idle";
  return info("entities", `${definition.name} is a ${definition.kind}, placement ${placement}, behavior ${behaviorLabel}.`, definition.id);
}

function readBehaviorProfile(definition: EntityDefinition): EntityBehaviorProfile | undefined {
  return typeof definition.behavior === "object" ? definition.behavior : undefined;
}

function buildStateDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  const diagnostics: AuthoringDiagnostic[] = [];
  diagnostics.push(info("flags", `Initial flags: ${Object.keys(pkg.startState.initialFlags ?? {}).join(", ") || "none"}.`));
  diagnostics.push(info("inventory", `Defined item objects available to triggers and actors: ${pkg.itemDefinitions.length}.`));
  return diagnostics;
}

function buildExitDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  return pkg.maps.flatMap((map) => map.exits.map((exit) => {
    const target = pkg.maps.find((candidate) => candidate.id === exit.toMapId);
    const targetName = target?.name ?? exit.toMapId;
    return info("exits", `${map.name} (${exit.x}, ${exit.y}) links to ${targetName} (${exit.toX}, ${exit.toY}).`, exit.id);
  }));
}

function buildQuestDiagnostics(pkg: AdventurePackage): AuthoringDiagnostic[] {
  return pkg.questDefinitions.map((quest) => {
    const objectiveCount = quest.objectives.length;
    const rewardCount = quest.rewards?.length ?? 0;
    return info("quests", `${quest.name} has ${objectiveCount} objective object(s) and ${rewardCount} reward object(s).`, quest.id);
  });
}

function createPlaytestScenarios(pkg: AdventurePackage): PlaytestScenario[] {
  return [
    createStartScenario(pkg),
    createTriggerScenario(pkg),
    createExitScenario(pkg),
    createQuestScenario(pkg)
  ].filter((scenario): scenario is PlaytestScenario => Boolean(scenario));
}

function createStartScenario(pkg: AdventurePackage): PlaytestScenario {
  return {
    id: "scenario_start_state",
    name: "Start State Smoke Test",
    startMapId: pkg.startState.mapId,
    x: pkg.startState.x,
    y: pkg.startState.y,
    goal: "Confirm the player starts on the intended map with initial flags and quest stages loaded.",
    checks: ["Current map matches start state", "Player coordinates match start state", "Initial flags are present"]
  };
}

function createTriggerScenario(pkg: AdventurePackage): PlaytestScenario | undefined {
  const rewardTrigger = pkg.triggers.find((trigger) => hasAction(trigger, "giveItem")) ?? pkg.triggers[0];
  if (!rewardTrigger?.mapId) {
    return undefined;
  }
  return {
    id: "scenario_trigger_chain",
    name: "Trigger Chain Smoke Test",
    startMapId: rewardTrigger.mapId,
    x: rewardTrigger.x ?? pkg.startState.x,
    y: rewardTrigger.y ?? pkg.startState.y,
    goal: `Exercise ${rewardTrigger.id} and verify its authored effects appear in runtime events.`,
    checks: rewardTrigger.actions.map((action) => `Runtime emits ${action.type}`)
  };
}

function createExitScenario(pkg: AdventurePackage): PlaytestScenario | undefined {
  const map = pkg.maps.find((candidate) => candidate.exits.length > 0);
  const exit = map?.exits[0];
  if (!map || !exit) {
    return undefined;
  }
  return {
    id: "scenario_exit_graph",
    name: "Exit Graph Smoke Test",
    startMapId: map.id,
    x: exit.x,
    y: exit.y,
    goal: `Step onto ${exit.id} and verify travel to ${exit.toMapId}.`,
    checks: ["Exit tile is reachable", "Runtime emits teleported", "Destination coordinates match exit target"]
  };
}

function createQuestScenario(pkg: AdventurePackage): PlaytestScenario | undefined {
  const quest = pkg.questDefinitions[0];
  if (!quest) {
    return undefined;
  }
  return {
    id: "scenario_quest_state",
    name: "Quest State Smoke Test",
    startMapId: pkg.startState.mapId,
    x: pkg.startState.x,
    y: pkg.startState.y,
    goal: `Verify ${quest.name} advances through authored objective stages.`,
    checks: quest.objectives.map((objective) => `${objective.title}: ${objective.description}`)
  };
}

function info(area: AuthoringDiagnosticArea, message: string, reference?: string): AuthoringDiagnostic {
  return createDiagnostic(area, "info", message, reference);
}

function warning(area: AuthoringDiagnosticArea, message: string, reference?: string): AuthoringDiagnostic {
  return createDiagnostic(area, "warning", message, reference);
}

function createDiagnostic(
  area: AuthoringDiagnosticArea,
  severity: AuthoringDiagnosticSeverity,
  message: string,
  reference?: string
): AuthoringDiagnostic {
  return { area, severity, message, reference };
}
