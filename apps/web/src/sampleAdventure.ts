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
  libraryCategories: [
    { id: "lib_entities_people" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "People & Guides", description: "Player characters, oracles, informants, and other social actors." },
    { id: "lib_entities_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Creatures & Enemies", description: "Hostile or roaming creatures that can be placed on maps." },
    { id: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Relics", description: "Quest objects and mystical treasure." },
    { id: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Fieldcraft", description: "Exploration, tracking, and survival capabilities." },
    { id: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Mystic Arts", description: "Prophecy, wards, and shrine lore." },
    { id: "lib_flags_quest" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "flag", name: "Quest State Flags", description: "Boolean and numeric switches used by triggers." },
    { id: "lib_quests_main" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "quest", name: "Main Quests", description: "Primary authored objective chains." },
    { id: "lib_dialogue_oracle" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "dialogue", name: "Oracle & Shrine Scenes", description: "Conversation and narration records used by the Solar Seal quest." },
    { id: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Terrain & Special Cells", description: "Planned terrain categories for later tile definition editing." },
    { id: "lib_assets_classic" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "asset", name: "Classic ACS Visuals", description: "Visual manifest and future sprite assets for the retro presentation mode." }
  ],
  tileDefinitions: [
    {
      id: "grass" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Sun Grass",
      description: "Open meadow ground. Safe to walk on and useful as a neutral painting brush.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "A quiet patch of meadow grass.",
      tags: ["terrain", "outdoor"],
      classicSpriteId: "grass"
    },
    {
      id: "path" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Packed Path",
      description: "A walkable road tile that guides players toward authored destinations.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Footprints and worn dirt suggest this route matters.",
      tags: ["terrain", "road"],
      classicSpriteId: "path"
    },
    {
      id: "shrub" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Dense Shrub",
      description: "A blocked natural barrier for shaping paths without using walls.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "The branches are too dense to push through.",
      tags: ["terrain", "barrier", "outdoor"],
      classicSpriteId: "shrub"
    },
    {
      id: "stone" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Shrine Stone",
      description: "A blocked masonry tile used as shrine walls and hard map edges.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "Cold stone blocks the way.",
      tags: ["wall", "barrier", "interior"],
      classicSpriteId: "stone"
    },
    {
      id: "floor" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Shrine Floor",
      description: "Walkable interior flooring for chambers, halls, and ruins.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Smooth floor stones echo underfoot.",
      tags: ["terrain", "interior"],
      classicSpriteId: "floor"
    },
    {
      id: "altar" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Solar Altar",
      description: "A special walkable shrine tile that can fire reward triggers.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "conditional",
      interactionHint: "A ritual tile. Triggers can transform it when the quest state is right.",
      tags: ["special", "quest", "shrine"],
      classicSpriteId: "altar"
    },
    {
      id: "altar-lit" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Lit Solar Altar",
      description: "The altar after the Solar Seal has been claimed.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "conditional",
      interactionHint: "The altar glows with spent sunlight.",
      tags: ["special", "quest", "changed"],
      classicSpriteId: "altar-lit"
    },
    {
      id: "door" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Blue Door",
      description: "A passable doorway tile often paired with exits and portals.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Doors are good visual anchors for map exits.",
      tags: ["portal", "door"],
      classicSpriteId: "door"
    },
    {
      id: "water" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Deep Water",
      description: "A blocked hazard tile for lakes, moats, canals, and sci-fi coolant channels.",
      categoryId: "lib_tiles_terrain" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "You need a bridge, boat, spell, or future rule to cross.",
      tags: ["hazard", "barrier", "water"],
      classicSpriteId: "water"
    }
  ],  entityDefinitions: [
    {
      id: "def_player" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Hero",
      kind: "player",
      placement: "singleton",
      assetId: "sprite_hero" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: {
        stats: { life: 12, power: 4, speed: 3 },
        skillIds: ["skill_omen_reading", "skill_pathfinding"] as RawAdventurePackage["skillDefinitions"][number]["id"][]
      },
      startingPossessions: [
        { itemId: "item_oracle_charm" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }
      ]
    },
    {
      id: "def_oracle" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Oracle",
      kind: "npc",
      placement: "singleton",
      assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: {
        stats: { life: 8, power: 9, speed: 1 },
        skillIds: ["skill_prophecy", "skill_warding"] as RawAdventurePackage["skillDefinitions"][number]["id"][]
      },
      behavior: "guard"
    },
    {
      id: "def_wolf" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Shrine Wolf",
      kind: "enemy",
      placement: "multiple",
      assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      faction: "wild",
      profile: {
        stats: { life: 6, power: 3, speed: 4 },
        skillIds: ["skill_tracking", "skill_ambush"] as RawAdventurePackage["skillDefinitions"][number]["id"][]
      },
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
      id: "item_oracle_charm" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Oracle Charm",
      description: "A starter keepsake that marks the hero as one of the Oracle's chosen.",
      categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    },
    {
      id: "item_solar_seal" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Solar Seal",
      description: "A small gold disc warmed by shrine-light.",
      categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    }
  ],
  skillDefinitions: [
    { id: "skill_omen_reading" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Omen Reading", description: "Interprets shrine signs and prophetic warnings.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_pathfinding" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Pathfinding", description: "Finds safe paths through wild maps and ruins.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_prophecy" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Prophecy", description: "Speaks future-facing clues through dialogue and quest text.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_warding" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Warding", description: "Protective shrine magic used by guardians and priests.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_tracking" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Tracking", description: "Follows nearby prey or intruders.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_ambush" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Ambush", description: "Waits near paths and pressures careless movement.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] }
  ],
  traitDefinitions: [],
  spellDefinitions: [],
  flagDefinitions: [
    { id: "quest_started" as RawAdventurePackage["flagDefinitions"][number]["id"], name: "Quest Started", description: "The Oracle has given the shrine task.", categoryId: "lib_flags_quest" as RawAdventurePackage["libraryCategories"][number]["id"], defaultValue: false },
    { id: "quest_complete" as RawAdventurePackage["flagDefinitions"][number]["id"], name: "Quest Complete", description: "The hero has returned to the Oracle with the Solar Seal.", categoryId: "lib_flags_quest" as RawAdventurePackage["libraryCategories"][number]["id"], defaultValue: false },
    { id: "quest_stage" as RawAdventurePackage["flagDefinitions"][number]["id"], name: "Quest Stage", description: "Numeric shorthand mirrored by triggers for the Solar Seal quest.", categoryId: "lib_flags_quest" as RawAdventurePackage["libraryCategories"][number]["id"], defaultValue: 0 }
  ],
  customLibraryObjects: [],
  questDefinitions: [
    {
      id: "quest_solar_seal" as RawAdventurePackage["questDefinitions"][number]["id"],
      name: "Claim the Solar Seal",
      summary: "Hear the Oracle, cross into the shrine, then return with the seal.",
      categoryId: "lib_quests_main" as RawAdventurePackage["libraryCategories"][number]["id"],
      stages: ["Unstarted", "Seek the shrine", "Return to the Oracle"],
      sourceReferences: ["Milestone 5 sample quest"]
    }
  ],
  dialogue: [
    {
      id: "dialogue_intro" as RawAdventurePackage["dialogue"][number]["id"],
      categoryId: "lib_dialogue_oracle" as RawAdventurePackage["libraryCategories"][number]["id"],
      speaker: "Oracle",
      text: "The shrine answers only those who step forward. Bring back the solar seal, and mind the wolf in the meadow."
    },
    {
      id: "dialogue_shrine" as RawAdventurePackage["dialogue"][number]["id"],
      categoryId: "lib_dialogue_oracle" as RawAdventurePackage["libraryCategories"][number]["id"],
      speaker: "Shrine",
      text: "The seal lifts free from the altar and settles into your hands."
    },
    {
      id: "dialogue_return" as RawAdventurePackage["dialogue"][number]["id"],
      categoryId: "lib_dialogue_oracle" as RawAdventurePackage["libraryCategories"][number]["id"],
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
