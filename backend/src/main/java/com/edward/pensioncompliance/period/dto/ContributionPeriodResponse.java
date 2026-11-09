package com.edward.pensioncompliance.period.dto;

import com.edward.pensioncompliance.period.entity.ContributionPeriod;

import java.time.LocalDate;

public record ContributionPeriodResponse(
        Long periodId,
        int periodYear,
        int periodMonth,
        LocalDate periodStart,
        LocalDate periodEnd,
        String periodLabel,
        String status
) {
    public static ContributionPeriodResponse from(ContributionPeriod p) {
        return new ContributionPeriodResponse(
                p.getPeriodId(),
                p.getPeriodYear().intValue(),
                p.getPeriodMonth().intValue(),
                p.getPeriodStart(),
                p.getPeriodEnd(),
                p.getPeriodLabel(),
                p.getStatus().name()
        );
    }
}