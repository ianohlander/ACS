import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  legacyStarterCustomObjects,
  legacyStarterEntityDefinitions,
  legacyStarterItemDefinitions,
  legacyStarterSpellDefinitions,
  legacyStarterTileDefinitions,
  legacyStarterTraitDefinitions
} from "../../packages/default-content/dist/index.js";

const legacySource = JSON.parse(readFileSync("legacy ACS/legacy_ACS_startpacks.txt", "utf8"));
const importedNames = new Set([
  ...legacyStarterCustomObjects,
  ...legacyStarterEntityDefinitions,
  ...legacyStarterItemDefinitions,
  ...legacyStarterSpellDefinitions,
  ...legacyStarterTileDefinitions,
  ...legacyStarterTraitDefinitions
].map((definition) => definition.name.toLowerCase()));

describe("default-content starter libraries", () => {
  it("imports every documented non-Land classic ACS starter element", () => {
    const missing = [
      ...missingDocumentedThings(),
      ...missingSpecialUtilityThings(),
      ...missingBaseSpellEffects(),
      ...missingDocumentedCreatures(),
      ...missingGeneralCreatureTypes()
    ];

    assert.deepEqual(missing, []);
  });

  it("keeps the classic starter libraries substantial enough to be useful", () => {
    assert.ok(legacyStarterTileDefinitions.length >= 21, "expected at least 21 classic tiles/spaces/portals");
    assert.ok(legacyStarterItemDefinitions.length >= 22, "expected at least 22 classic items/things");
    assert.ok(legacyStarterEntityDefinitions.length >= 15, "expected at least 15 classic entities/creatures");
    assert.ok(legacyStarterSpellDefinitions.length >= 16, "expected at least 16 classic spells/effects");
    assert.ok(legacyStarterTraitDefinitions.length >= 30, "expected at least 30 classic traits/options");
  });
});

function missingDocumentedThings() {
  return legacySource.documented_named_things_and_examples
    .filter((entry) => !isLandExample(entry))
    .filter((entry) => !hasImportedName(entry.name))
    .map((entry) => entry.name);
}

function missingSpecialUtilityThings() {
  return legacySource.special_utility_things
    .filter((entry) => !hasImportedName(entry.name))
    .map((entry) => entry.name);
}

function missingBaseSpellEffects() {
  return legacySource.base_spell_effects
    .filter((entry) => !hasImportedNameContaining(entry.name))
    .map((entry) => entry.name);
}

function missingDocumentedCreatures() {
  return legacySource.creature_system.documented_named_creature_examples
    .filter((entry) => !hasImportedName(entry.name))
    .map((entry) => entry.name);
}

function missingGeneralCreatureTypes() {
  return legacySource.creature_system.documented_general_creature_types
    .filter((name) => !hasImportedName(name))
    .map((name) => name);
}

function hasImportedName(name) {
  return importedNames.has(name.toLowerCase());
}

function hasImportedNameContaining(name) {
  return [...importedNames].some((importedName) => importedName.includes(name.toLowerCase()));
}

function isLandExample(entry) {
  return /Land of Aventuria|not proven/.test(entry.context ?? "");
}
