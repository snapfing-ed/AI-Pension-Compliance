package com.edward.pensioncompliance.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMemberRequest(
        @NotBlank @Size(max = 50) String memberRef,
        @Size(max = 100) String sourceMemberRef,
        String status
) {}