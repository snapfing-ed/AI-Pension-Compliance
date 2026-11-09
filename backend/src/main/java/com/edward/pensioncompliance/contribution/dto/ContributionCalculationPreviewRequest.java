package com.edward.pensioncompliance.contribution.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContributionCalculationPreviewRequest(
        BigDecimal grossPay,
        Long periodId,
        LocalDate date,
        String ruleCode
) {}