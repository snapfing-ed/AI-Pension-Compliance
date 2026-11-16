package com.edward.pensioncompliance.analysis.dto;

import com.edward.pensioncompliance.analysis.entity.AnalysisSnapshot;
import com.edward.pensioncompliance.analysis.entity.ContributionCalculationEntity;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record SnapshotDetailResponse(
        Long snapshotId,
        Long analysisId,
        Integer runNumber,
        OffsetDateTime runStartedAt,
        OffsetDateTime runCompletedAt,
        Long ruleVersionId,
        String detectionLogicVersion,
        String inputFingerprint,
        String overallResult,
        BigDecimal totalExpected,
        BigDecimal totalReported,
        BigDecimal totalAllocatedPayments,
        List<ContributionCalculationEntity> calculations
) {
    public static SnapshotDetailResponse of(
            AnalysisSnapshot s,
            BigDecimal totalExpected,
            BigDecimal totalReported,
            BigDecimal totalAllocatedPayments,
            List<ContributionCalculationEntity> calcs) {
        return new SnapshotDetailResponse(
                s.getSnapshotId(), s.getAnalysisId(), s.getRunNumber(),
                s.getRunStartedAt(), s.getRunCompletedAt(), s.getRuleVersionId(),
                s.getDetectionLogicVersion(), s.getInputFingerprint(),
                s.getOverallResult().name(),
                totalExpected, totalReported, totalAllocatedPayments, calcs
        );
    }
}