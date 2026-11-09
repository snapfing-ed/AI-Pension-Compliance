package com.edward.pensioncompliance.employer.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.employer.dto.CreateEmployerRequest;
import com.edward.pensioncompliance.employer.dto.EmployerResponse;
import com.edward.pensioncompliance.employer.dto.UpdateEmployerRequest;
import com.edward.pensioncompliance.employer.service.EmployerService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employers")
public class EmployerController {

    private final EmployerService service;

    public EmployerController(EmployerService service) {
        this.service = service;
    }

    // GET /api/employers?search=&status=&page=&size=
    @GetMapping
    public PageResponse<EmployerResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(search, status, page, size);
    }

    // GET /api/employers/{id}
    @GetMapping("/{id}")
    public EmployerResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // POST /api/employers
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmployerResponse create(
            @Valid @RequestBody CreateEmployerRequest request,
            Authentication auth) {
        return service.create(request, auth);
    }

    // PATCH /api/employers/{id}
    @PatchMapping("/{id}")
    public EmployerResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployerRequest request,
            Authentication auth) {
        return service.update(id, request, auth);
    }
}