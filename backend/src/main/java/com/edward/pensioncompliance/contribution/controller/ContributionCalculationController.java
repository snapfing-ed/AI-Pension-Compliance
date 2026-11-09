package com.edward.pensioncompliance.contribution.controller;

import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewRequest;
import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewResponse;
import com.edward.pensioncompliance.contribution.service.ContributionRuleService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contribution-calculations")
public class ContributionCalculationController {

    private final ContributionRuleService service;

    public ContributionCalculationController(ContributionRuleService service) {
        this.service = service;
    }

    // POST /api/contribution-calculations/preview
    @PostMapping("/preview")
    public ContributionCalculationPreviewResponse preview(
            @RequestBody ContributionCalculationPreviewRequest request) {
        return service.previewCalculation(request);
    }
}