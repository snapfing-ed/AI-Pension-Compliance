package com.edward.pensioncompliance.returns.dto;

import com.edward.pensioncompliance.returns.entity.ReturnVersion;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReturnVersionResponse(
        Long returnVersionId,
        Long returnId,
        Long sourceId,
        Integer versionNo,
        OffsetDateTime submittedAt,
        OffsetDateTime receivedAt,
        OffsetDateTime recordedAt,
        BigDecimal reportedEmployeeAmount,
        BigDecimal reportedEmployerAmount,
        BigDecimal reportedTotalAmount,
        String completenessStatus,
        Long supersedesVersionId,
        String sourceDocumentRef
) {
    public static ReturnVersionResponse from(ReturnVersion rv) {
        return new ReturnVersionResponse(
                rv.getReturnVersionId(), rv.getReturnId(), rv.getSourceId(), rv.getVersionNo(),
                rv.getSubmittedAt(), rv.getReceivedAt(), rv.getRecordedAt(),
                rv.getReportedEmployeeAmount(), rv.getReportedEmployerAmount(), rv.getReportedTotalAmount(),
                rv.getCompletenessStatus().name(), rv.getSupersedesVersionId(), rv.getSourceDocumentRef()
        );
    }
}