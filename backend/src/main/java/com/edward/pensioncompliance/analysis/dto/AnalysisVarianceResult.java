package com.edward.pensioncompliance.analysis.dto;

import java.math.BigDecimal;

public record AnalysisVarianceResult(
        BigDecimal expectedTotal,
        BigDecimal reportedTotal,
        BigDecimal variance,
        String status,
        String explanationCode
) {}