package com.edward.pensioncompliance.analysis.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "contribution_calculation")
public class ContributionCalculationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "calculation_id")
    private Long calculationId;

    @Column(name = "snapshot_id", nullable = false)
    private Long snapshotId;

    @Column(name = "payroll_record_id", nullable = false)
    private Long payrollRecordId;

    @Column(name = "payroll_batch_id", nullable = false)
    private Long payrollBatchId;

    @Column(name = "rule_version_id", nullable = false)
    private Long ruleVersionId;

    @Column(name = "eligible_pay_used", nullable = false, precision = 15, scale = 2)
    private BigDecimal eligiblePayUsed;

    @Column(name = "employee_expected", nullable = false, precision = 15, scale = 2)
    private BigDecimal employeeExpected;

    @Column(name = "employer_expected", nullable = false, precision = 15, scale = 2)
    private BigDecimal employerExpected;

    @Column(name = "total_expected", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalExpected;

    @Column(name = "calculation_status", nullable = false, length = 20)
    private String calculationStatus;

    @Column(name = "explanation_code", length = 100)
    private String explanationCode;

    protected ContributionCalculationEntity() {}

    public ContributionCalculationEntity(
            Long snapshotId, Long payrollRecordId, Long payrollBatchId, Long ruleVersionId,
            BigDecimal eligiblePayUsed, BigDecimal employeeExpected, BigDecimal employerExpected,
            BigDecimal totalExpected, String calculationStatus, String explanationCode) {
        this.snapshotId = snapshotId;
        this.payrollRecordId = payrollRecordId;
        this.payrollBatchId = payrollBatchId;
        this.ruleVersionId = ruleVersionId;
        this.eligiblePayUsed = eligiblePayUsed;
        this.employeeExpected = employeeExpected;
        this.employerExpected = employerExpected;
        this.totalExpected = totalExpected;
        this.calculationStatus = calculationStatus;
        this.explanationCode = explanationCode;
    }

    public Long getCalculationId() { return calculationId; }
    public Long getSnapshotId() { return snapshotId; }
    public Long getPayrollRecordId() { return payrollRecordId; }
    public Long getPayrollBatchId() { return payrollBatchId; }
    public Long getRuleVersionId() { return ruleVersionId; }
    public BigDecimal getEligiblePayUsed() { return eligiblePayUsed; }
    public BigDecimal getEmployeeExpected() { return employeeExpected; }
    public BigDecimal getEmployerExpected() { return employerExpected; }
    public BigDecimal getTotalExpected() { return totalExpected; }
    public String getCalculationStatus() { return calculationStatus; }
    public String getExplanationCode() { return explanationCode; }
}