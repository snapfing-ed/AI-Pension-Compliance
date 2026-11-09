package com.edward.pensioncompliance.contribution;

import java.time.LocalDate;

/**
 * One effective-dated version of a contribution rule.
 * effectiveTo is inclusive; null means open-ended.
 */
public record RuleVersion(
        String ruleCode,
        int versionNo,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        VerificationStatus verificationStatus,
        ContributionRuleParameters parameters) { }