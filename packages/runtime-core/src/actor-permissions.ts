import type {
  ActorActionKind,
  ActorCapabilityProfile,
  ActorKind,
  ActorUsePolicy,
  AdventurePackage,
  EntityDefId,
  RuntimeActionProposal
} from "@acs/domain";

export interface ActorActionReadiness {
  allowed: boolean;
  actorKind: ActorKind;
  reasons: string[];
}

interface ActorContext {
  actorKind: ActorKind;
  entityDefinitionId?: EntityDefId;
  capabilityProfile?: ActorCapabilityProfile;
}

export function evaluateRuntimeActionReadiness(pkg: AdventurePackage, proposal: RuntimeActionProposal): ActorActionReadiness {
  const actor = resolveActorContext(pkg, proposal.actorId);
  const reasons = [
    ...actionReasons(actor.capabilityProfile, proposal.action),
    ...targetPolicyReasons(pkg, actor, proposal)
  ];

  return {
    allowed: reasons.length === 0,
    actorKind: actor.actorKind,
    reasons
  };
}

function resolveActorContext(pkg: AdventurePackage, actorId: RuntimeActionProposal["actorId"]): ActorContext {
  if (actorId === "player") {
    return withCapabilityProfile({ actorKind: "player" }, findProfileForKind(pkg, "player"));
  }

  const instance = pkg.entityInstances.find((entity) => entity.id === actorId);
  const definition = pkg.entityDefinitions.find((entity) => entity.id === instance?.definitionId);
  const profile = findProfileById(pkg, definition?.capabilityProfileId);
  const actorKind = profile?.role ?? definitionKindToActorKind(definition?.kind);
  const context = withCapabilityProfile({ actorKind }, profile);

  return definition?.id ? { ...context, entityDefinitionId: definition.id } : context;
}

function withCapabilityProfile(context: ActorContext, profile: ActorCapabilityProfile | undefined): ActorContext {
  return profile ? { ...context, capabilityProfile: profile } : context;
}

function actionReasons(profile: ActorCapabilityProfile | undefined, action: ActorActionKind) {
  if (!profile) {
    return [];
  }
  return profile.allowedActions.includes(action) ? [] : [`action_not_allowed:${action}`];
}

function targetPolicyReasons(pkg: AdventurePackage, actor: ActorContext, proposal: RuntimeActionProposal) {
  return [
    ...profilePolicyReasons(actor, profilePolicyForAction(actor.capabilityProfile, proposal.action)),
    ...objectPolicyReasons(actor, objectPolicyForProposal(pkg, proposal))
  ];
}

function profilePolicyForAction(profile: ActorCapabilityProfile | undefined, action: ActorActionKind) {
  if (action === "useItem") {
    return profile?.itemPolicy;
  }
  if (action === "activateTrigger") {
    return profile?.triggerPolicy;
  }
  if (action === "traverseExit") {
    return profile?.exitPolicy;
  }
  return undefined;
}

function objectPolicyForProposal(pkg: AdventurePackage, proposal: RuntimeActionProposal) {
  if (proposal.action === "useItem") {
    return pkg.itemDefinitions.find((item) => item.id === proposal.targetItemId)?.usePolicy;
  }
  if (proposal.action === "activateTrigger") {
    return pkg.triggers.find((trigger) => trigger.id === proposal.targetTriggerId)?.usePolicy;
  }
  if (proposal.action === "traverseExit") {
    return pkg.maps.flatMap((map) => map.exits).find((exit) => exit.id === proposal.targetExitId)?.usePolicy;
  }
  return undefined;
}

function profilePolicyReasons(actor: ActorContext, policy: ActorUsePolicy | undefined) {
  return evaluateActorPolicy(actor, policy).map((reason) => `profile_${reason}`);
}

function objectPolicyReasons(actor: ActorContext, policy: ActorUsePolicy | undefined) {
  return evaluateActorPolicy(actor, policy).map((reason) => `object_${reason}`);
}

function evaluateActorPolicy(actor: ActorContext, policy: ActorUsePolicy | undefined) {
  if (!policy || policy.mode === "all") {
    return [];
  }
  if (policy.mode === "blocked") {
    return ["policy_blocked"];
  }
  if (policy.mode === "playersOnly") {
    return actor.actorKind === "player" ? [] : ["players_only"];
  }
  if (policy.mode === "npcsOnly") {
    return actor.actorKind === "player" ? ["npcs_only"] : [];
  }
  return explicitPolicyReasons(actor, policy);
}

function explicitPolicyReasons(actor: ActorContext, policy: ActorUsePolicy) {
  if (isExplicitlyDenied(actor, policy)) {
    return ["explicit_denied_entity"];
  }
  if (isExplicitlyAllowed(actor, policy)) {
    return [];
  }
  return ["explicit_not_allowed"];
}

function isExplicitlyDenied(actor: ActorContext, policy: ActorUsePolicy) {
  return Boolean(actor.entityDefinitionId && policy.deniedEntityDefinitionIds?.includes(actor.entityDefinitionId));
}

function isExplicitlyAllowed(actor: ActorContext, policy: ActorUsePolicy) {
  return Boolean(
    policy.allowedActorKinds?.includes(actor.actorKind) ||
      (actor.entityDefinitionId && policy.allowedEntityDefinitionIds?.includes(actor.entityDefinitionId))
  );
}

function findProfileForKind(pkg: AdventurePackage, actorKind: ActorKind) {
  return pkg.actorCapabilityProfiles?.find((profile) => profile.role === actorKind);
}

function findProfileById(pkg: AdventurePackage, profileId: string | undefined) {
  return pkg.actorCapabilityProfiles?.find((profile) => profile.id === profileId);
}

function definitionKindToActorKind(kind: AdventurePackage["entityDefinitions"][number]["kind"] | undefined): ActorKind {
  if (kind === "player" || kind === "npc" || kind === "enemy") {
    return kind;
  }
  return "npc";
}
