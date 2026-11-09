package com.edward.pensioncompliance.payroll.dto;

import java.math.BigDecimal;

public record ImportPayrollRowRequest(
        String memberRef,
        String sourceMemberRef,
        String sourceRowRef,
        BigDecimal eligibleGrossPay,
        String payrollStatus
) {}