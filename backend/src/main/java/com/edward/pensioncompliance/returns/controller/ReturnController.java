package com.edward.pensioncompliance.returns.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.returns.dto.ReturnVersionResponse;
import com.edward.pensioncompliance.returns.dto.SubmitReturnRequest;
import com.edward.pensioncompliance.returns.dto.SubmittedReturnSummaryResponse;
import com.edward.pensioncompliance.returns.entity.ReturnLine;
import com.edward.pensioncompliance.returns.service.ReturnService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/returns")
public class ReturnController {

    private final ReturnService service;

    public ReturnController(ReturnService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<SubmittedReturnSummaryResponse> list(
            @RequestParam(required = false) Long employerId,
            @RequestParam(required = false) Long periodId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listReturns(employerId, periodId, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReturnVersionResponse submit(@Valid @RequestBody SubmitReturnRequest request, Authentication auth) {
        return service.submit(request, auth);
    }

    @GetMapping("/{returnId}/versions")
    public List<ReturnVersionResponse> versions(@PathVariable Long returnId) {
        return service.listVersions(returnId);
    }

    @GetMapping("/versions/{returnVersionId}/lines")
    public List<ReturnLine> lines(@PathVariable Long returnVersionId) {
        return service.listLines(returnVersionId);
    }
}