package com.edward.pensioncompliance.analysis.dto;

import jakarta.validation.constraints.NotNull;

public record ExecuteAnalysisRequest(
        @NotNull Long employerId,
        @NotNull Long periodId,
        String ruleCode
) {}