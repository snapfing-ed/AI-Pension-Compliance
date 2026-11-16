package com.edward.pensioncompliance.returns.dto;

import com.edward.pensioncompliance.returns.entity.ReturnVersion;
import com.edward.pensioncompliance.returns.entity.SubmittedReturn;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record SubmittedReturnSummaryResponse(
        Long returnId,
        Long employerId,
        Long periodId,
        String returnType,
        String returnRef,
        OffsetDateTime createdAt,
        Long latestReturnVersionId,
        Integer latestVersionNo,
        Long sourceId,
        OffsetDateTime submittedAt,
        OffsetDateTime receivedAt,
        BigDecimal reportedEmployeeAmount,
        BigDecimal reportedEmployerAmount,
        BigDecimal reportedTotalAmount,
        String completenessStatus,
        String sourceDocumentRef
) {
    public static SubmittedReturnSummaryResponse from(SubmittedReturn sr, ReturnVersion latest) {
        return new SubmittedReturnSummaryResponse(
                sr.getReturnId(),
                sr.getEmployerId(),
                sr.getPeriodId(),
                sr.getReturnType().name(),
                sr.getReturnRef(),
                sr.getCreatedAt(),
                latest != null ? latest.getReturnVersionId() : null,
                latest != null ? latest.getVersionNo() : null,
                latest != null ? latest.getSourceId() : null,
                latest != null ? latest.getSubmittedAt() : null,
                latest != null ? latest.getReceivedAt() : null,
                latest != null ? latest.getReportedEmployeeAmount() : null,
                latest != null ? latest.getReportedEmployerAmount() : null,
                latest != null ? latest.getReportedTotalAmount() : null,
                latest != null ? latest.getCompletenessStatus().name() : "UNKNOWN",
                latest != null ? latest.getSourceDocumentRef() : null
        );
    }
}