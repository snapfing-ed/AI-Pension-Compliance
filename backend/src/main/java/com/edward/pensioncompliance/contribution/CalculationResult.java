package com.edward.pensioncompliance.contribution;

import java.math.BigDecimal;

/** Amounts are null when status is not CALCULATED. */
public record CalculationResult(
        CalculationStatus status,
        BigDecimal pensionableEarnings,
        BigDecimal employeeAmount,
        BigDecimal employerAmount,
        BigDecimal totalAmount,
        String explanationCode) {

    public static CalculationResult notCalculated(CalculationStatus status, String code) {
        return new CalculationResult(status, null, null, null, null, code);
    }
}