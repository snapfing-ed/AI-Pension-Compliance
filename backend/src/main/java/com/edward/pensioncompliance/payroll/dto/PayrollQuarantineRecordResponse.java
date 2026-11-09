package com.edward.pensioncompliance.payroll.dto;

import com.edward.pensioncompliance.payroll.entity.PayrollQuarantineRecord;

import java.time.OffsetDateTime;

public record PayrollQuarantineRecordResponse(
        Long quarantineRecordId,
        Long payrollBatchId,
        int rowNumber,
        String sourceRowRef,
        String rawMemberRef,
        String rawSourceMemberRef,
        String rawEligibleGrossPay,
        String rawPayrollStatus,
        String reasonCode,
        String reasonDetail,
        OffsetDateTime quarantinedAt
) {
    public static PayrollQuarantineRecordResponse from(PayrollQuarantineRecord q) {
        return new PayrollQuarantineRecordResponse(
                q.getQuarantineRecordId(),
                q.getPayrollBatch().getPayrollBatchId(),
                q.getRowNumber(),
                q.getSourceRowRef(),
                q.getRawMemberRef(),
                q.getRawSourceMemberRef(),
                q.getRawEligibleGrossPay(),
                q.getRawPayrollStatus(),
                q.getReasonCode().name(),
                q.getReasonDetail(),
                q.getQuarantinedAt()
        );
    }
}