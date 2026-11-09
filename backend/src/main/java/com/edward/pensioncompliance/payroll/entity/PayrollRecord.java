package com.edward.pensioncompliance.payroll.entity;

import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.member.entity.Member;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "payroll_record")
public class PayrollRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_record_id")
    private Long payrollRecordId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_batch_id", nullable = false, updatable = false)
    private PayrollBatch payrollBatch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employer_id", nullable = false, updatable = false)
    private Employer employer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false, updatable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false, updatable = false)
    private ContributionPeriod period;

    @Column(name = "source_row_ref", length = 100, updatable = false)
    private String sourceRowRef;

    @Column(name = "eligible_gross_pay", precision = 15, scale = 2, updatable = false)
    private BigDecimal eligibleGrossPay;

    @Enumerated(EnumType.STRING)
    @Column(name = "payroll_status", nullable = false, length = 20, updatable = false)
    private PayrollRecordStatus payrollStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_quality_status", nullable = false, length = 20, updatable = false)
    private PayrollQualityStatus dataQualityStatus;

    protected PayrollRecord() {
        // Required by JPA
    }

    public PayrollRecord(
            PayrollBatch payrollBatch,
            Member member,
            String sourceRowRef,
            BigDecimal eligibleGrossPay,
            PayrollRecordStatus payrollStatus,
            PayrollQualityStatus dataQualityStatus) {
        if (eligibleGrossPay != null && eligibleGrossPay.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Negative eligible gross pay cannot be stored in payroll_record.");
        }
        this.payrollBatch = payrollBatch;
        this.employer = payrollBatch.getEmployer();
        this.period = payrollBatch.getPeriod();
        this.member = member;
        this.sourceRowRef = sourceRowRef;
        this.eligibleGrossPay = eligibleGrossPay;
        this.payrollStatus = (payrollStatus != null) ? payrollStatus : PayrollRecordStatus.ACTIVE;
        this.dataQualityStatus = (dataQualityStatus != null)
                ? dataQualityStatus
                : ((eligibleGrossPay == null) ? PayrollQualityStatus.ISSUE : PayrollQualityStatus.VALID);
    }

    public Long getPayrollRecordId() { return payrollRecordId; }
    public PayrollBatch getPayrollBatch() { return payrollBatch; }
    public Employer getEmployer() { return employer; }
    public Member getMember() { return member; }
    public ContributionPeriod getPeriod() { return period; }
    public String getSourceRowRef() { return sourceRowRef; }
    public BigDecimal getEligibleGrossPay() { return eligibleGrossPay; }
    public PayrollRecordStatus getPayrollStatus() { return payrollStatus; }
    public PayrollQualityStatus getDataQualityStatus() { return dataQualityStatus; }
}