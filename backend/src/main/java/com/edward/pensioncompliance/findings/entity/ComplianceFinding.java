package com.edward.pensioncompliance.findings.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "compliance_finding")
public class ComplianceFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "finding_id")
    private Long findingId;

    @Column(name = "snapshot_id", nullable = false, updatable = false)
    private Long snapshotId;

    @Column(name = "finding_code", nullable = false, length = 100, updatable = false)
    private String findingCode;

    @Column(name = "category", nullable = false, length = 40, updatable = false)
    private String category;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String description;

    @Column(name = "priority_score", precision = 8, scale = 3)
    private BigDecimal priorityScore;

    @Column(name = "confidence_score", precision = 6, scale = 5)
    private BigDecimal confidenceScore;

    @Column(name = "detection_method", nullable = false, length = 30, updatable = false)
    private String detectionMethod;

    @Column(name = "explanation", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String explanation;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "NEW";

    @Column(name = "detected_at", nullable = false, updatable = false)
    private OffsetDateTime detectedAt;

    protected ComplianceFinding() {}

    public ComplianceFinding(
            Long snapshotId, String findingCode, String category, String description,
            BigDecimal priorityScore, BigDecimal confidenceScore, String detectionMethod,
            String explanation) {
        this.snapshotId = snapshotId;
        this.findingCode = findingCode;
        this.category = category;
        this.description = description;
        this.priorityScore = priorityScore;
        this.confidenceScore = confidenceScore;
        this.detectionMethod = detectionMethod;
        this.explanation = explanation;
        this.status = "NEW";
        this.detectedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public void updateStatus(String status) { this.status = status; }

    public Long getFindingId() { return findingId; }
    public Long getSnapshotId() { return snapshotId; }
    public String getFindingCode() { return findingCode; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getPriorityScore() { return priorityScore; }
    public BigDecimal getConfidenceScore() { return confidenceScore; }
    public String getDetectionMethod() { return detectionMethod; }
    public String getExplanation() { return explanation; }
    public String getStatus() { return status; }
    public OffsetDateTime getDetectedAt() { return detectedAt; }
}