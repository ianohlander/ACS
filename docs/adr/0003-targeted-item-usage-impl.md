# ADR 0003: Targeted Item Usage System - Implementation Package

## Quick Reference

**Status:** Proposed  
**Target Milestone:** Milestone 32  
**Related ADRs:** ADR 0001 (Architecture Boundaries)

---

## 1. Domain Model Changes

### 1.1 ItemDefinition Extensions

```typescript
// ADD to packages/domain/src/index.ts

export type ItemTargetType = "self" | "entity" | "tile" | "any";

export interface ItemEffect {
  statChanges?: EntityStatChange[];
  damage?: number;           // For weapons
  heal?: number;             // For healing items
  buff?: number;             // For buff items
  giveItemId?: ItemDefId;
  giveItemQuantity?: number;
  removeItemId?: ItemDefId;
  removeItemQuantity?: number;
  skillChanges?: SkillChange[];
  traitChanges?: TraitChange[];
  condition?: ItemEffectCondition;
  onUseMediaCueId?: MediaCueId;
  onUseSoundCueId?: SoundCueId;
  tileChangeTileId?: TileDefId;  // For tile targets
}

export interface EntityStatChange {
  stat: "life" | "power" | "speed";
  delta: number;
  isTemporary?: boolean;
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
  targetKind?: ActorKind[];
  targetFaction?: string;
  targetHasItem?: ItemDefId;
  targetFlagEquals?: { flag: string; value: unknown };
}

// MODIFY existing ItemDefinition interface
export interface ItemDefinition {
  id: ItemDefId;
  name: string;
  description: string;
  categoryId?: LibraryCategoryId;
  useKind?: ItemUseKind;
  targetType?: ItemTargetType;      // NEW
  effect?: ItemEffect;               // NEW
  assetId?: AssetId;
  classicSpriteId?: string;
  visual?: VisualPresentationBinding;
  usePolicy?: ActorUsePolicy;
}
```

### 1.2 RuntimeActionProposal Extension

```typescript
// MODIFY in packages/domain/src/index.ts

export interface RuntimeActionProposal {
  actorId: "player" | EntityId;
  action: ActorActionKind;
  targetItemId?: ItemDefId;
  targetEntityId?: EntityId;    // NEW
  targetTileX?: number;         // NEW
  targetTileY?: number;         // NEW
  targetTriggerId?: TriggerId;
  targetExitId?: string;
  targetMapId?: MapId;
  direction?: "north" | "south" | "east" | "west";
}
```

### 1.3 New Action Types

```typescript
// ADD to packages/domain/src/index.ts - Action type union

export type Action =
  | { type: "showDialogue"; dialogueId: DialogueId }
  | { type: "setFlag"; flag: string; value: boolean | number | string }
  | { type: "giveItem"; itemId: ItemDefId; quantity?: number }
  | { type: "playMedia"; cueId: MediaCueId }
  | { type: "playSound"; cueId: SoundCueId }
  | { type: "teleport"; mapId: MapId; x: number; y: number }
  | { type: "changeTile"; mapId: MapId; x: number; y: number; tileId: string }
  | { type: "setQuestStage"; questId: QuestId; stage: number }
  // NEW ENTITY-TARGETING ACTIONS
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

### 1.4 New Condition Types

```typescript
// ADD to packages/domain/src/index.ts - Condition type union

export type Condition =
  | { type: "flagEquals"; flag: string; value: boolean | number | string }
  | { type: "hasItem"; itemId: ItemDefId; quantity?: number }
  | { type: "questStageAtLeast"; questId: QuestId; stage: number }
  // NEW ENTITY-TARGETING CONDITIONS
  | { type: "entityHasItem"; entityId: EntityId; itemId: ItemDefId; quantity?: number }
  | { type: "entityStatAtLeast"; entityId: EntityId; stat: "life" | "power" | "speed"; value: number }
  | { type: "entityIsAlive"; entityId: EntityId }
  | { type: "entityOnMap"; entityId: EntityId; mapId: MapId }
  | { type: "entityAtLocation"; entityId: EntityId; mapId: MapId; x: number; y: number };
```

---

## 2. Runtime Engine Changes

### 2.1 PlayerCommand Types

```typescript
// MODIFY in packages/runtime-core/src/types.ts

export type PlayerCommand =
  | { type: "move"; direction: CardinalDirection }
  | { type: "interact"; direction?: CardinalDirection }
  | { type: "inspect"; direction?: CardinalDirection }
  | { type: "useItem"; itemId: ItemDefId }
  | { type: "useItemOnEntity"; itemId: ItemDefId; targetEntityId: EntityId }   // NEW
  | { type: "useItemOnTile"; itemId: ItemDefId; x: number; y: number }        // NEW
  | { type: "openMenu"; menu: "inventory" | "skills" | "save" | "load" }
  | { type: "selectDialogueChoice"; choiceId: string }
  | { type: "endTurn" };
```

### 2.2 EngineEvent Types

```typescript
// ADD to packages/runtime-core/src/types.ts - EngineEvent union

export type EngineEvent =
  | { type: "playerMoved"; mapId: MapId; x: number; y: number }
  | { type: "movementBlocked"; reason: string }
  | { type: "interactionTargetFound"; entityId: EntityId }
  | { type: "inspectResult"; message: string }
  | { type: "itemGranted"; itemId: ItemDefId; quantity: number }
  | { type: "itemConsumed"; itemId: ItemDefId; targetEntityId?: EntityId }    // MODIFIED
  | { type: "entityStatChanged"; entityId: EntityId; stat: string; oldValue: number; newValue: number; delta: number }
  | { type: "entityDamaged"; entityId: EntityId; damage: number; weaponId: ItemDefId }
  | { type: "entityHealed"; entityId: EntityId; heal: number; itemId: ItemDefId }
  | { type: "entityDied"; entityId: EntityId }
  | { type: "entityRevived"; entityId: EntityId; life: number }
  // ... existing events ...
```

### 2.3 RuntimeEntityState Extension

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
  inventory: Record<ItemDefId, number>;   // NEW
  skills: Set<SkillDefId>;                  // NEW
  traits: Set<TraitDefId>;                  // NEW
}
```

### 2.4 GameSession Handlers

```typescript
// ADD to packages/runtime-core/src/game-session.ts

export class RuntimeGameSession implements GameSession {
  // ... existing methods ...

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
    // 1. Validate item exists
    // 2. Validate targetType allows entity
    // 3. Find target entity
    // 4. Evaluate conditions (targetKind, targetFaction, etc.)
    // 5. Apply stat changes (damage, heal, buffs)
    // 6. Handle item transfer (giveItemId, removeItemId)
    // 7. Handle skill/trait changes
    // 8. Play media/sound cues
    // 9. Consume if consumable
    // 10. Run triggers
    // Return true if turn consumed
  }

  private handleUseItemOnTile(itemId: ItemDefId, x: number, y: number, events: EngineEvent[]): boolean {
    // 1. Validate item allows tile target
    // 2. Apply tile change (tileChangeTileId)
    // 3. Consume if consumable
    // Return true if turn consumed
  }

  private modifyEntityStat(entityId: EntityId, stat: "life" | "power" | "speed", delta: number, events: EngineEvent[]): void {
    // 1. Find entity in state
    // 2. Update stat
    // 3. Emit entityStatChanged event
    // 4. Check for death (life <= 0)
    // 5. Emit entityDied if dead
  }

  private giveItemToEntity(entityId: EntityId, itemId: ItemDefId, quantity: number, events: EngineEvent[]): void {
    // Add item to entity's inventory
  }

  private removeItemFromEntity(entityId: EntityId, itemId: ItemDefId, quantity: number, events: EngineEvent[]): void {
    // Remove item from entity's inventory
  }

  private addSkillToEntity(entityId: EntityId, skillId: SkillDefId, events: EngineEvent[]): void {
    // Add skill to entity's skill set
  }

  private removeSkillFromEntity(entityId: EntityId, skillId: SkillDefId, events: EngineEvent[]): void {
    // Remove skill from entity's skill set
  }

  private addTraitToEntity(entityId: EntityId, traitId: TraitDefId, events: EngineEvent[]): void {
    // Add trait to entity's trait set
  }

  private removeTraitFromEntity(entityId: EntityId, traitId: TraitDefId, events: EngineEvent[]): void {
    // Remove trait from entity's trait set
  }

  private evaluateItemEffectCondition(condition: ItemEffectCondition, target: RuntimeEntityState, events: EngineEvent[]): boolean {
    // Check targetKind, targetFaction, targetHasItem, targetFlagEquals
    // Return true if all conditions pass
  }
}
```

---

## 3. Validation Rules

```typescript
// ADD to packages/validation/src/index.ts

export function validateItemEffects(pkg: AdventurePackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const item of pkg.itemDefinitions) {
    if (item.effect) {
      // Validate stat changes
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

      // Validate giveItemId exists
      if (item.effect.giveItemId && !pkg.itemDefinitions.find(i => i.id === item.effect.giveItemId)) {
        issues.push({
          severity: "error",
          code: "invalid_item_grant",
          message: `Item '${item.id}' grants non-existent item '${item.effect.giveItemId}'`,
          path: `itemDefinitions[...].effect.giveItemId`
        });
      }

      // Validate consumable has effect
      if (item.useKind === "consumable" && !item.effect && !item.effect?.damage && !item.effect?.heal) {
        issues.push({
          severity: "warning",
          code: "consumable_no_effect",
          message: `Consumable item '${item.id}' has no defined effect`,
          path: `itemDefinitions[...].effect`
        });
      }

      // Validate entity target has effect
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

---

## 4. Example Item Definitions

### Example 1: Healing Potion (self)

```typescript
{
  id: "item_healing_potion",
  name: "Healing Potion",
  description: "Restores 5 life points when consumed.",
  categoryId: "lib_items_treasure",
  useKind: "consumable",
  targetType: "self",
  effect: {
    heal: 5
  },
  usePolicy: { mode: "explicit", allowedActorKinds: ["player", "support"] }
}
```

### Example 2: Iron Sword (entity attack)

```typescript
{
  id: "item_iron_sword",
  name: "Iron Sword",
  description: "A plain fantasy weapon. Deals 3 damage to enemies.",
  categoryId: "lib_items_weapons",
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

### Example 3: Healer's Kit (entity heal)

```typescript
{
  id: "item_healers_kit",
  name: "Healer's Kit",
  description: "A medical supply kit. Can heal NPCs or allies for 10 life.",
  categoryId: "lib_items_treasure",
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

### Example 4: Lighter (tile interaction)

```typescript
{
  id: "item_lighter",
  name: "Lighter",
  description: "A flame source. Can ignite torches and fire pits.",
  categoryId: "lib_items_treasure",
  useKind: "usable",
  targetType: "tile",
  effect: {
    tileChangeTileId: "tile_campfire"
  },
  usePolicy: { mode: "all" }
}
```

### Example 5: Strength Charm (entity buff)

```typescript
{
  id: "item_strength_charm",
  name: "Strength Charm",
  description: "Temporarily increases power by 2.",
  categoryId: "lib_items_relics",
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

### Example 6: Gift Box (item transfer)

```typescript
{
  id: "item_gift_box",
  name: "Gift Box",
  description: "A decorative box containing rare coins.",
  categoryId: "lib_items_treasure",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    giveItemId: "item_rare_coin",
    giveItemQuantity: 5
  },
  usePolicy: { mode: "all" }
}
```

### Example 7: Poison (damage + condition)

```typescript
{
  id: "item_poison_vial",
  name: "Poison Vial",
  description: "A deadly poison. Only effective on living targets.",
  categoryId: "lib_items_weapons",
  useKind: "consumable",
  targetType: "entity",
  effect: {
    damage: 8,
    condition: {
      targetKind: ["enemy", "npc", "player"],
      targetFaction: "living"
    }
  },
  usePolicy: { mode: "explicit", allowedActorKinds: ["player"] }
}
```

---

## 5. Backward Compatibility Matrix

| Existing Field | New Default | Fallback Behavior |
|----------------|-------------|-------------------|
| `ItemDefinition.targetType` | `"self"` | If missing, treat as self-target |
| `ItemDefinition.effect` | `undefined` | Use trigger-based effects |
| `useItem` command | N/A | Map to `useItemOnEntity` with player as target |

---

## 6. Implementation Checklist

### Phase 1: Domain Model
- [ ] Add `ItemTargetType` type
- [ ] Add `ItemEffect` interface
- [ ] Add `EntityStatChange`, `SkillChange`, `TraitChange`, `ItemEffectCondition` interfaces
- [ ] Modify `ItemDefinition` to include `targetType` and `effect`
- [ ] Add `targetEntityId`, `targetTileX`, `targetTileY` to `RuntimeActionProposal`
- [ ] Add new `Action` types to union
- [ ] Add new `Condition` types to union

### Phase 2: Runtime Engine
- [ ] Add `useItemOnEntity` and `useItemOnTile` to `PlayerCommand`
- [ ] Add new `EngineEvent` types
- [ ] Extend `RuntimeEntityState` with `inventory`, `skills`, `traits`
- [ ] Implement `handleUseItemOnEntity`
- [ ] Implement `handleUseItemOnTile`
- [ ] Implement `modifyEntityStat`
- [ ] Implement entity inventory/skill/trait helpers

### Phase 3: Validation
- [ ] Implement `validateItemEffects`
- [ ] Add validation for stat changes
- [ ] Add validation for item references
- [ ] Add warnings for missing effects

### Phase 4: Editor UI
- [ ] Add targetType selector to item editor
- [ ] Add effect panel with stat changes UI
- [ ] Add damage/heal input fields
- [ ] Add item transfer fields
- [ ] Add skill/trait change UI
- [ ] Add condition builder UI
- [ ] Implement targeting mode in gameplay

### Phase 5: Backward Compatibility
- [ ] Default `targetType` to `"self"` for existing items
- [ ] Ensure `useItem` still works
- [ ] Test existing adventure packages

---

## 7. File Locations

| Change | File |
|--------|------|
| Domain types | `packages/domain/src/index.ts` |
| Runtime types | `packages/runtime-core/src/types.ts` |
| Runtime logic | `packages/runtime-core/src/game-session.ts` |
| Validation | `packages/validation/src/index.ts` |
| Editor UI | `apps/web/src/editor.ts` |
| Sample items | `apps/web/src/sampleAdventure.ts` |

---

## 8. Open Questions (Team Decision Required)

1. **Temporary stat expiry**: After N turns? End of encounter? Never expire?
2. **Combo items**: Support "item A + item B" combo effects?
3. **Range limits**: Require adjacency for entity targeting?
4. **Defense**: Entity dodge/block chance against item effects?
5. **Multiplayer**: How to handle player-to-player item usage?

---

*Generated for ACS Milestone 32 Implementation*