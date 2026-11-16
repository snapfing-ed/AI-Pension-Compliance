package com.edward.pensioncompliance.analysis.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DueDateCalculatorTest {

    private final DueDateCalculator calculator = new DueDateCalculator();

    @Test
    void weekdayFollowingMonth_resolvesTenthDay() {
        LocalDate due = calculator.resolveDueDate(
                2026, 1, "DAY_OF_FOLLOWING_MONTH:10", DueDateCalculator.WeekendAdjustment.NEXT_BUSINESS_DAY);
        assertThat(due).isEqualTo(LocalDate.of(2026, 2, 10));
    }

    @Test
    void sundayDueDate_shiftsToMondayWhenNextBusinessDayEnabled() {
        // April 2026 -> May 10, 2026 is a Sunday -> Monday May 11, 2026
        LocalDate strict = calculator.resolveDueDate(
                2026, 4, "DAY_OF_FOLLOWING_MONTH:10", DueDateCalculator.WeekendAdjustment.NONE);
        LocalDate adjusted = calculator.resolveDueDate(
                2026, 4, "DAY_OF_FOLLOWING_MONTH:10", DueDateCalculator.WeekendAdjustment.NEXT_BUSINESS_DAY);

        assertThat(strict).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(adjusted).isEqualTo(LocalDate.of(2026, 5, 11));
    }

    @Test
    void decemberPeriod_rollsIntoJanuaryNextYear() {
        LocalDate due = calculator.resolveDueDate(
                2025, 12, "DAY_OF_FOLLOWING_MONTH:10", DueDateCalculator.WeekendAdjustment.NONE);
        assertThat(due).isEqualTo(LocalDate.of(2026, 1, 10));
    }

    @Test
    void lusakaTimezoneBoundary_distinguishesOnTimeFromDelayed() {
        LocalDate dueDate = LocalDate.of(2026, 2, 10);
        // 23:30 CAT (UTC+2) on Feb 10 is 21:30 UTC on Feb 10 -> still on time in Zambia
        OffsetDateTime onTimeLateEvening = OffsetDateTime.parse("2026-02-10T21:30:00Z");
        // 00:05 CAT on Feb 11 is 22:05 UTC on Feb 10 -> delayed in Zambia
        OffsetDateTime delayedAfterMidnightCat = OffsetDateTime.parse("2026-02-10T22:05:00Z");

        assertThat(calculator.isDelayed(onTimeLateEvening, dueDate)).isFalse();
        assertThat(calculator.isDelayed(delayedAfterMidnightCat, dueDate)).isTrue();
        assertThat(calculator.isDelayed(null, dueDate)).isFalse();
    }

    @Test
    void unsupportedRule_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> calculator.resolveDueDate(
                2026, 1, "UNKNOWN_RULE", DueDateCalculator.WeekendAdjustment.NONE))
                .isInstanceOf(IllegalArgumentException.class);
    }
}