package com.edward.pensioncompliance.payments.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AllocatePaymentRequest(
        @NotNull Long paymentId,
        @NotNull Long employerId,
        @NotNull Long periodId,
        @NotNull @DecimalMin("0.01") BigDecimal allocatedAmount
) {}