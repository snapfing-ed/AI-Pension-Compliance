package com.edward.pensioncompliance.period.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateContributionPeriodStatusRequest(
        @NotBlank String status
) {}