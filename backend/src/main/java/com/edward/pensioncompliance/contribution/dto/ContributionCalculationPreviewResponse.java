package com.edward.pensioncompliance.contribution.dto;

import com.edward.pensioncompliance.contribution.CalculationResult;
import com.edward.pensioncompliance.contribution.RuleVersion;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContributionCalculationPreviewResponse(
        String ruleCode,
        int ruleVersionNo,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        BigDecimal employeeRate,
        BigDecimal employerRate,
        BigDecimal ceilingAmount,
        BigDecimal grossPay,
        String calculationStatus,
        BigDecimal pensionableEarnings,
        BigDecimal employeeAmount,
        BigDecimal employerAmount,
        BigDecimal totalAmount,
        String explanationCode
) {
    public static ContributionCalculationPreviewResponse from(
            RuleVersion rule,
            BigDecimal grossPay,
            CalculationResult result) {
        return new ContributionCalculationPreviewResponse(
                rule.ruleCode(),
                rule.versionNo(),
                rule.effectiveFrom(),
                rule.effectiveTo(),
                rule.parameters().employeeRate(),
                rule.parameters().employerRate(),
                rule.parameters().ceilingAmount(),
                grossPay,
                result.status().name(),
                result.pensionableEarnings(),
                result.employeeAmount(),
                result.employerAmount(),
                result.totalAmount(),
                result.explanationCode()
        );
    }
}