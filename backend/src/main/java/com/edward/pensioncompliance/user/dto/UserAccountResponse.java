package com.edward.pensioncompliance.user.dto;

import java.time.OffsetDateTime;

public record UserAccountResponse(Long userId, String username, String displayName,
    String institutionalEmail, String roleCode, String accountStatus,
    OffsetDateTime createdAt, OffsetDateTime lastLoginAt, boolean mustChangePassword) {}
