package com.edward.pensioncompliance.findings.controller;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.findings.entity.ComplianceFinding;
import com.edward.pensioncompliance.findings.entity.DataQualityFinding;
import com.edward.pensioncompliance.findings.repository.ComplianceFindingRepository;
import com.edward.pensioncompliance.findings.repository.DataQualityFindingRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/findings")
public class FindingsController {

    private static final Set<String> ALLOWED_COMPLIANCE_STATUS = Set.of(
            "NEW", "UNDER_REVIEW", "CONFIRMED", "NOT_SUBSTANTIATED", "RESOLVED");
    private static final Set<String> ALLOWED_DQ_STATUS = Set.of(
            "OPEN", "UNDER_REVIEW", "RESOLVED", "ACCEPTED");

    private final ComplianceFindingRepository complianceRepo;
    private final DataQualityFindingRepository dqRepo;
    private final AppUserRepository users;
    private final AuditService audit;

    public FindingsController(
            ComplianceFindingRepository complianceRepo,
            DataQualityFindingRepository dqRepo,
            AppUserRepository users,
            AuditService audit) {
        this.complianceRepo = complianceRepo;
        this.dqRepo = dqRepo;
        this.users = users;
        this.audit = audit;
    }

    @GetMapping("/compliance")
    @Transactional(readOnly = true)
    public List<ComplianceFinding> listCompliance(
            @RequestParam(required = false) Long snapshotId,
            @RequestParam(required = false) String status) {
        if (snapshotId != null) {
            return complianceRepo.findBySnapshotIdOrderByPriorityScoreDesc(snapshotId);
        }
        if (status != null && !status.isBlank()) {
            return complianceRepo.findByStatusOrderByPriorityScoreDesc(status.trim().toUpperCase(Locale.ROOT));
        }
        return complianceRepo.findAllByOrderByDetectedAtDesc();
    }

    @PatchMapping("/compliance/{id}/status")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR', 'COMPLIANCE_MONITOR')")
    @Transactional
    public ComplianceFinding updateComplianceStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String next = body.getOrDefault("status", "").trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_COMPLIANCE_STATUS.contains(next)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid compliance finding status.");
        }
        ComplianceFinding f = complianceRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compliance finding not found."));
        f.updateStatus(next);
        ComplianceFinding saved = complianceRepo.save(f);
        AppUser actor = users.findByUsername(auth.getName()).orElse(null);
        if (actor != null) {
            audit.record(actor, "COMPLIANCE_FINDING_STATUS_UPDATED", "COMPLIANCE_FINDING",
                    id.toString(), "Updated status to " + next);
        }
        return saved;
    }

    @GetMapping("/data-quality")
    @Transactional(readOnly = true)
    public List<DataQualityFinding> listDataQuality(@RequestParam(required = false) Long snapshotId) {
        if (snapshotId != null) {
            return dqRepo.findBySnapshotIdOrderByDetectedAtDesc(snapshotId);
        }
        return dqRepo.findAllByOrderByDetectedAtDesc();
    }

    @PatchMapping("/data-quality/{id}/status")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR', 'COMPLIANCE_MONITOR')")
    @Transactional
    public DataQualityFinding updateDqStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String next = body.getOrDefault("resolutionStatus", "").trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_DQ_STATUS.contains(next)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid data quality resolution status.");
        }
        DataQualityFinding f = dqRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Data quality finding not found."));
        f.updateResolutionStatus(next);
        DataQualityFinding saved = dqRepo.save(f);
        AppUser actor = users.findByUsername(auth.getName()).orElse(null);
        if (actor != null) {
            audit.record(actor, "DQ_FINDING_STATUS_UPDATED", "DATA_QUALITY_FINDING",
                    id.toString(), "Updated resolutionStatus to " + next);
        }
        return saved;
    }
}