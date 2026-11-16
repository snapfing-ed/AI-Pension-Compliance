package com.edward.pensioncompliance.analysis.entity;

/** Mirrors ck_analysis_status in V2__create_payroll_analysis_tables.sql. */
public enum EmployerMonthAnalysisStatus {
    NOT_ANALYSED,
    UNDER_REVIEW,
    REQUIRES_INVESTIGATION,
    NO_ISSUE_DETECTED,
    DATA_INCOMPLETE
}