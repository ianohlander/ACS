import type {
  AdventurePackage,
  AssetId,
  ClassicPixelSpriteDefinition,
  MediaCueDefinition,
  SoundCueDefinition,
  StarterLibraryPackDefinition,
  VisualManifestDefinition
} from "@acs/domain";

export function listStarterLibraryPacks(pkg: AdventurePackage): StarterLibraryPackDefinition[] {
  return [...(pkg.starterLibraryPacks ?? [])].sort((a, b) => a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name));
}

export function listClassicPixelSprites(pkg: AdventurePackage): ClassicPixelSpriteDefinition[] {
  return activeClassicManifest(pkg)?.pixelSprites ?? [];
}

export function listMediaCues(pkg: AdventurePackage): MediaCueDefinition[] {
  return [...(pkg.mediaCues ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function listSoundCues(pkg: AdventurePackage): SoundCueDefinition[] {
  return [...(pkg.soundCues ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export function updateAdventurePresentation(
  pkg: AdventurePackage,
  updates: Partial<AdventurePackage["presentation"]>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  next.presentation = sanitizePresentation({ ...(next.presentation ?? {}), ...updates });
  return next;
}

export function updateClassicPixelSprite(
  pkg: AdventurePackage,
  spriteId: string,
  updates: Partial<ClassicPixelSpriteDefinition>
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const sprite = editableClassicPixelSprites(next).find((candidate) => candidate.id === spriteId);
  if (!sprite) {
    return next;
  }

  Object.assign(sprite, sanitizePixelSprite({ ...sprite, ...updates }));
  return next;
}

export function setClassicPixelSpritePixel(
  pkg: AdventurePackage,
  spriteId: string,
  x: number,
  y: number,
  paletteIndex: number
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const sprite = editableClassicPixelSprites(next).find((candidate) => candidate.id === spriteId);
  if (!sprite || !isWithinSprite(sprite, x, y)) {
    return next;
  }

  sprite.pixels[y * sprite.width + x] = clampPaletteIndex(paletteIndex, sprite.palette.length);
  return next;
}

export function createClassicPixelSprite(
  pkg: AdventurePackage,
  name = "New Pixel Sprite"
): AdventurePackage {
  const next = cloneAdventurePackage(pkg);
  const sprites = editableClassicPixelSprites(next);
  const id = createPixelSpriteId(sprites, name);
  sprites.push(createDefaultPixelSprite(id, name));
  return next;
}

function editableClassicPixelSprites(pkg: AdventurePackage): ClassicPixelSpriteDefinition[] {
  const manifest = ensureClassicManifest(pkg);
  manifest.pixelSprites = manifest.pixelSprites ?? [];
  return manifest.pixelSprites;
}

function ensureClassicManifest(pkg: AdventurePackage): VisualManifestDefinition {
  const existing = activeClassicManifest(pkg);
  if (existing) {
    return existing;
  }

  const manifest: VisualManifestDefinition = {
    id: "classic_manifest",
    name: "Classic ACS Manifest",
    mode: "classic-acs",
    tileSprites: {},
    entitySprites: {},
    uiSprites: {},
    pixelSprites: []
  };
  pkg.visualManifests.push(manifest);
  return manifest;
}

function activeClassicManifest(pkg: AdventurePackage): VisualManifestDefinition | undefined {
  return pkg.visualManifests.find((manifest) => manifest.mode === "classic-acs");
}

function sanitizePresentation(value: AdventurePackage["presentation"]): AdventurePackage["presentation"] {
  const sanitized: AdventurePackage["presentation"] = {};
  if (value.splashAssetId) {
    sanitized.splashAssetId = value.splashAssetId;
  }
  if (value.startingMusicAssetId) {
    sanitized.startingMusicAssetId = value.startingMusicAssetId;
  }
  if (value.introText?.trim()) {
    sanitized.introText = value.introText.trim();
  }
  return sanitized;
}

function sanitizePixelSprite(sprite: ClassicPixelSpriteDefinition): ClassicPixelSpriteDefinition {
  const width = Math.max(1, Math.floor(sprite.width));
  const height = Math.max(1, Math.floor(sprite.height));
  const palette = sprite.palette.length > 0 ? sprite.palette : ["#000000", "#ffffff"];
  return {
    ...sprite,
    id: sprite.id.trim() || "pixel_sprite",
    name: sprite.name.trim() || sprite.id,
    width,
    height,
    palette,
    pixels: normalizePixels(sprite.pixels, width * height, palette.length),
    tags: sprite.tags ?? [],
    genreTags: sprite.genreTags ?? []
  };
}

function normalizePixels(values: number[], length: number, paletteLength: number): number[] {
  return Array.from({ length }, (_, index) => clampPaletteIndex(values[index] ?? 0, paletteLength));
}

function createDefaultPixelSprite(id: string, name: string): ClassicPixelSpriteDefinition {
  return {
    id,
    name,
    usage: "tile",
    width: 8,
    height: 8,
    palette: ["#000000", "#ffffff", "#f5d547", "#1f4fff"],
    pixels: Array.from({ length: 64 }, (_, index) => index % 9 === 0 ? 2 : 0),
    tags: ["custom"],
    genreTags: []
  };
}

function createPixelSpriteId(sprites: ClassicPixelSpriteDefinition[], seed: string): string {
  const base = `pixel_${slugify(seed || "sprite")}`;
  const existing = new Set(sprites.map((sprite) => sprite.id));
  let index = 1;
  let candidate = base;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }
  return candidate;
}

function isWithinSprite(sprite: ClassicPixelSpriteDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < sprite.width && y < sprite.height;
}

function clampPaletteIndex(value: number, paletteLength: number): number {
  return Math.max(0, Math.min(Math.floor(value), Math.max(0, paletteLength - 1)));
}

function cloneAdventurePackage(pkg: AdventurePackage): AdventurePackage {
  return JSON.parse(JSON.stringify(pkg)) as AdventurePackage;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "sprite";
}
