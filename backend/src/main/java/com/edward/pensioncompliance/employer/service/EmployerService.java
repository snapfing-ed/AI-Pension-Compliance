package com.edward.pensioncompliance.employer.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.employer.dto.CreateEmployerRequest;
import com.edward.pensioncompliance.employer.dto.EmployerResponse;
import com.edward.pensioncompliance.employer.dto.UpdateEmployerRequest;
import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.employer.entity.EmployerStatus;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
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
import java.util.Objects;

@Service
public class EmployerService {

    private static final int MAX_PAGE_SIZE = 100;

    private final EmployerRepository employers;
    private final AppUserRepository users;
    private final AuditService audit;

    public EmployerService(EmployerRepository employers, AppUserRepository users, AuditService audit) {
        this.employers = employers;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployerResponse> list(String search, String status, int page, int size) {
        EmployerStatus statusFilter = parseStatus(status);
        String term = (search == null) ? "" : search.trim().toLowerCase();

        Specification<Employer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }
            if (!term.isEmpty()) {
                String like = "%" + escapeLike(term) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("legalName")), like, '\\'),
                        cb.like(cb.lower(root.get("employerRef")), like, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by("legalName").ascending());

        Page<Employer> result = employers.findAll(spec, pageable);
        return PageResponse.of(result.map(EmployerResponse::from));
    }

    @Transactional(readOnly = true)
    public EmployerResponse get(Long id) {
        return EmployerResponse.from(find(id));
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public EmployerResponse create(CreateEmployerRequest request, Authentication auth) {
        String ref = request.employerRef().trim();
        if (employers.existsByEmployerRef(ref)) {
            throw duplicateReference();
        }
        AppUser actor = resolveActor(auth);

        Employer saved;
        try {
            saved = employers.save(new Employer(ref, request.legalName().trim(),
                    blankToNull(request.tradingName())));
        } catch (DataIntegrityViolationException e) {
            // Two simultaneous requests can both pass the check above; the unique constraint decides.
            throw duplicateReference();
        }

        audit.record(actor, "EMPLOYER_CREATED", "EMPLOYER",
                saved.getEmployerId().toString(), "Employer " + ref + " created.");
        return EmployerResponse.from(saved);
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public EmployerResponse update(Long id, UpdateEmployerRequest request, Authentication auth) {
        Employer employer = find(id);
        AppUser actor = resolveActor(auth);
        List<String> changes = new ArrayList<>();

        if (request.legalName() != null) {
            String name = request.legalName().trim();
            if (!name.equals(employer.getLegalName())) {
                employer.changeLegalName(name);
                changes.add("legalName");
            }
        }
        if (request.tradingName() != null) {
            String trading = blankToNull(request.tradingName());
            if (!Objects.equals(trading, employer.getTradingName())) {
                employer.changeTradingName(trading);
                changes.add("tradingName");
            }
        }
        if (request.status() != null) {
            EmployerStatus newStatus = EmployerStatus.valueOf(request.status());
            if (newStatus != employer.getStatus()) {
                changes.add("status " + employer.getStatus() + " to " + newStatus);
                employer.changeStatus(newStatus);
            }
        }

        if (!changes.isEmpty()) {
            audit.record(actor, "EMPLOYER_UPDATED", "EMPLOYER", id.toString(),
                    "Employer " + employer.getEmployerRef() + " updated: " + String.join(", ", changes) + ".");
        }
        return EmployerResponse.from(employer);
    }

    private Employer find(Long id) {
        return employers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    private static EmployerStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return EmployerStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown employer status.");
        }
    }

    private static ResponseStatusException duplicateReference() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Employer reference already exists.");
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}