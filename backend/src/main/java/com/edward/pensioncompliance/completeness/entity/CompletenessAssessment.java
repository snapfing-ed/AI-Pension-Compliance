package com.edward.pensioncompliance.completeness.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "completeness_assessment")
public class CompletenessAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assessment_id")
    private Long assessmentId;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 30)
    private CompletenessScopeType scopeType;

    @Column(name = "scope_start", nullable = false)
    private LocalDate scopeStart;

    @Column(name = "scope_end", nullable = false)
    private LocalDate scopeEnd;

    @Column(name = "employer_id")
    private Long employerId;

    @Column(name = "period_id")
    private Long periodId;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_status", nullable = false, length = 20)
    private AssessmentStatus assessmentStatus;

    @Column(name = "assessed_at", nullable = false, updatable = false)
    private OffsetDateTime assessedAt;

    @Column(name = "assessed_by_user_id")
    private Long assessedByUserId;

    @Column(name = "evidence_notes")
    private String evidenceNotes;

    protected CompletenessAssessment() {}

    public CompletenessAssessment(
            Long sourceId, CompletenessScopeType scopeType, LocalDate scopeStart, LocalDate scopeEnd,
            Long employerId, Long periodId, AssessmentStatus assessmentStatus,
            Long assessedByUserId, String evidenceNotes) {
        this.sourceId = sourceId;
        this.scopeType = scopeType;
        this.scopeStart = scopeStart;
        this.scopeEnd = scopeEnd;
        this.employerId = employerId;
        this.periodId = periodId;
        this.assessmentStatus = assessmentStatus;
        this.assessedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.assessedByUserId = assessedByUserId;
        this.evidenceNotes = evidenceNotes;
    }

    public Long getAssessmentId() { return assessmentId; }
    public Long getSourceId() { return sourceId; }
    public CompletenessScopeType getScopeType() { return scopeType; }
    public LocalDate getScopeStart() { return scopeStart; }
    public LocalDate getScopeEnd() { return scopeEnd; }
    public Long getEmployerId() { return employerId; }
    public Long getPeriodId() { return periodId; }
    public AssessmentStatus getAssessmentStatus() { return assessmentStatus; }
    public OffsetDateTime getAssessedAt() { return assessedAt; }
    public Long getAssessedByUserId() { return assessedByUserId; }
    public String getEvidenceNotes() { return evidenceNotes; }
}