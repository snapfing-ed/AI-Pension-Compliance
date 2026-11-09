package com.edward.pensioncompliance.payroll.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.payroll.dto.*;
import com.edward.pensioncompliance.payroll.service.PayrollBatchService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/payroll/batches")
public class PayrollBatchController {

    private final PayrollBatchService service;

    public PayrollBatchController(PayrollBatchService service) {
        this.service = service;
    }

    // POST /api/payroll/batches/import
    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollImportResponse importJson(
            @Valid @RequestBody ImportPayrollBatchRequest request,
            Authentication auth) {
        return service.importJson(request, auth);
    }

    // POST /api/payroll/batches/import-csv
    @PostMapping(value = "/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollImportResponse importCsv(
            @RequestParam Long employerId,
            @RequestParam Long periodId,
            @RequestParam Long sourceId,
            @RequestParam String batchRef,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime receivedAt,
            @RequestParam(required = false) Long supersedesBatchId,
            @RequestPart("file") MultipartFile file,
            Authentication auth) {
        return service.importCsv(
                employerId, periodId, sourceId, batchRef, receivedAt, supersedesBatchId, file, auth);
    }

    // GET /api/payroll/batches?employerId=&periodId=&sourceId=&status=&currentOnly=&search=&page=&size=
    @GetMapping
    public PageResponse<PayrollBatchResponse> listBatches(
            @RequestParam(required = false) Long employerId,
            @RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean currentOnly,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listBatches(employerId, periodId, sourceId, status, currentOnly, search, page, size);
    }

    // GET /api/payroll/batches/current?employerId=&periodId=
    @GetMapping("/current")
    public PayrollBatchResponse getCurrentBatch(
            @RequestParam Long employerId,
            @RequestParam Long periodId) {
        return service.getCurrentBatch(employerId, periodId);
    }

    // GET /api/payroll/batches/{id}
    @GetMapping("/{id}")
    public PayrollBatchResponse getBatch(@PathVariable Long id) {
        return service.getBatch(id);
    }

    // GET /api/payroll/batches/{id}/records?dataQualityStatus=&payrollStatus=&search=&page=&size=
    @GetMapping("/{id}/records")
    public PageResponse<PayrollRecordResponse> listRecords(
            @PathVariable Long id,
            @RequestParam(required = false) String dataQualityStatus,
            @RequestParam(required = false) String payrollStatus,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listRecords(id, dataQualityStatus, payrollStatus, search, page, size);
    }

    // GET /api/payroll/batches/{id}/quarantine?reasonCode=&page=&size=
    @GetMapping("/{id}/quarantine")
    public PageResponse<PayrollQuarantineRecordResponse> listQuarantinedRecords(
            @PathVariable Long id,
            @RequestParam(required = false) String reasonCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listQuarantinedRecords(id, reasonCode, page, size);
    }
}