package com.edward.pensioncompliance.analysis.entity;

import com.edward.pensioncompliance.contribution.CalculationStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Entity
@Table(name = "contribution_calculation")
public class ContributionCalculation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "calculation_id")
    private Long calculationId;

    @Column(name = "snapshot_id", nullable = false, updatable = false)
    private Long snapshotId;

    @Column(name = "payroll_record_id", nullable = false, updatable = false)
    private Long payrollRecordId;

    @Column(name = "payroll_batch_id", nullable = false, updatable = false)
    private Long payrollBatchId;

    @Column(name = "rule_version_id", nullable = false, updatable = false)
    private Long ruleVersionId;

    @Column(name = "eligible_pay_used", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal eligiblePayUsed;

    @Column(name = "employee_expected", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal employeeExpected;

    @Column(name = "employer_expected", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal employerExpected;

    @Column(name = "total_expected", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal totalExpected;

    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_status", nullable = false, length = 20, updatable = false)
    private CalculationStatus calculationStatus;

    @Column(name = "explanation_code", length = 100, updatable = false)
    private String explanationCode;

    protected ContributionCalculation() {}

    public ContributionCalculation(
            Long snapshotId,
            Long payrollRecordId,
            Long payrollBatchId,
            Long ruleVersionId,
            BigDecimal eligiblePayUsed,
            BigDecimal employeeExpected,
            BigDecimal employerExpected,
            CalculationStatus calculationStatus,
            String explanationCode) {
        BigDecimal pay = nonNegativeScaled(eligiblePayUsed);
        BigDecimal emp = nonNegativeScaled(employeeExpected);
        BigDecimal er = nonNegativeScaled(employerExpected);
        this.snapshotId = snapshotId;
        this.payrollRecordId = payrollRecordId;
        this.payrollBatchId = payrollBatchId;
        this.ruleVersionId = ruleVersionId;
        this.eligiblePayUsed = pay;
        this.employeeExpected = emp;
        this.employerExpected = er;
        this.totalExpected = emp.add(er);
        this.calculationStatus = calculationStatus;
        this.explanationCode = explanationCode;
    }

    private static BigDecimal nonNegativeScaled(BigDecimal value) {
        BigDecimal resolved = (value != null) ? value.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
        if (resolved.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Contribution calculation amounts must not be negative.");
        }
        return resolved;
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
    public CalculationStatus getCalculationStatus() { return calculationStatus; }
    public String getExplanationCode() { return explanationCode; }
}