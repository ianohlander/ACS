import type { AdventurePackage, DialogueDefinition, MapDefinition } from "@acs/domain";

const meadowTiles = [
  "grass", "grass", "shrub", "grass", "grass", "grass", "grass", "grass",
  "grass", "path",  "path",  "path",  "grass", "grass", "grass", "grass",
  "grass", "path",  "grass", "path",  "grass", "grass", "grass", "grass",
  "grass", "path",  "grass", "path",  "grass", "grass", "shrub", "grass",
  "grass", "path",  "grass", "path",  "path",  "path",  "path",  "grass",
  "grass", "path",  "grass", "grass", "grass", "grass", "path",  "grass",
  "grass", "path",  "path",  "path",  "path",  "path",  "door",  "grass",
  "grass", "grass", "grass", "grass", "grass", "grass", "grass", "grass"
] as const;

const shrineTiles = [
  "stone", "stone", "stone", "stone", "stone", "stone",
  "stone", "floor", "floor", "floor", "floor", "stone",
  "stone", "floor", "floor", "floor", "altar", "stone",
  "stone", "floor", "floor", "floor", "floor", "stone",
  "stone", "floor", "floor", "floor", "floor", "stone",
  "stone", "door",  "stone", "stone", "stone", "stone"
] as const;

function createMap(
  id: MapDefinition["id"],
  name: string,
  width: number,
  height: number,
  tileIds: readonly string[],
  exits: MapDefinition["exits"],
  regionId?: MapDefinition["regionId"]
): MapDefinition {
  return {
    id,
    name,
    regionId,
    width,
    height,
    exits,
    tileLayers: [
      {
        id: `${id}_base`,
        name: "Base",
        width,
        height,
        tileIds: [...tileIds]
      }
    ]
  };
}

function createDialogue(id: DialogueDefinition["id"], speaker: string, text: string): DialogueDefinition {
  return {
    id,
    nodes: [
      {
        id: `${id}_node_1`,
        speaker,
        text,
        choices: [{ id: `${id}_close`, label: "Continue" }]
      }
    ]
  };
}

export const sampleAdventure: AdventurePackage = {
  schemaVersion: "1.0.0",
  metadata: {
    id: "adv_milestone3" as AdventurePackage["metadata"]["id"],
    slug: "milestone-3-demo",
    title: "Oracle of the Solar Seal",
    description: "A tiny milestone slice with movement, dialogue, triggers, and map travel.",
    author: "Codex",
    tags: ["demo", "milestone-3"]
  },
  assets: [],
  rules: {
    simulationMode: "turn-based",
    movementModel: "grid-step",
    combatModel: "simple-tactical",
    inventoryModel: "slotless"
  },
  regions: [
    {
      id: "region_meadow" as AdventurePackage["regions"][number]["id"],
      name: "Sun Meadow",
      description: "A bright clearing wrapped around an old shrine.",
      loreNotes: "The Oracle waits where paths cross.",
      sourceReferences: ["Prototype region"]
    },
    {
      id: "region_shrine" as AdventurePackage["regions"][number]["id"],
      name: "Inner Shrine",
      description: "A stone chamber holding a small golden seal.",
      loreNotes: "The seal glows once the vow has been accepted."
    }
  ],
  maps: [
    createMap(
      "map_meadow" as AdventurePackage["maps"][number]["id"],
      "Sun Meadow",
      8,
      8,
      meadowTiles,
      [
        {
          id: "exit_meadow_to_shrine",
          x: 6,
          y: 6,
          toMapId: "map_shrine" as AdventurePackage["maps"][number]["id"],
          toX: 1,
          toY: 4
        }
      ],
      "region_meadow" as AdventurePackage["regions"][number]["id"]
    ),
    createMap(
      "map_shrine" as AdventurePackage["maps"][number]["id"],
      "Inner Shrine",
      6,
      6,
      shrineTiles,
      [
        {
          id: "exit_shrine_to_meadow",
          x: 1,
          y: 5,
          toMapId: "map_meadow" as AdventurePackage["maps"][number]["id"],
          toX: 6,
          toY: 6
        }
      ],
      "region_shrine" as AdventurePackage["regions"][number]["id"]
    )
  ],
  entityDefinitions: [
    {
      id: "def_player" as AdventurePackage["entityDefinitions"][number]["id"],
      name: "Hero",
      kind: "player"
    },
    {
      id: "def_oracle" as AdventurePackage["entityDefinitions"][number]["id"],
      name: "Oracle",
      kind: "npc",
      behavior: "guard"
    }
  ],
  entityInstances: [
    {
      id: "entity_oracle" as AdventurePackage["entityInstances"][number]["id"],
      definitionId: "def_oracle" as AdventurePackage["entityDefinitions"][number]["id"],
      mapId: "map_meadow" as AdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2
    }
  ],
  itemDefinitions: [
    {
      id: "item_solar_seal" as AdventurePackage["itemDefinitions"][number]["id"],
      name: "Solar Seal",
      description: "A small gold disc warmed by shrine-light."
    }
  ],
  questDefinitions: [
    {
      id: "quest_solar_seal" as AdventurePackage["questDefinitions"][number]["id"],
      name: "Claim the Solar Seal",
      summary: "Hear the Oracle, cross into the shrine, then return with the seal.",
      stages: ["Unstarted", "Seek the shrine", "Return to the Oracle"],
      sourceReferences: ["Milestone 3 sample quest"]
    }
  ],
  dialogue: [
    createDialogue(
      "dialogue_intro" as AdventurePackage["dialogue"][number]["id"],
      "Oracle",
      "The shrine answers only those who step forward. Bring back the solar seal."
    ),
    createDialogue(
      "dialogue_shrine" as AdventurePackage["dialogue"][number]["id"],
      "Shrine",
      "The seal lifts free from the altar and settles into your hands."
    ),
    createDialogue(
      "dialogue_return" as AdventurePackage["dialogue"][number]["id"],
      "Oracle",
      "You returned with the seal. The path ahead is yours now."
    )
  ],
  triggers: [
    {
      id: "trigger_intro" as AdventurePackage["triggers"][number]["id"],
      type: "onInteractEntity",
      mapId: "map_meadow" as AdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2,
      conditions: [{ type: "flagEquals", flag: "quest_started", value: false }],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_intro" as AdventurePackage["dialogue"][number]["id"] },
        { type: "setFlag", flag: "quest_started", value: true },
        { type: "setFlag", flag: "quest_stage", value: 1 }
      ]
    },
    {
      id: "trigger_shrine_reward" as AdventurePackage["triggers"][number]["id"],
      type: "onEnterTile",
      mapId: "map_shrine" as AdventurePackage["maps"][number]["id"],
      x: 4,
      y: 2,
      runOnce: true,
      conditions: [{ type: "flagEquals", flag: "quest_started", value: true }],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_shrine" as AdventurePackage["dialogue"][number]["id"] },
        { type: "giveItem", itemId: "item_solar_seal" as AdventurePackage["itemDefinitions"][number]["id"], quantity: 1 },
        { type: "setFlag", flag: "quest_stage", value: 2 },
        { type: "changeTile", mapId: "map_shrine" as AdventurePackage["maps"][number]["id"], x: 4, y: 2, tileId: "altar-lit" }
      ]
    },
    {
      id: "trigger_return" as AdventurePackage["triggers"][number]["id"],
      type: "onInteractEntity",
      mapId: "map_meadow" as AdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2,
      conditions: [
        { type: "hasItem", itemId: "item_solar_seal" as AdventurePackage["itemDefinitions"][number]["id"], quantity: 1 },
        { type: "flagEquals", flag: "quest_complete", value: false }
      ],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_return" as AdventurePackage["dialogue"][number]["id"] },
        { type: "setFlag", flag: "quest_complete", value: true },
        { type: "setFlag", flag: "quest_stage", value: 3 }
      ]
    }
  ],
  startState: {
    mapId: "map_meadow" as AdventurePackage["maps"][number]["id"],
    x: 1,
    y: 1,
    party: ["def_player" as AdventurePackage["entityDefinitions"][number]["id"]],
    initialFlags: {
      quest_started: false,
      quest_complete: false,
      quest_stage: 0
    },
    initialQuestStages: {
      quest_solar_seal: 0
    }
  }
};
