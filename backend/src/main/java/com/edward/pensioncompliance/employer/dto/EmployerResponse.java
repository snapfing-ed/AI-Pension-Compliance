package com.edward.pensioncompliance.employer.dto;

import com.edward.pensioncompliance.employer.entity.Employer;

import java.time.OffsetDateTime;

public record EmployerResponse(
    Long employerId,
    String employerRef,
    String legalName,
    String tradingName,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
    public static EmployerResponse from(Employer e) {
        return new EmployerResponse(e.getEmployerId(), e.getEmployerRef(), e.getLegalName(),
                e.getTradingName(), e.getStatus().name(), e.getCreatedAt(), e.getUpdatedAt());
    }
}