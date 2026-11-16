package com.edward.pensioncompliance.cases.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateCaseRequest(
        @NotBlank String title,
        String description,
        String priority,
        Long assignedUserId,
        List<Long> findingIds
) {}