package com.edward.pensioncompliance.analysis.entity;

/** Mirrors ck_snapshot_result in V2__create_payroll_analysis_tables.sql. */
public enum SnapshotOverallResult {
    PENDING,
    NO_ISSUE_DETECTED,
    REQUIRES_REVIEW,
    DATA_INCOMPLETE,
    FAILED
}