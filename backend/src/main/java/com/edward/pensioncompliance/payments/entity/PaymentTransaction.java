package com.edward.pensioncompliance.payments.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "source_id", nullable = false, updatable = false)
    private Long sourceId;

    @Column(name = "external_transaction_ref", length = 150, updatable = false)
    private String externalTransactionRef;

    @Column(name = "employer_ref_as_received", length = 100, updatable = false)
    private String employerRefAsReceived;

    @Column(name = "transaction_amount", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal transactionAmount;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency_code", nullable = false, length = 3, updatable = false)
    private String currencyCode = "ZMW";

    @Column(name = "paid_at", updatable = false)
    private OffsetDateTime paidAt;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private OffsetDateTime recordedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_status", nullable = false, length = 20)
    private PaymentTransactionStatus transactionStatus = PaymentTransactionStatus.RECEIVED;

    @Column(name = "reversal_of_payment_id", updatable = false)
    private Long reversalOfPaymentId;

    @Column(name = "source_record_ref", length = 150, updatable = false)
    private String sourceRecordRef;

    protected PaymentTransaction() {}

    public PaymentTransaction(
            Long sourceId,
            String externalTransactionRef,
            String employerRefAsReceived,
            BigDecimal transactionAmount,
            String currencyCode,
            OffsetDateTime paidAt,
            PaymentTransactionStatus transactionStatus,
            Long reversalOfPaymentId,
            String sourceRecordRef) {
        if (transactionAmount == null || transactionAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment transaction amount must be positive.");
        }
        this.sourceId = sourceId;
        this.externalTransactionRef = externalTransactionRef;
        this.employerRefAsReceived = employerRefAsReceived;
        this.transactionAmount = transactionAmount;
        this.currencyCode = (currencyCode != null && !currencyCode.isBlank()) ? currencyCode : "ZMW";
        this.paidAt = paidAt;
        this.recordedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.transactionStatus = (transactionStatus != null)
                ? transactionStatus
                : PaymentTransactionStatus.RECEIVED;
        this.reversalOfPaymentId = reversalOfPaymentId;
        this.sourceRecordRef = sourceRecordRef;
    }

    public void updateStatus(PaymentTransactionStatus status) {
        this.transactionStatus = status;
    }

    public Long getPaymentId() { return paymentId; }
    public Long getSourceId() { return sourceId; }
    public String getExternalTransactionRef() { return externalTransactionRef; }
    public String getEmployerRefAsReceived() { return employerRefAsReceived; }
    public BigDecimal getTransactionAmount() { return transactionAmount; }
    public String getCurrencyCode() { return currencyCode; }
    public OffsetDateTime getPaidAt() { return paidAt; }
    public OffsetDateTime getRecordedAt() { return recordedAt; }
    public PaymentTransactionStatus getTransactionStatus() { return transactionStatus; }
    public Long getReversalOfPaymentId() { return reversalOfPaymentId; }
    public String getSourceRecordRef() { return sourceRecordRef; }
}