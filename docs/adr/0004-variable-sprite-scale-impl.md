# ADR 0004: Variable Sprite Scale System - Implementation Package

## Quick Reference

**Status:** Proposed (Deferred)  
**Target Milestone:** Milestone 33+  
**Prerequisite:** ADR 0003 (Item Usage System)  
**Related ADRs:** ADR 0001 (Architecture Boundaries)

---

## 1. Domain Model Changes

### 1.1 EntityDefinition Extensions

```typescript
// MODIFY in packages/domain/src/index.ts

export type EntityRenderLayer = "floor" | "object" | "character" | "overhead";

export interface EntityVisualScale {
  width: number;      // tile units: 0.5, 1, 1.5, 2, etc.
  height: number;
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "center" | "bottom";
}

// MODIFY existing EntityDefinition
export interface EntityDefinition {
  id: EntityDefId;
  categoryId?: LibraryCategoryId;
  name: string;
  kind: "player" | "npc" | "enemy" | "container";
  placement?: "singleton" | "multiple";
  behavior?: EntityBehaviorMode | EntityBehaviorProfile;
  profile?: EntityProfile;
  startingPossessions?: EntityStartingPossession[];
  faction?: string;
  assetId?: AssetId;
  visual?: VisualPresentationBinding;
  capabilityProfileId?: string;
  
  // NEW: Visual presentation (16-bit+ modes)
  visualScale?: EntityVisualScale;
  renderLayer?: EntityRenderLayer;
}
```

### 1.2 TileDefinition Extensions

```typescript
// MODIFY in packages/domain/src/index.ts

export interface TileDefinition {
  id: TileDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  passability: TilePassability;
  interactionHint?: string;
  tags: string[];
  classicSpriteId?: string;
  visual?: VisualPresentationBinding;
  
  // NEW: For 16-bit+ modes
  visualScale?: {
    width: number;   // tile units: 1, 2, 3...
    height: number;
  };
}
```

### 1.3 VisualManifestDefinition — Add HD Modes

```typescript
// MODIFY in packages/domain/src/index.ts

export type VisualMode = "classic-acs" | "16-bit" | "hd" | "3d";

export interface VisualManifestDefinition {
  id: string;
  name: string;
  mode: VisualMode;
  tileSprites: Record<string, ClassicSpriteStyle>;
  entitySprites: Record<string, ClassicSpriteStyle>;
  uiSprites?: Record<string, ClassicSpriteStyle>;
  pixelSprites?: ClassicPixelSpriteDefinition[];
  
  // NEW: HD bitmap sprites
  hdTileSprites?: HdTileSpriteDefinition[];
  hdEntitySprites?: HdEntitySpriteDefinition[];
}

export interface HdTileSpriteDefinition {
  id: string;
  name: string;
  width: number;    // pixels (e.g., 32, 64)
  height: number;
  frames: number;  // animation frames (1 = static)
  frameDuration: number;  // ms per frame
  pixels: number[];  // RGBA array (width * height * 4)
}

export interface HdEntitySpriteDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  frames: number;
  frameDuration: number;
  pixels: number[];
  collisionMask: number[];  // 0 = transparent, 1 = solid
}
```

### 1.4 ItemDefinition — Add Missile Properties

```typescript
// ADD to packages/domain/src/index.ts

export interface MissileProperties {
  speed: number;           // tiles per second
  trajectory: "straight" | "arc" | "boomerang";
  range: number;           // max tiles
  useEuclideanDistance: boolean;  // true = Euclidean, false = Manhattan
  collisionMask?: number[];       // custom collision for projectile
}

// MODIFY ItemEffect
export interface ItemEffect {
  // ... existing fields ...
  
  // NEW: Missile-specific
  missileProperties?: MissileProperties;
}
```

---

## 2. Collision System (New Module)

### 2.1 Collision Types

```typescript
// NEW FILE: packages/runtime-core/src/collision.ts

export interface CollisionBox {
  x: number;      // pixel coordinates
  y: number;
  width: number;
  height: number;
}

export interface CollisionResult {
  hit: boolean;
  overlapArea: number;
  contactPoint: { x: number; y: number };
}

export type CollisionMode = "tile" | "pixel";

export interface CollisionConfig {
  mode: CollisionMode;
  tileSize: number;
}
```

### 2.2 Pixel-Accurate Collision

```typescript
// packages/runtime-core/src/collision.ts

export function checkPixelCollision(
  attackerBox: CollisionBox,
  defenderMask: number[],
  defenderWidth: number,
  defenderHeight: number
): CollisionResult {
  const attackerPixels = getPixelPositions(attackerBox);
  let overlapCount = 0;
  let contactX = 0;
  let contactY = 0;
  let hitCount = 0;

  for (const pixel of attackerPixels) {
    if (pixel.x >= 0 && pixel.x < defenderWidth &&
        pixel.y >= 0 && pixel.y < defenderHeight) {
      const maskIndex = Math.floor(pixel.y) * defenderWidth + Math.floor(pixel.x);
      if (defenderMask[maskIndex] === 1) {
        overlapCount++;
        contactX += pixel.x;
        contactY += pixel.y;
        hitCount++;
      }
    }
  }

  return {
    hit: overlapCount > 0,
    overlapArea: overlapCount,
    contactPoint: hitCount > 0 
      ? { x: contactX / hitCount, y: contactY / hitCount }
      : { x: 0, y: 0 }
  };
}

function getPixelPositions(box: CollisionBox): Array<{x: number, y: number}> {
  const pixels = [];
  for (let x = Math.floor(box.x); x < box.x + box.width; x++) {
    for (let y = Math.floor(box.y); y < box.y + box.height; y++) {
      pixels.push({ x, y });
    }
  }
  return pixels;
}
```

### 2.3 Distance Calculations

```typescript
// packages/runtime-core/src/collision.ts

export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function getMissilePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number
): Array<{ x: number; y: number }> {
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t
    });
  }
  return path;
}

export function checkMissileHit(
  path: Array<{ x: number; y: number }>,
  entityBox: CollisionBox,
  entityMask: number[],
  entityWidth: number,
  entityHeight: number
): CollisionResult {
  for (const point of path) {
    const tipBox: CollisionBox = {
      x: point.x,
      y: point.y,
      width: 1,  // missile tip width
      height: 1
    };
    const result = checkPixelCollision(tipBox, entityMask, entityWidth, entityHeight);
    if (result.hit) return result;
  }
  return { hit: false, overlapArea: 0, contactPoint: { x: 0, y: 0 } };
}
```

### 2.4 Tile-Based Collision (Default for 8-bit)

```typescript
// packages/runtime-core/src/collision.ts

export function checkTileCollision(
  entityX: number,
  entityY: number,
  targetX: number,
  targetY: number
): boolean {
  return entityX === targetX && entityY === targetY;
}

export function checkTileCollisionWithScale(
  entityX: number,
  entityY: number,
  entityScale: { width: number; height: number },
  targetX: number,
  targetY: number
): boolean {
  // Check all tiles covered by scaled entity
  for (let dx = 0; dx < entityScale.width; dx++) {
    for (let dy = 0; dy < entityScale.height; dy++) {
      if (entityX + dx === targetX && entityY + dy === targetY) {
        return true;
      }
    }
  }
  return false;
}
```

---

## 3. Runtime Engine Changes

### 3.1 RuntimeEntityState Extensions

```typescript
// MODIFY in packages/runtime-core/src/types.ts

export interface RuntimeEntityState {
  id: EntityId;
  definitionId: EntityDefId;
  mapId: MapId;
  x: number;
  y: number;
  active: boolean;
  stats: {
    life: number;
    power: number;
    speed: number;
  };
  inventory?: Record<ItemDefId, number>;
  skills?: Set<SkillDefId>;
  traits?: Set<TraitDefId>;
  
  // NEW: Visual presentation state
  currentFrame?: number;
  animationTime?: number;
}
```

### 3.2 GameSession — Use Appropriate Collision

```typescript
// MODIFY in packages/runtime-core/src/game-session.ts

export class RuntimeGameSession implements GameSession {
  private readonly collisionMode: CollisionMode;
  
  constructor(pkg: AdventurePackage, snapshot?: RuntimeSnapshot) {
    // ... existing code ...
    this.collisionMode = this.determineCollisionMode(pkg);
  }
  
  private determineCollisionMode(pkg: AdventurePackage): CollisionMode {
    // Use pixel collision for 16-bit+ if HD sprites exist
    const manifest = pkg.visualManifests.find(m => 
      m.mode === "16-bit" || m.mode === "hd" || m.mode === "3d"
    );
    if (manifest?.hdEntitySprites?.length) {
      return "pixel";
    }
    return "tile";  // Default for 8-bit
  }
  
  private checkEntityCollision(
    attackerId: EntityId,
    defenderId: EntityId,
    events: EngineEvent[]
  ): boolean {
    const attacker = this.state.entities.find(e => e.id === attackerId);
    const defender = this.state.entities.find(e => e.id === defenderId);
    if (!attacker || !defender) return false;
    
    if (this.collisionMode === "pixel") {
      return this.checkPixelEntityCollision(attacker, defender, events);
    }
    return this.checkTileEntityCollision(attacker, defender);
  }
  
  private checkPixelEntityCollision(
    attacker: RuntimeEntityState,
    defender: RuntimeEntityState,
    events: EngineEvent[]
  ): boolean {
    const defenderDef = this.entityDefinitionsById.get(defender.definitionId);
    const manifest = this.adventure.visualManifests.find(m => 
      m.mode !== "classic-acs"
    );
    const hdSprite = manifest?.hdEntitySprites?.find(s => s.id === defenderDef?.assetId);
    
    if (!hdSprite?.collisionMask) {
      // Fall back to tile collision
      return attacker.x === defender.x && attacker.y === defender.y;
    }
    
    const attackerBox = this.getEntityCollisionBox(attacker);
    const result = checkPixelCollision(
      attackerBox,
      hdSprite.collisionMask,
      hdSprite.width,
      hdSprite.height
    );
    
    if (result.hit) {
      events.push({ 
        type: "entityHit", 
        attackerId: attacker.id, 
        defenderId: defender.id,
        overlapArea: result.overlapArea
      });
    }
    
    return result.hit;
  }
  
  private getEntityCollisionBox(entity: RuntimeEntityState): CollisionBox {
    const def = this.entityDefinitionsById.get(entity.definitionId);
    const scale = def?.visualScale ?? { width: 1, height: 1 };
    const tileSize = 1;  // normalized tile units
    
    return {
      x: entity.x * tileSize,
      y: entity.y * tileSize,
      width: scale.width * tileSize,
      height: scale.height * tileSize
    };
  }
}
```

---

## 4. Renderer Changes

### 4.1 Z-Layer Draw Order

```typescript
// MODIFY in packages/runtime-2d/src/index.ts

const RENDER_LAYER_ORDER: Record<string, number> = {
  "floor": 0,
  "object": 1,
  "character": 2,
  "overhead": 3
};

export class CanvasGameRenderer {
  // ... existing code ...
  
  private renderWithZLayers(entities: RuntimeEntityState[]): void {
    const sorted = [...entities].sort((a, b) => {
      const defA = this.entityDefinitions.get(a.definitionId);
      const defB = this.entityDefinitions.get(b.definitionId);
      
      const layerA = defA?.renderLayer ?? "character";
      const layerB = defB?.renderLayer ?? "character";
      
      if (layerA !== layerB) {
        return RENDER_LAYER_ORDER[layerA] - RENDER_LAYER_ORDER[layerB];
      }
      
      // Same layer: sort by Y (lower = further back)
      return a.y - b.y;
    });
    
    for (const entity of sorted) {
      this.renderEntity(entity);
    }
  }
  
  private renderEntity(entity: RuntimeEntityState): void {
    const def = this.entityDefinitions.get(entity.definitionId);
    const scale = def?.visualScale ?? { width: 1, height: 1 };
    const layer = def?.renderLayer ?? "character";
    
    const baseSize = this.tileSize;
    const scaledWidth = baseSize * scale.width;
    const scaledHeight = baseSize * scale.height;
    
    // Calculate anchor offset
    const anchorX = def?.visualScale?.anchorX ?? "center";
    const anchorY = def?.visualScale?.anchorY ?? "bottom";
    
    let offsetX = 0;
    let offsetY = 0;
    
    if (anchorX === "center") offsetX = (baseSize - scaledWidth) / 2;
    else if (anchorX === "right") offsetX = baseSize - scaledWidth;
    
    if (anchorY === "center") offsetY = (baseSize - scaledHeight) / 2;
    else if (anchorY === "top") offsetY = baseSize - scaledHeight;
    // "bottom" = 0 (default)
    
    const screenX = entity.x * baseSize + offsetX;
    const screenY = entity.y * baseSize + offsetY;
    
    this.drawEntitySprite(screenX, screenY, scaledWidth, scaledHeight, def, entity);
  }
}
```

### 4.2 HD Sprite Rendering

```typescript
// ADD to packages/runtime-2d/src/index.ts

private drawHdSprite(
  x: number,
  y: number,
  width: number,
  height: number,
  sprite: HdEntitySpriteDefinition,
  frame: number = 0
): void {
  const pixels = sprite.pixels;
  const spriteWidth = sprite.width;
  const frameOffset = frame * spriteWidth * sprite.height * 4;
  
  const scaleX = width / spriteWidth;
  const scaleY = height / spriteHeight;
  
  for (let py = 0; py < sprite.height; py++) {
    for (let px = 0; px < sprite.width; px++) {
      const srcIndex = frameOffset + (py * spriteWidth + px) * 4;
      const r = pixels[srcIndex];
      const g = pixels[srcIndex + 1];
      const b = pixels[srcIndex + 2];
      const a = pixels[srcIndex + 3];
      
      if (a > 0) {
        this.context.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        this.context.fillRect(
          x + px * scaleX,
          y + py * scaleY,
          scaleX,
          scaleY
        );
      }
    }
  }
}
```

---

## 5. Validation Rules

```typescript
// ADD to packages/validation/src/index.ts

export function validateVisualScales(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const entity of pkg.entityDefinitions) {
    if (entity.visualScale) {
      // Validate scale values
      if (entity.visualScale.width <= 0 || entity.visualScale.width > 4) {
        issues.push({
          severity: "error",
          code: "invalid_entity_visual_scale_width",
          message: `Entity '${entity.id}' has invalid visualScale.width '${entity.visualScale.width}'`,
          path: `entityDefinitions[...].visualScale.width`
        });
      }
      
      if (entity.visualScale.height <= 0 || entity.visualScale.height > 4) {
        issues.push({
          severity: "error",
          code: "invalid_entity_visual_scale_height",
          message: `Entity '${entity.id}' has invalid visualScale.height '${entity.visualScale.height}'`,
          path: `entityDefinitions[...].visualScale.height`
        });
      }
      
      // Warn if entity has scale but no HD sprite
      if (entity.visualScale.width !== 1 || entity.visualScale.height !== 1) {
        const hasHdSprite = pkg.visualManifests.some(m => 
          m.hdEntitySprites?.some(s => s.id === entity.assetId)
        );
        if (!hasHdSprite) {
          issues.push({
            severity: "warning",
            code: "entity_scaled_no_hd_sprite",
            message: `Entity '${entity.id}' has non-1x scale but no HD sprite defined`,
            path: `entityDefinitions[...].visualScale`
          });
        }
      }
    }
    
    // Validate render layer
    if (entity.renderLayer) {
      const validLayers = ["floor", "object", "character", "overhead"];
      if (!validLayers.includes(entity.renderLayer)) {
        issues.push({
          severity: "error",
          code: "invalid_entity_render_layer",
          message: `Entity '${entity.id}' has invalid renderLayer '${entity.renderLayer}'`,
          path: `entityDefinitions[...].renderLayer`
        });
      }
    }
  }
  
  // Validate HD sprites have collision masks
  for (const manifest of pkg.visualManifests) {
    for (const sprite of manifest.hdEntitySprites ?? []) {
      if (!sprite.collisionMask || sprite.collisionMask.length === 0) {
        issues.push({
          severity: "warning",
          code: "hd_sprite_no_collision_mask",
          message: `HD sprite '${sprite.id}' has no collision mask`,
          path: `visualManifests[...].hdEntitySprites[...].collisionMask`
        });
      }
    }
  }
  
  return issues;
}
```

---

## 6. Example Entity Definitions

### Example 1: Tiny Fairy (0.5x scale)

```typescript
{
  id: "def_fairy",
  name: "Forest Fairy",
  kind: "npc",
  placement: "multiple",
  assetId: "hd_sprite_fairy",
  visualScale: {
    width: 0.5,
    height: 0.5,
    anchorX: "center",
    anchorY: "bottom"
  },
  renderLayer: "character",
  profile: {
    stats: { life: 3, power: 2, speed: 6 }
  },
  behavior: "wander"
}
```

### Example 2: Large Boss (2x scale)

```typescript
{
  id: "def_dragon_boss",
  name: "Ancient Dragon",
  kind: "enemy",
  placement: "singleton",
  assetId: "hd_sprite_dragon",
  visualScale: {
    width: 2,
    height: 2,
    anchorX: "center",
    anchorY: "bottom"
  },
  renderLayer: "character",
  profile: {
    stats: { life: 50, power: 8, speed: 2 }
  },
  behavior: { mode: "guard", detectionRange: 6 }
}
```

### Example 3: Overhead Bridge

```typescript
{
  id: "def_rope_bridge",
  name: "Rope Bridge",
  kind: "container",
  placement: "multiple",
  assetId: "hd_sprite_bridge",
  visualScale: {
    width: 3,
    height: 1
  },
  renderLayer: "overhead",
  behavior: "idle"
}
```

### Example 4: Arrow with Collision Mask

```typescript
// In visual manifest
{
  id: "hd_sprite_arrow",
  name: "Iron Arrow",
  width: 4,
  height: 1,
  frames: 1,
  frameDuration: 0,
  pixels: [...],  // RGBA array
  collisionMask: [
    0, 0, 0, 1  // only tip is solid (4 pixels wide)
  ]
}

// In item definition
{
  id: "item_iron_arrow",
  name: "Iron Arrow",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    damage: 2,
    missileProperties: {
      speed: 8,
      trajectory: "straight",
      range: 6,
      useEuclideanDistance: true
    }
  }
}
```

---

## 7. Backward Compatibility Matrix

| Feature | 8-bit Mode | 16-bit+ Mode |
|---------|------------|--------------|
| `visualScale` | Ignored (default 1x1) | Supported |
| `renderLayer` | Ignored (default character) | Supported |
| `collisionMask` | Not used | Used for pixel collision |
| Tile collision | ✅ Default | ✅ Fallback |
| Pixel collision | ❌ Not used | ✅ When HD sprites exist |
| Euclidean distance | ❌ Not used | ✅ For missiles |

---

## 8. Implementation Checklist

### Phase 1: Domain Model
- [ ] Add `EntityVisualScale` interface
- [ ] Add `EntityRenderLayer` type
- [ ] Add `visualScale` and `renderLayer` to `EntityDefinition`
- [ ] Add `visualScale` to `TileDefinition`
- [ ] Add `HdTileSpriteDefinition` and `HdEntitySpriteDefinition`
- [ ] Add `MissileProperties` to `ItemEffect`
- [ ] Update `VisualManifestDefinition.mode` type

### Phase 2: Collision System
- [ ] Create `packages/runtime-core/src/collision.ts`
- [ ] Implement `checkPixelCollision`
- [ ] Implement `euclideanDistance`
- [ ] Implement `getMissilePath`
- [ ] Implement `checkMissileHit`
- [ ] Keep tile collision as fallback

### Phase 3: Runtime Engine
- [ ] Add `currentFrame` and `animationTime` to `RuntimeEntityState`
- [ ] Add collision mode detection
- [ ] Integrate collision system into `GameSession`
- [ ] Handle missile weapon attacks

### Phase 4: Renderer
- [ ] Add `RENDER_LAYER_ORDER` constant
- [ ] Implement `renderWithZLayers`
- [ ] Update entity rendering for scale
- [ ] Add anchor point calculation
- [ ] Add HD sprite rendering

### Phase 5: Validation
- [ ] Implement `validateVisualScales`
- [ ] Validate scale values
- [ ] Warn about missing HD sprites
- [ ] Validate render layers

### Phase 6: Editor UI
- [ ] Add visual scale panel (16-bit+ modes only)
- [ ] Add render layer selector
- [ ] Add collision mask editor
- [ ] Hide 8-bit mode options

---

## 9. File Locations

| Change | File |
|--------|------|
| Domain types | `packages/domain/src/index.ts` |
| Collision system | `packages/runtime-core/src/collision.ts` |
| Runtime logic | `packages/runtime-core/src/game-session.ts` |
| Runtime types | `packages/runtime-core/src/types.ts` |
| Renderer | `packages/runtime-2d/src/index.ts` |
| Validation | `packages/validation/src/index.ts` |
| Editor UI | `apps/web/src/editor.ts` |
| Sample entities | `apps/web/src/sampleAdventure.ts` |

---

## 10. Performance Considerations

| Operation | Complexity | Mitigation |
|-----------|------------|------------|
| Pixel collision | O(n*m) | Cache masks, early exit on bounding box |
| Z-layer sort | O(n log n) | Only sort visible entities |
| HD sprite render | O(pixels) | Only render visible area |
| Animation frames | O(1) | Pre-compute, use sprite sheets |

---

## 11. Open Questions (Deferred)

1. **Animation system:** Frame-based animation for HD sprites?
2. **Parallax layers:** Scrolling background layers?
3. **Particle effects:** For magic, blood, etc.?

---

*Generated for ACS Milestone 33+ Implementation*