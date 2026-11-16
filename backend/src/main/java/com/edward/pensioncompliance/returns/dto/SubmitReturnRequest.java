package com.edward.pensioncompliance.returns.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record SubmitReturnRequest(
        @NotNull Long employerId,
        @NotNull Long periodId,
        @NotNull Long sourceId,
        @NotBlank String returnType,
        String returnRef,
        OffsetDateTime submittedAt,
        OffsetDateTime receivedAt,
        @DecimalMin("0.00") BigDecimal reportedEmployeeAmount,
        @DecimalMin("0.00") BigDecimal reportedEmployerAmount,
        @DecimalMin("0.00") BigDecimal reportedTotalAmount,
        String completenessStatus,
        String sourceDocumentRef,
        Long supersedesReturnId,
        @Valid List<ReturnLineRequest> lines
) {
    public record ReturnLineRequest(
            Long memberId,
            String lineRef,
            @DecimalMin("0.00") BigDecimal reportedPay,
            @DecimalMin("0.00") BigDecimal reportedEmployeeAmount,
            @DecimalMin("0.00") BigDecimal reportedEmployerAmount,
            @DecimalMin("0.00") BigDecimal reportedTotalAmount,
            String lineStatus
    ) {}
}