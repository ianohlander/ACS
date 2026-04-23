import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const docsRoot = join(repoRoot, "docs");
const tutorialManifestPath = join(docsRoot, "tutorial-acceptance.json");
const docFiles = [
  "docs/user-guide.md",
  "docs/user-guide.html",
  "docs/system-reference.md",
  "docs/system-reference.html"
];
const requiredPdfFiles = ["docs/user-guide.pdf", "docs/system-reference.pdf"];
const tutorialManifest = readJson(tutorialManifestPath);

const issues = [
  ...validateReferencedImages(),
  ...validatePdfFiles(),
  ...validateTutorialAcceptance()
];

if (issues.length > 0) {
  console.error("Documentation validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Documentation validation passed: image references, PDFs, and tutorial acceptance checks are complete.");

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

function validateTutorialAcceptance() {
  const guidePath = join(repoRoot, tutorialManifest.guide);
  const content = readFileSync(guidePath, "utf8");
  const sections = splitTutorialSteps(content);
  return [
    ...validateManifestShape(tutorialManifest),
    ...validateTutorialStepSet(sections, tutorialManifest.steps),
    ...validateTutorialStepContent(sections, tutorialManifest.steps),
    ...validateNoRepeatedStepImages(sections)
  ];
}

function splitTutorialSteps(content) {
  const matches = [...content.matchAll(/^### Step (\d+): (.+)$/gm)];
  return new Map(matches.map((match, index) => {
    const step = Number(match[1]);
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return [step, { title: match[2], content: content.slice(start, end) }];
  }));
}

function validateManifestShape(manifest) {
  const issues = [];
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    issues.push("docs/tutorial-acceptance.json must define at least one tutorial step");
  }
  if (!manifest.guide) {
    issues.push("docs/tutorial-acceptance.json must name the guide it validates");
  }
  return issues;
}

function validateTutorialStepSet(sections, steps) {
  return steps
    .filter((step) => !sections.has(step.number))
    .map((step) => `docs/user-guide.md is missing tutorial Step ${step.number}`);
}

function validateTutorialStepContent(sections, steps) {
  return steps.flatMap((step) => validateSingleTutorialStep(sections.get(step.number), step));
}

function validateSingleTutorialStep(section, step) {
  if (!section) {
    return [];
  }
  return [
    ...validateStepTitle(section.title, step),
    ...validateRequiredText(section.content, step),
    ...validateRequiredImages(section.content, step)
  ];
}

function validateStepTitle(actualTitle, step) {
  return actualTitle.includes(step.title)
    ? []
    : [`Tutorial Step ${step.number} title must include '${step.title}'`];
}

function validateRequiredText(content, step) {
  const searchableContent = content.toLowerCase();
  return step.requiredText
    .filter((text) => !searchableContent.includes(text.toLowerCase()))
    .map((text) => `Tutorial Step ${step.number} must mention '${text}'`);
}

function validateRequiredImages(content, step) {
  return step.requiredImages
    .filter((image) => !content.includes(image))
    .map((image) => `Tutorial Step ${step.number} must include ${image}`);
}

function validateNoRepeatedStepImages(sections) {
  const seen = new Map();
  const issues = [];
  for (const [step, section] of sections.entries()) {
    collectRepeatedImageIssues(seen, issues, step, section.content);
  }
  return issues;
}

function collectRepeatedImageIssues(seen, issues, step, content) {
  for (const image of extractImageReferences(content).map((reference) => normalize(reference))) {
    if (seen.has(image)) {
      issues.push(`Tutorial image '${image}' is reused in Steps ${seen.get(image)} and ${step}`);
    }
    seen.set(image, step);
  }
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}
