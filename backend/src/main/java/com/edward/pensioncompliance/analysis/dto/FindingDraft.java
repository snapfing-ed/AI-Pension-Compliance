package com.edward.pensioncompliance.analysis.dto;

import java.math.BigDecimal;

/** A finding produced by the deterministic rules, not yet persisted. */
public record FindingDraft(
        String findingCode,
        String category,
        String description,
        BigDecimal priorityScore,
        BigDecimal confidenceScore,
        String detectionMethod,
        String explanation) {
}