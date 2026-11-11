package com.edward.pensioncompliance.datasource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateDataSourceRequest(
        @NotBlank @Size(max = 60) @jakarta.validation.constraints.Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$") String sourceCode,
        @NotBlank @Size(max = 150) String sourceName,
        @NotBlank @Size(max = 40) String sourceType,
        @Size(max = 150) String ownerName,
        @Size(max = 150) String authorityReference,
        @NotBlank String permittedPurpose,
        OffsetDateTime receivedAt,
        String coverageNotes
) {}
