package com.edward.pensioncompliance.completeness.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.completeness.dto.CreateCompletenessRequest;
import com.edward.pensioncompliance.completeness.entity.AssessmentStatus;
import com.edward.pensioncompliance.completeness.entity.CompletenessAssessment;
import com.edward.pensioncompliance.completeness.entity.CompletenessScopeType;
import com.edward.pensioncompliance.completeness.repository.CompletenessAssessmentRepository;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class CompletenessService {

    private final CompletenessAssessmentRepository assessments;
    private final DataSourceRepository sources;
    private final AppUserRepository users;
    private final AuditService audit;

    public CompletenessService(
            CompletenessAssessmentRepository assessments, DataSourceRepository sources,
            AppUserRepository users, AuditService audit) {
        this.assessments = assessments;
        this.sources = sources;
        this.users = users;
        this.audit = audit;
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public CompletenessAssessment create(CreateCompletenessRequest req, Authentication auth) {
        if (!sources.existsById(req.sourceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Data source not found.");
        }
        if (req.scopeStart().isAfter(req.scopeEnd())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scopeStart must be <= scopeEnd.");
        }

        CompletenessScopeType scope = CompletenessScopeType.valueOf(req.scopeType().trim().toUpperCase(Locale.ROOT));
        AssessmentStatus status = AssessmentStatus.valueOf(req.assessmentStatus().trim().toUpperCase(Locale.ROOT));

        AppUser actor = users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Actor not found."));

        CompletenessAssessment saved = assessments.save(new CompletenessAssessment(
                req.sourceId(), scope, req.scopeStart(), req.scopeEnd(),
                req.employerId(), req.periodId(), status, actor.getUserId(), req.evidenceNotes()
        ));

        audit.record(actor, "COMPLETENESS_ASSESSED", "COMPLETENESS_ASSESSMENT",
                saved.getAssessmentId().toString(),
                "Assessed scope=" + scope + " status=" + status + " for sourceId=" + req.sourceId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CompletenessAssessment> list() {
        return assessments.findAll();
    }
}