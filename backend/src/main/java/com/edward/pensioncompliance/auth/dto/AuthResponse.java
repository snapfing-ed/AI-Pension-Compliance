// Defines the information returned after successful authentication.

package com.edward.pensioncompliance.auth.dto;

public record AuthResponse(
    Long userId,
    String username,
    String displayName,
    String institutionalEmail,
    String roleCode,
    boolean mustChangePassword
) {}