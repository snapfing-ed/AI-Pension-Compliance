package com.edward.pensioncompliance.payroll.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "payroll_quarantine_record")
public class PayrollQuarantineRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quarantine_record_id")
    private Long quarantineRecordId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_batch_id", nullable = false, updatable = false)
    private PayrollBatch payrollBatch;

    @Column(name = "row_number", nullable = false, updatable = false)
    private Integer rowNumber;

    @Column(name = "source_row_ref", updatable = false)
    private String sourceRowRef;

    @Column(name = "raw_member_ref", updatable = false)
    private String rawMemberRef;

    @Column(name = "raw_source_member_ref", updatable = false)
    private String rawSourceMemberRef;

    @Column(name = "raw_eligible_gross_pay", updatable = false)
    private String rawEligibleGrossPay;

    @Column(name = "raw_payroll_status", updatable = false)
    private String rawPayrollStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, length = 60, updatable = false)
    private QuarantineReasonCode reasonCode;

    @Column(name = "reason_detail", nullable = false, updatable = false)
    private String reasonDetail;

    @Column(name = "quarantined_at", nullable = false, updatable = false)
    private OffsetDateTime quarantinedAt;

    protected PayrollQuarantineRecord() {
        // Required by JPA
    }

    public PayrollQuarantineRecord(
            PayrollBatch payrollBatch,
            int rowNumber,
            String sourceRowRef,
            String rawMemberRef,
            String rawSourceMemberRef,
            String rawEligibleGrossPay,
            String rawPayrollStatus,
            QuarantineReasonCode reasonCode,
            String reasonDetail) {
        this.payrollBatch = payrollBatch;
        this.rowNumber = rowNumber;
        this.sourceRowRef = sourceRowRef;
        this.rawMemberRef = rawMemberRef;
        this.rawSourceMemberRef = rawSourceMemberRef;
        this.rawEligibleGrossPay = rawEligibleGrossPay;
        this.rawPayrollStatus = rawPayrollStatus;
        this.reasonCode = reasonCode;
        this.reasonDetail = reasonDetail;
        this.quarantinedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getQuarantineRecordId() { return quarantineRecordId; }
    public PayrollBatch getPayrollBatch() { return payrollBatch; }
    public Integer getRowNumber() { return rowNumber; }
    public String getSourceRowRef() { return sourceRowRef; }
    public String getRawMemberRef() { return rawMemberRef; }
    public String getRawSourceMemberRef() { return rawSourceMemberRef; }
    public String getRawEligibleGrossPay() { return rawEligibleGrossPay; }
    public String getRawPayrollStatus() { return rawPayrollStatus; }
    public QuarantineReasonCode getReasonCode() { return reasonCode; }
    public String getReasonDetail() { return reasonDetail; }
    public OffsetDateTime getQuarantinedAt() { return quarantinedAt; }
}