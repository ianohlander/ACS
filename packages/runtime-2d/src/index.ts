import type { AdventurePackage, ClassicSpriteStyle, EntityDefinition, MapDefinition, VisualManifestDefinition } from "@acs/domain";
import type { GameSessionState, RuntimeEntityState } from "@acs/runtime-core";

export type RuntimeVisualMode = "debug-grid" | "classic-acs";

export interface CanvasRendererOptions {
  tileSize?: number;
  showGrid?: boolean;
  mode?: RuntimeVisualMode;
}

export class CanvasGameRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly tileSize: number;
  private readonly showGrid: boolean;
  private mode: RuntimeVisualMode;
  private readonly entityDefinitions = new Map<string, EntityDefinition>();
  private readonly maps = new Map<string, MapDefinition>();
  private readonly classicManifest: VisualManifestDefinition | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly adventure: AdventurePackage,
    options: CanvasRendererOptions = {}
  ) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.context = context;
    this.tileSize = options.tileSize ?? 48;
    this.showGrid = options.showGrid ?? true;
    this.mode = options.mode ?? "debug-grid";

    for (const entityDefinition of adventure.entityDefinitions) {
      this.entityDefinitions.set(entityDefinition.id, entityDefinition);
    }

    for (const map of adventure.maps) {
      this.maps.set(map.id, map);
    }

    this.classicManifest = adventure.visualManifests.find((manifest) => manifest.mode === "classic-acs");
  }

  setMode(mode: RuntimeVisualMode): void {
    this.mode = mode;
  }

  getMode(): RuntimeVisualMode {
    return this.mode;
  }

  render(state: GameSessionState): void {
    if (this.mode === "classic-acs") {
      this.renderClassic(state);
      return;
    }

    this.renderDebugGrid(state);
  }

  private renderDebugGrid(state: GameSessionState): void {
    const map = this.requireMap(state.currentMapId);

    this.canvas.width = map.width * this.tileSize;
    this.canvas.height = map.height * this.tileSize;
    this.context.imageSmoothingEnabled = false;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const tileId = this.resolveTileId(map, state, x, y);
        this.context.fillStyle = tileColor(tileId);
        this.context.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

        if (this.showGrid) {
          this.context.strokeStyle = "rgba(255,255,255,0.12)";
          this.context.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }

    for (const entity of state.entities.filter((candidate) => candidate.active && candidate.mapId === state.currentMapId)) {
      this.drawDebugEntity(entity);
    }

    this.drawDebugPlayer(state.player.x, state.player.y);
  }

  private renderClassic(state: GameSessionState): void {
    const map = this.requireMap(state.currentMapId);
    const metrics = {
      width: 1280,
      height: 800,
      viewportX: 48,
      viewportY: 48,
      viewportWidth: 992,
      viewportHeight: 592,
      statusX: 1096,
      statusY: 84,
      bottomY: 660,
      tileSize: 64,
      scale: 2
    };

    this.canvas.width = metrics.width;
    this.canvas.height = metrics.height;
    this.context.imageSmoothingEnabled = false;
    this.context.fillStyle = "#000000";
    this.context.fillRect(0, 0, metrics.width, metrics.height);

    this.drawClassicFrame(metrics);
    this.drawClassicMap(map, state, metrics);
    this.drawClassicStatusRail(state, metrics);
    this.drawClassicMessageBand(map, state, metrics);
  }

  private drawClassicFrame(metrics: {
    width: number;
    height: number;
    viewportX: number;
    viewportY: number;
    viewportWidth: number;
    viewportHeight: number;
    statusX: number;
    statusY: number;
    bottomY: number;
    tileSize: number;
    scale: number;
  }): void {
    this.context.strokeStyle = "#6f6f6f";
    this.context.lineWidth = 2 * metrics.scale;
    this.context.strokeRect(8 * metrics.scale, 8 * metrics.scale, metrics.width - 16 * metrics.scale, metrics.height - 16 * metrics.scale);
    this.context.strokeStyle = "#1f4fff";
    this.context.strokeRect(metrics.viewportX - 2 * metrics.scale, metrics.viewportY - 2 * metrics.scale, metrics.viewportWidth + 4 * metrics.scale, metrics.viewportHeight + 4 * metrics.scale);

    this.context.fillStyle = "#a15a12";
    this.context.fillRect(metrics.statusX, metrics.statusY, 20 * metrics.scale, 178 * metrics.scale);
    this.context.fillStyle = "#6f6f6f";
    this.context.fillRect(metrics.statusX + 48 * metrics.scale, metrics.statusY + 32 * metrics.scale, 18 * metrics.scale, 146 * metrics.scale);
  }

  private drawClassicMap(
    map: MapDefinition,
    state: GameSessionState,
    metrics: { viewportX: number; viewportY: number; viewportWidth: number; viewportHeight: number; tileSize: number }
  ): void {
    const tileSize = metrics.tileSize;
    const mapPixelWidth = map.width * tileSize;
    const mapPixelHeight = map.height * tileSize;
    const originX = metrics.viewportX + Math.floor((metrics.viewportWidth - mapPixelWidth) / 2);
    const originY = metrics.viewportY + Math.floor((metrics.viewportHeight - mapPixelHeight) / 2);

    this.context.fillStyle = "#000000";
    this.context.fillRect(metrics.viewportX, metrics.viewportY, metrics.viewportWidth, metrics.viewportHeight);

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const tileId = this.resolveTileId(map, state, x, y);
        this.drawClassicTile(originX + x * tileSize, originY + y * tileSize, tileSize, tileId);
      }
    }

    for (const entity of state.entities.filter((candidate) => candidate.active && candidate.mapId === state.currentMapId)) {
      this.drawClassicEntity(originX + entity.x * tileSize, originY + entity.y * tileSize, tileSize, entity);
    }

    this.drawClassicPlayer(originX + state.player.x * tileSize, originY + state.player.y * tileSize, tileSize, state);
  }

  private drawClassicTile(x: number, y: number, size: number, tileId: string): void {
    this.drawClassicSprite(x, y, size, this.resolveClassicTileSprite(tileId));
  }

  private drawDitheredRect(x: number, y: number, size: number, primary: string, secondary: string): void {
    this.context.fillStyle = primary;
    this.context.fillRect(x, y, size, size);
    this.context.fillStyle = secondary;

    const dot = Math.max(4, size / 8);
    const step = dot * 2;

    for (let row = 0; row < size; row += dot) {
      for (let col = (row / dot) % 2 === 0 ? 0 : dot; col < size; col += step) {
        this.context.fillRect(x + col, y + row, dot, dot);
      }
    }
  }

  private drawClassicPlayer(x: number, y: number, size: number, state: GameSessionState): void {
    const playerDefinitionId = state.player.party[0];
    const definition = playerDefinitionId ? this.entityDefinitions.get(playerDefinitionId) : undefined;
    this.drawClassicSprite(x, y, size, this.resolveClassicEntitySprite(definition, "player"));
  }

  private drawClassicEntity(x: number, y: number, size: number, entity: RuntimeEntityState): void {
    const definition = this.entityDefinitions.get(entity.definitionId);
    this.drawClassicSprite(x, y, size, this.resolveClassicEntitySprite(definition, definition?.kind ?? "npc"));
  }

  private resolveClassicTileSprite(tileId: string): ClassicSpriteStyle {
    return this.classicManifest?.tileSprites[tileId]
      ?? DEFAULT_CLASSIC_TILE_SPRITES[tileId]
      ?? DEFAULT_CLASSIC_VOID_TILE_SPRITE;
  }

  private resolveClassicEntitySprite(definition: EntityDefinition | undefined, fallbackKind: EntityDefinition["kind"]): ClassicSpriteStyle {
    const assetKey = definition?.assetId ? String(definition.assetId) : undefined;
    const definitionKey = definition?.id ? String(definition.id) : undefined;

    if (assetKey && this.classicManifest?.entitySprites[assetKey]) {
      return this.classicManifest.entitySprites[assetKey];
    }

    if (definitionKey && this.classicManifest?.entitySprites[definitionKey]) {
      return this.classicManifest.entitySprites[definitionKey];
    }

    return DEFAULT_CLASSIC_ENTITY_SPRITES[fallbackKind];
  }

  private drawClassicSprite(x: number, y: number, size: number, sprite: ClassicSpriteStyle): void {
    const unit = size / 32;
    const shadow = sprite.shadow ?? "#000000";
    const accent = sprite.accent ?? "#ffffff";
    const line = sprite.line ?? "#000000";

    switch (sprite.pattern) {
      case "solid":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x, y, size, size);
        break;
      case "dither":
        this.drawDitheredRect(x, y, size, sprite.fill, shadow);
        break;
      case "floor":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x, y, size, size);
        this.context.fillStyle = shadow;
        this.context.fillRect(x + 2 * unit, y + 2 * unit, size - 4 * unit, 2 * unit);
        break;
      case "shrub":
        this.drawDitheredRect(x, y, size, sprite.fill, shadow);
        this.context.fillStyle = accent;
        this.context.fillRect(x + 10 * unit, y + 8 * unit, 12 * unit, 16 * unit);
        break;
      case "altar":
      case "seal":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x + 8 * unit, y + 8 * unit, size - 16 * unit, size - 16 * unit);
        this.context.fillStyle = accent;
        this.context.fillRect(x + 14 * unit, y + 4 * unit, 4 * unit, size - 8 * unit);
        this.context.fillRect(x + 8 * unit, y + 14 * unit, size - 16 * unit, 4 * unit);
        break;
      case "door":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x + 8 * unit, y + 2 * unit, size - 16 * unit, size - 4 * unit);
        this.context.fillStyle = shadow;
        this.context.fillRect(x + 12 * unit, y + 8 * unit, size - 24 * unit, size - 10 * unit);
        break;
      case "hero":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x + 14 * unit, y + 4 * unit, 4 * unit, 6 * unit);
        this.context.fillRect(x + 10 * unit, y + 10 * unit, 12 * unit, 12 * unit);
        this.context.fillRect(x + 6 * unit, y + 14 * unit, 6 * unit, 4 * unit);
        this.context.fillRect(x + 20 * unit, y + 14 * unit, 6 * unit, 4 * unit);
        this.context.fillRect(x + 10 * unit, y + 22 * unit, 4 * unit, 6 * unit);
        this.context.fillRect(x + 18 * unit, y + 22 * unit, 4 * unit, 6 * unit);
        this.context.strokeStyle = line;
        this.context.strokeRect(x + 9 * unit, y + 9 * unit, size - 18 * unit, size - 12 * unit);
        break;
      case "oracle":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x + 11 * unit, y + 6 * unit, size - 22 * unit, size - 12 * unit);
        this.context.fillStyle = accent;
        this.context.fillRect(x + 14 * unit, y + 12 * unit, size - 28 * unit, 8 * unit);
        this.context.strokeStyle = line;
        this.context.strokeRect(x + 10 * unit, y + 5 * unit, size - 20 * unit, size - 10 * unit);
        break;
      case "wolf":
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x + 8 * unit, y + 8 * unit, size - 16 * unit, size - 12 * unit);
        this.context.fillStyle = accent;
        this.context.fillRect(x + 8 * unit, y + 4 * unit, 6 * unit, 6 * unit);
        this.context.fillRect(x + size - 14 * unit, y + 4 * unit, 6 * unit, 6 * unit);
        this.context.fillStyle = line;
        this.context.fillRect(x + 13 * unit, y + 16 * unit, 3 * unit, 3 * unit);
        this.context.fillRect(x + size - 16 * unit, y + 16 * unit, 3 * unit, 3 * unit);
        break;
      default:
        this.context.fillStyle = sprite.fill;
        this.context.fillRect(x, y, size, size);
        break;
    }
  }

  private drawClassicStatusRail(state: GameSessionState, metrics: { statusX: number; statusY: number; scale: number }): void {
    this.drawVerticalLabel("POWER", metrics.statusX + 7 * metrics.scale, metrics.statusY + 14 * metrics.scale, "#ffffff", metrics.scale);
    this.drawVerticalLabel("LIFE", metrics.statusX + 55 * metrics.scale, metrics.statusY + 52 * metrics.scale, "#ffffff", metrics.scale);

    const maxRail = 160 * metrics.scale;
    const power = Math.min(maxRail, (36 + state.turn * 7) * metrics.scale);
    const inventoryCount = Object.values(state.inventory).reduce((sum, quantity) => sum + Number(quantity), 0);
    const life = Math.max(30 * metrics.scale, (150 - state.entities.filter((entity) => entity.active && entity.mapId === state.currentMapId).length * 8) * metrics.scale);

    this.context.fillStyle = "#1f4fff";
    this.context.fillRect(metrics.statusX + 24 * metrics.scale, metrics.statusY + 178 * metrics.scale - power, 14 * metrics.scale, power);
    this.context.fillStyle = inventoryCount > 0 ? "#f5d547" : "#6f6f6f";
    this.context.fillRect(metrics.statusX + 72 * metrics.scale, metrics.statusY + 178 * metrics.scale - life, 14 * metrics.scale, life);
  }

  private drawVerticalLabel(text: string, x: number, y: number, color: string, scale: number): void {
    this.context.font = `${12 * scale}px 'Courier New', monospace`;
    this.context.fillStyle = color;
    for (let index = 0; index < text.length; index += 1) {
      this.context.fillText(text[index] ?? "", x, y + index * 13 * scale);
    }
  }

  private drawClassicMessageBand(
    map: MapDefinition,
    state: GameSessionState,
    metrics: { bottomY: number; width: number; scale: number }
  ): void {
    this.context.fillStyle = "#000000";
    this.context.fillRect(16 * metrics.scale, metrics.bottomY, metrics.width - 32 * metrics.scale, 54 * metrics.scale);
    this.context.strokeStyle = "#6f6f6f";
    this.context.lineWidth = 2 * metrics.scale;
    this.context.strokeRect(16 * metrics.scale, metrics.bottomY, metrics.width - 32 * metrics.scale, 54 * metrics.scale);

    this.context.font = `${16 * metrics.scale}px 'Courier New', monospace`;
    this.context.fillStyle = "#ffffff";
    this.context.textAlign = "left";
    this.context.fillText("HERO", 34 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText(map.name.toUpperCase(), 176 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText(`TURN ${state.turn}`, 446 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText("MOVE WITH THE ARROW KEYS", 118 * metrics.scale, metrics.bottomY + 42 * metrics.scale);
    this.context.textAlign = "start";
  }

  private resolveTileId(map: MapDefinition, state: GameSessionState, x: number, y: number): string {
    const overrideKey = `${state.currentMapId}:${x},${y}`;
    const overrideTile = state.tileOverrides[overrideKey]?.tileId;
    if (overrideTile) {
      return overrideTile;
    }

    for (let index = map.tileLayers.length - 1; index >= 0; index -= 1) {
      const layer = map.tileLayers[index];
      if (!layer) {
        continue;
      }

      const tileId = layer.tileIds[y * map.width + x];
      if (tileId && tileId !== "void") {
        return tileId;
      }
    }

    return "void";
  }

  private drawDebugPlayer(x: number, y: number): void {
    const px = x * this.tileSize;
    const py = y * this.tileSize;

    this.context.fillStyle = "#f5d547";
    this.context.fillRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
    this.context.strokeStyle = "#1f1500";
    this.context.lineWidth = 2;
    this.context.strokeRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
  }

  private drawDebugEntity(entity: RuntimeEntityState): void {
    const definition = this.entityDefinitions.get(entity.definitionId);
    const px = entity.x * this.tileSize;
    const py = entity.y * this.tileSize;

    this.context.fillStyle = entityColor(definition?.kind ?? "npc");
    this.context.beginPath();
    this.context.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize / 3, 0, Math.PI * 2);
    this.context.fill();

    this.context.strokeStyle = "#101418";
    this.context.lineWidth = 2;
    this.context.stroke();
  }

  private requireMap(mapId: string): MapDefinition {
    const map = this.maps.get(mapId);
    if (!map) {
      throw new Error(`Map '${mapId}' is not present in adventure package.`);
    }

    return map;
  }
}


const DEFAULT_CLASSIC_VOID_TILE_SPRITE: ClassicSpriteStyle = { pattern: "solid", fill: "#000000" };

const DEFAULT_CLASSIC_TILE_SPRITES: Record<string, ClassicSpriteStyle> = {
  grass: { pattern: "dither", fill: "#00a020", shadow: "#003c12" },
  path: { pattern: "dither", fill: "#a15a12", shadow: "#5a2b0a" },
  water: { pattern: "dither", fill: "#003cff", shadow: "#00145e" },
  stone: { pattern: "dither", fill: "#6f6f6f", shadow: "#1f4fff" },
  floor: { pattern: "floor", fill: "#9a9a9a", shadow: "#000000" },
  shrub: { pattern: "shrub", fill: "#00a020", shadow: "#000000", accent: "#00ff48" },
  altar: { pattern: "altar", fill: "#a15a12", accent: "#ffffff" },
  "altar-lit": { pattern: "altar", fill: "#f5d547", accent: "#ffffff" },
  door: { pattern: "door", fill: "#1f4fff", shadow: "#000000" },
  void: DEFAULT_CLASSIC_VOID_TILE_SPRITE
};

const DEFAULT_CLASSIC_ENTITY_SPRITES: Record<EntityDefinition["kind"], ClassicSpriteStyle> = {
  player: { pattern: "hero", fill: "#f5d547", line: "#000000" },
  npc: { pattern: "oracle", fill: "#ffffff", accent: "#1f4fff", line: "#000000" },
  enemy: { pattern: "wolf", fill: "#bf4b45", accent: "#f5d547", line: "#000000" },
  container: { pattern: "oracle", fill: "#a15a12", accent: "#1f4fff", line: "#000000" }
};
function tileColor(tileId: string): string {
  switch (tileId) {
    case "grass":
      return "#497c4c";
    case "path":
      return "#a58258";
    case "water":
      return "#2e5b88";
    case "stone":
      return "#68737d";
    case "altar":
      return "#c4a85a";
    case "altar-lit":
      return "#e1c66f";
    case "shrub":
      return "#2d5132";
    case "door":
      return "#704b2e";
    case "floor":
      return "#8b8f94";
    default:
      return "#1f2329";
  }
}

function entityColor(kind: EntityDefinition["kind"]): string {
  switch (kind) {
    case "enemy":
      return "#bf4b45";
    case "container":
      return "#d79b59";
    case "player":
      return "#f5d547";
    case "npc":
    default:
      return "#f3f4f6";
  }
}
