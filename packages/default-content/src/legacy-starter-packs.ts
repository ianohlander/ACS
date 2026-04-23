import type {
  CustomLibraryObjectDefinition,
  EntityDefinition,
  ItemDefinition,
  LibraryCategoryDefinition,
  SpellDefinition,
  StarterLibraryPackDefinition,
  TileDefinition,
  TraitDefinition
} from "@acs/domain";

const categoryId = (id: string) => id as LibraryCategoryDefinition["id"];
const tileId = (id: string) => id as TileDefinition["id"];
const entityId = (id: string) => id as EntityDefinition["id"];
const itemId = (id: string) => id as ItemDefinition["id"];
const spellId = (id: string) => id as SpellDefinition["id"];
const traitId = (id: string) => id as TraitDefinition["id"];
const customObjectId = (id: string) => id as CustomLibraryObjectDefinition["id"];

const classicVisual = (classicSpriteId: string) => ({ classicSpriteId });

const tile = (
  id: string,
  name: string,
  category: string,
  passability: TileDefinition["passability"],
  description: string,
  interactionHint: string,
  tags: string[]
): TileDefinition => ({
  id: tileId(id),
  name,
  description,
  categoryId: categoryId(category),
  passability,
  interactionHint,
  tags: ["legacy-acs", ...tags],
  classicSpriteId: id,
  visual: classicVisual(id),
  usePolicy: { mode: "all" }
});

const item = (
  id: string,
  name: string,
  category: string,
  useKind: NonNullable<ItemDefinition["useKind"]>,
  description: string
): ItemDefinition => ({
  id: itemId(id),
  name,
  description,
  categoryId: categoryId(category),
  useKind,
  classicSpriteId: id,
  visual: classicVisual(id),
  usePolicy: { mode: "all" }
});

const entity = (
  id: string,
  name: string,
  category: string,
  kind: EntityDefinition["kind"],
  behavior: NonNullable<EntityDefinition["behavior"]>,
  traitIds: string[],
  stats: NonNullable<NonNullable<EntityDefinition["profile"]>["stats"]>,
  possessionIds: string[] = []
): EntityDefinition => ({
  id: entityId(id),
  name,
  kind,
  placement: "multiple",
  behavior,
  categoryId: categoryId(category),
  profile: { stats, traitIds: traitIds.map(traitId) },
  startingPossessions: possessionIds.map((possessionId) => ({ itemId: itemId(possessionId), quantity: 1 })),
  visual: classicVisual(id),
  capabilityProfileId: kind === "enemy" ? "cap_antagonist" : "cap_support_ally"
});

const spell = (id: string, name: string, description: string, powerCost: number): SpellDefinition => ({
  id: spellId(id),
  name,
  description,
  categoryId: categoryId("legacy_cat_magic_spells"),
  powerCost,
  visual: classicVisual(id),
  usePolicy: { mode: "playersOnly" }
});

const customObject = (
  id: string,
  name: string,
  kind: string,
  description: string,
  category: string,
  fields: CustomLibraryObjectDefinition["fields"] = {}
): CustomLibraryObjectDefinition => ({
  id: customObjectId(id),
  name,
  kind,
  description,
  categoryId: categoryId(category),
  fields: { source: "legacy-acs-starter-pack", ...fields }
});

export const legacyStarterLibraryCategories: LibraryCategoryDefinition[] = [
  { id: categoryId("legacy_cat_treasures"), kind: "item", name: "Legacy ACS Treasures", description: "Currency, jewels, and generic valuables from the original ACS starter packs." },
  { id: categoryId("legacy_cat_magic_items"), kind: "item", name: "Legacy ACS Magic Items", description: "Reusable magic and special-purpose things from the original ACS starter packs." },
  { id: categoryId("legacy_cat_missile_weapons"), kind: "item", name: "Legacy ACS Missile Weapons", description: "Ranged weapons and thrown attacks from the original ACS starter packs." },
  { id: categoryId("legacy_cat_melee_weapons"), kind: "item", name: "Legacy ACS Melee Weapons", description: "Close-combat weapons and natural attacks from the original ACS starter packs." },
  { id: categoryId("legacy_cat_armor"), kind: "item", name: "Legacy ACS Armor", description: "Protective gear and natural armor from the original ACS starter packs." },
  { id: categoryId("legacy_cat_magic_spells"), kind: "spell", name: "Legacy ACS Spells", description: "The original ACS base spell-effect slots plus the documented Flight spell." },
  { id: categoryId("legacy_cat_portals"), kind: "tile", name: "Legacy ACS Portals", description: "Doors, passages, tunnels, transporters, and time-window portal things." },
  { id: categoryId("legacy_cat_spaces"), kind: "tile", name: "Legacy ACS Spaces", description: "Standard and special walkable spaces used by the construction set." },
  { id: categoryId("legacy_cat_obstacles"), kind: "tile", name: "Legacy ACS Obstacles", description: "Blocking and triggerable obstacle things used by the construction set." },
  { id: categoryId("legacy_cat_creature_roles"), kind: "entity", name: "Legacy ACS Creature Roles", description: "Reusable person, animal, monster, magical-being, robot, vehicle, and role archetypes." },
  { id: categoryId("legacy_cat_traits"), kind: "trait", name: "Legacy ACS Traits", description: "Classic construction-set creature typing and role traits." },
  { id: categoryId("legacy_cat_custom_mechanics"), kind: "custom", name: "Legacy ACS Custom Mechanics", description: "Starter-pack thing categories, Do-All spaces, and graphics-page metadata that need richer editors later." }
];

export const legacyStarterTileDefinitions: TileDefinition[] = [
  tile("legacy_tile_room_floor", "Room Floor", "legacy_cat_spaces", "passable", "The default interior space for rooms and buildings.", "Walkable interior floor.", ["space", "room"]),
  tile("legacy_tile_store", "Store", "legacy_cat_spaces", "conditional", "A shop or trade cell from the original starter material.", "Open a store or trade interaction.", ["space", "shop"]),
  tile("legacy_tile_help_space", "Help Space", "legacy_cat_spaces", "conditional", "A special space that can provide help text or instructions.", "Display a help or hint message.", ["space", "message"]),
  tile("legacy_tile_invisible_cover", "Invisible Cover", "legacy_cat_spaces", "conditional", "A concealed protective or hidden-state space from the starter material.", "Apply hidden cover or special protection.", ["space", "hidden"]),
  tile("legacy_tile_custom_space", "Custom Space", "legacy_cat_spaces", "conditional", "A generic custom walkable trigger space.", "Run a custom space effect.", ["space", "custom"]),
  tile("legacy_tile_do_all_walk_space", "Do-All-Walk Space", "legacy_cat_spaces", "conditional", "A walk-triggered starter space intended to stack multiple effects.", "Run stacked effects when walked onto.", ["space", "do-all", "trigger"]),
  tile("legacy_tile_do_all_carry_space", "Do-All-Carry Space", "legacy_cat_spaces", "conditional", "A carried-item or inventory-sensitive starter space intended to stack multiple effects.", "Run stacked effects when the required carried object is present.", ["space", "do-all", "inventory"]),
  tile("legacy_tile_music_custom_space", "Music Custom Space", "legacy_cat_spaces", "conditional", "A custom space that plays or changes music.", "Play a music cue.", ["space", "music"]),
  tile("legacy_tile_message_custom_space", "Message Custom Space", "legacy_cat_spaces", "conditional", "A custom space that displays a message.", "Display a message.", ["space", "message"]),
  tile("legacy_tile_decoder_custom_space", "Decoder Custom Space", "legacy_cat_spaces", "conditional", "A custom space that decodes messages or gates spy/mystery clues.", "Decode a message or reveal clue text.", ["space", "decoder", "spy"]),
  tile("legacy_tile_rid_room_custom_space", "Rid the Room Custom Space", "legacy_cat_spaces", "conditional", "A custom space for removing entities or objects from a room.", "Clear authored targets from the room.", ["space", "room-effect"]),
  tile("legacy_tile_add_room_custom_space", "Add to Room Custom Space", "legacy_cat_spaces", "conditional", "A custom space for adding entities or objects to a room.", "Add authored targets to the room.", ["space", "room-effect"]),
  tile("legacy_tile_increase_life_force_space", "Increase Life Force Custom Space", "legacy_cat_spaces", "conditional", "A custom space that raises life force.", "Increase the actor's life force.", ["space", "stat"]),
  tile("legacy_tile_obstacle", "Obstacle", "legacy_cat_obstacles", "blocked", "A generic blocking obstacle.", "Blocks movement until removed or bypassed.", ["obstacle"]),
  tile("legacy_tile_custom_obstacle", "Custom Obstacle", "legacy_cat_obstacles", "blocked", "A generic custom blocking obstacle.", "Run custom obstacle logic when bumped.", ["obstacle", "custom"]),
  tile("legacy_tile_do_all_bump_obstacle", "Do-All-Bump Obstacle", "legacy_cat_obstacles", "blocked", "A bump-triggered starter obstacle intended to stack multiple effects.", "Run stacked effects when bumped.", ["obstacle", "do-all", "trigger"]),
  tile("legacy_tile_door", "Door", "legacy_cat_portals", "conditional", "A standard portal between spaces.", "Open, unlock, or traverse a door.", ["portal", "door"]),
  tile("legacy_tile_passageway", "Passageway", "legacy_cat_portals", "conditional", "A standard passage portal.", "Travel through a passageway.", ["portal"]),
  tile("legacy_tile_tunnel", "Tunnel", "legacy_cat_portals", "conditional", "A standard tunnel portal.", "Travel through a tunnel.", ["portal"]),
  tile("legacy_tile_time_window", "Time Window", "legacy_cat_portals", "conditional", "A portal associated with time travel or time-shifted regions.", "Travel through a time window.", ["portal", "time"]),
  tile("legacy_tile_beam_down_transporter", "Beam Me Down Transporter", "legacy_cat_portals", "conditional", "A science-fiction transporter portal from the original starter material.", "Transport to another map or coordinate.", ["portal", "science-fiction"])
];

export const legacyStarterItemDefinitions: ItemDefinition[] = [
  item("legacy_item_gold", "Gold", "legacy_cat_treasures", "quest", "Fantasy currency and treasure."),
  item("legacy_item_dollars", "Dollars", "legacy_cat_treasures", "quest", "Modern or spy-genre currency."),
  item("legacy_item_crystite", "Crystite", "legacy_cat_treasures", "quest", "Science-fiction currency or mineral treasure."),
  item("legacy_item_jewels", "Jewels", "legacy_cat_treasures", "quest", "Portable treasure for rewards, shops, and gates."),
  item("legacy_item_magic_bag", "Magic Bag", "legacy_cat_magic_items", "usable", "A magic container or special inventory object."),
  item("legacy_item_horse", "Horse", "legacy_cat_magic_items", "usable", "A rideable or travel-enabling thing from the fantasy starter set."),
  item("legacy_item_lantern", "Lantern", "legacy_cat_magic_items", "usable", "A light source for dark rooms, messages, or hidden paths."),
  item("legacy_item_rope", "Rope", "legacy_cat_magic_items", "usable", "A traversal tool for pits, bridges, climbing, or rescue scenes."),
  item("legacy_item_coded_message", "Coded Message", "legacy_cat_magic_items", "quest", "A spy or mystery clue object that pairs with decoder-style spaces."),
  item("legacy_item_magic_sword", "Magic Sword", "legacy_cat_melee_weapons", "equipment", "A fantasy melee weapon with magical force."),
  item("legacy_item_dagger", "Dagger", "legacy_cat_melee_weapons", "equipment", "A compact melee weapon."),
  item("legacy_item_club", "Club", "legacy_cat_melee_weapons", "equipment", "A simple blunt melee weapon."),
  item("legacy_item_claws", "Claws", "legacy_cat_melee_weapons", "equipment", "A natural melee attack used by creatures."),
  item("legacy_item_teeth", "Teeth", "legacy_cat_melee_weapons", "equipment", "A natural bite attack used by creatures."),
  item("legacy_item_fists", "Fists", "legacy_cat_melee_weapons", "equipment", "An unarmed attack entry from the starter material."),
  item("legacy_item_magical_crossbow", "Magical Crossbow", "legacy_cat_missile_weapons", "equipment", "A fantasy ranged weapon with magical force."),
  item("legacy_item_bow", "Bow", "legacy_cat_missile_weapons", "equipment", "A standard ranged weapon."),
  item("legacy_item_rifle", "Rifle", "legacy_cat_missile_weapons", "equipment", "A modern ranged weapon for spy or science-fiction adventures."),
  item("legacy_item_grenade", "Grenade", "legacy_cat_missile_weapons", "consumable", "A thrown explosive weapon."),
  item("legacy_item_chain_mail", "Chain Mail", "legacy_cat_armor", "equipment", "Fantasy armor for characters and guards."),
  item("legacy_item_thick_hide", "Thick Hide", "legacy_cat_armor", "equipment", "Natural armor used by beasts or monsters."),
  item("legacy_item_shield", "Shield", "legacy_cat_armor", "equipment", "Defensive gear for fantasy and heroic characters.")
];

export const legacyStarterTraitDefinitions: TraitDefinition[] = [
  { id: traitId("legacy_trait_person"), name: "Person", description: "Classic ACS person creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_animal"), name: "Animal", description: "Classic ACS animal creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_monster"), name: "Monster", description: "Classic ACS monster creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_magical_being"), name: "Magical Being", description: "Classic ACS magical-being creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_robot"), name: "Robot", description: "Classic ACS robot creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_vehicle"), name: "Vehicle", description: "Classic ACS vehicle creature type.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_friend"), name: "Friend", description: "Friendly role from classic person-role setup.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_enemy"), name: "Enemy", description: "Enemy role from classic person-role setup.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_thief"), name: "Thief", description: "Thief role from classic person-role setup.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_neutral"), name: "Neutral", description: "Neutral role from classic person-role setup.", categoryId: categoryId("legacy_cat_traits") },
  { id: traitId("legacy_trait_evil_being"), name: "Evil Being", description: "Fantasy evil-being archetype from the starter material.", categoryId: categoryId("legacy_cat_traits") }
];

export const legacyStarterEntityDefinitions: EntityDefinition[] = [
  entity("legacy_def_person_friend", "Person - Friend", "legacy_cat_creature_roles", "npc", "idle", ["legacy_trait_person", "legacy_trait_friend"], { life: 6, power: 2, speed: 2 }),
  entity("legacy_def_person_enemy", "Person - Enemy", "legacy_cat_creature_roles", "enemy", { mode: "guard", detectionRange: 4 }, ["legacy_trait_person", "legacy_trait_enemy"], { life: 7, power: 3, speed: 2 }, ["legacy_item_dagger"]),
  entity("legacy_def_person_thief", "Person - Thief", "legacy_cat_creature_roles", "enemy", { mode: "wander", detectionRange: 5 }, ["legacy_trait_person", "legacy_trait_thief"], { life: 5, power: 2, speed: 4 }, ["legacy_item_dagger"]),
  entity("legacy_def_person_neutral", "Person - Neutral", "legacy_cat_creature_roles", "npc", "idle", ["legacy_trait_person", "legacy_trait_neutral"], { life: 6, power: 1, speed: 2 }),
  entity("legacy_def_hostile_beast", "Beast - Hostile", "legacy_cat_creature_roles", "enemy", { mode: "wander", detectionRange: 4 }, ["legacy_trait_animal", "legacy_trait_enemy"], { life: 8, power: 3, speed: 3 }, ["legacy_item_claws"]),
  entity("legacy_def_neutral_beast", "Beast - Neutral", "legacy_cat_creature_roles", "npc", { mode: "wander", wanderRadius: 3 }, ["legacy_trait_animal", "legacy_trait_neutral"], { life: 7, power: 1, speed: 3 }),
  entity("legacy_def_monster", "Monster", "legacy_cat_creature_roles", "enemy", { mode: "pursue", detectionRange: 4 }, ["legacy_trait_monster", "legacy_trait_enemy"], { life: 10, power: 4, speed: 2 }, ["legacy_item_teeth"]),
  entity("legacy_def_magical_being", "Magical Being", "legacy_cat_creature_roles", "npc", "idle", ["legacy_trait_magical_being"], { life: 8, power: 5, speed: 2 }),
  entity("legacy_def_robot", "Robot", "legacy_cat_creature_roles", "enemy", { mode: "guard", detectionRange: 5 }, ["legacy_trait_robot"], { life: 9, power: 4, speed: 2 }, ["legacy_item_rifle"]),
  entity("legacy_def_vehicle", "Vehicle", "legacy_cat_creature_roles", "npc", "idle", ["legacy_trait_vehicle"], { life: 12, power: 0, speed: 5 }),
  entity("legacy_def_leprechaun", "Leprechaun", "legacy_cat_creature_roles", "npc", { mode: "wander", wanderRadius: 2 }, ["legacy_trait_magical_being", "legacy_trait_neutral"], { life: 5, power: 4, speed: 4 }, ["legacy_item_gold"]),
  entity("legacy_def_banshee", "Banshee", "legacy_cat_creature_roles", "enemy", { mode: "pursue", detectionRange: 5 }, ["legacy_trait_magical_being", "legacy_trait_enemy"], { life: 7, power: 5, speed: 3 }),
  entity("legacy_def_demon", "Demon", "legacy_cat_creature_roles", "enemy", { mode: "pursue", detectionRange: 6 }, ["legacy_trait_monster", "legacy_trait_evil_being"], { life: 12, power: 6, speed: 3 }, ["legacy_item_claws"]),
  entity("legacy_def_river_god", "River God", "legacy_cat_creature_roles", "npc", "idle", ["legacy_trait_magical_being"], { life: 14, power: 7, speed: 2 }),
  entity("legacy_def_ghost", "Ghost", "legacy_cat_creature_roles", "npc", { mode: "wander", wanderRadius: 4 }, ["legacy_trait_magical_being", "legacy_trait_neutral"], { life: 6, power: 4, speed: 3 })
];

export const legacyStarterSpellDefinitions: SpellDefinition[] = [
  spell("legacy_spell_effect_01_damage", "Spell Effect 01 - Damage", "Base spell-effect slot for direct damage or attack magic.", 2),
  spell("legacy_spell_effect_02_heal", "Spell Effect 02 - Heal", "Base spell-effect slot for restoring life force.", 2),
  spell("legacy_spell_effect_03_light", "Spell Effect 03 - Light", "Base spell-effect slot for light, reveal, or visibility effects.", 1),
  spell("legacy_spell_effect_04_unlock", "Spell Effect 04 - Unlock", "Base spell-effect slot for opening locked doors, gates, or containers.", 2),
  spell("legacy_spell_effect_05_protect", "Spell Effect 05 - Protect", "Base spell-effect slot for defense, warding, or armor effects.", 2),
  spell("legacy_spell_effect_06_detect", "Spell Effect 06 - Detect", "Base spell-effect slot for detecting hidden things, enemies, or clues.", 1),
  spell("legacy_spell_effect_07_teleport", "Spell Effect 07 - Teleport", "Base spell-effect slot for portal, blink, or relocation effects.", 3),
  spell("legacy_spell_effect_08_summon", "Spell Effect 08 - Summon", "Base spell-effect slot for adding creatures, objects, or room contents.", 3),
  spell("legacy_spell_effect_09_remove", "Spell Effect 09 - Remove", "Base spell-effect slot for removing obstacles, room contents, or effects.", 2),
  spell("legacy_spell_effect_10_transform", "Spell Effect 10 - Transform", "Base spell-effect slot for changing tiles, objects, or creature states.", 3),
  spell("legacy_spell_effect_11_message", "Spell Effect 11 - Message", "Base spell-effect slot for magical text, narration, or clue delivery.", 1),
  spell("legacy_spell_effect_12_boost", "Spell Effect 12 - Boost", "Base spell-effect slot for increasing life force, power, speed, or another stat.", 2),
  spell("legacy_spell_effect_13_reveal_portal", "Spell Effect 13 - Reveal Portal", "Base spell-effect slot for hidden doors, time windows, or secret travel links.", 2),
  spell("legacy_spell_effect_14_music_cue", "Spell Effect 14 - Music Cue", "Base spell-effect slot for music or sound-triggered magical events.", 1),
  spell("legacy_spell_effect_15_custom", "Spell Effect 15 - Custom", "Reserved custom spell-effect slot from the classic starter model.", 2),
  spell("legacy_spell_flight", "Flight Spell", "Documented starter utility spell for flying or bypassing grounded movement constraints.", 3)
];

export const legacyStarterCustomObjects: CustomLibraryObjectDefinition[] = [
  customObject("legacy_custom_thing_category_treasures", "Thing Category - Treasures", "legacyThingCategory", "Original ACS thing category for treasure objects.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_magic_item", "Thing Category - Magic Item", "legacyThingCategory", "Original ACS thing category for magic and special items.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_missile_weapon", "Thing Category - Missile Weapon", "legacyThingCategory", "Original ACS thing category for ranged weapons.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_melee_weapon", "Thing Category - Melee Weapon", "legacyThingCategory", "Original ACS thing category for melee weapons.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_armor", "Thing Category - Armor", "legacyThingCategory", "Original ACS thing category for armor.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_magic_spell", "Thing Category - Magic Spell", "legacyThingCategory", "Original ACS thing category for magic spells.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_portal", "Thing Category - Portal", "legacyThingCategory", "Original ACS thing category for portals.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_space", "Thing Category - Space", "legacyThingCategory", "Original ACS thing category for spaces.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_custom_space", "Thing Category - Custom Space", "legacyThingCategory", "Original ACS thing category for custom spaces.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_obstacle", "Thing Category - Obstacle", "legacyThingCategory", "Original ACS thing category for obstacles.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_custom_obstacle", "Thing Category - Custom Obstacle", "legacyThingCategory", "Original ACS thing category for custom obstacles.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_store", "Thing Category - Store", "legacyThingCategory", "Original ACS thing category for stores.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_thing_category_room_floor", "Thing Category - Room Floor", "legacyThingCategory", "Original ACS thing category for room floors.", "legacy_cat_custom_mechanics"),
  customObject("legacy_custom_graphics_page_terrain", "Graphics Page - Terrain", "legacyGraphicsPage", "Original ACS master graphics page for terrain graphics.", "legacy_cat_custom_mechanics", { capacity: 16 }),
  customObject("legacy_custom_graphics_page_mixed", "Graphics Page - Mixed Things", "legacyGraphicsPage", "Original ACS master graphics page for mixed thing graphics.", "legacy_cat_custom_mechanics", { capacity: 48 }),
  customObject("legacy_custom_graphics_page_creatures", "Graphics Page - Creatures", "legacyGraphicsPage", "Original ACS master graphics page for creature graphics.", "legacy_cat_custom_mechanics", { capacity: 46 })
];

const coreTileIds = legacyStarterTileDefinitions.map((definition) => definition.id);
const coreEntityIds = legacyStarterEntityDefinitions.map((definition) => definition.id);
const coreItemIds = legacyStarterItemDefinitions.map((definition) => definition.id);
const coreSpellIds = legacyStarterSpellDefinitions.map((definition) => definition.id);
const coreTraitIds = legacyStarterTraitDefinitions.map((definition) => definition.id);

export const legacyStarterPacks: StarterLibraryPackDefinition[] = [
  {
    id: "legacy_pack_classic_core",
    name: "Classic ACS Core Toolkit",
    genre: "classicAcs",
    description: "Shared construction-set categories, spaces, obstacles, portals, creature roles, base spell effects, and reusable things documented from the original ACS starter materials.",
    tileIds: coreTileIds,
    entityDefinitionIds: coreEntityIds,
    itemDefinitionIds: coreItemIds,
    spellDefinitionIds: coreSpellIds,
    traitDefinitionIds: coreTraitIds
  },
  {
    id: "legacy_pack_classic_fantasy",
    name: "Classic ACS Fantasy",
    genre: "fantasy",
    description: "The reusable fantasy starter-pack subset: treasure, magic items, fantasy weapons and armor, fantasy creatures, portals, spaces, obstacles, and spell effects. Land of Adventuria-only items stay with the custom game data.",
    tileIds: ["legacy_tile_room_floor", "legacy_tile_store", "legacy_tile_help_space", "legacy_tile_custom_space", "legacy_tile_obstacle", "legacy_tile_custom_obstacle", "legacy_tile_door", "legacy_tile_passageway", "legacy_tile_tunnel"].map(tileId),
    entityDefinitionIds: ["legacy_def_person_friend", "legacy_def_person_enemy", "legacy_def_person_thief", "legacy_def_person_neutral", "legacy_def_hostile_beast", "legacy_def_neutral_beast", "legacy_def_monster", "legacy_def_magical_being", "legacy_def_leprechaun", "legacy_def_banshee", "legacy_def_demon", "legacy_def_river_god", "legacy_def_ghost"].map(entityId),
    itemDefinitionIds: ["legacy_item_gold", "legacy_item_jewels", "legacy_item_magic_bag", "legacy_item_horse", "legacy_item_lantern", "legacy_item_rope", "legacy_item_magic_sword", "legacy_item_magical_crossbow", "legacy_item_bow", "legacy_item_dagger", "legacy_item_club", "legacy_item_claws", "legacy_item_teeth", "legacy_item_fists", "legacy_item_chain_mail", "legacy_item_thick_hide", "legacy_item_shield"].map(itemId),
    spellDefinitionIds: coreSpellIds,
    traitDefinitionIds: coreTraitIds
  },
  {
    id: "legacy_pack_classic_spy_mystery",
    name: "Classic ACS Spy/Mystery",
    genre: "modernSpy",
    description: "The reusable spy and mystery starter-pack subset: dollars, coded messages, modern weapons, decoder-style custom mechanics, people roles, portals, stores, and message/help spaces.",
    tileIds: ["legacy_tile_room_floor", "legacy_tile_store", "legacy_tile_help_space", "legacy_tile_message_custom_space", "legacy_tile_decoder_custom_space", "legacy_tile_door", "legacy_tile_passageway", "legacy_tile_tunnel", "legacy_tile_time_window"].map(tileId),
    entityDefinitionIds: ["legacy_def_person_friend", "legacy_def_person_enemy", "legacy_def_person_thief", "legacy_def_person_neutral", "legacy_def_robot", "legacy_def_vehicle"].map(entityId),
    itemDefinitionIds: ["legacy_item_dollars", "legacy_item_coded_message", "legacy_item_rifle", "legacy_item_grenade", "legacy_item_dagger", "legacy_item_fists", "legacy_item_lantern", "legacy_item_rope"].map(itemId),
    spellDefinitionIds: ["legacy_spell_effect_06_detect", "legacy_spell_effect_11_message", "legacy_spell_effect_13_reveal_portal"].map(spellId),
    traitDefinitionIds: ["legacy_trait_person", "legacy_trait_friend", "legacy_trait_enemy", "legacy_trait_thief", "legacy_trait_neutral", "legacy_trait_robot", "legacy_trait_vehicle"].map(traitId)
  },
  {
    id: "legacy_pack_classic_science_fiction",
    name: "Classic ACS Science Fiction",
    genre: "scienceFiction",
    description: "The reusable science-fiction starter-pack subset: crystite, transporters, time windows, modern weapons, robots, vehicles, and portal-oriented spell effects.",
    tileIds: ["legacy_tile_room_floor", "legacy_tile_custom_space", "legacy_tile_custom_obstacle", "legacy_tile_door", "legacy_tile_passageway", "legacy_tile_tunnel", "legacy_tile_time_window", "legacy_tile_beam_down_transporter"].map(tileId),
    entityDefinitionIds: ["legacy_def_person_friend", "legacy_def_person_enemy", "legacy_def_robot", "legacy_def_vehicle", "legacy_def_monster"].map(entityId),
    itemDefinitionIds: ["legacy_item_crystite", "legacy_item_rifle", "legacy_item_grenade", "legacy_item_fists", "legacy_item_lantern", "legacy_item_rope"].map(itemId),
    spellDefinitionIds: ["legacy_spell_effect_07_teleport", "legacy_spell_effect_10_transform", "legacy_spell_effect_13_reveal_portal", "legacy_spell_flight"].map(spellId),
    traitDefinitionIds: ["legacy_trait_person", "legacy_trait_enemy", "legacy_trait_robot", "legacy_trait_vehicle", "legacy_trait_monster"].map(traitId)
  }
];
