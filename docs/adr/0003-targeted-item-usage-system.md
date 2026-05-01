# ADR 0003: Targeted Item Usage System

## Status

Proposed

## Context

The current ACS architecture supports context-free item usage — items are used without specifying a target. This limits designers from creating meaningful interactions between objects and entities (NPCs, enemies, other players). 

**Required scenarios:**
- Use a **weapon** to attack an enemy, dealing damage based on weapon power
- Use a **healing item** on an NPC to restore their life (quest reward, bargain mechanic)
- Use a **lighter** on a tile to create fire (environmental interaction)
- Use a **buff item** on a party member to increase stats
- Apply items to **any target entity** including other players (future multiplayer)

**Designer requirement:** Must be fully customizable — the effect values, target restrictions, and behavior must be authored in the adventure package, not hardcoded.

## Decision

Extend the domain model, runtime engine, and editor to support **targeted item usage** with designer-controlled effects.

### 1. Domain Model Extensions

#### 1.1 ItemDefinition — Add targetable effect model

```typescript
// packages/domain/src/index.ts

export interface ItemDefinition {
  id: ItemDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  useKind?: ItemUseKind;  // "passive" | "usable" | "consumable" | "equipment" | "quest"
  targetType?: ItemTargetType;  // NEW
  effect?: ItemEffect;          // NEW
  assetId?: AssetId;
  classicSpriteId?: string;
  visual?: VisualPresentationBinding;
  usePolicy?: ActorUsePolicy;
}

export type ItemTargetType = "self" | "entity" | "tile" | "any";

export interface ItemEffect {
  // Stat modification
  statChanges?: EntityStatChange[];
  // Or explicit damage/heal shorthand
  damage?: number;        // For weapons — damage to target's life
  heal?: number;         // For healing items — restore target's life
  buff?: number;         // For buff items — temporary stat boost
  // Inventory manipulation
  giveItemId?: ItemDefId;    // Grant another item on use
  giveItemQuantity?: number;
  removeItemId?: ItemDefId;  // Remove item from target
  removeItemQuantity?: number;
  // Skill/trait modification
  skillChanges?: SkillChange[];
  traitChanges?: TraitChange[];
  // Conditional effects
  condition?: ItemEffectCondition;
  // Visual/audio feedback
  onUseMediaCueId?: MediaCueId;
  onUseSoundCueId?: SoundCueId;
}

export interface EntityStatChange {
  stat: "life" | "power" | "speed";
  delta: number;           // +5, -3, etc.
  isTemporary?: boolean;   // For buffs (future turn-based expiry)
}

export interface SkillChange {
  skillId: SkillDefId;
  add?: boolean;
  remove?: boolean;
}

export interface TraitChange {
  traitId: TraitDefId;
  add?: boolean;
  remove?: boolean;
}

export interface ItemEffectCondition {
  // Only apply effect if target meets criteria
  targetKind?: ActorKind[];        // ["npc", "enemy", "player"]
  targetFaction?: string;          // "wild", "dungeon", etc.
  targetHasItem?: ItemDefId;       // Target must possess item
  targetFlagEquals?: { flag: string; value: unknown };
}
```

#### 1.2 RuntimeActionProposal — Add target entity

```typescript
// packages/domain/src/index.ts

export interface RuntimeActionProposal {
  actorId: "player" | EntityId;
  action: ActorActionKind;
  targetItemId?: ItemDefId;
  targetEntityId?: EntityId;      // NEW: entity being targeted
  targetTileX?: number;            // NEW: tile coordinate for tile targets
  targetTileY?: number;
  targetTriggerId?: TriggerId;
  targetExitId?: string;
  targetMapId?: MapId;
  direction?: "north" | "south" | "east" | "west";
}
```

#### 1.3 Action types — Add entity-targeting actions

```typescript
// packages/domain/src/index.ts

export type Action =
  | { type: "showDialogue"; dialogueId: DialogueId }
  | { type: "setFlag"; flag: string; value: boolean | number | string }
  | { type: "giveItem"; itemId: ItemDefId; quantity?: number }
  | { type: "playMedia"; cueId: MediaCueId }
  | { type: "playSound"; cueId: SoundCueId }
  | { type: "teleport"; mapId: MapId; x: number; y: number }
  | { type: "changeTile"; mapId: MapId; x: number; y: number; tileId: string }
  | { type: "setQuestStage"; questId: QuestId; stage: number }
  // NEW: Entity-targeting actions
  | { type: "modifyEntityStat"; entityId: EntityId; stat: "life" | "power" | "speed"; delta: number }
  | { type: "modifyEntityStatById"; entityDefinitionId: EntityDefId; stat: "life" | "power" | "speed"; delta: number }
  | { type: "giveItemToEntity"; entityId: EntityId; itemId: ItemDefId; quantity?: number }
  | { type: "removeItemFromEntity"; entityId: EntityId; itemId: ItemDefId; quantity?: number }
  | { type: "addSkillToEntity"; entityId: EntityId; skillId: SkillDefId }
  | { type: "removeSkillFromEntity"; entityId: EntityId; skillId: SkillDefId }
  | { type: "addTraitToEntity"; entityId: EntityId; traitId: TraitDefId }
  | { type: "removeTraitFromEntity"; entityId: EntityId; traitId: TraitDefId }
  | { type: "killEntity"; entityId: EntityId }
  | { type: "reviveEntity"; entityId: EntityId; life?: number }
  | { type: "applyItemEffect"; itemId: ItemDefId; targetEntityId: EntityId };
```

#### 1.4 Condition types — Add entity-targeting conditions

```typescript
// packages/domain/src/index.ts

export type Condition =
  | { type: "flagEquals"; flag: string; value: boolean | number | string }
  | { type: "hasItem"; itemId: ItemDefId; quantity?: number }
  | { type: "questStageAtLeast"; questId: QuestId; stage: number }
  // NEW: Entity-targeting conditions
  | { type: "entityHasItem"; entityId: EntityId; itemId: ItemDefId; quantity?: number }
  | { type: "entityStatAtLeast"; entityId: EntityId; stat: "life" | "power" | "speed"; value: number }
  | { type: "entityIsAlive"; entityId: EntityId }
  | { type: "entityOnMap"; entityId: EntityId; mapId: MapId }
  | { type: "entityAtLocation"; entityId: EntityId; mapId: MapId; x: number; y: number };
```

### 2. Runtime Engine Extensions

#### 2.1 PlayerCommand — Add targeted useItem

```typescript
// packages/runtime-core/src/types.ts

export type PlayerCommand =
  | { type: "move"; direction: CardinalDirection }
  | { type: "interact"; direction?: CardinalDirection }
  | { type: "inspect"; direction?: CardinalDirection }
  | { type: "useItem"; itemId: ItemDefId }                          // Existing: context-free
  | { type: "useItemOnEntity"; itemId: ItemDefId; targetEntityId: EntityId }  // NEW
  | { type: "useItemOnTile"; itemId: ItemDefId; x: number; y: number }       // NEW
  | { type: "openMenu"; menu: "inventory" | "skills" | "save" | "load" }
  | { type: "selectDialogueChoice"; choiceId: string }
  | { type: "endTurn" };
```

#### 2.2 GameSession — Add targeted handlers

```typescript
// packages/runtime-core/src/game-session.ts

export class RuntimeGameSession implements GameSession {
  // ... existing code ...

  private dispatchPlayerCommand(command: PlayerCommand, events: EngineEvent[]): boolean {
    switch (command.type) {
      // ... existing cases ...
      case "useItemOnEntity":
        return this.handleUseItemOnEntity(command.itemId, command.targetEntityId, events);
      case "useItemOnTile":
        return this.handleUseItemOnTile(command.itemId, command.targetTileX, command.targetTileY, events);
      default:
        return assertNever(command);
    }
  }

  private handleUseItemOnEntity(itemId: ItemDefId, targetEntityId: EntityId, events: EngineEvent[]): boolean {
    const item = this.itemDefinitionsById.get(itemId);
    if (!item) {
      events.push({ type: "commandIgnored", reason: `Item '${itemId}' not found.` });
      return false;
    }

    // Validate target type
    if (item.targetType !== "entity" && item.targetType !== "any") {
      events.push({ type: "commandIgnored", reason: `Item '${itemId}' cannot be used on entities.` });
      return false;
    }

    // Find target entity
    const targetEntity = this.state.entities.find(e => e.id === targetEntityId);
    if (!targetEntity) {
      events.push({ type: "commandIgnored", reason: `Target entity '${targetEntityId}' not found.` });
      return false;
    }

    // Check conditions
    if (item.effect?.condition) {
      if (!this.evaluateItemEffectCondition(item.effect.condition, targetEntity, events)) {
        return false;
      }
    }

    // Apply stat changes
    if (item.effect?.statChanges) {
      for (const change of item.effect.statChanges) {
        this.modifyEntityStat(targetEntityId, change.stat, change.delta, events);
      }
    }

    // Apply damage (shorthand for life reduction)
    if (item.effect?.damage) {
      this.modifyEntityStat(targetEntityId, "life", -item.effect.damage, events);
      events.push({ type: "entityDamaged", entityId: targetEntityId, damage: item.effect.damage, weaponId: itemId });
    }

    // Apply heal (shorthand for life increase)
    if (item.effect?.heal) {
      this.modifyEntityStat(targetEntityId, "life", item.effect.heal, events);
      events.push({ type: "entityHealed", entityId: targetEntityId, heal: item.effect.heal, itemId });
    }

    // Grant item to target
    if (item.effect?.giveItemId) {
      this.giveItemToEntity(targetEntityId, item.effect.giveItemId, item.effect.giveItemQuantity ?? 1, events);
    }

    // Remove item from target
    if (item.effect?.removeItemId) {
      this.removeItemFromEntity(targetEntityId, item.effect.removeItemId, item.effect.removeItemQuantity ?? 1, events);
    }

    // Skill changes
    if (item.effect?.skillChanges) {
      for (const change of item.effect.skillChanges) {
        if (change.add) this.addSkillToEntity(targetEntityId, change.skillId, events);
        if (change.remove) this.removeSkillFromEntity(targetEntityId, change.skillId, events);
      }
    }

    // Trait changes
    if (item.effect?.traitChanges) {
      for (const change of item.effect.traitChanges) {
        if (change.add) this.addTraitToEntity(targetEntityId, change.traitId, events);
        if (change.remove) this.removeTraitFromEntity(targetEntityId, change.traitId, events);
      }
    }

    // Play feedback cues
    if (item.effect?.onUseMediaCueId) {
      events.push({ type: "mediaCuePlayed", cueId: item.effect.onUseMediaCueId });
    }
    if (item.effect?.onUseSoundCueId) {
      events.push({ type: "soundCuePlayed", cueId: item.effect.onUseSoundCueId });
    }

    // Consume item if consumable
    if (item.useKind === "consumable") {
      this.state.inventory[itemId] = (this.state.inventory[itemId] ?? 1) - 1;
      if (this.state.inventory[itemId] <= 0) {
        delete this.state.inventory[itemId];
      }
      events.push({ type: "itemConsumed", itemId, targetEntityId });
    }

    // Run triggers
    events.push(...this.triggerSystem.runTriggers("onUseItemOnEntity", targetEntity.x, targetEntity.y));

    return true;
  }

  private handleUseItemOnTile(itemId: ItemDefId, x: number, y: number, events: EngineEvent[]): boolean {
    const item = this.itemDefinitionsById.get(itemId);
    if (!item || (item.targetType !== "tile" && item.targetType !== "any")) {
      events.push({ type: "commandIgnored", reason: `Item '${itemId}' cannot be used on tiles.` });
      return false;
    }

    // Apply tile change if effect specifies
    if (item.effect?.tileChangeTileId) {
      const currentMap = this.requireCurrentMap();
      const overrideKey = `${currentMap.id}:${x},${y}`;
      this.state.tileOverrides[overrideKey] = { tileId: item.effect.tileChangeTileId };
      events.push({ type: "tileChanged", mapId: currentMap.id, x, y, tileId: item.effect.tileChangeTileId });
    }

    // Consume if consumable
    if (item.useKind === "consumable") {
      this.state.inventory[itemId] = (this.state.inventory[itemId] ?? 1) - 1;
      if (this.state.inventory[itemId] <= 0) delete this.state.inventory[itemId];
    }

    return true;
  }

  private modifyEntityStat(entityId: EntityId, stat: "life" | "power" | "speed", delta: number, events: EngineEvent[]): void {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    const current = entity.stats[stat] ?? 0;
    const newValue = Math.max(0, current + delta);
    entity.stats[stat] = newValue;

    events.push({ type: "entityStatChanged", entityId, stat, oldValue: current, newValue: delta });

    // Check for death
    if (stat === "life" && newValue <= 0) {
      entity.active = false;
      events.push({ type: "entityDied", entityId });
    }
  }
}
```

#### 2.3 Entity state — Add runtime stat tracking

```typescript
// packages/runtime-core/src/types.ts

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
  inventory: Record<ItemDefId, number>;    // NEW: entity inventory
  skills: Set<SkillDefId>;                  // NEW: entity skills
  traits: Set<TraitDefId>;                  // NEW: entity traits
}
```

### 3. Editor UI Extensions

#### 3.1 Item Editor — Add effect panel

```
Item Editor Panel:
├── Basic Info
│   ├── Name: [___________]
│   ├── Description: [___________]
│   └── Category: [dropdown]
├── Usage
│   ├── Use Kind: [consumable ▼]
│   ├── Target Type: [entity ▼]  ← NEW
│   └── Use Policy: [mode: all ▼]
└── Effects (NEW section)
    ├── Stat Changes
    │   ├── [+ Add Stat Change]
    │   │   ├── Stat: [life ▼]
    │   │   ├── Delta: [+5]
    │   │   └── Temporary: [checkbox]
    ├── Damage: [3]
    ├── Heal: [___]
    ├── Give Item: [dropdown] × [qty]
    ├── Remove Item: [dropdown] × [qty]
    ├── Skills: [+ Add] [-]
    ├── Traits: [+ Add] [-]
    ├── Conditions (target must have)
    │   ├── Target Kind: [enemy ▼]
    │   └── Target Faction: [___________]
    └── Audio/Visual
        ├── On Use Media: [dropdown]
        └── On Use Sound: [dropdown]
```

#### 3.2 In-Game UI — Add targeting mode

```
When player presses "U" to use item:
├── If item.targetType === "self"
│   └── Use immediately on self
├── If item.targetType === "entity"
│   └── Enter targeting mode:
│       ├── Highlight adjacent entities
│       ├── Show cursor over valid targets
│       ├── Press direction key to target
│       └── Press ESC to cancel
├── If item.targetType === "tile"
│   └── Enter tile-targeting mode:
│       ├── Show tile cursor
│       ├── Click/tap to apply
│       └── Press ESC to cancel
```

### 4. Validation Rules

```typescript
// packages/validation/src/index.ts

export function validateItemEffects(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const item of pkg.itemDefinitions) {
    if (item.effect) {
      // Validate stat changes reference valid stats
      for (const change of item.effect.statChanges ?? []) {
        if (!["life", "power", "speed"].includes(change.stat)) {
          issues.push({
            severity: "error",
            code: "invalid_item_stat",
            message: `Item '${item.id}' has invalid stat '${change.stat}'`,
            path: `itemDefinitions[...].effect.statChanges`
          });
        }
      }

      // Validate giveItemId references existing item
      if (item.effect.giveItemId && !pkg.itemDefinitions.find(i => i.id === item.effect.giveItemId)) {
        issues.push({
          severity: "error",
          code: "invalid_item_grant",
          message: `Item '${item.id}' grants non-existent item '${item.effect.giveItemId}'`,
          path: `itemDefinitions[...].effect.giveItemId`
        });
      }

      // Validate consumable with no effect
      if (item.useKind === "consumable" && !item.effect && !item.effect?.damage && !item.effect?.heal) {
        issues.push({
          severity: "warning",
          code: "consumable_no_effect",
          message: `Consumable item '${item.id}' has no defined effect`,
          path: `itemDefinitions[...].effect`
        });
      }

      // Validate targetType consistency
      if (item.targetType === "entity" && !item.effect) {
        issues.push({
          severity: "warning",
          code: "entity_item_no_effect",
          message: `Item '${item.id}' targets entities but has no effect`,
          path: `itemDefinitions[...].targetType`
        });
      }
    }
  }

  return issues;
}
```

### 5. Backward Compatibility

| Concern | Solution |
|---------|----------|
| Existing items without `targetType` | Default to `"self"` for backward compatibility |
| Existing items without `effect` | Continue using trigger-based effects |
| `useItem` command (context-free) | Still supported, maps to `useItemOnEntity` with `targetEntityId: "player"` |
| Save files | New fields are optional, existing saves remain valid |

### 6. Example Authored Items

#### Example 1: Healing Potion (heal self)

```typescript
{
  id: "item_healing_potion",
  name: "Healing Potion",
  useKind: "consumable",
  targetType: "self",
  effect: {
    heal: 5
  },
  usePolicy: { mode: "explicit", allowedActorKinds: ["player", "support"] }
}
```

#### Example 2: Iron Sword (attack entity)

```typescript
{
  id: "item_iron_sword",
  name: "Iron Sword",
  useKind: "equipment",
  targetType: "entity",
  effect: {
    damage: 3,
    condition: {
      targetKind: ["enemy", "antagonist"]
    }
  },
  usePolicy: { mode: "all" }
}
```

#### Example 3: Healer's Kit (heal NPC)

```typescript
{
  id: "item_healers_kit",
  name: "Healer's Kit",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    heal: 10,
    condition: {
      targetKind: ["npc", "player", "support"]
    }
  },
  usePolicy: { mode: "explicit", allowedActorKinds: ["player", "support"] }
}
```

#### Example 4: Lighter (create fire on tile)

```typescript
{
  id: "item_lighter",
  name: "Lighter",
  useKind: "usable",
  targetType: "tile",
  effect: {
    // Custom field for tile items
    tileChangeTileId: "tile_campfire"
  },
  usePolicy: { mode: "all" }
}
```

#### Example 5: Buff Charm (temporary stat boost)

```typescript
{
  id: "item_strength_charm",
  name: "Strength Charm",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    statChanges: [
      { stat: "power", delta: 2, isTemporary: true }
    ]
  },
  usePolicy: { mode: "all" }
}
```

#### Example 6: Transfer Item (give item to target)

```typescript
{
  id: "item_gift_box",
  name: "Gift Box",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    giveItemId: "item_rare_coin",
    giveItemQuantity: 5
  },
  usePolicy: { mode: "all" }
}
```

## Consequences

### Positive

- Designers can create rich item interactions without trigger scripting
- Weapons, healing items, buffs, and environmental items all use consistent model
- Supports future multiplayer (player → other player item usage)
- Backward compatible with existing content
- Validatable — editor can enforce targetType/effect consistency

### Negative

- Increases domain model complexity
- Requires editor UI updates
- Runtime state expands (entity inventory, skills, traits)
- Migration path for existing trigger-based item effects

### Risks

- **Targeting UX**: Players may find targeting cumbersome; need clear UI feedback
- **Balance**: Designer-authored damage/heal values need tuning guidance
- **Performance**: Entity stat tracking adds memory; validate at scale

## Alternatives Considered

### Alternative 1: Pure Trigger System

Keep item usage entirely trigger-based — designers create triggers for each item-target combination.

**Rejected because:**
- No reusability; same trigger pattern repeated per item
- Can't validate item-target relationships
- No clear path to multiplayer targeting
- Designer experience poor (manual trigger wiring)

### Alternative 2: Scriptable Effects

Allow designers to write effect logic in a sandboxed language.

**Rejected because:**
- Security complexity (sandboxing)
- No validation without custom parser
- Over-engineered for typical item effects
- Breaks the "content as data" principle

### Alternative 3: Component-Based Items

Items composed of effect components (DamageComponent, HealComponent, etc.).

**Deferred —** can be layered on top of this ADR as a v2 pattern. Current proposal provides 80% of use cases with simpler model.

## Implementation Phases

| Phase | Description | Scope |
|-------|-------------|-------|
| 1 | Domain model + types | `ItemDefinition`, `ItemEffect`, `RuntimeActionProposal`, new `Action`/`Condition` types |
| 2 | Runtime engine | `useItemOnEntity`, `useItemOnTile` handlers, entity stat modification |
| 3 | Validation | `validateItemEffects` rules |
| 4 | Editor UI | Item effect panel, targeting mode |
| 5 | Backward compatibility | Default `targetType: "self"`, trigger fallback |
| 6 | Multiplayer prep | Entity-to-player item usage (future) |

## Open Questions

1. **Temporary stat changes**: Should these expire after N turns, or be permanent for the encounter?
2. **Combo items**: Should we support "use item A then item B for combo effect"?
3. **Range limits**: Should items have adjacency requirements for entity targeting?
4. **Defense**: Do entities get a chance to dodge/block item effects?

---

*ADR 0003 — Proposed for ACS Milestone 32*