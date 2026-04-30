import { createTextFileArchive } from "./standalone-archive.js";
export function createReleaseReviewPackageArchive(manifest) {
    return createTextFileArchive(createReleaseReviewPackageFiles(manifest));
}
function createReleaseReviewPackageFiles(manifest) {
    return manifest.files.map((file) => ({
        path: file.path,
        contents: file.contents
    }));
}
//# sourceMappingURL=review-package.js.map