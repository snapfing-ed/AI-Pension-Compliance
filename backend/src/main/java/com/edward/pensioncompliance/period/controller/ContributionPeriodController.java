package com.edward.pensioncompliance.period.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.period.dto.ContributionPeriodResponse;
import com.edward.pensioncompliance.period.dto.CreateContributionPeriodRequest;
import com.edward.pensioncompliance.period.dto.UpdateContributionPeriodStatusRequest;
import com.edward.pensioncompliance.period.service.ContributionPeriodService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contribution-periods")
public class ContributionPeriodController {

    private final ContributionPeriodService service;

    public ContributionPeriodController(ContributionPeriodService service) {
        this.service = service;
    }

    // GET /api/contribution-periods?year=&status=&page=&size=
    @GetMapping
    public PageResponse<ContributionPeriodResponse> list(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(year, status, page, size);
    }

    // GET /api/contribution-periods/{id}
    @GetMapping("/{id}")
    public ContributionPeriodResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // POST /api/contribution-periods
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContributionPeriodResponse create(
            @Valid @RequestBody CreateContributionPeriodRequest request,
            Authentication auth) {
        return service.create(request, auth);
    }

    // PATCH /api/contribution-periods/{id}/status
    @PatchMapping("/{id}/status")
    public ContributionPeriodResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateContributionPeriodStatusRequest request,
            Authentication auth) {
        return service.updateStatus(id, request, auth);
    }
}