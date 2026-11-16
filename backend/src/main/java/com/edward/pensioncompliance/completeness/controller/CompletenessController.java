package com.edward.pensioncompliance.completeness.controller;

import com.edward.pensioncompliance.completeness.dto.CreateCompletenessRequest;
import com.edward.pensioncompliance.completeness.entity.CompletenessAssessment;
import com.edward.pensioncompliance.completeness.service.CompletenessService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/completeness")
public class CompletenessController {

    private final CompletenessService service;

    public CompletenessController(CompletenessService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompletenessAssessment create(@Valid @RequestBody CreateCompletenessRequest request, Authentication auth) {
        return service.create(request, auth);
    }

    @GetMapping
    public List<CompletenessAssessment> list() {
        return service.list();
    }
}