package com.edward.pensioncompliance.contribution.entity;

import com.edward.pensioncompliance.contribution.VerificationStatus;

import jakarta.persistence.*;

import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Read-only view of an effective-dated contribution rule. Rules change only through migrations. */
@Entity
@Immutable
@Table(name = "contribution_rule_version")
public class ContributionRuleVersion {

    @Id
    @Column(name = "rule_version_id")
    private Long ruleVersionId;

    @Column(name = "rule_code", nullable = false, length = 50)
    private String ruleCode;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "employee_rate", nullable = false, precision = 9, scale = 6)
    private BigDecimal employeeRate;

    @Column(name = "employer_rate", nullable = false, precision = 9, scale = 6)
    private BigDecimal employerRate;

    @Column(name = "ceiling_amount", precision = 15, scale = 2)
    private BigDecimal ceilingAmount;

    @Column(name = "due_day_rule", nullable = false, length = 100)
    private String dueDayRule;

    @Column(name = "rounding_rule", nullable = false, length = 50)
    private String roundingRule;

    @Column(name = "source_reference", nullable = false)
    private String sourceReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    private VerificationStatus verificationStatus;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected ContributionRuleVersion() {
        // Required by JPA
    }

    public Long getRuleVersionId() { return ruleVersionId; }
    public String getRuleCode() { return ruleCode; }
    public Integer getVersionNo() { return versionNo; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public BigDecimal getEmployeeRate() { return employeeRate; }
    public BigDecimal getEmployerRate() { return employerRate; }
    public BigDecimal getCeilingAmount() { return ceilingAmount; }
    public String getDueDayRule() { return dueDayRule; }
    public String getRoundingRule() { return roundingRule; }
    public String getSourceReference() { return sourceReference; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}