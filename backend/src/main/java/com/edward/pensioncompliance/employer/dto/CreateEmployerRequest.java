package com.edward.pensioncompliance.employer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateEmployerRequest(
    @NotBlank @Size(max = 50) @Pattern(regexp = "[A-Za-z0-9._/-]+") String employerRef,
    @NotBlank @Size(max = 200) String legalName,
    @Size(max = 200) String tradingName
) {}