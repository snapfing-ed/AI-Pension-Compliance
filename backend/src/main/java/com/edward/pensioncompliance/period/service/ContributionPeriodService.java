package com.edward.pensioncompliance.period.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.period.dto.ContributionPeriodResponse;
import com.edward.pensioncompliance.period.dto.CreateContributionPeriodRequest;
import com.edward.pensioncompliance.period.dto.UpdateContributionPeriodStatusRequest;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.entity.ContributionPeriodStatus;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ContributionPeriodService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ContributionPeriodRepository periods;
    private final AppUserRepository users;
    private final AuditService audit;

    public ContributionPeriodService(
            ContributionPeriodRepository periods,
            AppUserRepository users,
            AuditService audit) {
        this.periods = periods;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<ContributionPeriodResponse> list(Integer year, String status, int page, int size) {
        ContributionPeriodStatus statusFilter = parseOptionalStatus(status);
        Specification<ContributionPeriod> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (year != null) {
                predicates.add(cb.equal(root.get("periodYear"), year.shortValue()));
            }
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("periodYear"), Sort.Order.desc("periodMonth")));
        Page<ContributionPeriod> result = periods.findAll(spec, pageable);
        return PageResponse.of(result.map(ContributionPeriodResponse::from));
    }

    @Transactional(readOnly = true)
    public ContributionPeriodResponse get(Long id) {
        return ContributionPeriodResponse.from(find(id));
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public ContributionPeriodResponse create(CreateContributionPeriodRequest request, Authentication auth) {
        short year = request.periodYear().shortValue();
        short month = request.periodMonth().shortValue();
        if (periods.existsByPeriodYearAndPeriodMonth(year, month)) {
            throw duplicatePeriod();
        }
        AppUser actor = resolveActor(auth);
        ContributionPeriod saved;
        try {
            saved = periods.save(new ContributionPeriod(request.periodYear(), request.periodMonth()));
        } catch (DataIntegrityViolationException e) {
            throw duplicatePeriod();
        }
        String code = String.format("%04d-%02d", saved.getPeriodYear(), saved.getPeriodMonth());
        audit.record(actor, "CONTRIBUTION_PERIOD_CREATED", "CONTRIBUTION_PERIOD",
                saved.getPeriodId().toString(),
                "Contribution period " + saved.getPeriodLabel() + " (" + code + ") created.");
        return ContributionPeriodResponse.from(saved);
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public ContributionPeriodResponse updateStatus(
            Long id,
            UpdateContributionPeriodStatusRequest request,
            Authentication auth) {
        ContributionPeriod period = find(id);
        ContributionPeriodStatus target = parseRequiredStatus(request.status());
        AppUser actor = resolveActor(auth);

        ContributionPeriodStatus current = period.getStatus();
        if (target == current) {
            return ContributionPeriodResponse.from(period);
        }
        if (!period.canTransitionTo(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Contribution period cannot transition from " + current + " to " + target + ".");
        }
        period.transitionTo(target);
        audit.record(actor, "CONTRIBUTION_PERIOD_STATUS_CHANGED", "CONTRIBUTION_PERIOD",
                id.toString(),
                "Contribution period " + period.getPeriodLabel() + " status changed from "
                        + current + " to " + target + ".");
        return ContributionPeriodResponse.from(period);
    }

    private ContributionPeriod find(Long id) {
        return periods.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Contribution period not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    private static ContributionPeriodStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return parseRequiredStatus(status);
    }

    private static ContributionPeriodStatus parseRequiredStatus(String status) {
        try {
            return ContributionPeriodStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Unknown contribution period status.");
        }
    }

    private static ResponseStatusException duplicatePeriod() {
        return new ResponseStatusException(
                HttpStatus.CONFLICT, "Contribution period already exists.");
    }
}