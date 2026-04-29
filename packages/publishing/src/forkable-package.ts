import type { ForkableProjectArtifact } from "./index.js";
import { createTextFileArchive, type ArchiveTextFile } from "./standalone-archive.js";

export function createForkableProjectPackageArchive(artifact: ForkableProjectArtifact): Uint8Array {
  return createTextFileArchive(createForkableProjectPackageFiles(artifact));
}

function createForkableProjectPackageFiles(artifact: ForkableProjectArtifact): ArchiveTextFile[] {
  const handoff = artifact.projectManifest.handoff;
  return [
    createPackageFile(handoff.readmeHtml, createForkableReadmeHtml(artifact)),
    createPackageFile(handoff.readmeText, createForkableReadmeText(artifact)),
    createPackageFile(handoff.releaseNotesText, createForkableReleaseNotesText(artifact)),
    createPackageFile(handoff.packagedArtifactFileName, JSON.stringify(artifact, null, 2)),
    createPackageFile("project-manifest.json", JSON.stringify(artifact.projectManifest, null, 2))
  ];
}

function createForkableReadmeHtml(artifact: ForkableProjectArtifact): string {
  const { projectManifest } = artifact;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(projectManifest.project.title)} Forkable Package</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        line-height: 1.6;
        margin: 2rem;
        max-width: 54rem;
        color: #14202b;
      }
      code {
        background: #eef3f7;
        border-radius: 0.25rem;
        padding: 0.1rem 0.35rem;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(projectManifest.project.title)}: Forkable Project Package</h1>
    <p>This package is the editable handoff for the published ACS release <strong>${escapeHtml(projectManifest.release.label)}</strong>.</p>
    <h2>How To Use This Package</h2>
    <ol>
      ${projectManifest.handoff.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
    <h2>Files Included</h2>
    <ul>
      <li><code>${escapeHtml(projectManifest.handoff.packagedArtifactFileName)}</code> is the full forkable artifact JSON for import into ACS.</li>
      <li><code>project-manifest.json</code> is a smaller summary of release, content, and handoff metadata.</li>
      <li><code>${escapeHtml(projectManifest.handoff.releaseNotesText)}</code> preserves the published release notes in plain text.</li>
    </ul>
    <h2>Import Guidance</h2>
    <p>Recommended import area: <strong>${escapeHtml(projectManifest.handoff.recommendedImportArea)}</strong>.</p>
    <p>Recommended saved file name inside ACS: <code>${escapeHtml(projectManifest.handoff.recommendedFileName)}</code>.</p>
  </body>
</html>`;
}

function createForkableReadmeText(artifact: ForkableProjectArtifact): string {
  const { projectManifest } = artifact;
  return [
    `${projectManifest.project.title} - Forkable Project Package`,
    "",
    `Source release: ${projectManifest.release.label} (${projectManifest.release.id})`,
    `Recommended import area: ${projectManifest.handoff.recommendedImportArea}`,
    `Recommended saved file name: ${projectManifest.handoff.recommendedFileName}`,
    "",
    "Next steps:",
    ...projectManifest.handoff.nextSteps.map((step) => `- ${step}`),
    "",
    "Included files:",
    `- ${projectManifest.handoff.packagedArtifactFileName}`,
    "- project-manifest.json",
    `- ${projectManifest.handoff.releaseNotesText}`
  ].join("\n");
}

function createForkableReleaseNotesText(artifact: ForkableProjectArtifact): string {
  const { projectManifest } = artifact;
  return [
    `Release label: ${projectManifest.release.label}`,
    `Release id: ${projectManifest.release.id}`,
    `Release version: ${projectManifest.release.version}`,
    "",
    projectManifest.release.notes || "No release notes were provided for this published release."
  ].join("\n");
}

function createPackageFile(path: string, contents: string): ArchiveTextFile {
  return { path, contents };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
