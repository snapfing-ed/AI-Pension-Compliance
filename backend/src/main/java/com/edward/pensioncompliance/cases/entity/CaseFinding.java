package com.edward.pensioncompliance.cases.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "case_finding")
public class CaseFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "case_finding_id")
    private Long caseFindingId;

    @Column(name = "case_id", nullable = false, updatable = false)
    private Long caseId;

    @Column(name = "finding_id", nullable = false, updatable = false)
    private Long findingId;

    @Column(name = "linked_at", nullable = false, updatable = false)
    private OffsetDateTime linkedAt;

    @Column(name = "linked_by_user_id", updatable = false)
    private Long linkedByUserId;

    @Column(name = "case_specific_disposition", length = 30)
    private String caseSpecificDisposition;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    protected CaseFinding() {}

    public CaseFinding(Long caseId, Long findingId, Long linkedByUserId, String notes) {
        this.caseId = caseId;
        this.findingId = findingId;
        this.linkedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.linkedByUserId = linkedByUserId;
        this.caseSpecificDisposition = "REQUIRES_REVIEW";
        this.notes = notes;
    }

    public void updateDisposition(String disposition, String notes) {
        if (disposition != null) this.caseSpecificDisposition = disposition;
        if (notes != null) this.notes = notes;
    }

    public Long getCaseFindingId() { return caseFindingId; }
    public Long getCaseId() { return caseId; }
    public Long getFindingId() { return findingId; }
    public OffsetDateTime getLinkedAt() { return linkedAt; }
    public Long getLinkedByUserId() { return linkedByUserId; }
    public String getCaseSpecificDisposition() { return caseSpecificDisposition; }
    public String getNotes() { return notes; }
}