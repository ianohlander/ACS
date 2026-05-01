# ADR 0004: Variable Sprite Scale System for Higher Resolution Modes

## Status

Proposed (Deferred to Post-ADR 0003)

## Context

The current ACS architecture uses uniform 1x1 tile sprites across all visual modes. This is appropriate for the 8-bit classic aesthetic but limits visual expressiveness in higher resolution modes (16-bit, HD, 3D).

**Design goals:**
- Enable variable-sized sprites in 16-bit/HD modes without affecting 8-bit mode
- Use pixel-accurate collision detection (not tile-based)
- Implement proper distance calculations for missile weapons
- Add simple z-layering for draw order
- Minimize impact on existing systems

**Non-goals:**
- No push physics
- No float-position movement (stay tile-locked for now)
- No changes to 8-bit classic mode
- No new renderer modes (just prepare architecture)

---

## Decision

Prepare the architecture for variable sprite scaling while keeping 8-bit mode unchanged. The key insight is that **visual presentation** can be decoupled from **gameplay grid**.

### 1. Domain Model Extensions

#### 1.1 EntityDefinition — Add visual scale fields

```typescript
// packages/domain/src/index.ts

export interface EntityDefinition {
  id: EntityDefId;
  name: string;
  kind: "player" | "npc" | "enemy" | "container";
  // ... existing fields ...

  // NEW: Visual presentation (16-bit+ modes)
  visualScale?: EntityVisualScale;
  renderLayer?: EntityRenderLayer;
}

export interface EntityVisualScale {
  width: number;    // in tile units (0.5, 1, 1.5, 2, etc.)
  height: number;
  anchorX?: "left" | "center" | "right";  // horizontal anchor
  anchorY?: "top" | "center" | "bottom"; // vertical anchor
}

export type EntityRenderLayer = "floor" | "object" | "character" | "overhead";
```

#### 1.2 TileDefinition — Add visual scale (for large tiles)

```typescript
// packages/domain/src/index.ts

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
    width: number;   // tile units (1, 2, 3...)
    height: number;
  };
}
```

#### 1.3 VisualManifestDefinition — Add HD sprite support

```typescript
// packages/domain/src/index.ts

export interface VisualManifestDefinition {
  id: string;
  name: string;
  mode: "classic-acs" | "16-bit" | "hd" | "3d";  // NEW modes
  tileSprites: Record<string, ClassicSpriteStyle>;
  entitySprites: Record<string, ClassicSpriteStyle>;
  uiSprites?: Record<string, ClassicSpriteStyle>;
  pixelSprites?: ClassicPixelSpriteDefinition[];
  
  // NEW: HD bitmap sprites (larger than 8x8)
  hdTileSprites?: HdTileSpriteDefinition[];
  hdEntitySprites?: HdEntitySpriteDefinition[];
}

export interface HdTileSpriteDefinition {
  id: string;
  name: string;
  width: number;   // pixels (e.g., 32, 64)
  height: number;
  frames: number;  // animation frames
  frameDuration: number;  // ms per frame
  pixels: number[];  // RGBA array
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

---

### 2. Collision Detection (Pixel-Accurate)

#### 2.1 Current Limitation

The current system uses tile-based collision:

```typescript
// Current: tile-based
if (entity.x === target.x && entity.y === target.y) {
  // collision
}
```

**Problem:** A spear passing through a quarter-tile entity would never hit.

#### 2.2 Proposed: Pixel-Accurate Collision

```typescript
// packages/runtime-core/src/collision.ts

export interface CollisionBox {
  x: number;      // pixel coordinates relative to tile
  y: number;
  width: number;
  height: number;
}

export interface CollisionResult {
  hit: boolean;
  overlapArea: number;    // for partial hits
  contactPoint: { x: number; y: number };
}

export function checkPixelCollision(
  attackerBox: CollisionBox,
  defenderMask: number[],
  defenderWidth: number,
  defenderHeight: number
): CollisionResult {
  // Convert to pixel coordinates
  const attackerPixels = getAttackerPixelPositions(attackerBox);
  
  // Check each attacker pixel against defender mask
  let overlapCount = 0;
  for (const pixel of attackerPixels) {
    if (pixel.x >= 0 && pixel.x < defenderWidth &&
        pixel.y >= 0 && pixel.y < defenderHeight) {
      const maskIndex = pixel.y * defenderWidth + pixel.x;
      if (defenderMask[maskIndex] === 1) {
        overlapCount++;
      }
    }
  }
  
  return {
    hit: overlapCount > 0,
    overlapArea: overlapCount,
    contactPoint: calculateCentroid(attackerPixels.filter(p => /* hits */))
  };
}
```

#### 2.3 Missile Weapon Distance

Current: Manhattan distance (grid-based)

```typescript
// Current (problematic for missiles)
function manhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}
```

Proposed: Euclidean distance (true path)

```typescript
// Proposed: for missile weapons
function euclideanDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// For arrow/bolt trajectory
function getMissilePath(startX, startY, endX, endY, steps): Array<{x, y}> {
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

// Collision check along path
function checkMissileHit(path, entity): CollisionResult {
  for (const point of path) {
    const result = checkPixelCollision(
      getMissileTipBox(point),
      entity.collisionMask,
      entity.width,
      entity.height
    );
    if (result.hit) return result;
  }
  return { hit: false, overlapArea: 0, contactPoint: null };
}
```

---

### 3. Z-Layer Rendering

#### 3.1 Simple Draw Order

```typescript
// packages/runtime-2d/src/index.ts

// Define layer order (low to high)
const RENDER_LAYER_ORDER: Record<EntityRenderLayer, number> = {
  "floor": 0,      // ground tiles, floor decorations
  "object": 1,     // crates, signs, props
  "character": 2,  // NPCs, enemies, player
  "overhead": 3    // bridges, ceilings, hanging objects
};

function renderWithZLayers(entities: RuntimeEntityState[]): void {
  // Sort by layer, then by Y position (painter's algorithm)
  const sorted = [...entities].sort((a, b) => {
    const layerA = a.renderLayer ?? "character";
    const layerB = b.renderLayer ?? "character";
    
    if (layerA !== layerB) {
      return RENDER_LAYER_ORDER[layerA] - RENDER_LAYER_ORDER[layerB];
    }
    
    // Same layer: sort by Y (lower Y draws first = further back)
    return a.y - b.y;
  });
  
  for (const entity of sorted) {
    renderEntity(entity);
  }
}
```

---

### 4. Editor UI Extensions (16-bit+ Mode Only)

#### 4.1 Entity Editor — Visual Scale Panel

```
Entity Editor (16-bit mode):
├── Basic Info (existing)
├── Behavior (existing)
└── Visual Presentation (NEW - 16-bit mode only)
    ├── Render Scale
    │   ├── Width: [0.5 ▼] tiles
    │   └── Height: [1.0 ▼] tiles
    ├── Anchor Point
    │   ├── X: [center ▼]
    │   └── Y: [bottom ▼]
    └── Render Layer: [character ▼]
        └── Options: floor | object | character | overhead
```

**Note:** This panel only appears when:
- Visual mode is set to 16-bit, HD, or 3D
- 8-bit classic mode hides these options

#### 4.2 Collision Mask Editor

```
Collision Editor (NEW):
├── Sprite Preview (shows HD sprite)
├── Collision Mask
│   ├── [Draw] mode — click to mark solid pixels
│   ├── [Erase] mode — click to mark transparent
│   └── [Auto] button — generate from sprite alpha
└── Statistics
    ├── Total pixels: 1024
    ├── Solid pixels: 512 (50%)
    └── Bounding box: 8x12 pixels
```

---

### 5. Backward Compatibility

| Concern | Solution |
|---------|----------|
| 8-bit mode unchanged | All new fields optional, 8-bit ignores them |
| Existing entities | Default `visualScale: { width: 1, height: 1 }` |
| Existing saves | New fields are optional, parse defaults |
| Collision detection | Tile-based remains default for 8-bit |

---

### 6. Example Entity Definitions

#### Example 1: Tiny Fairy (0.5x scale)

```typescript
{
  id: "def_fairy",
  name: "Forest Fairy",
  kind: "npc",
  visualScale: {
    width: 0.5,
    height: 0.5,
    anchorX: "center",
    anchorY: "bottom"
  },
  renderLayer: "character",
  // ... existing fields
}
```

#### Example 2: Large Boss (2x scale)

```typescript
{
  id: "def_dragon_boss",
  name: "Ancient Dragon",
  kind: "enemy",
  visualScale: {
    width: 2,
    height: 2,
    anchorX: "center",
    anchorY: "bottom"
  },
  renderLayer: "character",
  // ... existing fields
}
```

#### Example 3: Overhead Bridge

```typescript
{
  id: "def_rope_bridge",
  name: "Rope Bridge",
  kind: "container",
  visualScale: {
    width: 3,
    height: 1
  },
  renderLayer: "overhead",
  // ... existing fields
}
```

#### Example 4: Arrow with Pixel Collision

```typescript
{
  id: "item_iron_arrow",
  name: "Iron Arrow",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    damage: 2,
    // Missile-specific properties
    missileProperties: {
      speed: 8,           // tiles per second
      trajectory: "straight",
      range: 6,           // max tiles
      useEuclideanDistance: true  // NEW flag
    },
    collisionMask: [
      // 4x1 pixel collision (arrow tip)
      0, 0, 0, 1  // only the tip is solid
    ]
  }
}
```

---

### 7. Implementation Phases

| Phase | Description | Scope |
|-------|-------------|-------|
| 1 | Domain model | Add `visualScale`, `renderLayer`, `collisionMask` to definitions |
| 2 | Collision system | Implement pixel-accurate collision detection |
| 3 | Missile weapons | Add Euclidean distance + path checking |
| 4 | Z-layer rendering | Implement draw order by layer + Y position |
| 5 | Editor UI | Add visual scale panel (16-bit+ modes only) |
| 6 | HD sprite support | Extend visual manifest for larger bitmaps |

---

### 8. File Changes Summary

| File | Changes |
|------|---------|
| `packages/domain/src/index.ts` | Add `EntityVisualScale`, `EntityRenderLayer`, `HdTileSpriteDefinition`, `HdEntitySpriteDefinition` |
| `packages/runtime-core/src/collision.ts` | NEW: pixel-accurate collision detection |
| `packages/runtime-core/src/game-session.ts` | Use new collision for missile weapons |
| `packages/runtime-2d/src/index.ts` | Add z-layer sorting, scale rendering |
| `apps/web/src/editor.ts` | Add visual scale editor panel |
| `apps/web/src/sampleAdventure.ts` | Add example large/small entities |

---

### 9. Open Questions (Deferred)

1. **Animation system:** Should HD sprites support frame-based animation?
2. **Parallax layers:** For scrolling backgrounds?
3. **Particle effects:** For magic spells, blood, etc.?

**Recommendation:** Address in separate ADRs after this core system.

---

### 10. Alternatives Considered

#### Alternative A: Full AABB Collision

Use axis-aligned bounding boxes for all collision.

**Rejected because:** Doesn't handle irregular shapes (L-shaped entities, transparent edges). Pixel mask is more precise.

#### Alternative B: Tile + Sub-Tile

Keep tile collision but add sub-tile (0.25, 0.5, 0.75) positions.

**Rejected because:** Still blocky. Pixel collision is actually simpler than managing sub-tile states.

#### Alternative C: Vector-Based Physics

Full physics engine with velocity, acceleration, mass.

**Rejected because:** Overkill. You're right to be concerned about feature creep.

---

## Consequences

### Positive

- Pixel-accurate collision solves the "miss the quarter-tile" problem
- Euclidean distance for missiles is more realistic
- Z-layers enable overhead objects (bridges, ceilings)
- Visual scale adds variety without changing gameplay
- Backward compatible with 8-bit mode

### Negative

- Editor UI grows (but contained to 16-bit+ modes)
- Collision checking is more expensive (but manageable)
- More sprite data to manage (collision masks)

### Risks

- **Performance:** Pixel collision on many entities could be slow
- **Complexity:** Two collision systems (tile for 8-bit, pixel for 16-bit+)

---

## Relationship to ADR 0003

| ADR 0003 (Item Usage) | ADR 0004 (Sprite Scale) |
|----------------------|-------------------------|
| Higher priority | Deferred |
| Affects core gameplay | Visual presentation only |
| Required for basic features | Nice-to-have for higher modes |
| Implement first | Implement after 0003 |

---

*ADR 0004 — Proposed for ACS Milestone 33+ (Post-ADR 0003)*