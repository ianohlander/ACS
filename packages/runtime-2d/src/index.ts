import type { AdventurePackage, ClassicSpriteStyle, DialogueNode, EntityDefinition, MapDefinition, VisualManifestDefinition } from "@acs/domain";
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
  private readonly tileClassicSpriteIds = new Map<string, string>();
  private readonly classicManifest: VisualManifestDefinition | undefined;
  private classicDialogueScrollOffset = 0;

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

    this.indexTileClassicSpriteIds();

    this.classicManifest = adventure.visualManifests.find((manifest) => manifest.mode === "classic-acs");
  }

  private indexTileClassicSpriteIds(): void {
    for (const tileDefinition of this.adventure.tileDefinitions ?? []) {
      if (tileDefinition.classicSpriteId) {
        this.tileClassicSpriteIds.set(String(tileDefinition.id), tileDefinition.classicSpriteId);
      }
    }
  }
  setMode(mode: RuntimeVisualMode): void {
    this.mode = mode;
  }

  getMode(): RuntimeVisualMode {
    return this.mode;
  }

  setClassicDialogueScrollOffset(offset: number): void {
    this.classicDialogueScrollOffset = Math.max(0, Math.floor(offset));
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
      statusX: 1068,
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
    const spriteId = this.tileClassicSpriteIds.get(tileId) ?? tileId;
    return this.classicManifest?.tileSprites[spriteId]
      ?? DEFAULT_CLASSIC_TILE_SPRITES[spriteId]
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
    const maxRail = 138 * metrics.scale;
    const power = Math.min(maxRail, (32 + state.turn * 6) * metrics.scale);
    const inventoryCount = Object.values(state.inventory).reduce((sum, quantity) => sum + Number(quantity), 0);
    const life = Math.max(28 * metrics.scale, Math.min(maxRail, (130 - state.entities.filter((entity) => entity.active && entity.mapId === state.currentMapId).length * 8) * metrics.scale));

    this.drawClassicMeter("POWER", metrics.statusX - 8 * metrics.scale, metrics.statusY, power, maxRail, "#1f4fff", metrics.scale);
    this.drawClassicMeter("LIFE", metrics.statusX + 46 * metrics.scale, metrics.statusY, life, maxRail, inventoryCount > 0 ? "#f5d547" : "#6f6f6f", metrics.scale);
  }

  private drawClassicMeter(label: string, x: number, y: number, value: number, maxValue: number, fill: string, scale: number): void {
    const wellWidth = 22 * scale;
    const wellTop = y + 34 * scale;
    const labelWidth = 44 * scale;

    this.context.font = `${9 * scale}px 'Courier New', monospace`;
    this.context.textAlign = "center";
    this.context.fillStyle = "#ffffff";
    this.context.fillText(label, x + labelWidth / 2, y + 18 * scale);

    this.context.fillStyle = "#15191e";
    this.context.fillRect(x + 15 * scale, wellTop, wellWidth, maxValue);
    this.context.strokeStyle = "#6f6f6f";
    this.context.lineWidth = 2 * scale;
    this.context.strokeRect(x + 15 * scale, wellTop, wellWidth, maxValue);

    this.context.fillStyle = fill;
    this.context.fillRect(x + 18 * scale, wellTop + maxValue - value, wellWidth - 6 * scale, value);
    this.context.textAlign = "start";
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

    const activeDialogue = this.getActiveDialogueNode(state);
    if (activeDialogue) {
      const textLines = this.wrapText(activeDialogue.text, 56);
      const visibleLineCount = 2;
      const maxOffset = Math.max(0, textLines.length - visibleLineCount);
      const scrollOffset = Math.min(this.classicDialogueScrollOffset, maxOffset);
      const visibleLines = textLines.slice(scrollOffset, scrollOffset + visibleLineCount);

      this.context.font = `${12 * metrics.scale}px 'Courier New', monospace`;
      this.context.fillStyle = "#f5d547";
      this.context.textAlign = "left";
      this.context.fillText((activeDialogue.speaker ?? "Dialogue").toUpperCase(), 34 * metrics.scale, metrics.bottomY + 18 * metrics.scale);
      this.context.fillStyle = "#ffffff";
      for (let index = 0; index < visibleLines.length; index += 1) {
        this.context.fillText(visibleLines[index] ?? "", 34 * metrics.scale, metrics.bottomY + (36 + index * 13) * metrics.scale);
      }
      this.context.fillStyle = "#9fb0be";
      this.context.textAlign = "right";
      const scrollHint = maxOffset > 0 ? `LINES ${scrollOffset + 1}-${Math.min(scrollOffset + visibleLineCount, textLines.length)}/${textLines.length}  UP/DOWN` : "";
      this.context.fillText(scrollHint || "ENTER / SPACE / E", metrics.width - 34 * metrics.scale, metrics.bottomY + 18 * metrics.scale);
      if (scrollHint) {
        this.context.fillText("ENTER / SPACE / E", metrics.width - 34 * metrics.scale, metrics.bottomY + 48 * metrics.scale);
      }
      this.context.textAlign = "start";
      return;
    }

    this.context.font = `${16 * metrics.scale}px 'Courier New', monospace`;
    this.context.fillStyle = "#ffffff";
    this.context.textAlign = "left";
    this.context.fillText("HERO", 34 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText(map.name.toUpperCase(), 176 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText(`TURN ${state.turn}`, 446 * metrics.scale, metrics.bottomY + 22 * metrics.scale);
    this.context.fillText("MOVE WITH THE ARROW KEYS", 118 * metrics.scale, metrics.bottomY + 42 * metrics.scale);
    this.context.textAlign = "start";
  }

  private getActiveDialogueNode(state: GameSessionState): DialogueNode | undefined {
    const active = state.activeDialogue;
    if (!active) {
      return undefined;
    }

    const dialogue = this.adventure.dialogue.find((candidate) => candidate.id === active.dialogueId);
    return dialogue?.nodes.find((candidate) => candidate.id === active.nodeId);
  }

  private wrapText(value: string, maxLength: number): string[] {
    const words = value.split(/\s+/).filter((word) => word.length > 0);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line.length > 0 ? `${line} ${word}` : word;
      if (candidate.length > maxLength && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line.length > 0) {
      lines.push(line);
    }

    return lines.length > 0 ? lines : [""];
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
