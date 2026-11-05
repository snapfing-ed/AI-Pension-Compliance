package com.edward.pensioncompliance.user.dto;

public record ProvisionedUserResponse(UserAccountResponse user, String temporaryPassword) {}
