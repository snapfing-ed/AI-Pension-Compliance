package com.edward.pensioncompliance.cases.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "case_assignment_history")
public class CaseAssignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "case_id", nullable = false, updatable = false)
    private Long caseId;

    @Column(name = "assigned_user_id", nullable = false, updatable = false)
    private Long assignedUserId;

    @Column(name = "assigned_by_user_id", nullable = false, updatable = false)
    private Long assignedByUserId;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "unassigned_at")
    private OffsetDateTime unassignedAt;

    @Column(name = "assignment_note", columnDefinition = "TEXT")
    private String assignmentNote;

    protected CaseAssignmentHistory() {}

    public CaseAssignmentHistory(Long caseId, Long assignedUserId, Long assignedByUserId, String assignmentNote) {
        this.caseId = caseId;
        this.assignedUserId = assignedUserId;
        this.assignedByUserId = assignedByUserId;
        this.assignedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.assignmentNote = assignmentNote;
    }

    public void markUnassigned() {
        this.unassignedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getAssignmentId() { return assignmentId; }
    public Long getCaseId() { return caseId; }
    public Long getAssignedUserId() { return assignedUserId; }
    public Long getAssignedByUserId() { return assignedByUserId; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public OffsetDateTime getUnassignedAt() { return unassignedAt; }
    public String getAssignmentNote() { return assignmentNote; }
}