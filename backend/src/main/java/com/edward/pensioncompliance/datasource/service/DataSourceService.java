package com.edward.pensioncompliance.datasource.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.datasource.dto.CreateDataSourceRequest;
import com.edward.pensioncompliance.datasource.dto.DataSourceResponse;
import com.edward.pensioncompliance.datasource.entity.DataSource;
import com.edward.pensioncompliance.datasource.entity.DataSourceStatus;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import jakarta.persistence.criteria.Predicate;
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
import java.util.regex.Pattern;

@Service
public class DataSourceService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Pattern SOURCE_TYPE_PATTERN = Pattern.compile("^[A-Z][A-Z0-9_-]{0,39}$");

    private final DataSourceRepository sources;
    private final AppUserRepository users;
    private final AuditService audit;

    public DataSourceService(
            DataSourceRepository sources,
            AppUserRepository users,
            AuditService audit) {
        this.sources = sources;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<DataSourceResponse> list(
            String search,
            String sourceType,
            String status,
            int page,
            int size) {
        DataSourceStatus statusFilter = parseStatus(status);
        String typeFilter = (sourceType == null || sourceType.isBlank())
                ? null
                : sourceType.trim().toUpperCase(Locale.ROOT);
        String term = (search == null) ? "" : search.trim().toLowerCase(Locale.ROOT);

        Specification<DataSource> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }
            if (typeFilter != null) {
                predicates.add(cb.equal(root.get("sourceType"), typeFilter));
            }
            if (!term.isEmpty()) {
                String like = "%" + escapeLike(term) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("sourceName")), like, '\\'),
                        cb.like(cb.lower(root.get("ownerName")), like, '\\'),
                        cb.like(cb.lower(root.get("authorityReference")), like, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("receivedAt"), Sort.Order.desc("sourceId")));
        Page<DataSource> result = sources.findAll(spec, pageable);
        return PageResponse.of(result.map(DataSourceResponse::from));
    }

    @Transactional(readOnly = true)
    public DataSourceResponse get(Long id) {
        return DataSourceResponse.from(find(id));
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public DataSourceResponse create(CreateDataSourceRequest request, Authentication auth) {
        String name = request.sourceName().trim();
        String normalizedType = normalizeSourceType(request.sourceType());
        AppUser actor = resolveActor(auth);

        DataSource saved = sources.save(new DataSource(
                name,
                normalizedType,
                blankToNull(request.ownerName()),
                blankToNull(request.authorityReference()),
                request.permittedPurpose().trim(),
                request.receivedAt(),
                blankToNull(request.coverageNotes())
        ));
        audit.record(actor, "DATA_SOURCE_CREATED", "DATA_SOURCE",
                saved.getSourceId().toString(),
                "Data source '" + name + "' (" + normalizedType + ") registered.");
        return DataSourceResponse.from(saved);
    }

    private DataSource find(Long id) {
        return sources.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Data source not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    private static DataSourceStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return DataSourceStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown data source status.");
        }
    }

    private static String normalizeSourceType(String raw) {
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (!SOURCE_TYPE_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Source type must start with a letter and use only letters, digits, underscores or hyphens.");
        }
        return normalized;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}