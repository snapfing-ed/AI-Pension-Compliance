package com.edward.pensioncompliance.contribution;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ContributionCalculatorTest {

    private final ContributionCalculator calculator = new ContributionCalculator();

    /** 2026 rule: 5% + 5%, earnings ceiling 37,236.00 */
    private static ContributionRuleParameters rule2026() {
        return new ContributionRuleParameters(
                new BigDecimal("0.05"), new BigDecimal("0.05"), new BigDecimal("37236.00"));
    }

    private static BigDecimal bd(String s) { return new BigDecimal(s); }

    @Test
    void belowCeiling_calculatesFivePercentEach() {
        CalculationResult r = calculator.calculate(bd("20000.00"), rule2026());
        assertThat(r.status()).isEqualTo(CalculationStatus.CALCULATED);
        assertThat(r.employeeAmount()).isEqualByComparingTo("1000.00");
        assertThat(r.employerAmount()).isEqualByComparingTo("1000.00");
        assertThat(r.totalAmount()).isEqualByComparingTo("2000.00");
    }

    @Test
    void atCeiling_reachesMaximum() {
        CalculationResult r = calculator.calculate(bd("37236.00"), rule2026());
        assertThat(r.employeeAmount()).isEqualByComparingTo("1861.80");
        assertThat(r.employerAmount()).isEqualByComparingTo("1861.80");
        assertThat(r.totalAmount()).isEqualByComparingTo("3723.60");
    }

    @Test
    void aboveCeiling_isCapped() {
        CalculationResult r = calculator.calculate(bd("50000.00"), rule2026());
        assertThat(r.pensionableEarnings()).isEqualByComparingTo("37236.00");
        assertThat(r.totalAmount()).isEqualByComparingTo("3723.60");
    }

    @Test
    void missingPay_isExcluded_notTreatedAsZero() {
        CalculationResult r = calculator.calculate(null, rule2026());
        assertThat(r.status()).isEqualTo(CalculationStatus.EXCLUDED);
        assertThat(r.totalAmount()).isNull();
    }

    @Test
    void oneCentAboveCeiling_stillCapped() {
        CalculationResult r = calculator.calculate(bd("37236.01"), rule2026());
        assertThat(r.totalAmount()).isEqualByComparingTo("3723.60");
    }

    @Test
    void explicitZero_isValidAndGivesZero() {
        CalculationResult r = calculator.calculate(bd("0.00"), rule2026());
        assertThat(r.status()).isEqualTo(CalculationStatus.CALCULATED);
        assertThat(r.totalAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    void negativePay_isInvalid() {
        CalculationResult r = calculator.calculate(bd("-1.00"), rule2026());
        assertThat(r.status()).isEqualTo(CalculationStatus.INVALID);
    }

    @Test
    void halfCent_roundsUp() {
        // 0.10 x 0.05 = 0.0050 -> 0.01 each under half-up -> total 0.02
        CalculationResult r = calculator.calculate(bd("0.10"), rule2026());
        assertThat(r.employeeAmount()).isEqualByComparingTo("0.01");
        assertThat(r.totalAmount()).isEqualByComparingTo("0.02");
    }

    @Test
    void roundingExample_33_33() {
        // 33.33 x 0.05 = 1.6665 -> 1.67 each -> total 3.34
        CalculationResult r = calculator.calculate(bd("33.33"), rule2026());
        assertThat(r.employeeAmount()).isEqualByComparingTo("1.67");
        assertThat(r.totalAmount()).isEqualByComparingTo("3.34");
    }

    @Test
    void amountsCarryTwoDecimalPlaces() {
        CalculationResult r = calculator.calculate(bd("20000"), rule2026());
        assertThat(r.employeeAmount().scale()).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.01", "19.99", "33.33", "1234.56", "37236.00", "99999.99"})
    void totalAlwaysEqualsEmployeePlusEmployer(String gross) {
        CalculationResult r = calculator.calculate(bd(gross), rule2026());
        assertThat(r.totalAmount())
                .isEqualByComparingTo(r.employeeAmount().add(r.employerAmount()));
    }
}
