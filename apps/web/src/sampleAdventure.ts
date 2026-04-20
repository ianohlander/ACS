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


const solarGatePixels = [
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 1, 2, 2, 2, 2, 1, 0,
  1, 2, 3, 3, 3, 3, 2, 1,
  1, 2, 3, 0, 0, 3, 2, 1,
  1, 2, 3, 0, 0, 3, 2, 1,
  1, 2, 3, 3, 3, 3, 2, 1,
  0, 1, 2, 2, 2, 2, 1, 0,
  0, 0, 1, 1, 1, 1, 0, 0
];

const dataCorePixels = [
  0, 4, 4, 0, 0, 4, 4, 0,
  4, 1, 1, 4, 4, 1, 1, 4,
  4, 1, 5, 5, 5, 5, 1, 4,
  0, 4, 5, 0, 0, 5, 4, 0,
  0, 4, 5, 0, 0, 5, 4, 0,
  4, 1, 5, 5, 5, 5, 1, 4,
  4, 1, 1, 4, 4, 1, 1, 4,
  0, 4, 4, 0, 0, 4, 4, 0
];

const cityMaskPixels = [
  0, 0, 6, 6, 6, 6, 0, 0,
  0, 6, 1, 1, 1, 1, 6, 0,
  6, 1, 0, 1, 1, 0, 1, 6,
  6, 1, 1, 1, 1, 1, 1, 6,
  0, 6, 1, 7, 7, 1, 6, 0,
  0, 0, 6, 1, 1, 6, 0, 0,
  0, 0, 0, 6, 6, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0
];
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
  },
  pixelSprites: [
    { id: "pixel_solar_gate", name: "Solar Gate Splash", usage: "splash", width: 8, height: 8, palette: ["#000000", "#f5d547", "#ffffff", "#a15a12", "#1f4fff", "#70d6ff", "#bf4b45", "#7c3aed"], pixels: solarGatePixels, tags: ["splash", "fantasy", "shrine"], genreTags: ["fantasy", "scienceFantasy"] },
    { id: "pixel_data_core", name: "Data Core Icon", usage: "item", width: 8, height: 8, palette: ["#000000", "#f5d547", "#ffffff", "#a15a12", "#1f4fff", "#70d6ff", "#bf4b45", "#7c3aed"], pixels: dataCorePixels, tags: ["sci-fi", "relic", "computer"], genreTags: ["scienceFiction", "scienceFantasy"] },
    { id: "pixel_city_mask", name: "City Mask Portrait", usage: "portrait", width: 8, height: 8, palette: ["#000000", "#f5d547", "#ffffff", "#a15a12", "#1f4fff", "#70d6ff", "#bf4b45", "#7c3aed"], pixels: cityMaskPixels, tags: ["urban", "hero", "mask"], genreTags: ["superhero", "modernSpy", "urbanFantasy"] }
  ]
};
export const sampleAdventureData: RawAdventurePackage = {
  schemaVersion: "1.0.0",
  metadata: {
    id: "adv_milestone3" as RawAdventurePackage["metadata"]["id"],
    slug: "milestone-3-demo",
    title: "Oracle of the Solar Seal",
    description: "A tiny milestone slice with movement, dialogue, triggers, enemy behavior, and map travel.",
    author: "Codex",
    tags: ["demo", "milestone-24", "starter-libraries"]
  },
  assets: [
    { id: "asset_splash_solar_gate" as RawAdventurePackage["assets"][number]["id"], kind: "splash", storageKey: "inline:pixel_solar_gate", metadata: { width: 160, height: 96, dpiClass: "low" } },
    { id: "music_sunrise_overture" as RawAdventurePackage["assets"][number]["id"], kind: "music", storageKey: "cue:classic-sunrise-overture" },
    { id: "sound_relic_chime" as RawAdventurePackage["assets"][number]["id"], kind: "sound", storageKey: "cue:relic-chime" }
  ],
  visualManifests: [classicVisualManifest],
  rules: {
    simulationMode: "turn-based",
    movementModel: "grid-step",
    combatModel: "simple-tactical",
    inventoryModel: "slotless"
  },
  presentation: {
    splashAssetId: "asset_splash_solar_gate" as RawAdventurePackage["assets"][number]["id"],
    startingMusicAssetId: "music_sunrise_overture" as RawAdventurePackage["assets"][number]["id"],
    introText: "The Solar Gate opens like an Adventuria sampler: shrine myth, strange science, and city shadows can all live in one construction set."
  },
  starterLibraryPacks: [
    { id: "pack_fantasy_shrine", name: "Fantasy Shrine Trial", genre: "fantasy", description: "Shrines, relics, oracles, wolves, ward circles, oathbound guardians, and mythic return quests.", tileIds: ["grass", "path", "shrub", "stone", "floor", "altar", "altar-lit", "door", "ward_circle", "bridge", "trap", "signpost", "shop_counter", "stairs_down", "treasure_chest", "locked_gate"], entityDefinitionIds: ["def_oracle", "def_wolf", "def_clockwork_knight", "def_town_healer", "def_merchant", "def_thief", "def_slinker", "def_dungeon_fighter", "def_guard_captain"], itemDefinitionIds: ["item_oracle_charm", "item_solar_seal", "item_moon_key", "item_starforged_relic", "item_iron_sword", "item_round_shield", "item_healing_potion", "item_torch", "item_rope", "item_gold_coins", "item_crystal_gem", "item_ration", "item_spell_scroll", "item_magic_ring"], skillDefinitionIds: ["skill_omen_reading", "skill_prophecy", "skill_warding", "skill_pathfinding"], spellDefinitionIds: ["spell_ward_flash"], traitDefinitionIds: ["trait_oathbound"], assetIds: ["asset_splash_solar_gate", "music_sunrise_overture", "sound_relic_chime"], questIds: ["quest_solar_seal"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_scifi_data_core", name: "Science Fiction Data Core", genre: "scienceFiction", description: "A compact starship or lab kit with decks, terminals, force fields, drones, ship AIs, and stolen data cores.", tileIds: ["floor", "door", "steel_deck", "force_field", "data_terminal", "water", "teleport_pad", "locked_gate"], entityDefinitionIds: ["def_starship_ai", "def_security_drone", "def_alien_scout"], itemDefinitionIds: ["item_data_core", "item_phase_decoder", "item_access_card", "item_blaster", "item_medkit", "item_crystal_gem"], skillDefinitionIds: ["skill_hacking", "skill_systems", "skill_pathfinding"], traitDefinitionIds: ["trait_construct"], assetIds: ["music_sunrise_overture", "sound_relic_chime"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_modern_spy", name: "Modern Spy Operation", genre: "modernSpy", description: "A tradecraft kit for city missions: contacts, badges, locked security doors, alleys, stealth, and extraction scenes.", tileIds: ["city_street", "security_door", "neon_alley", "floor", "door", "shop_counter", "signpost", "locked_gate"], entityDefinitionIds: ["def_spy_contact", "def_security_drone", "def_spy_handler", "def_thief", "def_merchant"], itemDefinitionIds: ["item_cipher_badge", "item_phase_decoder", "item_lockpick", "item_access_card", "item_spy_camera", "item_secret_dossier", "item_gold_coins"], skillDefinitionIds: ["skill_stealth", "skill_tradecraft", "skill_hacking", "skill_streetwise"], assetIds: ["sound_relic_chime"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_superhero_rooftops", name: "Superhero Rooftop Crisis", genre: "superhero", description: "Masked vigilantes, rooftop hazards, power conduits, gadgets, and dramatic rescue or showdown scenes.", tileIds: ["rooftop_edge", "power_conduit", "city_street", "security_door", "trap", "teleport_pad"], entityDefinitionIds: ["def_masked_vigilante", "def_security_drone", "def_town_healer", "def_alien_scout"], itemDefinitionIds: ["item_gravity_cape", "item_cipher_badge", "item_rope", "item_medkit", "item_blaster"], skillDefinitionIds: ["skill_gadgetry", "skill_heroics", "skill_tradecraft"], traitDefinitionIds: ["trait_masked_identity"], assetIds: ["sound_relic_chime"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_science_fantasy_gate", name: "Science-Fantasy Gate", genre: "scienceFantasy", description: "Ancient relics wired to impossible machines: force fields, ward circles, clockwork knights, and arcane science.", tileIds: ["ward_circle", "force_field", "data_terminal", "altar", "altar-lit", "teleport_pad", "treasure_chest", "locked_gate"], entityDefinitionIds: ["def_clockwork_knight", "def_starship_ai", "def_oracle", "def_dungeon_fighter", "def_alien_scout"], itemDefinitionIds: ["item_starforged_relic", "item_data_core", "item_moon_key", "item_crystal_gem", "item_spell_scroll", "item_magic_ring"], skillDefinitionIds: ["skill_arcane_science", "skill_systems", "skill_warding"], spellDefinitionIds: ["spell_phase_step", "spell_ward_flash"], traitDefinitionIds: ["trait_construct", "trait_oathbound"], assetIds: ["asset_splash_solar_gate", "music_sunrise_overture"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_supernatural_case", name: "Supernatural Case File", genre: "supernatural", description: "A haunting kit with ghost witnesses, cultists, ward circles, haunted floors, ecto lanterns, and occult investigation hooks.", tileIds: ["haunted_floor", "ward_circle", "stone", "floor", "door", "trap", "signpost", "treasure_chest"], entityDefinitionIds: ["def_ghost_witness", "def_void_cultist", "def_street_witch", "def_slinker"], itemDefinitionIds: ["item_ecto_lantern", "item_hex_charm", "item_torch", "item_spell_scroll", "item_magic_ring"], skillDefinitionIds: ["skill_occult_lore", "skill_spirit_speech", "skill_streetwise"], spellDefinitionIds: ["spell_ward_flash", "spell_neon_hex"], traitDefinitionIds: ["trait_spectral"], assetIds: ["sound_relic_chime"] } as RawAdventurePackage["starterLibraryPacks"][number],
    { id: "pack_urban_fantasy_alley", name: "Urban Fantasy Alley", genre: "urbanFantasy", description: "Neon alleys, street witches, cursed charms, city spirits, and spell-triggered shortcuts for modern occult adventures.", tileIds: ["neon_alley", "city_street", "security_door", "ward_circle", "shop_counter", "teleport_pad", "signpost"], entityDefinitionIds: ["def_street_witch", "def_ghost_witness", "def_void_cultist", "def_thief", "def_spy_handler"], itemDefinitionIds: ["item_hex_charm", "item_ecto_lantern", "item_cipher_badge", "item_lockpick", "item_secret_dossier", "item_crystal_gem"], skillDefinitionIds: ["skill_streetwise", "skill_occult_lore", "skill_spirit_speech"], spellDefinitionIds: ["spell_neon_hex", "spell_phase_step"], traitDefinitionIds: ["trait_spectral", "trait_masked_identity"], assetIds: ["sound_relic_chime"] } as RawAdventurePackage["starterLibraryPacks"][number]
  ],
  actorCapabilityProfiles: [
    { id: "cap_player_default", name: "Player Default Actions", role: "player", allowedActions: ["move", "inspect", "interact", "useItem", "activateTrigger", "traverseExit", "pickUpItem", "dropItem", "speak"], itemPolicy: { mode: "all" }, triggerPolicy: { mode: "all" }, exitPolicy: { mode: "all" } },
    { id: "cap_support_ally", name: "Support Ally", role: "support", allowedActions: ["move", "inspect", "interact", "useItem", "activateTrigger", "traverseExit", "giveItem", "support", "speak"], itemPolicy: { mode: "explicit", allowedActorKinds: ["support", "npc"] }, triggerPolicy: { mode: "explicit", allowedActorKinds: ["support", "npc"] }, exitPolicy: { mode: "explicit", allowedActorKinds: ["support", "npc"] } },
    { id: "cap_informational_npc", name: "Informational NPC", role: "informational", allowedActions: ["inspect", "interact", "speak"], itemPolicy: { mode: "blocked" }, triggerPolicy: { mode: "playersOnly" }, exitPolicy: { mode: "blocked" } },
    { id: "cap_antagonist", name: "Antagonist", role: "antagonist", allowedActions: ["move", "inspect", "interact", "useItem", "activateTrigger", "traverseExit", "attack", "speak"], itemPolicy: { mode: "explicit", allowedActorKinds: ["enemy", "antagonist"] }, triggerPolicy: { mode: "explicit", allowedActorKinds: ["enemy", "antagonist"] }, exitPolicy: { mode: "explicit", allowedActorKinds: ["enemy", "antagonist"] } },
    { id: "cap_random_actor", name: "Random Ambient Actor", role: "random", allowedActions: ["move", "inspect", "speak"], itemPolicy: { mode: "blocked" }, triggerPolicy: { mode: "blocked" }, exitPolicy: { mode: "blocked" } }
  ],
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
    { id: "lib_assets_classic" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "asset", name: "Classic ACS Visuals", description: "Visual manifest and future sprite assets for the retro presentation mode." },
    { id: "lib_entities_scifi" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Science Fiction Cast", description: "Ship AIs, drones, lab personnel, and synthetic threats." },
    { id: "lib_entities_modern" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Modern & Spy Cast", description: "Contacts, agents, security staff, informants, and city NPCs." },
    { id: "lib_entities_super" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Superhero Cast", description: "Masked allies, villains, gadgetsmiths, and dramatic rooftop actors." },
    { id: "lib_entities_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Supernatural Cast", description: "Ghosts, cultists, witches, cursed witnesses, and occult enemies." },
    { id: "lib_items_scifi" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Science Fiction Items", description: "Data cores, decoders, scanners, and experimental technology." },
    { id: "lib_items_modern" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Modern & Spy Items", description: "Badges, dossiers, gadgets, credentials, and extraction tools." },
    { id: "lib_items_super" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Heroic Gear", description: "Capes, power devices, signature gear, and public-symbol objects." },
    { id: "lib_items_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Occult Implements", description: "Lanterns, charms, wards, relics, and haunted evidence." },
    { id: "lib_tiles_scifi" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Science Fiction Tiles", description: "Deck plating, terminals, force fields, and lab hazards." },
    { id: "lib_tiles_modern" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Modern City Tiles", description: "Streets, security doors, alleys, rooftops, and infrastructure." },
    { id: "lib_tiles_heroic" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Heroic Set Pieces", description: "Rooftop edges, power conduits, and dramatic comic-book hazards." },
    { id: "lib_tiles_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Supernatural Tiles", description: "Haunted floors, ward circles, ritual zones, and liminal spaces." },
    { id: "lib_skills_technical" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Technical Skills", description: "Hacking, systems work, devices, and future-facing problem solving." },
    { id: "lib_skills_social" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Social & Tradecraft Skills", description: "Stealth, contacts, infiltration, streetwise work, and coded negotiations." },
    { id: "lib_skills_heroic" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Heroic Skills", description: "Gadgets, rescues, leadership, and spectacular action beats." },
    { id: "lib_skills_occult" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "skill", name: "Occult Skills", description: "Spirit speech, occult lore, ritual safety, and uncanny investigation." },
    { id: "lib_traits_archetypes" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "trait", name: "Genre Archetype Traits", description: "Reusable identity and creature traits for entities." },
    { id: "lib_spells_crossgenre" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "spell", name: "Cross-Genre Powers", description: "Spell-like powers that can fit fantasy, science fantasy, or urban fantasy." },
    { id: "lib_entities_classic_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Classic ACS Creatures", description: "Generic fighters, slinkers, thieves, guards, beasts, and dungeon enemies inspired by construction-set creature roles." },
    { id: "lib_entities_support" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "entity", name: "Support & Informational NPCs", description: "Healers, merchants, handlers, guides, witnesses, and friendly/random actors." },
    { id: "lib_items_weapons" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Weapons & Armor", description: "Reusable melee, ranged, shield, and armor objects for tactical adventures." },
    { id: "lib_items_keys" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Keys & Access", description: "Keys, badges, cards, passes, and unlock objects that gates and triggers can reference." },
    { id: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "item", name: "Treasure & Supplies", description: "Coins, gems, food, potions, ropes, torches, and other classic thing/tool objects." },
    { id: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "tile", name: "Classic Things & Set Pieces", description: "Shops, stairs, traps, signs, chests, bridges, and teleport pads used as interactive map objects." },
    { id: "lib_spells_fantasy" as RawAdventurePackage["libraryCategories"][number]["id"], kind: "spell", name: "Fantasy Spells", description: "Classic spell-like effects for healing, light, locks, protection, and detection." }
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
    },
    {
      id: "steel_deck" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Steel Deck",
      description: "A walkable starship or laboratory floor for science-fiction maps.",
      categoryId: "lib_tiles_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Metal plates hum faintly underfoot.",
      tags: ["terrain", "sci-fi", "interior"],
      classicSpriteId: "floor"
    },
    {
      id: "force_field" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Force Field",
      description: "A blocked energy barrier that can later be opened by a trigger, key item, or puzzle rule.",
      categoryId: "lib_tiles_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "The blue wall crackles; a decoder or switch could drop it.",
      tags: ["barrier", "sci-fi", "trigger-target"],
      classicSpriteId: "water"
    },
    {
      id: "data_terminal" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Data Terminal",
      description: "A conditional interaction tile for hacking scenes, logs, and trigger-driven doors.",
      categoryId: "lib_tiles_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "conditional",
      interactionHint: "A terminal waits for credentials, a code phrase, or a hacking trigger.",
      tags: ["interactive", "sci-fi", "logic"],
      classicSpriteId: "altar-lit"
    },
    {
      id: "city_street" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "City Street",
      description: "A walkable urban tile for spy, superhero, and urban-fantasy regions.",
      categoryId: "lib_tiles_modern" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Traffic noise and alley echoes make good cover.",
      tags: ["terrain", "modern", "urban"],
      classicSpriteId: "path"
    },
    {
      id: "security_door" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Security Door",
      description: "A locked modern barrier ready for keycards, badges, switches, or story triggers.",
      categoryId: "lib_tiles_modern" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "A status light blinks red beside the lock.",
      tags: ["door", "barrier", "modern", "trigger-target"],
      classicSpriteId: "door"
    },
    {
      id: "rooftop_edge" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Rooftop Edge",
      description: "A blocked dramatic boundary for superhero chases and skyline rescues.",
      categoryId: "lib_tiles_heroic" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "blocked",
      interactionHint: "The city drops away below. This is a great place for a rescue trigger.",
      tags: ["barrier", "superhero", "hazard"],
      classicSpriteId: "stone"
    },
    {
      id: "power_conduit" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Power Conduit",
      description: "A conditional hazard or energy source for gadgets, alarms, or powered gates.",
      categoryId: "lib_tiles_heroic" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "conditional",
      interactionHint: "Energy arcs through the conduit. It could empower or endanger an action.",
      tags: ["hazard", "power", "superhero", "trigger-source"],
      classicSpriteId: "altar-lit"
    },
    {
      id: "ward_circle" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Ward Circle",
      description: "A ritual interaction tile for protective magic, summons, and threshold puzzles.",
      categoryId: "lib_tiles_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "conditional",
      interactionHint: "Chalk lines shimmer when a spirit or relic draws near.",
      tags: ["ritual", "magic", "trigger-source"],
      classicSpriteId: "altar"
    },
    {
      id: "haunted_floor" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Haunted Floor",
      description: "A walkable supernatural tile for mansions, catacombs, and cursed rooms.",
      categoryId: "lib_tiles_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Cold drafts move against your steps.",
      tags: ["terrain", "supernatural", "interior"],
      classicSpriteId: "floor"
    },
    { id: "bridge" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Bridge", description: "A passable thing-like terrain tile for crossing water, gaps, or rooftops.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "passable", interactionHint: "A safe crossing point.", tags: ["thing", "crossing", "classic"], classicSpriteId: "path", visual: { classicSpriteId: "path" } },
    { id: "trap" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Trap", description: "A conditional hazard tile ready for damage, alarm, or teleport triggers.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "conditional", interactionHint: "Something clicks underfoot.", tags: ["thing", "hazard", "trigger-source"], classicSpriteId: "altar", visual: { classicSpriteId: "altar" } },
    { id: "signpost" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Signpost", description: "An informational tile that can show dialogue, clues, warnings, or region names.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "conditional", interactionHint: "A readable sign waits for inspection.", tags: ["thing", "message", "clue"], classicSpriteId: "door", visual: { classicSpriteId: "door" } },
    { id: "shop_counter" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Shop Counter", description: "A shop-like interaction point for buying, selling, clues, or services.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "conditional", interactionHint: "A merchant could trade from here.", tags: ["thing", "shop", "social"], classicSpriteId: "altar-lit", visual: { classicSpriteId: "altar-lit" } },
    { id: "stairs_down" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Stairs Down", description: "A portal anchor for dungeon floors, basements, ships, towers, or secret lairs.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "passable", interactionHint: "Stairs lead to another map.", tags: ["portal", "stairs", "dungeon"], classicSpriteId: "door", visual: { classicSpriteId: "door" } },
    { id: "treasure_chest" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Treasure Chest", description: "A container-like tile for rewards, traps, keys, and clue drops.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "conditional", interactionHint: "A chest waits to be opened by a trigger or key.", tags: ["thing", "container", "reward"], classicSpriteId: "altar", visual: { classicSpriteId: "altar" } },
    { id: "teleport_pad" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Teleport Pad", description: "A futurist or magical portal pad for map-to-map travel.", categoryId: "lib_tiles_scifi" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "conditional", interactionHint: "The pad hums with destination energy.", tags: ["portal", "sci-fi", "magic"], classicSpriteId: "altar-lit", visual: { classicSpriteId: "altar-lit" } },
    { id: "locked_gate" as RawAdventurePackage["tileDefinitions"][number]["id"], name: "Locked Gate", description: "A blocked barrier intended for keys, passcards, spells, or switch triggers.", categoryId: "lib_tiles_classic_things" as RawAdventurePackage["libraryCategories"][number]["id"], passability: "blocked", interactionHint: "A lock or access rule bars the way.", tags: ["door", "barrier", "keyed"], classicSpriteId: "door", visual: { classicSpriteId: "door" } },    {
      id: "neon_alley" as RawAdventurePackage["tileDefinitions"][number]["id"],
      name: "Neon Alley",
      description: "A walkable urban-fantasy tile for informants, portals, and occult side streets.",
      categoryId: "lib_tiles_modern" as RawAdventurePackage["libraryCategories"][number]["id"],
      passability: "passable",
      interactionHint: "Neon reflections make the alley feel slightly unreal.",
      tags: ["terrain", "urban-fantasy", "modern"],
      classicSpriteId: "path"
    }
  ],
  entityDefinitions: [
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
    },
    {
      id: "def_starship_ai" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Starship AI",
      kind: "npc",
      placement: "singleton",
      categoryId: "lib_entities_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "pixel_data_core" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: { stats: { life: 10, power: 8, speed: 0 }, skillIds: ["skill_hacking", "skill_systems"] as RawAdventurePackage["skillDefinitions"][number]["id"][], traitIds: ["trait_construct"] as RawAdventurePackage["traitDefinitions"][number]["id"][] },
      behavior: "guard"
    },
    {
      id: "def_security_drone" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Security Drone",
      kind: "enemy",
      placement: "multiple",
      categoryId: "lib_entities_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      faction: "security",
      profile: { stats: { life: 5, power: 4, speed: 3 }, skillIds: ["skill_systems", "skill_ambush"] as RawAdventurePackage["skillDefinitions"][number]["id"][], traitIds: ["trait_construct"] as RawAdventurePackage["traitDefinitions"][number]["id"][] },
      behavior: { mode: "pursue", detectionRange: 5, leashRange: 7, turnInterval: 2 }
    },
    {
      id: "def_spy_contact" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Spy Contact",
      kind: "npc",
      placement: "singleton",
      categoryId: "lib_entities_modern" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "pixel_city_mask" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: { stats: { life: 7, power: 5, speed: 4 }, skillIds: ["skill_stealth", "skill_tradecraft", "skill_streetwise"] as RawAdventurePackage["skillDefinitions"][number]["id"][] },
      behavior: "guard"
    },
    {
      id: "def_masked_vigilante" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Masked Vigilante",
      kind: "npc",
      placement: "singleton",
      categoryId: "lib_entities_super" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "pixel_city_mask" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: { stats: { life: 12, power: 9, speed: 6 }, skillIds: ["skill_gadgetry", "skill_heroics"] as RawAdventurePackage["skillDefinitions"][number]["id"][], traitIds: ["trait_masked_identity"] as RawAdventurePackage["traitDefinitions"][number]["id"][] },
      behavior: "guard"
    },
    {
      id: "def_void_cultist" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Void Cultist",
      kind: "enemy",
      placement: "multiple",
      categoryId: "lib_entities_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      faction: "void",
      profile: { stats: { life: 6, power: 7, speed: 2 }, skillIds: ["skill_occult_lore", "skill_ambush"] as RawAdventurePackage["skillDefinitions"][number]["id"][] },
      behavior: { mode: "guard", detectionRange: 3, leashRange: 4, turnInterval: 3 }
    },
    {
      id: "def_ghost_witness" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Ghost Witness",
      kind: "npc",
      placement: "singleton",
      categoryId: "lib_entities_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: { stats: { life: 4, power: 8, speed: 1 }, skillIds: ["skill_spirit_speech", "skill_occult_lore"] as RawAdventurePackage["skillDefinitions"][number]["id"][], traitIds: ["trait_spectral"] as RawAdventurePackage["traitDefinitions"][number]["id"][] },
      behavior: "idle"
    },
    {
      id: "def_street_witch" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Street Witch",
      kind: "npc",
      placement: "singleton",
      categoryId: "lib_entities_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "pixel_city_mask" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      profile: { stats: { life: 8, power: 10, speed: 3 }, skillIds: ["skill_streetwise", "skill_occult_lore"] as RawAdventurePackage["skillDefinitions"][number]["id"][] },
      behavior: "guard"
    },
    {
      id: "def_clockwork_knight" as RawAdventurePackage["entityDefinitions"][number]["id"],
      name: "Clockwork Knight",
      kind: "enemy",
      placement: "multiple",
      categoryId: "lib_entities_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>,
      faction: "ancient-machine",
      profile: { stats: { life: 9, power: 6, speed: 2 }, skillIds: ["skill_arcane_science", "skill_warding"] as RawAdventurePackage["skillDefinitions"][number]["id"][], traitIds: ["trait_construct", "trait_oathbound"] as RawAdventurePackage["traitDefinitions"][number]["id"][] },
      behavior: { mode: "guard", detectionRange: 4, leashRange: 5, turnInterval: 3 }
    }
    { id: "def_town_healer" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Town Healer", kind: "npc", placement: "multiple", categoryId: "lib_entities_support" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_support_ally", profile: { stats: { life: 7, power: 6, speed: 2 }, skillIds: ["skill_warding"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_healing_potion" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 2 }], behavior: "guard" },
    { id: "def_merchant" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Merchant", kind: "npc", placement: "multiple", categoryId: "lib_entities_support" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_informational_npc", profile: { stats: { life: 6, power: 3, speed: 2 }, skillIds: ["skill_tradecraft", "skill_streetwise"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_gold_coins" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 8 }], behavior: "idle" },
    { id: "def_thief" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Thief", kind: "enemy", placement: "multiple", categoryId: "lib_entities_classic_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "pixel_city_mask" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_antagonist", faction: "thieves", profile: { stats: { life: 5, power: 3, speed: 6 }, skillIds: ["skill_stealth", "skill_tradecraft"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_lockpick" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }], behavior: { mode: "wander", detectionRange: 3, leashRange: 5, turnInterval: 2 } },
    { id: "def_slinker" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Slinker", kind: "enemy", placement: "multiple", categoryId: "lib_entities_classic_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_antagonist", faction: "wild", profile: { stats: { life: 4, power: 2, speed: 7 }, skillIds: ["skill_ambush"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, behavior: { mode: "wander", detectionRange: 2, leashRange: 4, turnInterval: 2 } },
    { id: "def_dungeon_fighter" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Dungeon Fighter", kind: "enemy", placement: "multiple", categoryId: "lib_entities_classic_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "sprite_wolf" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_antagonist", faction: "dungeon", profile: { stats: { life: 8, power: 5, speed: 3 }, skillIds: ["skill_ambush"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_iron_sword" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }], behavior: { mode: "guard", detectionRange: 4, leashRange: 5, turnInterval: 3 } },
    { id: "def_guard_captain" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Guard Captain", kind: "npc", placement: "multiple", categoryId: "lib_entities_classic_creatures" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "sprite_oracle" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_support_ally", faction: "town", profile: { stats: { life: 10, power: 6, speed: 3 }, skillIds: ["skill_pathfinding"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_round_shield" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }], behavior: "guard" },
    { id: "def_alien_scout" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Alien Scout", kind: "enemy", placement: "multiple", categoryId: "lib_entities_scifi" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "pixel_data_core" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_antagonist", faction: "alien", profile: { stats: { life: 6, power: 5, speed: 5 }, skillIds: ["skill_systems"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_blaster" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }], behavior: { mode: "pursue", detectionRange: 5, leashRange: 6, turnInterval: 2 } },
    { id: "def_spy_handler" as RawAdventurePackage["entityDefinitions"][number]["id"], name: "Spy Handler", kind: "npc", placement: "singleton", categoryId: "lib_entities_modern" as RawAdventurePackage["libraryCategories"][number]["id"], assetId: "pixel_city_mask" as NonNullable<RawAdventurePackage["entityDefinitions"][number]["assetId"]>, capabilityProfileId: "cap_informational_npc", profile: { stats: { life: 7, power: 5, speed: 4 }, skillIds: ["skill_tradecraft", "skill_streetwise"] as RawAdventurePackage["skillDefinitions"][number]["id"][] }, startingPossessions: [{ itemId: "item_secret_dossier" as RawAdventurePackage["itemDefinitions"][number]["id"], quantity: 1 }], behavior: "guard" },  ],
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
    },
    {
      id: "item_data_core" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Data Core",
      description: "A stolen memory module that can unlock logs, gates, or evidence chains.",
      categoryId: "lib_items_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    },
    {
      id: "item_phase_decoder" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Phase Decoder",
      description: "A hand-held device for disabling force fields or reading hidden signals.",
      categoryId: "lib_items_scifi" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "usable"
    },
    {
      id: "item_cipher_badge" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Cipher Badge",
      description: "A credential that can satisfy access checks, persuade contacts, or expose impostors.",
      categoryId: "lib_items_modern" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    },
    {
      id: "item_gravity_cape" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Gravity Cape",
      description: "Heroic equipment for rooftop rescues, dramatic escapes, and triggered mobility rules.",
      categoryId: "lib_items_super" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "equipment"
    },
    {
      id: "item_ecto_lantern" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Ecto Lantern",
      description: "A supernatural investigation tool that reveals ghosts, clues, and warded doors.",
      categoryId: "lib_items_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "usable"
    },
    {
      id: "item_hex_charm" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Hex Charm",
      description: "A risky charm for curses, bargains, and urban-fantasy trigger puzzles.",
      categoryId: "lib_items_supernatural" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    },
    {
      id: "item_moon_key" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Moon Key",
      description: "A fantasy key item that can open old doors when the Solar Seal is not enough.",
      categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    },
    {
      id: "item_starforged_relic" as RawAdventurePackage["itemDefinitions"][number]["id"],
      name: "Starforged Relic",
      description: "A science-fantasy artifact that bridges temple myth and impossible machinery.",
      categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"],
      useKind: "quest"
    }
    { id: "item_iron_sword" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Iron Sword", description: "A plain fantasy weapon for guards, heroes, and dungeon fighters.", categoryId: "lib_items_weapons" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "equipment", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_round_shield" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Round Shield", description: "Defensive gear for classic fighters, guards, and support companions.", categoryId: "lib_items_weapons" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "equipment", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_healing_potion" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Healing Potion", description: "A consumable support item that players or permitted allies can use.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "consumable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "explicit", allowedActorKinds: ["player", "support"] } },
    { id: "item_torch" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Torch", description: "A light source for caves, castles, and hidden-door triggers.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "usable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_rope" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Rope", description: "A tool for bridges, pits, rescues, rooftops, and dungeon escapes.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "usable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_gold_coins" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Gold Coins", description: "Trade treasure for shops, bribes, tolls, and reward chests.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "quest", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "playersOnly" } },
    { id: "item_crystal_gem" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Crystal Gem", description: "A treasure or power source for fantasy, futurist, or science-fantasy gates.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "quest", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_ration" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Food Ration", description: "A classic supply item for long regions, survival quests, or support NPCs.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "consumable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_lockpick" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Lockpick", description: "A spy or thief tool for doors, chests, and quiet trigger branches.", categoryId: "lib_items_keys" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "usable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "explicit", allowedActorKinds: ["player", "npc", "antagonist"] } },
    { id: "item_access_card" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Access Card", description: "A futurist/spy access object for labs, ships, bases, and security doors.", categoryId: "lib_items_keys" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "quest", classicSpriteId: "pixel_data_core", visual: { pixelSpriteId: "pixel_data_core" }, usePolicy: { mode: "explicit", allowedActorKinds: ["player", "npc", "enemy", "antagonist"] } },
    { id: "item_blaster" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Blaster", description: "A generic futurist ranged weapon for patrols, heroes, or villains.", categoryId: "lib_items_weapons" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "equipment", classicSpriteId: "pixel_data_core", visual: { pixelSpriteId: "pixel_data_core" }, usePolicy: { mode: "explicit", allowedActorKinds: ["player", "enemy", "antagonist"] } },
    { id: "item_medkit" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Medkit", description: "A modern or futurist support item for rescue scenes and ally behavior.", categoryId: "lib_items_treasure" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "consumable", classicSpriteId: "pixel_data_core", visual: { pixelSpriteId: "pixel_data_core" }, usePolicy: { mode: "explicit", allowedActorKinds: ["player", "support", "npc"] } },
    { id: "item_spy_camera" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Spy Camera", description: "A clue-gathering gadget for surveillance, evidence, and secret-room triggers.", categoryId: "lib_items_modern" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "usable", classicSpriteId: "pixel_city_mask", visual: { pixelSpriteId: "pixel_city_mask" }, usePolicy: { mode: "playersOnly" } },
    { id: "item_secret_dossier" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Secret Dossier", description: "A modern objective item for blackmail, clues, and story reveals.", categoryId: "lib_items_modern" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "quest", classicSpriteId: "pixel_city_mask", visual: { pixelSpriteId: "pixel_city_mask" }, usePolicy: { mode: "playersOnly" } },
    { id: "item_spell_scroll" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Spell Scroll", description: "A one-use magical instruction for opening paths, revealing text, or warding danger.", categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "consumable", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "all" } },
    { id: "item_magic_ring" as RawAdventurePackage["itemDefinitions"][number]["id"], name: "Magic Ring", description: "A reusable fantasy item for protection, invisibility, or keyed dialogue.", categoryId: "lib_items_relics" as RawAdventurePackage["libraryCategories"][number]["id"], useKind: "equipment", classicSpriteId: "solar_seal", visual: { classicSpriteId: "solar_seal" }, usePolicy: { mode: "playersOnly" } },  ],
  skillDefinitions: [
    { id: "skill_omen_reading" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Omen Reading", description: "Interprets shrine signs and prophetic warnings.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_pathfinding" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Pathfinding", description: "Finds safe paths through wild maps and ruins.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_prophecy" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Prophecy", description: "Speaks future-facing clues through dialogue and quest text.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_warding" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Warding", description: "Protective shrine magic used by guardians and priests.", categoryId: "lib_skills_mystic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_tracking" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Tracking", description: "Follows nearby prey or intruders.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_ambush" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Ambush", description: "Waits near paths and pressures careless movement.", categoryId: "lib_skills_fieldcraft" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_hacking" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Hacking", description: "Breaks into terminals, disables locks, and drives science-fiction logic puzzles.", categoryId: "lib_skills_technical" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_systems" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Systems", description: "Understands ships, labs, drones, power conduits, and automated defenses.", categoryId: "lib_skills_technical" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_stealth" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Stealth", description: "Moves through patrols, restricted rooms, and social danger without drawing attention.", categoryId: "lib_skills_social" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_tradecraft" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Tradecraft", description: "Handles dead drops, cover identities, coded meetings, and modern spy interactions.", categoryId: "lib_skills_social" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_gadgetry" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Gadgetry", description: "Builds or uses devices for superhero rescues, alarms, grapples, and scanners.", categoryId: "lib_skills_heroic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_heroics" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Heroics", description: "Performs bold rescues, protects bystanders, and turns set pieces into story moments.", categoryId: "lib_skills_heroic" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_arcane_science" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Arcane Science", description: "Treats magic and machinery as one puzzle language for science-fantasy adventures.", categoryId: "lib_skills_technical" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_occult_lore" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Occult Lore", description: "Recognizes rituals, hauntings, curses, and dangerous supernatural bargains.", categoryId: "lib_skills_occult" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_spirit_speech" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Spirit Speech", description: "Allows conversations with ghosts, echoes, ancestors, and other liminal witnesses.", categoryId: "lib_skills_occult" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "skill_streetwise" as RawAdventurePackage["skillDefinitions"][number]["id"], name: "Streetwise", description: "Finds contacts, reads neighborhoods, and navigates city danger without a map.", categoryId: "lib_skills_social" as RawAdventurePackage["libraryCategories"][number]["id"] }
  ],  traitDefinitions: [
    { id: "trait_construct" as RawAdventurePackage["traitDefinitions"][number]["id"], name: "Construct", description: "Mechanical or synthetic beings that can be used for drones, golems, and clockwork enemies.", categoryId: "lib_traits_archetypes" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "trait_spectral" as RawAdventurePackage["traitDefinitions"][number]["id"], name: "Spectral", description: "Ghostly entities that are best handled through wards, lanterns, or spirit speech.", categoryId: "lib_traits_archetypes" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "trait_masked_identity" as RawAdventurePackage["traitDefinitions"][number]["id"], name: "Masked Identity", description: "A heroic or secret-identity trait for allies, rivals, and dramatic reveals.", categoryId: "lib_traits_archetypes" as RawAdventurePackage["libraryCategories"][number]["id"] },
    { id: "trait_oathbound" as RawAdventurePackage["traitDefinitions"][number]["id"], name: "Oathbound", description: "An entity bound by a vow, geas, directive, or ancient command.", categoryId: "lib_traits_archetypes" as RawAdventurePackage["libraryCategories"][number]["id"] }
  ],  spellDefinitions: [
    { id: "spell_ward_flash" as RawAdventurePackage["spellDefinitions"][number]["id"], name: "Ward Flash", description: "A burst of protective force useful for altar puzzles, ghost barriers, or enemy stuns.", categoryId: "lib_spells_crossgenre" as RawAdventurePackage["libraryCategories"][number]["id"], powerCost: 2 },
    { id: "spell_phase_step" as RawAdventurePackage["spellDefinitions"][number]["id"], name: "Phase Step", description: "A short-range impossible movement effect for magic doors, force fields, or sci-fi teleport tricks.", categoryId: "lib_spells_crossgenre" as RawAdventurePackage["libraryCategories"][number]["id"], powerCost: 3 },
    { id: "spell_neon_hex" as RawAdventurePackage["spellDefinitions"][number]["id"], name: "Neon Hex", description: "An urban-fantasy curse that can flip switches, mark enemies, or light a hidden alley route.", categoryId: "lib_spells_crossgenre" as RawAdventurePackage["libraryCategories"][number]["id"], powerCost: 2 }
  ],  flagDefinitions: [
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
      stages: ["Await the Oracle", "Seek the shrine", "Return to the Oracle", "Quest complete"],
      rewards: ["Solar Seal", "Oracle blessing"],
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
        { type: "setFlag", flag: "quest_stage", value: 1 },
        { type: "setQuestStage", questId: "quest_solar_seal" as RawAdventurePackage["questDefinitions"][number]["id"], stage: 1 }
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
        { type: "setQuestStage", questId: "quest_solar_seal" as RawAdventurePackage["questDefinitions"][number]["id"], stage: 2 },
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
        { type: "setFlag", flag: "quest_stage", value: 3 },
        { type: "setQuestStage", questId: "quest_solar_seal" as RawAdventurePackage["questDefinitions"][number]["id"], stage: 3 }
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





