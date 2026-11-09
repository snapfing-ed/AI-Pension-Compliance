package com.edward.pensioncompliance.employer.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** PATCH semantics: a null field means unchanged. A blank tradingName clears it. */
public record UpdateEmployerRequest(
    @Size(max = 200) @Pattern(regexp = ".*\\S.*") String legalName,
    @Size(max = 200) String tradingName,
    @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED") String status
) {}