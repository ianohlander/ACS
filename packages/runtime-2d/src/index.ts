import type { AdventurePackage, EntityDefinition, MapDefinition } from "@acs/domain";
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
      width: 640,
      height: 400,
      viewportX: 24,
      viewportY: 24,
      viewportWidth: 496,
      viewportHeight: 296,
      statusX: 548,
      statusY: 42,
      bottomY: 330,
      tileSize: 32
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
  }): void {
    this.context.strokeStyle = "#6f6f6f";
    this.context.lineWidth = 2;
    this.context.strokeRect(8, 8, metrics.width - 16, metrics.height - 16);
    this.context.strokeStyle = "#1f4fff";
    this.context.strokeRect(metrics.viewportX - 2, metrics.viewportY - 2, metrics.viewportWidth + 4, metrics.viewportHeight + 4);

    this.context.fillStyle = "#a15a12";
    this.context.fillRect(metrics.statusX, metrics.statusY, 20, 178);
    this.context.fillStyle = "#6f6f6f";
    this.context.fillRect(metrics.statusX + 48, metrics.statusY + 32, 18, 146);
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

    this.drawClassicPlayer(originX + state.player.x * tileSize, originY + state.player.y * tileSize, tileSize);
  }

  private drawClassicTile(x: number, y: number, size: number, tileId: string): void {
    switch (tileId) {
      case "grass":
        this.drawDitheredRect(x, y, size, "#00a020", "#003c12");
        break;
      case "path":
        this.drawDitheredRect(x, y, size, "#a15a12", "#5a2b0a");
        break;
      case "water":
        this.drawDitheredRect(x, y, size, "#003cff", "#00145e");
        break;
      case "stone":
        this.drawDitheredRect(x, y, size, "#6f6f6f", "#1f4fff");
        break;
      case "floor":
        this.context.fillStyle = "#9a9a9a";
        this.context.fillRect(x, y, size, size);
        this.context.fillStyle = "#000000";
        this.context.fillRect(x + 2, y + 2, size - 4, 2);
        break;
      case "shrub":
        this.drawDitheredRect(x, y, size, "#00a020", "#000000");
        this.context.fillStyle = "#00ff48";
        this.context.fillRect(x + 10, y + 8, 12, 16);
        break;
      case "altar":
      case "altar-lit":
        this.context.fillStyle = tileId === "altar-lit" ? "#f5d547" : "#a15a12";
        this.context.fillRect(x + 8, y + 8, size - 16, size - 16);
        this.context.fillStyle = "#ffffff";
        this.context.fillRect(x + 14, y + 4, 4, size - 8);
        this.context.fillRect(x + 8, y + 14, size - 16, 4);
        break;
      case "door":
        this.context.fillStyle = "#1f4fff";
        this.context.fillRect(x + 8, y + 2, size - 16, size - 4);
        this.context.fillStyle = "#000000";
        this.context.fillRect(x + 12, y + 8, size - 24, size - 10);
        break;
      default:
        this.context.fillStyle = "#000000";
        this.context.fillRect(x, y, size, size);
        break;
    }
  }

  private drawDitheredRect(x: number, y: number, size: number, primary: string, secondary: string): void {
    this.context.fillStyle = primary;
    this.context.fillRect(x, y, size, size);
    this.context.fillStyle = secondary;

    for (let row = 0; row < size; row += 4) {
      for (let col = (row / 4) % 2 === 0 ? 0 : 4; col < size; col += 8) {
        this.context.fillRect(x + col, y + row, 4, 4);
      }
    }
  }

  private drawClassicPlayer(x: number, y: number, size: number): void {
    this.context.fillStyle = "#f5d547";
    this.context.fillRect(x + 14, y + 4, 4, 6);
    this.context.fillRect(x + 10, y + 10, 12, 12);
    this.context.fillRect(x + 6, y + 14, 6, 4);
    this.context.fillRect(x + 20, y + 14, 6, 4);
    this.context.fillRect(x + 10, y + 22, 4, 6);
    this.context.fillRect(x + 18, y + 22, 4, 6);
    this.context.strokeStyle = "#000000";
    this.context.strokeRect(x + 9, y + 9, size - 18, size - 12);
  }

  private drawClassicEntity(x: number, y: number, size: number, entity: RuntimeEntityState): void {
    const definition = this.entityDefinitions.get(entity.definitionId);
    const kind = definition?.kind ?? "npc";

    if (kind === "enemy") {
      this.context.fillStyle = "#bf4b45";
      this.context.fillRect(x + 8, y + 8, size - 16, size - 12);
      this.context.fillStyle = "#f5d547";
      this.context.fillRect(x + 8, y + 4, 6, 6);
      this.context.fillRect(x + size - 14, y + 4, 6, 6);
      this.context.fillStyle = "#000000";
      this.context.fillRect(x + 13, y + 16, 3, 3);
      this.context.fillRect(x + size - 16, y + 16, 3, 3);
      return;
    }

    this.context.fillStyle = kind === "container" ? "#a15a12" : "#ffffff";
    this.context.fillRect(x + 11, y + 6, size - 22, size - 12);
    this.context.fillStyle = "#1f4fff";
    this.context.fillRect(x + 14, y + 12, size - 28, 8);
  }

  private drawClassicStatusRail(state: GameSessionState, metrics: { statusX: number; statusY: number }): void {
    this.drawVerticalLabel("POWER", metrics.statusX + 7, metrics.statusY + 14, "#ffffff");
    this.drawVerticalLabel("LIFE", metrics.statusX + 55, metrics.statusY + 52, "#ffffff");

    const power = Math.min(160, 36 + state.turn * 7);
    const inventoryCount = Object.values(state.inventory).reduce((sum, quantity) => sum + Number(quantity), 0);
    const life = Math.max(30, 150 - state.entities.filter((entity) => entity.active && entity.mapId === state.currentMapId).length * 8);

    this.context.fillStyle = "#1f4fff";
    this.context.fillRect(metrics.statusX + 24, metrics.statusY + 178 - power, 14, power);
    this.context.fillStyle = inventoryCount > 0 ? "#f5d547" : "#6f6f6f";
    this.context.fillRect(metrics.statusX + 72, metrics.statusY + 178 - life, 14, life);
  }

  private drawVerticalLabel(text: string, x: number, y: number, color: string): void {
    this.context.font = "12px 'Courier New', monospace";
    this.context.fillStyle = color;
    for (let index = 0; index < text.length; index += 1) {
      this.context.fillText(text[index] ?? "", x, y + index * 13);
    }
  }

  private drawClassicMessageBand(
    map: MapDefinition,
    state: GameSessionState,
    metrics: { bottomY: number; width: number }
  ): void {
    this.context.fillStyle = "#000000";
    this.context.fillRect(16, metrics.bottomY, metrics.width - 32, 54);
    this.context.strokeStyle = "#6f6f6f";
    this.context.strokeRect(16, metrics.bottomY, metrics.width - 32, 54);

    this.context.font = "16px 'Courier New', monospace";
    this.context.fillStyle = "#ffffff";
    this.context.textAlign = "left";
    this.context.fillText("HERO", 34, metrics.bottomY + 22);
    this.context.fillText(map.name.toUpperCase(), 176, metrics.bottomY + 22);
    this.context.fillText(`TURN ${state.turn}`, 446, metrics.bottomY + 22);
    this.context.fillText("MOVE WITH THE ARROW KEYS", 118, metrics.bottomY + 42);
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
