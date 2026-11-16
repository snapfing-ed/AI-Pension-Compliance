package com.edward.pensioncompliance.payments.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record RecordPaymentRequest(
        @NotNull Long sourceId,
        String externalTransactionRef,
        String employerRefAsReceived,
        @NotNull @DecimalMin("0.01") BigDecimal transactionAmount,
        String currencyCode,
        OffsetDateTime paidAt,
        String transactionStatus,
        Long reversalOfPaymentId,
        String sourceRecordRef
) {}