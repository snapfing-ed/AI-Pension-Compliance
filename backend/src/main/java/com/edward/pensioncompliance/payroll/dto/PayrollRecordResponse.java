package com.edward.pensioncompliance.payroll.dto;

import com.edward.pensioncompliance.payroll.entity.PayrollRecord;

import java.math.BigDecimal;

public record PayrollRecordResponse(
        Long payrollRecordId,
        Long payrollBatchId,
        Long employerId,
        Long periodId,
        Long memberId,
        String memberRef,
        String sourceMemberRef,
        String sourceRowRef,
        BigDecimal eligibleGrossPay,
        String payrollStatus,
        String dataQualityStatus
) {
    public static PayrollRecordResponse from(PayrollRecord r) {
        return new PayrollRecordResponse(
                r.getPayrollRecordId(),
                r.getPayrollBatch().getPayrollBatchId(),
                r.getEmployer().getEmployerId(),
                r.getPeriod().getPeriodId(),
                r.getMember().getMemberId(),
                r.getMember().getMemberRef(),
                r.getMember().getSourceMemberRef(),
                r.getSourceRowRef(),
                r.getEligibleGrossPay(),
                r.getPayrollStatus().name(),
                r.getDataQualityStatus().name()
        );
    }
}