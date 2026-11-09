package com.edward.pensioncompliance.contribution.controller;

import com.edward.pensioncompliance.contribution.dto.ContributionRuleResponse;
import com.edward.pensioncompliance.contribution.service.ContributionRuleService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/contribution-rules")
public class ContributionRuleController {

    private final ContributionRuleService service;

    public ContributionRuleController(ContributionRuleService service) {
        this.service = service;
    }

    // GET /api/contribution-rules?ruleCode=&verificationStatus=
    @GetMapping
    public List<ContributionRuleResponse> listRules(
            @RequestParam(required = false) String ruleCode,
            @RequestParam(required = false) String verificationStatus) {
        return service.listRules(ruleCode, verificationStatus);
    }

    // GET /api/contribution-rules/applicable?periodId=&date=&ruleCode=
    @GetMapping("/applicable")
    public ContributionRuleResponse getApplicableRule(
            @RequestParam(required = false) Long periodId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String ruleCode) {
        return service.findApplicableRuleResponse(ruleCode, periodId, date);
    }
}