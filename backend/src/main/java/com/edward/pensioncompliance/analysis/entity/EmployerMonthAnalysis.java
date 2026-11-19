package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "employer_month_analysis")
public class EmployerMonthAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_id")
    private Long analysisId;

    @Column(name = "employer_id", nullable = false)
    private Long employerId;

    @Column(name = "period_id", nullable = false)
    private Long periodId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected EmployerMonthAnalysis() {}

    public EmployerMonthAnalysis(Long employerId, Long periodId) {
        this.employerId = employerId;
        this.periodId = periodId;
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getAnalysisId() { return analysisId; }
    public Long getEmployerId() { return employerId; }
    public Long getPeriodId() { return periodId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}