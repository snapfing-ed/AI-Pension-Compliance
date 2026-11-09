package com.edward.pensioncompliance.datasource.dto;

import com.edward.pensioncompliance.datasource.entity.DataSource;

import java.time.OffsetDateTime;

public record DataSourceResponse(
        Long sourceId,
        String sourceName,
        String sourceType,
        String ownerName,
        String authorityReference,
        String permittedPurpose,
        OffsetDateTime receivedAt,
        String coverageNotes,
        String status
) {
    public static DataSourceResponse from(DataSource ds) {
        return new DataSourceResponse(
                ds.getSourceId(),
                ds.getSourceName(),
                ds.getSourceType(),
                ds.getOwnerName(),
                ds.getAuthorityReference(),
                ds.getPermittedPurpose(),
                ds.getReceivedAt(),
                ds.getCoverageNotes(),
                ds.getStatus().name()
        );
    }
}