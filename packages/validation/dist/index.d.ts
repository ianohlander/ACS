import { type ValidationIssue } from "@acs/content-schema";
import type { AdventurePackage } from "@acs/domain";
export type { ValidationIssue } from "@acs/content-schema";
export interface ValidationSummary {
    errorCount: number;
    warningCount: number;
}
export interface ValidationReport {
    valid: boolean;
    blocking: boolean;
    issues: ValidationIssue[];
    summary: ValidationSummary;
}
export declare function validateAdventure(pkg: AdventurePackage): ValidationReport;
//# sourceMappingURL=index.d.ts.map