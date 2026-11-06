package com.edward.pensioncompliance.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangeRoleRequest(
    @NotBlank
    @Pattern(regexp = "SYSTEM_ADMINISTRATOR|COMPLIANCE_SUPERVISOR|COMPLIANCE_MONITOR",
             message = "Role code is not recognised.")
    String roleCode
) {}