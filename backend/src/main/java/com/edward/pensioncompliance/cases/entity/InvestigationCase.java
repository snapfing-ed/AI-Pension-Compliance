package com.edward.pensioncompliance.cases.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "investigation_case")
public class InvestigationCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "case_id")
    private Long caseId;

    @Column(name = "case_ref", nullable = false, unique = true, length = 50, updatable = false)
    private String caseRef;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "case_status", nullable = false, length = 25)
    private String caseStatus = "OPEN";

    @Column(name = "priority", nullable = false, length = 20)
    private String priority = "MEDIUM";

    @Column(name = "opened_at", nullable = false, updatable = false)
    private OffsetDateTime openedAt;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @Column(name = "created_by_user_id", updatable = false)
    private Long createdByUserId;

    protected InvestigationCase() {}

    public InvestigationCase(String caseRef, String title, String description, String priority, Long createdByUserId) {
        this.caseRef = caseRef;
        this.title = title;
        this.description = description;
        this.caseStatus = "OPEN";
        this.priority = (priority != null && !priority.isBlank()) ? priority : "MEDIUM";
        this.openedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.createdByUserId = createdByUserId;
    }

    public void updateStatus(String newStatus) {
        this.caseStatus = newStatus;
        if ("CLOSED".equals(newStatus) || "CANCELLED".equals(newStatus)) {
            this.closedAt = OffsetDateTime.now(ZoneOffset.UTC);
        }
    }

    public void updatePriority(String newPriority) {
        this.priority = newPriority;
    }

    public Long getCaseId() { return caseId; }
    public String getCaseRef() { return caseRef; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCaseStatus() { return caseStatus; }
    public String getPriority() { return priority; }
    public OffsetDateTime getOpenedAt() { return openedAt; }
    public OffsetDateTime getClosedAt() { return closedAt; }
    public Long getCreatedByUserId() { return createdByUserId; }
}