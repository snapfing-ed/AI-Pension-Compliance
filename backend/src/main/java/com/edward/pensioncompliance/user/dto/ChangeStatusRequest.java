package com.edward.pensioncompliance.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangeStatusRequest(
    @NotBlank
    @Pattern(regexp = "ACTIVE|LOCKED|DISABLED",
             message = "Status must be ACTIVE, LOCKED or DISABLED.")
    String accountStatus
) {}