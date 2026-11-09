package com.edward.pensioncompliance.payroll.dto;

import java.util.List;

public record PayrollImportResponse(
        PayrollBatchResponse batch,
        int totalRowsEvaluated,
        long validRecordCount,
        long missingPayRecordCount,
        long quarantinedRecordCount,
        long duplicateRowCount,
        int autoCreatedMemberCount,
        long processingTimeMs,
        boolean quarantinedRowsTruncated,
        List<PayrollQuarantineRecordResponse> quarantinedRows
) {}