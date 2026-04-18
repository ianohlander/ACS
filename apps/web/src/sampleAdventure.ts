import type { RawAdventurePackage } from "@acs/content-schema";

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

const classicVisualManifest: RawAdventurePackage["visualManifests"][number] = {
  id: "classic_solar_seal_manifest",
  name: "Classic Solar Seal Sprite Set",
  mode: "classic-acs",
  tileSprites: {
    grass: { pattern: "dither", fill: "#00a020", shadow: "#003c12" },
    path: { pattern: "dither", fill: "#a15a12", shadow: "#5a2b0a" },
    shrub: { pattern: "shrub", fill: "#00a020", shadow: "#000000", accent: "#00ff48" },
    stone: { pattern: "dither", fill: "#6f6f6f", shadow: "#1f4fff" },
    floor: { pattern: "floor", fill: "#9a9a9a", shadow: "#000000" },
    altar: { pattern: "altar", fill: "#a15a12", accent: "#ffffff" },
    "altar-lit": { pattern: "altar", fill: "#f5d547", accent: "#ffffff" },
    door: { pattern: "door", fill: "#1f4fff", shadow: "#000000" },
    water: { pattern: "dither", fill: "#003cff", shadow: "#00145e" },
    void: { pattern: "solid", fill: "#000000" }
  },
  entitySprites: {
    sprite_hero: { pattern: "hero", fill: "#f5d547", line: "#000000" },
    sprite_oracle: { pattern: "oracle", fill: "#ffffff", accent: "#1f4fff", line: "#000000" },
    sprite_wolf: { pattern: "wolf", fill: "#bf4b45", accent: "#f5d547", line: "#000000" }
  },
  uiSprites: {
    solar_seal: { pattern: "seal", fill: "#f5d547", accent: "#ffffff", line: "#000000" }
  }
};
export const sampleAdventureData: RawAdventurePackage = {
  schemaVersion: "1.0.0",
  metadata: {
    id: "adv_milestone3" as RawAdventurePackage["metadata"]["id"],
    slug: "milestone-3-demo",
    title: "Oracle of the Solar Seal",
    description: "A tiny milestone slice with movement, dialogue, triggers, enemy behavior, and map travel.",
    author: "Codex",
    tags: ["demo", "milestone-5"]
  },
  assets: [],
  visualManifests: [classicVisualManifest],
  rules: {
    simulationMode: "turn-based",
    movementModel: "grid-step",
    combatModel: "simple-tactical",
    inventoryModel: "slotless"
  },
  regions: [
    {
      id: "region_meadow" as RawAdventurePackage["regions"][number]["id"],
      name: "Sun Meadow",
      description: "A bright clearing wrapped around an old shrine.",
      loreNotes: "The Oracle waits where paths cross.",
      sourceReferences: ["Prototype region"]
    },
    {
      id: "region_shrine" as RawAdventurePackage["regions"][number]["id"],
      name: "Inner Shrine",
      description: "A stone chamber holding a small golden seal.",
      loreNotes: "The seal glows once the vow has been accepted."
    }
  ],
  maps: [
    {
      id: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
      name: "Sun Meadow",
      kind: "local",
      width: 8,
      height: 8,
      regionId: "region_meadow" as RawAdventurePackage["regions"][number]["id"],
      exits: [
        {
          id: "exit_meadow_to_shrine",
          x: 6,
          y: 6,
          toMapId: "map_shrine" as RawAdventurePackage["maps"][number]["id"],
          toX: 1,
          toY: 4
        }
      ],
      tileIds: meadowTiles
    },
    {
      id: "map_shrine" as RawAdventurePackage["maps"][number]["id"],
      name: "Inner Shrine",
      kind: "interior",
      width: 6,
      height: 6,
      regionId: "region_shrine" as RawAdventurePackage["regions"][number]["id"],
      exits: [
        {
          id: "exit_shrine_to_meadow",
          x: 1,
          y: 5,
          toMapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
          toX: 6,
          toY: 6
        }
      ],
      tileIds: shrineTiles
    }
  ],
  entityDefinitions: [
    {
      id: "def_player" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Hero",
      kind: "player",
      placement: "singleton",
      assetId: "sprite_hero" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>
    },
    {
      id: "def_oracle" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Oracle",
      kind: "npc",
      placement: "singleton",
      assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      behavior: "guard"
    },
    {
      id: "def_wolf" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Shrine Wolf",
      kind: "enemy",
      placement: "multiple",
      assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      faction: "wild",
      behavior: {
        mode: "pursue",
        detectionRange: 4,
        leashRange: 6,
        turnInterval: 3
      }
    }
  ],
  entityInstances: [
    {
      id: "entity_oracle" as RawAdventurePackage["entityInstances"][number]["id"],
      definitionId: "def_oracle" as RawAdventurePackage["entityDefinitions"][number]["id"],
      mapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2
    },
    {
      id: "entity_wolf" as RawAdventurePackage["entityInstances"][number]["id"],
      definitionId: "def_wolf" as RawAdventurePackage["entityDefinitions"][number]["id"],
      mapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
      x: 5,
      y: 4
    }
  ],
  itemDefinitions: [
    {
      id: "item_solar_seal" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Solar Seal",
      description: "A small gold disc warmed by shrine-light."
    }
  ],
  questDefinitions: [
    {
      id: "quest_solar_seal" as RawAdventurePackage["questDefinitions"][number]["id"],
      name: "Claim the Solar Seal",
      summary: "Hear the Oracle, cross into the shrine, then return with the seal.",
      stages: ["Unstarted", "Seek the shrine", "Return to the Oracle"],
      sourceReferences: ["Milestone 5 sample quest"]
    }
  ],
  dialogue: [
    {
      id: "dialogue_intro" as RawAdventurePackage["dialogue"][number]["id"],
      speaker: "Oracle",
      text: "The shrine answers only those who step forward. Bring back the solar seal, and mind the wolf in the meadow."
    },
    {
      id: "dialogue_shrine" as RawAdventurePackage["dialogue"][number]["id"],
      speaker: "Shrine",
      text: "The seal lifts free from the altar and settles into your hands."
    },
    {
      id: "dialogue_return" as RawAdventurePackage["dialogue"][number]["id"],
      speaker: "Oracle",
      text: "You returned with the seal. The path ahead is yours now."
    }
  ],
  triggers: [
    {
      id: "trigger_intro" as RawAdventurePackage["triggers"][number]["id"],
      type: "onInteractEntity",
      mapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2,
      conditions: [{ type: "flagEquals", flag: "quest_started", value: false }],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_intro" as RawAdventurePackage["dialogue"][number]["id"] },
        { type: "setFlag", flag: "quest_started", value: true },
        { type: "setFlag", flag: "quest_stage", value: 1 }
      ]
    },
    {
      id: "trigger_shrine_reward" as RawAdventurePackage["triggers"][number]["id"],
      type: "onEnterTile",
      mapId: "map_shrine" as RawAdventurePackage["maps"][number]["id"],
      x: 4,
      y: 2,
      runOnce: true,
      conditions: [{ type: "flagEquals", flag: "quest_started", value: true }],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_shrine" as RawAdventurePackage["dialogue"][number]["id"] },
        { type: "giveItem", itemId: "item_solar_seal" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 },
        { type: "setFlag", flag: "quest_stage", value: 2 },
        { type: "changeTile", mapId: "map_shrine" as RawAdventurePackage["maps"][number]["id"], x: 4, y: 2, tileId: "altar-lit" }
      ]
    },
    {
      id: "trigger_return" as RawAdventurePackage["triggers"][number]["id"],
      type: "onInteractEntity",
      mapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
      x: 3,
      y: 2,
      conditions: [
        { type: "hasItem", itemId: "item_solar_seal" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 },
        { type: "flagEquals", flag: "quest_complete", value: false }
      ],
      actions: [
        { type: "showDialogue", dialogueId: "dialogue_return" as RawAdventurePackage["dialogue"][number]["id"] },
        { type: "setFlag", flag: "quest_complete", value: true },
        { type: "setFlag", flag: "quest_stage", value: 3 }
      ]
    }
  ],
  startState: {
    mapId: "map_meadow" as RawAdventurePackage["maps"][number]["id"],
    x: 1,
    y: 1,
    party: ["def_player" as RawAdventurePackage["entityDefinitions"][number]["id"]],
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
