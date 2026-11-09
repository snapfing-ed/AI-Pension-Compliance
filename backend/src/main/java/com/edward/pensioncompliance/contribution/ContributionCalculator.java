package com.edward.pensioncompliance.contribution;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class ContributionCalculator {

    public CalculationResult calculate(BigDecimal grossPay, ContributionRuleParameters rule) {
        if (grossPay == null) {
            return CalculationResult.notCalculated(CalculationStatus.EXCLUDED, "MISSING_PAY");
        }
        if (grossPay.compareTo(BigDecimal.ZERO) < 0) {
            return CalculationResult.notCalculated(CalculationStatus.INVALID, "NEGATIVE_PAY");
        }

        BigDecimal pensionable = (rule.ceilingAmount() == null)
                ? grossPay
                : grossPay.min(rule.ceilingAmount());

        BigDecimal employee = pensionable.multiply(rule.employeeRate())
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal employer = pensionable.multiply(rule.employerRate())
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = employee.add(employer);

        return new CalculationResult(CalculationStatus.CALCULATED,
                pensionable, employee, employer, total, "OK");
    }
}