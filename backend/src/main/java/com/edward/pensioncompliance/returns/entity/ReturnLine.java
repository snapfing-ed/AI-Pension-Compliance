package com.edward.pensioncompliance.returns.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "return_line")
public class ReturnLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "return_line_id")
    private Long returnLineId;

    @Column(name = "return_version_id", nullable = false)
    private Long returnVersionId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "line_ref", length = 100)
    private String lineRef;

    @Column(name = "reported_pay", precision = 15, scale = 2)
    private BigDecimal reportedPay;

    @Column(name = "reported_employee_amount", precision = 15, scale = 2)
    private BigDecimal reportedEmployeeAmount;

    @Column(name = "reported_employer_amount", precision = 15, scale = 2)
    private BigDecimal reportedEmployerAmount;

    @Column(name = "reported_total_amount", precision = 15, scale = 2)
    private BigDecimal reportedTotalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_status", nullable = false, length = 20)
    private ReturnLineStatus lineStatus = ReturnLineStatus.UNVERIFIED;

    protected ReturnLine() {}

    public ReturnLine(
            Long returnVersionId, Long memberId, String lineRef,
            BigDecimal reportedPay, BigDecimal reportedEmployeeAmount,
            BigDecimal reportedEmployerAmount, BigDecimal reportedTotalAmount,
            ReturnLineStatus lineStatus) {
        this.returnVersionId = returnVersionId;
        this.memberId = memberId;
        this.lineRef = lineRef;
        this.reportedPay = reportedPay;
        this.reportedEmployeeAmount = reportedEmployeeAmount;
        this.reportedEmployerAmount = reportedEmployerAmount;
        this.reportedTotalAmount = reportedTotalAmount;
        this.lineStatus = (lineStatus != null) ? lineStatus : ReturnLineStatus.UNVERIFIED;
    }

    public Long getReturnLineId() { return returnLineId; }
    public Long getReturnVersionId() { return returnVersionId; }
    public Long getMemberId() { return memberId; }
    public String getLineRef() { return lineRef; }
    public BigDecimal getReportedPay() { return reportedPay; }
    public BigDecimal getReportedEmployeeAmount() { return reportedEmployeeAmount; }
    public BigDecimal getReportedEmployerAmount() { return reportedEmployerAmount; }
    public BigDecimal getReportedTotalAmount() { return reportedTotalAmount; }
    public ReturnLineStatus getLineStatus() { return lineStatus; }
}