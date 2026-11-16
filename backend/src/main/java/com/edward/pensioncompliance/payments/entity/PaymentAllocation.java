package com.edward.pensioncompliance.payments.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "payment_allocation")
public class PaymentAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allocation_id")
    private Long allocationId;

    @Column(name = "payment_id", nullable = false, updatable = false)
    private Long paymentId;

    @Column(name = "analysis_id", nullable = false, updatable = false)
    private Long analysisId;

    @Column(name = "allocated_amount", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal allocatedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_status", nullable = false, length = 20)
    private PaymentAllocationStatus allocationStatus = PaymentAllocationStatus.ACTIVE;

    @Column(name = "allocated_at", nullable = false, updatable = false)
    private OffsetDateTime allocatedAt;

    @Column(name = "allocated_by_user_id", updatable = false)
    private Long allocatedByUserId;

    @Column(name = "reverses_allocation_id", updatable = false)
    private Long reversesAllocationId;

    protected PaymentAllocation() {}

    public PaymentAllocation(
            Long paymentId,
            Long analysisId,
            BigDecimal allocatedAmount,
            PaymentAllocationStatus allocationStatus,
            Long allocatedByUserId,
            Long reversesAllocationId) {
        if (allocatedAmount == null || allocatedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocated amount must be positive.");
        }
        this.paymentId = paymentId;
        this.analysisId = analysisId;
        this.allocatedAmount = allocatedAmount;
        this.allocationStatus = (allocationStatus != null)
                ? allocationStatus
                : PaymentAllocationStatus.ACTIVE;
        this.allocatedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.allocatedByUserId = allocatedByUserId;
        this.reversesAllocationId = reversesAllocationId;
    }

    public void updateStatus(PaymentAllocationStatus status) {
        this.allocationStatus = status;
    }

    public Long getAllocationId() { return allocationId; }
    public Long getPaymentId() { return paymentId; }
    public Long getAnalysisId() { return analysisId; }
    public BigDecimal getAllocatedAmount() { return allocatedAmount; }
    public PaymentAllocationStatus getAllocationStatus() { return allocationStatus; }
    public OffsetDateTime getAllocatedAt() { return allocatedAt; }
    public Long getAllocatedByUserId() { return allocatedByUserId; }
    public Long getReversesAllocationId() { return reversesAllocationId; }
}