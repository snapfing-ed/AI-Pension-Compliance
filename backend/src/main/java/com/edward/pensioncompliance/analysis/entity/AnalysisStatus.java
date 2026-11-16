package com.edward.pensioncompliance.analysis.entity;

public enum AnalysisStatus {
    NOT_ANALYSED,
    NO_ISSUE_DETECTED,
    POTENTIALLY_INCOMPLETE,
    POTENTIALLY_MISSING,
    POTENTIALLY_DELAYED,
    UNUSUAL_PATTERN,
    REQUIRES_REVIEW,
    DATA_INCOMPLETE,
    DATA_QUALITY_ISSUE
}