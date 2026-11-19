package com.edward.pensioncompliance.cases.controller;

import com.edward.pensioncompliance.cases.dto.CaseDetailResponse;
import com.edward.pensioncompliance.cases.dto.CreateCaseRequest;
import com.edward.pensioncompliance.cases.service.InvestigationCaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cases")
public class InvestigationCaseController {

    private final InvestigationCaseService service;

    public InvestigationCaseController(InvestigationCaseService service) {
        this.service = service;
    }

    @GetMapping
    public List<CaseDetailResponse> list(@RequestParam(required = false) String status) {
        return service.listCases(status);
    }

    @GetMapping("/{id}")
    public CaseDetailResponse get(@PathVariable Long id) {
        return service.getCase(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CaseDetailResponse create(@Valid @RequestBody CreateCaseRequest req, Authentication auth) {
        return service.createCase(req, auth);
    }

    @PatchMapping("/{id}/status")
    public CaseDetailResponse updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return service.updateStatus(id, body.get("status"), body.get("note"), auth);
    }

    @PatchMapping("/{id}/assign")
    public CaseDetailResponse assign(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long userId = Long.valueOf(String.valueOf(body.get("assignedUserId")));
        String note = body.get("note") != null ? String.valueOf(body.get("note")) : null;
        return service.assignOfficer(id, userId, note, auth);
    }

    @PatchMapping("/{id}/priority")
    public CaseDetailResponse updatePriority(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return service.updatePriority(id, body.get("priority"), body.get("justification"), auth);
    }
}