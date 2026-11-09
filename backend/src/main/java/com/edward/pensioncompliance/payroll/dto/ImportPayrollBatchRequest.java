package com.edward.pensioncompliance.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public record ImportPayrollBatchRequest(
        @NotNull Long employerId,
        @NotNull Long periodId,
        @NotNull Long sourceId,
        @NotBlank @Size(max = 100) String batchRef,
        OffsetDateTime receivedAt,
        Long supersedesBatchId,
        @NotEmpty List<ImportPayrollRowRequest> rows
) {}