import type {
  AdventurePackage,
  AssetRecord,
  CustomLibraryObjectDefinition,
  DialogueDefinition,
  EntityDefinition,
  FlagDefinition,
  ItemDefinition,
  LibraryCategoryDefinition,
  MediaCueDefinition,
  QuestDefinition,
  SkillDefinition,
  SoundCueDefinition,
  SpellDefinition,
  StarterGenre,
  StarterLibraryPackDefinition,
  TileDefinition,
  TraitDefinition
} from "@acs/domain";

export const customLibrarySchemaVersion = "1.0.0";

export const builtInStarterLibrarySource = {
  id: "acs-default-starter-library",
  name: "ACS Default Starter Library",
  version: "0.1.0",
  kind: "starter",
  description:
    "Built-in starter library collections shipped with the application. Adventures can copy from these packs, but should not mutate the source definitions directly."
} as const;

export type LibraryCollectionKind =
  | "categories"
  | "tiles"
  | "entities"
  | "items"
  | "skills"
  | "traits"
  | "spells"
  | "flags"
  | "customObjects"
  | "quests"
  | "dialogue"
  | "assets"
  | "mediaCues"
  | "soundCues";

export interface LibraryObjectCollections {
  categories: LibraryCategoryDefinition[];
  tiles: TileDefinition[];
  entities: EntityDefinition[];
  items: ItemDefinition[];
  skills: SkillDefinition[];
  traits: TraitDefinition[];
  spells: SpellDefinition[];
  flags: FlagDefinition[];
  customObjects: CustomLibraryObjectDefinition[];
  quests: QuestDefinition[];
  dialogue: DialogueDefinition[];
  assets: AssetRecord[];
  mediaCues: MediaCueDefinition[];
  soundCues: SoundCueDefinition[];
}

export interface StarterLibrarySnapshot {
  schemaVersion: typeof customLibrarySchemaVersion;
  source: typeof builtInStarterLibrarySource;
  starterPacks: StarterLibraryPackDefinition[];
  collections: LibraryObjectCollections;
}

export interface CustomLibraryExport {
  schemaVersion: typeof customLibrarySchemaVersion;
  source: "custom";
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  genreTags: StarterGenre[];
  basedOnStarterPackIds: string[];
  starterPacks: StarterLibraryPackDefinition[];
  collections: LibraryObjectCollections;
}

export function createLibraryCollections(pkg: AdventurePackage): LibraryObjectCollections {
  return {
    categories: [...pkg.libraryCategories],
    tiles: [...pkg.tileDefinitions],
    entities: [...pkg.entityDefinitions],
    items: [...pkg.itemDefinitions],
    skills: [...pkg.skillDefinitions],
    traits: [...pkg.traitDefinitions],
    spells: [...pkg.spellDefinitions],
    flags: [...pkg.flagDefinitions],
    customObjects: [...pkg.customLibraryObjects],
    quests: [...pkg.questDefinitions],
    dialogue: [...pkg.dialogue],
    assets: [...pkg.assets],
    mediaCues: [...pkg.mediaCues],
    soundCues: [...pkg.soundCues]
  };
}

export function createStarterLibrarySnapshot(pkg: AdventurePackage): StarterLibrarySnapshot {
  return {
    schemaVersion: customLibrarySchemaVersion,
    source: builtInStarterLibrarySource,
    starterPacks: [...pkg.starterLibraryPacks],
    collections: createLibraryCollections(pkg)
  };
}

export function createCustomLibraryExport(options: {
  id: string;
  name: string;
  package: AdventurePackage;
  description?: string;
  createdAt?: string;
  genreTags?: StarterGenre[];
  basedOnStarterPackIds?: string[];
  starterPacks?: StarterLibraryPackDefinition[];
}): CustomLibraryExport {
  const exportFile: CustomLibraryExport = {
    schemaVersion: customLibrarySchemaVersion,
    source: "custom",
    id: options.id,
    name: options.name,
    genreTags: options.genreTags ?? [],
    basedOnStarterPackIds: options.basedOnStarterPackIds ?? [],
    starterPacks: options.starterPacks ?? [],
    collections: createLibraryCollections(options.package)
  };

  if (options.description) {
    exportFile.description = options.description;
  }
  if (options.createdAt) {
    exportFile.createdAt = options.createdAt;
  }

  return exportFile;
}

export function listStarterPacksByGenre(
  snapshot: StarterLibrarySnapshot,
  genre: StarterGenre
): StarterLibraryPackDefinition[] {
  return snapshot.starterPacks.filter((pack) => pack.genre === genre);
}

export function listCustomLibraryObjectCounts(exportFile: CustomLibraryExport): Record<LibraryCollectionKind, number> {
  return {
    categories: exportFile.collections.categories.length,
    tiles: exportFile.collections.tiles.length,
    entities: exportFile.collections.entities.length,
    items: exportFile.collections.items.length,
    skills: exportFile.collections.skills.length,
    traits: exportFile.collections.traits.length,
    spells: exportFile.collections.spells.length,
    flags: exportFile.collections.flags.length,
    customObjects: exportFile.collections.customObjects.length,
    quests: exportFile.collections.quests.length,
    dialogue: exportFile.collections.dialogue.length,
    assets: exportFile.collections.assets.length,
    mediaCues: exportFile.collections.mediaCues.length,
    soundCues: exportFile.collections.soundCues.length
  };
}
