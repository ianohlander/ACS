import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const docsRoot = join(repoRoot, "docs");
const docFiles = [
  "docs/user-guide.md",
  "docs/user-guide.html",
  "docs/system-reference.md",
  "docs/system-reference.html"
];
const requiredPdfFiles = ["docs/user-guide.pdf", "docs/system-reference.pdf"];
const requiredTutorialImagesByStep = new Map([
  [1, ["tutorial-ui-01-editor-open.png"]],
  [2, ["tutorial-ui-02-adventure-identity.png"]],
  [3, ["tutorial-ui-03-world-atlas-empty.png"]],
  [4, ["tutorial-ui-04-create-access-ring.png"]],
  [5, ["tutorial-ui-05-create-data-core.png"]],
  [6, ["tutorial-ui-06-create-airlock.png"]],
  [7, ["tutorial-ui-07-paint-access-ring.png"]],
  [8, ["tutorial-ui-08-paint-data-core.png"]],
  [9, ["tutorial-ui-09-paint-airlock.png"]],
  [10, ["tutorial-ui-10-place-station-ai.png"]],
  [11, ["tutorial-ui-11-place-pad-sentry.png"]],
  [12, ["tutorial-ui-12-quest-library.png", "tutorial-relay-08-quest.png"]],
  [13, ["tutorial-ui-12b-pixel-grouping-preview.png"]],
  [14, ["tutorial-ui-13-logic-panel.png", "tutorial-relay-10-trigger-ai.png", "tutorial-relay-11-trigger-power.png", "tutorial-relay-12-trigger-teleport.png", "tutorial-relay-13-trigger-core.png"]],
  [15, ["tutorial-ui-14-link-data-core-exit.png"]],
  [16, ["tutorial-ui-17-selected-cell-inspector.png"]],
  [17, ["tutorial-ui-15-diagnostics.png"]],
  [18, ["tutorial-ui-18-display-rename-preview.png"]],
  [19, ["tutorial-ui-16-ready-to-playtest.png"]]
]);

const issues = [
  ...validateReferencedImages(),
  ...validatePdfFiles(),
  ...validateTutorialScreenshots()
];

if (issues.length > 0) {
  console.error("Documentation validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Documentation validation passed: image references, PDFs, and tutorial screenshots are present and non-empty.");

function validateReferencedImages() {
  return docFiles.flatMap((file) => {
    const absoluteFile = join(repoRoot, file);
    const content = readFileSync(absoluteFile, "utf8");
    return extractImageReferences(content).flatMap((reference) => validateImageReference(file, reference));
  });
}

function extractImageReferences(content) {
  return [
    ...[...content.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => match[1]),
    ...[...content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map((match) => match[1])
  ];
}

function validateImageReference(file, reference) {
  if (isExternalReference(reference)) {
    return [];
  }
  const target = resolve(dirname(join(repoRoot, file)), reference.split("#")[0]);
  return validateExistingNonEmptyFile(target, `${file} references missing or empty image '${reference}'`);
}

function validatePdfFiles() {
  return requiredPdfFiles.flatMap((file) => validateExistingNonEmptyFile(join(repoRoot, file), `${file} is missing or empty`));
}

function validateTutorialScreenshots() {
  const content = readFileSync(join(docsRoot, "user-guide.md"), "utf8");
  const sections = splitTutorialSteps(content);
  return [
    ...validateTutorialStepSet(sections),
    ...validateRequiredTutorialImages(sections),
    ...validateNoRepeatedStepImages(sections)
  ];
}

function splitTutorialSteps(content) {
  const matches = [...content.matchAll(/^### Step (\d+): .+$/gm)];
  return new Map(matches.map((match, index) => {
    const step = Number(match[1]);
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return [step, content.slice(start, end)];
  }));
}

function validateTutorialStepSet(sections) {
  return [...requiredTutorialImagesByStep.keys()]
    .filter((step) => !sections.has(step))
    .map((step) => `docs/user-guide.md is missing tutorial Step ${step}`);
}

function validateRequiredTutorialImages(sections) {
  return [...requiredTutorialImagesByStep.entries()].flatMap(([step, images]) => {
    const section = sections.get(step) ?? "";
    return images
      .filter((image) => !section.includes(image))
      .map((image) => `Tutorial Step ${step} must include ${image}`);
  });
}

function validateNoRepeatedStepImages(sections) {
  const seen = new Map();
  const issues = [];
  for (const [step, section] of sections.entries()) {
    for (const image of extractImageReferences(section).map((reference) => normalize(reference))) {
      if (seen.has(image)) {
        issues.push(`Tutorial image '${image}' is reused in Steps ${seen.get(image)} and ${step}`);
      }
      seen.set(image, step);
    }
  }
  return issues;
}

function validateExistingNonEmptyFile(path, message) {
  if (!existsSync(path)) {
    return [message];
  }
  return statSync(path).size > 0 ? [] : [message];
}

function isExternalReference(reference) {
  return /^[a-z]+:\/\//i.test(reference) || reference.startsWith("data:");
}
