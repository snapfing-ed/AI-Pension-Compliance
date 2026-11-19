package com.edward.pensioncompliance.completeness.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateCompletenessRequest(
        @NotNull Long sourceId,
        @NotBlank String scopeType,
        @NotNull LocalDate scopeStart,
        @NotNull LocalDate scopeEnd,
        Long employerId,
        Long periodId,
        @NotBlank String assessmentStatus,
        String evidenceNotes
) {}