package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DueDateCalculator {

    public static final ZoneId ZAMBIA_ZONE = ZoneId.of("Africa/Lusaka");
    private static final Pattern FOLLOWING_MONTH_PATTERN =
            Pattern.compile("^DAY_OF_FOLLOWING_MONTH:(\\d{1,2})$");

    public enum WeekendAdjustment {
        NONE,
        NEXT_BUSINESS_DAY
    }

    public LocalDate resolveDueDate(
            ContributionPeriod period,
            String dueDayRule,
            WeekendAdjustment weekendAdjustment) {
        if (period == null) {
            throw new IllegalArgumentException("Contribution period is required.");
        }
        return resolveDueDate(
                period.getPeriodYear().intValue(),
                period.getPeriodMonth().intValue(),
                dueDayRule,
                weekendAdjustment);
    }

    public LocalDate resolveDueDate(
            int periodYear,
            int periodMonth,
            String dueDayRule,
            WeekendAdjustment weekendAdjustment) {
        if (dueDayRule == null || dueDayRule.isBlank()) {
            throw new IllegalArgumentException("dueDayRule must not be blank.");
        }
        Matcher matcher = FOLLOWING_MONTH_PATTERN.matcher(dueDayRule.trim());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Unsupported dueDayRule: " + dueDayRule);
        }
        int targetDay = Integer.parseInt(matcher.group(1));
        if (targetDay < 1 || targetDay > 31) {
            throw new IllegalArgumentException("Due day must be between 1 and 31: " + targetDay);
        }

        YearMonth followingMonth = YearMonth.of(periodYear, periodMonth).plusMonths(1);
        int clampedDay = Math.min(targetDay, followingMonth.lengthOfMonth());
        LocalDate dueDate = followingMonth.atDay(clampedDay);

        if (weekendAdjustment == WeekendAdjustment.NEXT_BUSINESS_DAY) {
            while (dueDate.getDayOfWeek() == DayOfWeek.SATURDAY
                    || dueDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
                dueDate = dueDate.plusDays(1);
            }
        }
        return dueDate;
    }

    public boolean isDelayed(OffsetDateTime eventTimestamp, LocalDate dueDate) {
        if (eventTimestamp == null || dueDate == null) {
            return false;
        }
        LocalDate localDate = eventTimestamp.atZoneSameInstant(ZAMBIA_ZONE).toLocalDate();
        return localDate.isAfter(dueDate);
    }
}