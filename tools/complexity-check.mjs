#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript/lib/typescript.js");

const repoRoot = process.cwd();
const maxComplexity = 8;
const baselinePath = join(repoRoot, "tools", "complexity-baseline.json");
const writeBaseline = process.argv.includes("--write-baseline");
const sourceFiles = [
  "packages/validation/src/index.ts",
  "packages/runtime-2d/src/index.ts",
  "packages/content-schema/src/index.ts",
  "packages/editor-core/src/index.ts",
  "apps/web/src/index.ts",
  "apps/web/src/editor.ts",
  "packages/runtime-core/src/index.ts",
  "apps/api/src/index.ts",
  "packages/persistence/src/index.ts",
  "packages/project-api/src/index.ts"
];

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function nameOf(node) {
  if (node.name?.getText) {
    return node.name.getText();
  }

  if (ts.isVariableDeclaration(node.parent) && node.parent.name) {
    return node.parent.name.getText();
  }

  if (ts.isPropertyAssignment(node.parent) && node.parent.name) {
    return node.parent.name.getText();
  }

  return "<anonymous>";
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isConstructorDeclaration(node);
}

function complexityOf(fn) {
  let complexity = 1;

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
      case ts.SyntaxKind.CaseClause:
        complexity += 1;
        break;
      case ts.SyntaxKind.BinaryExpression:
        if (
          node.operatorToken &&
          (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
        ) {
          complexity += 1;
        }
        break;
    }

    ts.forEachChild(node, visit);
  }

  if (fn.body) {
    ts.forEachChild(fn.body, visit);
  }

  return complexity;
}

function scanFile(file) {
  const absolutePath = join(repoRoot, file);
  const sourceText = readFileSync(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(absolutePath, sourceText, ts.ScriptTarget.Latest, true);
  const findings = [];

  function walk(node) {
    if (isFunctionLike(node) && node.body) {
      const line = lineOf(sourceFile, node);
      const name = nameOf(node);
      findings.push({
        id: `${file}:${line}:${name}`,
        file,
        line,
        name,
        complexity: complexityOf(node)
      });
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return findings;
}

function readBaseline() {
  if (!existsSync(baselinePath)) {
    return { maxComplexity, violations: [] };
  }

  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

const findings = sourceFiles.flatMap(scanFile);
const violations = findings
  .filter((finding) => finding.complexity > maxComplexity)
  .sort((a, b) => b.complexity - a.complexity || a.file.localeCompare(b.file) || a.line - b.line);

if (writeBaseline) {
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ maxComplexity, generatedAt: new Date().toISOString(), violations }, null, 2)}\n`
  );
  console.log(`Wrote complexity baseline with ${violations.length} existing violation(s).`);
  process.exit(0);
}

const baseline = readBaseline();
const baselineById = new Map((baseline.violations ?? []).map((violation) => [violation.id, violation]));
const failures = [];

for (const violation of violations) {
  const baselineViolation = baselineById.get(violation.id);
  if (!baselineViolation) {
    failures.push({ ...violation, reason: "new violation" });
    continue;
  }

  if (violation.complexity > baselineViolation.complexity) {
    failures.push({
      ...violation,
      reason: `worsened from ${baselineViolation.complexity}`
    });
  }
}

if (failures.length > 0) {
  console.error(`Cyclomatic complexity check failed. Max allowed for new or changed functions is ${maxComplexity}.`);
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line} ${failure.name} complexity ${failure.complexity} (${failure.reason})`);
  }
  console.error("Refactor the function or intentionally reduce/update the baseline as part of a cleanup commit.");
  process.exit(1);
}

const legacyCount = violations.length;
console.log(`Cyclomatic complexity check passed. No new or worsened violations over ${maxComplexity}.`);
if (legacyCount > 0) {
  console.log(`${legacyCount} existing violation(s) remain in the baseline and should be refactored down over time.`);
}
