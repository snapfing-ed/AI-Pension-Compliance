package com.edward.pensioncompliance.contribution.dto;

import com.edward.pensioncompliance.contribution.RuleVersion;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContributionRuleResponse(
        Long ruleVersionId,
        String ruleCode,
        int versionNo,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        BigDecimal employeeRate,
        BigDecimal employerRate,
        BigDecimal ceilingAmount,
        String dueDayRule,
        String roundingRule,
        String sourceReference,
        String verificationStatus
) {
    public static ContributionRuleResponse from(ContributionRuleVersion e) {
        return new ContributionRuleResponse(
                e.getRuleVersionId(),
                e.getRuleCode(),
                e.getVersionNo(),
                e.getEffectiveFrom(),
                e.getEffectiveTo(),
                e.getEmployeeRate(),
                e.getEmployerRate(),
                e.getCeilingAmount(),
                e.getDueDayRule(),
                e.getRoundingRule(),
                e.getSourceReference(),
                e.getVerificationStatus().name()
        );
    }

    public static ContributionRuleResponse from(RuleVersion r) {
        return new ContributionRuleResponse(
                null,
                r.ruleCode(),
                r.versionNo(),
                r.effectiveFrom(),
                r.effectiveTo(),
                r.parameters().employeeRate(),
                r.parameters().employerRate(),
                r.parameters().ceilingAmount(),
                null,
                null,
                null,
                r.verificationStatus().name()
        );
    }
}