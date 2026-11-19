package com.edward.pensioncompliance.analysis.dto;

import java.math.BigDecimal;

/**
 * Everything the deterministic rules need, with no entities or repositories.
 * reportedUnknown is true when at least one return version has a NULL reported total.
 * totalReported then sums only the amounts that were actually reported.
 */
public record RuleInputs(
        Long employerId,
        Long periodId,
        int activeBatchCount,
        int latestReturnCount,
        boolean reportedUnknown,
        boolean scopeEvidenceIncomplete,
        BigDecimal totalExpected,
        BigDecimal totalReported,
        BigDecimal totalPaid) {
}