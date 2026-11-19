package com.edward.pensioncompliance.cases.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.cases.dto.CaseDetailResponse;
import com.edward.pensioncompliance.cases.dto.CreateCaseRequest;
import com.edward.pensioncompliance.cases.entity.CaseAssignmentHistory;
import com.edward.pensioncompliance.cases.entity.CaseFinding;
import com.edward.pensioncompliance.cases.entity.InvestigationCase;
import com.edward.pensioncompliance.cases.repository.CaseAssignmentHistoryRepository;
import com.edward.pensioncompliance.cases.repository.CaseFindingRepository;
import com.edward.pensioncompliance.cases.repository.InvestigationCaseRepository;
import com.edward.pensioncompliance.findings.entity.ComplianceFinding;
import com.edward.pensioncompliance.findings.repository.ComplianceFindingRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class InvestigationCaseService {

    private static final Set<String> ALLOWED_STATUS = Set.of(
            "OPEN", "ASSIGNED", "UNDER_INVESTIGATION", "PENDING_REVIEW", "CLOSED", "CANCELLED");
    private static final Set<String> ALLOWED_PRIORITY = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

    private final InvestigationCaseRepository cases;
    private final CaseFindingRepository caseFindings;
    private final CaseAssignmentHistoryRepository assignments;
    private final ComplianceFindingRepository findings;
    private final AppUserRepository users;
    private final AuditService audit;

    public InvestigationCaseService(
            InvestigationCaseRepository cases,
            CaseFindingRepository caseFindings,
            CaseAssignmentHistoryRepository assignments,
            ComplianceFindingRepository findings,
            AppUserRepository users,
            AuditService audit) {
        this.cases = cases;
        this.caseFindings = caseFindings;
        this.assignments = assignments;
        this.findings = findings;
        this.users = users;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR', 'COMPLIANCE_MONITOR')")
    @Transactional
    public CaseDetailResponse createCase(CreateCaseRequest req, Authentication auth) {
        AppUser actor = resolveActor(auth);
        String priority = normalizePriority(req.priority());
        String ref = "CASE-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);

        InvestigationCase saved = cases.save(new InvestigationCase(
                ref, req.title().trim(), req.description(), priority, actor.getUserId()));

        if (req.findingIds() != null) {
            for (Long fid : req.findingIds()) {
                ComplianceFinding cf = findings.findById(fid)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finding not found: " + fid));
                if (!caseFindings.existsByCaseIdAndFindingId(saved.getCaseId(), fid)) {
                    caseFindings.save(new CaseFinding(saved.getCaseId(), fid, actor.getUserId(), "Linked on case creation."));
                    if ("NEW".equals(cf.getStatus())) {
                        cf.updateStatus("UNDER_REVIEW");
                        findings.save(cf);
                    }
                }
            }
        }

        Long assigneeId = (req.assignedUserId() != null) ? req.assignedUserId() : actor.getUserId();
        if (users.existsById(assigneeId)) {
            assignments.save(new CaseAssignmentHistory(saved.getCaseId(), assigneeId, actor.getUserId(), "Initial assignment"));
            saved.updateStatus("ASSIGNED");
            saved = cases.save(saved);
        }

        audit.record(actor, "CASE_CREATED", "INVESTIGATION_CASE", saved.getCaseId().toString(),
                "Opened investigation case " + saved.getCaseRef() + ": " + saved.getTitle());

        return toDetail(saved);
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR', 'COMPLIANCE_MONITOR')")
    @Transactional
    public CaseDetailResponse updateStatus(Long caseId, String newStatus, String note, Authentication auth) {
        String normalized = newStatus == null ? "" : newStatus.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid case status.");
        }
        InvestigationCase c = cases.findById(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigation case not found."));
        AppUser actor = resolveActor(auth);

        c.updateStatus(normalized);
        cases.save(c);

        if ("CLOSED".equals(normalized)) {
            for (CaseFinding cfLink : caseFindings.findByCaseIdOrderByLinkedAtDesc(caseId)) {
                findings.findById(cfLink.getFindingId()).ifPresent(f -> {
                    f.updateStatus("RESOLVED");
                    findings.save(f);
                });
            }
        }

        audit.record(actor, "CASE_STATUS_UPDATED", "INVESTIGATION_CASE", caseId.toString(),
                "Transitioned " + c.getCaseRef() + " to " + normalized + (note != null ? " (" + note + ")" : ""));
        return toDetail(c);
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR')")
    @Transactional
    public CaseDetailResponse assignOfficer(Long caseId, Long targetUserId, String note, Authentication auth) {
        InvestigationCase c = cases.findById(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigation case not found."));
        if (!users.existsById(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Target officer user not found.");
        }
        AppUser actor = resolveActor(auth);

        assignments.findTopByCaseIdAndUnassignedAtIsNullOrderByAssignedAtDesc(caseId).ifPresent(prev -> {
            prev.markUnassigned();
            assignments.save(prev);
        });

        assignments.save(new CaseAssignmentHistory(caseId, targetUserId, actor.getUserId(), note));
        if ("OPEN".equals(c.getCaseStatus())) {
            c.updateStatus("ASSIGNED");
            cases.save(c);
        }

        audit.record(actor, "CASE_ASSIGNED", "INVESTIGATION_CASE", caseId.toString(),
                "Assigned " + c.getCaseRef() + " to userId=" + targetUserId);
        return toDetail(c);
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR')")
    @Transactional
    public CaseDetailResponse updatePriority(Long caseId, String priority, String justification, Authentication auth) {
        String normalized = normalizePriority(priority);
        InvestigationCase c = cases.findById(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigation case not found."));
        AppUser actor = resolveActor(auth);
        c.updatePriority(normalized);
        cases.save(c);

        audit.record(actor, "CASE_PRIORITY_UPDATED", "INVESTIGATION_CASE", caseId.toString(),
                "Updated " + c.getCaseRef() + " priority to " + normalized + ": " + (justification != null ? justification : ""));
        return toDetail(c);
    }

    @Transactional(readOnly = true)
    public List<CaseDetailResponse> listCases(String status) {
        List<InvestigationCase> list = (status != null && !status.isBlank())
                ? cases.findByCaseStatusOrderByOpenedAtDesc(status.trim().toUpperCase(Locale.ROOT))
                : cases.findAllByOrderByOpenedAtDesc();
        return list.stream().map(this::toDetail).toList();
    }

    @Transactional(readOnly = true)
    public CaseDetailResponse getCase(Long caseId) {
        InvestigationCase c = cases.findById(caseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investigation case not found."));
        return toDetail(c);
    }

    private CaseDetailResponse toDetail(InvestigationCase c) {
        return CaseDetailResponse.of(
                c,
                caseFindings.findByCaseIdOrderByLinkedAtDesc(c.getCaseId()),
                assignments.findByCaseIdOrderByAssignedAtDesc(c.getCaseId())
        );
    }

    private static String normalizePriority(String p) {
        if (p == null || p.isBlank()) return "MEDIUM";
        String norm = p.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_PRIORITY.contains(norm)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid priority value.");
        }
        return norm;
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Actor not found."));
    }
}