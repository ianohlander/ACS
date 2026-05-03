# ADR 0005: Runtime NPC AI Integration

## Status

Proposed

## Context

The current architecture supports content AI for authoring assistance, but lacks support for runtime AI that can drive NPC behavior during gameplay. The roadmap already expects NPC and future multiplayer actors to converge on shared validated runtime action services rather than special one-off execution paths.

Pre-authored scripts remain the right default for deterministic classic adventures, but future richer modes may need NPCs that can respond dynamically to player actions, maintain personality and goals, and choose from the same legal action vocabulary that players and scripted actors use.

Runtime NPC AI needs to:

- make autonomous decisions without bypassing runtime validation;
- respond to player actions during play;
- maintain consistent NPC personalities, goals, faction rules, and scenario constraints;
- integrate with the existing runtime engine without putting provider logic in renderer packages;
- remain provider-agnostic like content AI;
- degrade safely when an AI provider is unavailable, slow, or blocked.

## Decision

Implement a runtime AI integration layer that allows AI providers to propose NPC behavior during gameplay, separate from the content AI review-first lifecycle.

Runtime AI proposals are not authoring proposals. They may be applied during play only after the runtime validates the proposed action against actor capabilities, object policies, map state, trigger rules, and session constraints.

### Key Components

1. **Runtime AI Provider Interface**
   - Define a `RuntimeAiProvider` interface in the AI boundary package.
   - Keep it separate from content AI provider interfaces.
   - Focus on decision making rather than content generation.

2. **NPC AI Context Model**
   - Create an `NpcAiContext` type representing current game state from the NPC perspective.
   - Include allowed player actions, visible NPC state, nearby entities, local map facts, known quest progress, and designer-authored behavior constraints.
   - Exclude hidden information that would break game balance.

3. **AI-Driven NPC Actions**
   - Extend the runtime action path to accept AI-generated action proposals.
   - Implement `NpcAiAction` types for movement, dialogue, item usage, waiting, interaction, and later targeted effects.
   - Validate AI actions against game rules before execution.

4. **Runtime AI Session Management**
   - Create `RuntimeAiSession` to manage provider state during gameplay.
   - Handle session lifecycle: initialization, context updates, action requests, timeout, fallback, and termination.
   - Keep provider failures from blocking the whole game loop.

5. **Integration Points**
   - Runtime engine asks for an AI action only when an actor policy allows runtime AI.
   - AI responses are validated and then either applied, rejected with a deterministic event, or replaced by a safe fallback action.
   - Runtime AI remains separate from content AI packages and does not mutate authored adventure data.

### Provider Interface Design

```typescript
interface RuntimeAiProvider {
  initializeNpcSession(npcId: string, initialContext: NpcAiContext): Promise<RuntimeAiSession>;
  requestNpcAction(session: RuntimeAiSession, currentContext: NpcAiContext): Promise<NpcAiAction>;
  updateNpcContext(session: RuntimeAiSession, newContext: NpcAiContext): Promise<void>;
  terminateNpcSession(session: RuntimeAiSession): Promise<void>;
}
```

### AI Action Types

```typescript
type NpcAiAction =
  | { type: 'move', direction: Direction, distance: number }
  | { type: 'speak', dialogue: string, targetPlayer?: string }
  | { type: 'use_item', itemId: string, targetEntityId?: string }
  | { type: 'change_state', newState: string }
  | { type: 'wait', duration: number };
```

The exact action shape should converge with the shared runtime action proposal model already planned for actor-capable runtime services.

## Consequences

### Positive

- NPCs can exhibit dynamic, responsive behavior during gameplay.
- Adventures can become more replayable without requiring every line of behavior to be pre-scripted.
- Content creation AI and runtime behavior AI stay separate.
- Provider-agnostic design allows future AI model integration.
- Runtime validation keeps authored rules in control.

### Negative

- Runtime complexity and performance overhead increase.
- AI provider failures could affect gameplay unless fallbacks are strong.
- Validation must be strict enough to prevent AI-driven exploits or broken game states.
- AI-integrated gameplay scenarios require additional test coverage.

### Risks

- AI hallucinations could lead to inappropriate NPC behavior.
- Provider latency could harm turn pacing or realtime responsiveness.
- Runtime provider access introduces cost, privacy, and availability concerns.
- Multiplayer scenarios need stronger authority and anti-cheat boundaries.

### Future Considerations

- This ADR focuses on single-player runtime AI first; multiplayer scenarios require backend-authoritative coordination.
- Consider provider rate limiting, cost management, privacy boundaries, and offline fallback behavior for runtime usage.
- Future work may include runtime procedural content suggestions, but those should use separate review and persistence rules before changing authored data.
- Add monitoring and diagnostics for AI action decisions, rejected proposals, fallback rates, and provider failures.
