import type { ReleaseReviewPackageManifest } from "./index.js";
import { createTextFileArchive, type ArchiveTextFile } from "./standalone-archive.js";

export function createReleaseReviewPackageArchive(manifest: ReleaseReviewPackageManifest): Uint8Array {
  return createTextFileArchive(createReleaseReviewPackageFiles(manifest));
}

function createReleaseReviewPackageFiles(manifest: ReleaseReviewPackageManifest): ArchiveTextFile[] {
  return manifest.files.map((file) => ({
    path: file.path,
    contents: file.contents
  }));
}
