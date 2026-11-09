package com.edward.pensioncompliance.payroll.dto;

import com.edward.pensioncompliance.payroll.entity.PayrollBatch;

import java.time.OffsetDateTime;

public record PayrollBatchResponse(
        Long payrollBatchId,
        Long employerId,
        String employerRef,
        String employerLegalName,
        Long periodId,
        String periodLabel,
        Long sourceId,
        String sourceName,
        String sourceType,
        String batchRef,
        int versionNo,
        OffsetDateTime receivedAt,
        OffsetDateTime recordedAt,
        String status,
        boolean current,
        Long supersedesBatchId,
        Long supersededByBatchId,
        long validRecordCount,
        long missingPayRecordCount,
        long totalRecordsStored,
        long quarantinedRecordCount
) {
    public static PayrollBatchResponse from(
            PayrollBatch b,
            boolean current,
            Long supersededByBatchId,
            long validCount,
            long issueCount,
            long pendingCount,
            long quarantineCount) {
        long stored = validCount + issueCount + pendingCount;
        return new PayrollBatchResponse(
                b.getPayrollBatchId(),
                b.getEmployer().getEmployerId(),
                b.getEmployer().getEmployerRef(),
                b.getEmployer().getLegalName(),
                b.getPeriod().getPeriodId(),
                b.getPeriod().getPeriodLabel(),
                b.getSource().getSourceId(),
                b.getSource().getSourceName(),
                b.getSource().getSourceType(),
                b.getBatchRef(),
                b.getVersionNo(),
                b.getReceivedAt(),
                b.getRecordedAt(),
                b.getStatus().name(),
                current,
                (b.getSupersedesBatch() != null) ? b.getSupersedesBatch().getPayrollBatchId() : null,
                supersededByBatchId,
                validCount,
                issueCount,
                stored,
                quarantineCount
        );
    }
}