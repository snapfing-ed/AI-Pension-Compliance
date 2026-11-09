package com.edward.pensioncompliance.contribution.service;

import com.edward.pensioncompliance.contribution.*;
import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewRequest;
import com.edward.pensioncompliance.contribution.dto.ContributionCalculationPreviewResponse;
import com.edward.pensioncompliance.contribution.dto.ContributionRuleResponse;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;
import com.edward.pensioncompliance.contribution.repository.ContributionRuleVersionRepository;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class ContributionRuleService {

    public static final String DEFAULT_RULE_CODE = "NAPSA_FORMAL";

    private final ContributionRuleVersionRepository repository;
    private final ContributionPeriodRepository periods;
    private final RuleSelector selector = new RuleSelector();
    private final ContributionCalculator calculator = new ContributionCalculator();

    @Autowired
    public ContributionRuleService(
            ContributionRuleVersionRepository repository,
            ContributionPeriodRepository periods) {
        this.repository = repository;
        this.periods = periods;
    }

    // Convenience constructor for existing unit tests without ContributionPeriodRepository.
    public ContributionRuleService(ContributionRuleVersionRepository repository) {
        this(repository, null);
    }

    @Transactional(readOnly = true)
    public List<ContributionRuleResponse> listRules(String ruleCode, String verificationStatus) {
        VerificationStatus statusFilter = parseOptionalVerificationStatus(verificationStatus);
        List<ContributionRuleVersion> source = (ruleCode != null && !ruleCode.isBlank())
                ? repository.findByRuleCodeOrderByVersionNoAsc(ruleCode.trim())
                : repository.findAllByOrderByRuleCodeAscVersionNoAsc();

        return source.stream()
                .filter(r -> statusFilter == null || r.getVerificationStatus() == statusFilter)
                .map(ContributionRuleResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RuleVersion findApplicableRule(String ruleCode, LocalDate date) {
        List<RuleVersion> versions = repository.findByRuleCodeOrderByVersionNoAsc(ruleCode).stream()
                .map(this::toRuleVersion)
                .toList();
        return selector.select(versions, date);
    }

    @Transactional(readOnly = true)
    public ContributionRuleResponse findApplicableRuleResponse(String ruleCode, Long periodId, LocalDate date) {
        String code = normalizeRuleCode(ruleCode);
        LocalDate targetDate = resolveTargetDate(periodId, date);
        try {
            RuleVersion rule = findApplicableRule(code, targetDate);
            return ContributionRuleResponse.from(rule);
        } catch (RuleSelectionException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ContributionCalculationPreviewResponse previewCalculation(
            ContributionCalculationPreviewRequest request) {
        String code = normalizeRuleCode(request.ruleCode());
        LocalDate targetDate = resolveTargetDate(request.periodId(), request.date());
        RuleVersion rule;
        try {
            rule = findApplicableRule(code, targetDate);
        } catch (RuleSelectionException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
        CalculationResult result = calculator.calculate(request.grossPay(), rule.parameters());
        return ContributionCalculationPreviewResponse.from(rule, request.grossPay(), result);
    }

    private LocalDate resolveTargetDate(Long periodId, LocalDate date) {
        if (periodId != null) {
            if (periods == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "ContributionPeriodRepository is not configured.");
            }
            ContributionPeriod period = periods.findById(periodId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Contribution period not found."));
            return period.getPeriodStart();
        }
        if (date != null) {
            return date;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Either periodId or date must be provided.");
    }

    private static String normalizeRuleCode(String ruleCode) {
        return (ruleCode == null || ruleCode.isBlank()) ? DEFAULT_RULE_CODE : ruleCode.trim();
    }

    private static VerificationStatus parseOptionalVerificationStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return VerificationStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown verification status.");
        }
    }

    private RuleVersion toRuleVersion(ContributionRuleVersion e) {
        return new RuleVersion(
                e.getRuleCode(),
                e.getVersionNo(),
                e.getEffectiveFrom(),
                e.getEffectiveTo(),
                e.getVerificationStatus(),
                new ContributionRuleParameters(
                        e.getEmployeeRate(), e.getEmployerRate(), e.getCeilingAmount()));
    }
}