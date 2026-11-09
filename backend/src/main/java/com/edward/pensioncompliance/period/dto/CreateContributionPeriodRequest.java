package com.edward.pensioncompliance.period.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateContributionPeriodRequest(
        @NotNull @Min(2000) @Max(2200) Integer periodYear,
        @NotNull @Min(1) @Max(12) Integer periodMonth
) {}