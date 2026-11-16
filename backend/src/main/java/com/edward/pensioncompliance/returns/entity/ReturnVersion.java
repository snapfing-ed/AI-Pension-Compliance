package com.edward.pensioncompliance.returns.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "return_version")
public class ReturnVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_version_id")
    private Long returnVersionId;

    @Column(name = "return_id", nullable = false)
    private Long returnId;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private OffsetDateTime recordedAt;

    @Column(name = "reported_employee_amount", precision = 15, scale = 2)
    private BigDecimal reportedEmployeeAmount;

    @Column(name = "reported_employer_amount", precision = 15, scale = 2)
    private BigDecimal reportedEmployerAmount;

    @Column(name = "reported_total_amount", precision = 15, scale = 2)
    private BigDecimal reportedTotalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "completeness_status", nullable = false, length = 20)
    private CompletenessStatus completenessStatus = CompletenessStatus.UNKNOWN;

    @Column(name = "supersedes_version_id")
    private Long supersedesVersionId;

    @Column(name = "source_document_ref", length = 150)
    private String sourceDocumentRef;

    protected ReturnVersion() {}

    public ReturnVersion(
            Long returnId, Long sourceId, Integer versionNo,
            OffsetDateTime submittedAt, OffsetDateTime receivedAt,
            BigDecimal reportedEmployeeAmount, BigDecimal reportedEmployerAmount, BigDecimal reportedTotalAmount,
            CompletenessStatus completenessStatus, Long supersedesVersionId, String sourceDocumentRef) {
        this.returnId = returnId;
        this.sourceId = sourceId;
        this.versionNo = versionNo;
        this.submittedAt = submittedAt;
        this.receivedAt = (receivedAt != null) ? receivedAt : OffsetDateTime.now(ZoneOffset.UTC);
        this.recordedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.reportedEmployeeAmount = reportedEmployeeAmount;
        this.reportedEmployerAmount = reportedEmployerAmount;
        this.reportedTotalAmount = reportedTotalAmount;
        this.completenessStatus = (completenessStatus != null) ? completenessStatus : CompletenessStatus.UNKNOWN;
        this.supersedesVersionId = supersedesVersionId;
        this.sourceDocumentRef = sourceDocumentRef;
    }

    public Long getReturnVersionId() { return returnVersionId; }
    public Long getReturnId() { return returnId; }
    public Long getSourceId() { return sourceId; }
    public Integer getVersionNo() { return versionNo; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public OffsetDateTime getRecordedAt() { return recordedAt; }
    public BigDecimal getReportedEmployeeAmount() { return reportedEmployeeAmount; }
    public BigDecimal getReportedEmployerAmount() { return reportedEmployerAmount; }
    public BigDecimal getReportedTotalAmount() { return reportedTotalAmount; }
    public CompletenessStatus getCompletenessStatus() { return completenessStatus; }
    public Long getSupersedesVersionId() { return supersedesVersionId; }
    public String getSourceDocumentRef() { return sourceDocumentRef; }
}