package com.edward.pensioncompliance.findings.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "data_quality_finding")
public class DataQualityFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dq_finding_id")
    private Long dqFindingId;

    @Column(name = "snapshot_id", nullable = false, updatable = false)
    private Long snapshotId;

    @Column(name = "finding_code", nullable = false, length = 100, updatable = false)
    private String findingCode;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String description;

    @Column(name = "severity", nullable = false, length = 20, updatable = false)
    private String severity;

    @Column(name = "affected_record_type", nullable = false, length = 50, updatable = false)
    private String affectedRecordType;

    @Column(name = "affected_payroll_record_id", updatable = false)
    private Long affectedPayrollRecordId;

    @Column(name = "affected_return_line_id", updatable = false)
    private Long affectedReturnLineId;

    @Column(name = "affected_payment_id", updatable = false)
    private Long affectedPaymentId;

    @Column(name = "detected_at", nullable = false, updatable = false)
    private OffsetDateTime detectedAt;

    @Column(name = "resolution_status", nullable = false, length = 20)
    private String resolutionStatus = "OPEN";

    protected DataQualityFinding() {}

    public DataQualityFinding(
            Long snapshotId, String findingCode, String description, String severity,
            String affectedRecordType, Long affectedPayrollRecordId,
            Long affectedReturnLineId, Long affectedPaymentId) {
        this.snapshotId = snapshotId;
        this.findingCode = findingCode;
        this.description = description;
        this.severity = severity;
        this.affectedRecordType = affectedRecordType;
        this.affectedPayrollRecordId = affectedPayrollRecordId;
        this.affectedReturnLineId = affectedReturnLineId;
        this.affectedPaymentId = affectedPaymentId;
        this.detectedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.resolutionStatus = "OPEN";
    }

    public void updateResolutionStatus(String resolutionStatus) { this.resolutionStatus = resolutionStatus; }

    public Long getDqFindingId() { return dqFindingId; }
    public Long getSnapshotId() { return snapshotId; }
    public String getFindingCode() { return findingCode; }
    public String getDescription() { return description; }
    public String getSeverity() { return severity; }
    public String getAffectedRecordType() { return affectedRecordType; }
    public Long getAffectedPayrollRecordId() { return affectedPayrollRecordId; }
    public Long getAffectedReturnLineId() { return affectedReturnLineId; }
    public Long getAffectedPaymentId() { return affectedPaymentId; }
    public OffsetDateTime getDetectedAt() { return detectedAt; }
    public String getResolutionStatus() { return resolutionStatus; }
}