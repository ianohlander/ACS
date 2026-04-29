import type { ForkableProjectArtifact } from "./index.js";
import { createTextFileArchive, type ArchiveTextFile } from "./standalone-archive.js";

export function createForkableProjectPackageArchive(artifact: ForkableProjectArtifact): Uint8Array {
  return createTextFileArchive(createForkableProjectPackageFiles(artifact));
}

function createForkableProjectPackageFiles(artifact: ForkableProjectArtifact): ArchiveTextFile[] {
  if (!artifact.package) {
    throw new Error("Forkable project artifact is missing its package manifest.");
  }
  return artifact.package.files.map((file) => createPackageFile(file.path, file.contents));
}

function createPackageFile(path: string, contents: string): ArchiveTextFile {
  return { path, contents };
}
