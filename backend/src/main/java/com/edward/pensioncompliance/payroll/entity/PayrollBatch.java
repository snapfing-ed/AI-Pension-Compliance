package com.edward.pensioncompliance.payroll.entity;

import com.edward.pensioncompliance.datasource.entity.DataSource;
import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "payroll_batch")
public class PayrollBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_batch_id")
    private Long payrollBatchId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employer_id", nullable = false, updatable = false)
    private Employer employer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private ContributionPeriod period;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_id", nullable = false, updatable = false)
    private DataSource source;

    @Column(name = "batch_ref", nullable = false, length = 100, updatable = false)
    private String batchRef;

    @Column(name = "version_no", nullable = false, updatable = false)
    private Integer versionNo;

    @Column(name = "received_at", nullable = false, updatable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private OffsetDateTime recordedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PayrollBatchStatus status = PayrollBatchStatus.RECEIVED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supersedes_batch_id", updatable = false)
    private PayrollBatch supersedesBatch;

    protected PayrollBatch() {
        // Required by JPA
    }

    public PayrollBatch(
            Employer employer,
            ContributionPeriod period,
            DataSource source,
            String batchRef,
            int versionNo,
            OffsetDateTime receivedAt,
            PayrollBatch supersedesBatch) {
        if (versionNo <= 0) {
            throw new IllegalArgumentException("Batch version number must be positive.");
        }
        this.employer = employer;
        this.period = period;
        this.source = source;
        this.batchRef = batchRef;
        this.versionNo = versionNo;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        this.receivedAt = (receivedAt != null) ? receivedAt : now;
        this.recordedAt = now;
        this.status = PayrollBatchStatus.RECEIVED;
        this.supersedesBatch = supersedesBatch;
    }

    public void markValidated() { this.status = PayrollBatchStatus.VALIDATED; }
    public void markRejected() { this.status = PayrollBatchStatus.REJECTED; }
    public void markSuperseded() { this.status = PayrollBatchStatus.SUPERSEDED; }

    public Long getPayrollBatchId() { return payrollBatchId; }
    public Employer getEmployer() { return employer; }
    public ContributionPeriod getPeriod() { return period; }
    public DataSource getSource() { return source; }
    public String getBatchRef() { return batchRef; }
    public Integer getVersionNo() { return versionNo; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public OffsetDateTime getRecordedAt() { return recordedAt; }
    public PayrollBatchStatus getStatus() { return status; }
    public PayrollBatch getSupersedesBatch() { return supersedesBatch; }
}