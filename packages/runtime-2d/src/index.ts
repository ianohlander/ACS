import type { AdventurePackage, EntityDefinition, MapDefinition } from "@acs/domain";
import type { GameSessionState, RuntimeEntityState } from "@acs/runtime-core";

export interface CanvasRendererOptions {
  tileSize?: number;
  showGrid?: boolean;
}

export class CanvasGameRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly tileSize: number;
  private readonly showGrid: boolean;
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

    for (const entityDefinition of adventure.entityDefinitions) {
      this.entityDefinitions.set(entityDefinition.id, entityDefinition);
    }

    for (const map of adventure.maps) {
      this.maps.set(map.id, map);
    }
  }

  render(state: GameSessionState): void {
    const map = this.maps.get(state.currentMapId);
    if (!map) {
      throw new Error(`Map '${state.currentMapId}' is not present in adventure package.`);
    }

    this.canvas.width = map.width * this.tileSize;
    this.canvas.height = map.height * this.tileSize;

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
      this.drawEntity(entity);
    }

    this.drawPlayer(state.player.x, state.player.y);
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

  private drawPlayer(x: number, y: number): void {
    const px = x * this.tileSize;
    const py = y * this.tileSize;

    this.context.fillStyle = "#f5d547";
    this.context.fillRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
    this.context.strokeStyle = "#1f1500";
    this.context.lineWidth = 2;
    this.context.strokeRect(px + 10, py + 10, this.tileSize - 20, this.tileSize - 20);
  }

  private drawEntity(entity: RuntimeEntityState): void {
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
