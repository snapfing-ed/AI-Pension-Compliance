package com.edward.pensioncompliance.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank @Size(max = 80) @Pattern(regexp = "[A-Za-z0-9._-]+") String username,
    @NotBlank @Email @Size(max = 254) String institutionalEmail,
    @NotBlank @Size(max = 150) String displayName,
    @NotBlank @Pattern(regexp = "SYSTEM_ADMINISTRATOR|COMPLIANCE_SUPERVISOR|COMPLIANCE_MONITOR") String roleCode
) {}
