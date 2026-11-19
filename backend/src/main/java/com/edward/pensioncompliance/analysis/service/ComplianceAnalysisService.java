package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.AnalysisVarianceResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class ComplianceAnalysisService {

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    public AnalysisVarianceResult analyzeContribution(BigDecimal expectedTotal, BigDecimal reportedTotal) {
        return analyzeContribution(expectedTotal, reportedTotal, BigDecimal.ZERO);
    }

    public AnalysisVarianceResult analyzeContribution(
            BigDecimal expectedTotal,
            BigDecimal reportedTotal,
            BigDecimal tolerance) {
        if (expectedTotal == null) {
            return new AnalysisVarianceResult(
                    null, reportedTotal, null, "DATA_INCOMPLETE", "MISSING_EXPECTED_DATA");
        }

        BigDecimal expected = expectedTotal.setScale(SCALE, ROUNDING_MODE);
        BigDecimal effectiveTolerance = (tolerance == null)
                ? BigDecimal.ZERO.setScale(SCALE, ROUNDING_MODE)
                : tolerance.abs().setScale(SCALE, ROUNDING_MODE);

        if (reportedTotal == null || reportedTotal.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal zero = BigDecimal.ZERO.setScale(SCALE, ROUNDING_MODE);
            if (expected.compareTo(BigDecimal.ZERO) == 0) {
                return new AnalysisVarianceResult(
                        expected, zero, zero, "NO_ISSUE_DETECTED", "ZERO_EXPECTED_AND_REPORTED");
            }
            return new AnalysisVarianceResult(
                    expected, zero, expected, "POTENTIALLY_MISSING", "NO_REPORTED_CONTRIBUTION");
        }

        BigDecimal reported = reportedTotal.setScale(SCALE, ROUNDING_MODE);
        BigDecimal variance = expected.subtract(reported).setScale(SCALE, ROUNDING_MODE);

        if (variance.abs().compareTo(effectiveTolerance) <= 0) {
            String code = (variance.compareTo(BigDecimal.ZERO) == 0)
                    ? "EXACT_MATCH"
                    : "WITHIN_TOLERANCE";
            return new AnalysisVarianceResult(expected, reported, variance, "NO_ISSUE_DETECTED", code);
        }

        if (variance.compareTo(BigDecimal.ZERO) > 0) {
            return new AnalysisVarianceResult(
                    expected, reported, variance,
                    "POTENTIALLY_INCOMPLETE", "REPORTED_AMOUNT_BELOW_EXPECTED");
        }

        return new AnalysisVarianceResult(
                expected, reported, variance,
                "REQUIRES_REVIEW", "REPORTED_AMOUNT_ABOVE_EXPECTED");
    }
}