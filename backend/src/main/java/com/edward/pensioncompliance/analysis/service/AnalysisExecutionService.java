package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.ExecuteAnalysisRequest;
import com.edward.pensioncompliance.analysis.dto.SnapshotDetailResponse;
import com.edward.pensioncompliance.analysis.entity.*;
import com.edward.pensioncompliance.analysis.repository.*;
import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.completeness.entity.AssessmentStatus;
import com.edward.pensioncompliance.completeness.entity.CompletenessAssessment;
import com.edward.pensioncompliance.completeness.repository.CompletenessAssessmentRepository;
import com.edward.pensioncompliance.contribution.*;
import com.edward.pensioncompliance.contribution.entity.ContributionRuleVersion;
import com.edward.pensioncompliance.contribution.repository.ContributionRuleVersionRepository;
import com.edward.pensioncompliance.contribution.service.ContributionRuleService;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.findings.entity.ComplianceFinding;
import com.edward.pensioncompliance.findings.entity.DataQualityFinding;
import com.edward.pensioncompliance.findings.repository.ComplianceFindingRepository;
import com.edward.pensioncompliance.findings.repository.DataQualityFindingRepository;
import com.edward.pensioncompliance.payments.entity.PaymentAllocation;
import com.edward.pensioncompliance.payments.entity.PaymentAllocationStatus;
import com.edward.pensioncompliance.payments.repository.PaymentAllocationRepository;
import com.edward.pensioncompliance.payroll.entity.PayrollBatch;
import com.edward.pensioncompliance.payroll.entity.PayrollRecord;
import com.edward.pensioncompliance.payroll.repository.PayrollBatchRepository;
import com.edward.pensioncompliance.payroll.repository.PayrollRecordRepository;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.returns.entity.ReturnVersion;
import com.edward.pensioncompliance.returns.entity.SubmittedReturn;
import com.edward.pensioncompliance.returns.repository.ReturnVersionRepository;
import com.edward.pensioncompliance.returns.repository.SubmittedReturnRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

@Service
public class AnalysisExecutionService {

    private static final String LOGIC_VERSION = "PHASE3C-DETERMINISTIC-V3";

    private final EmployerMonthAnalysisRepository analyses;
    private final AnalysisSnapshotRepository snapshots;
    private final ContributionCalculationRepository calculations;
    private final ComplianceFindingRepository complianceFindings;
    private final DataQualityFindingRepository dqFindings;
    private final EmployerRepository employers;
    private final ContributionPeriodRepository periods;
    private final PayrollBatchRepository batches;
    private final PayrollRecordRepository payrollRecords;
    private final SubmittedReturnRepository returns;
    private final ReturnVersionRepository returnVersions;
    private final PaymentAllocationRepository allocations;
    private final CompletenessAssessmentRepository assessments;
    private final ContributionRuleService ruleService;
    private final ContributionRuleVersionRepository ruleRepo;
    private final AppUserRepository users;
    private final AuditService audit;
    private final EntityManager em;
    private final ContributionCalculator calculator = new ContributionCalculator();

    public AnalysisExecutionService(
            EmployerMonthAnalysisRepository analyses, AnalysisSnapshotRepository snapshots,
            ContributionCalculationRepository calculations, ComplianceFindingRepository complianceFindings,
            DataQualityFindingRepository dqFindings, EmployerRepository employers,
            ContributionPeriodRepository periods, PayrollBatchRepository batches,
            PayrollRecordRepository payrollRecords, SubmittedReturnRepository returns,
            ReturnVersionRepository returnVersions, PaymentAllocationRepository allocations,
            CompletenessAssessmentRepository assessments, ContributionRuleService ruleService,
            ContributionRuleVersionRepository ruleRepo, AppUserRepository users,
            AuditService audit, EntityManager em) {
        this.analyses = analyses;
        this.snapshots = snapshots;
        this.calculations = calculations;
        this.complianceFindings = complianceFindings;
        this.dqFindings = dqFindings;
        this.employers = employers;
        this.periods = periods;
        this.batches = batches;
        this.payrollRecords = payrollRecords;
        this.returns = returns;
        this.returnVersions = returnVersions;
        this.allocations = allocations;
        this.assessments = assessments;
        this.ruleService = ruleService;
        this.ruleRepo = ruleRepo;
        this.users = users;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR')")
    @Transactional
    public SnapshotDetailResponse execute(ExecuteAnalysisRequest req, Authentication auth) {
        OffsetDateTime startedAt = OffsetDateTime.now(ZoneOffset.UTC);

        if (!employers.existsById(req.employerId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found.");
        }
        ContributionPeriod period = periods.findById(req.periodId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribution period not found."));

        String ruleCode = (req.ruleCode() == null || req.ruleCode().isBlank()) ? "NAPSA_FORMAL" : req.ruleCode().trim();
        RuleVersion rule = ruleService.findApplicableRule(ruleCode, period.getPeriodStart());
        ContributionRuleVersion ruleEntity = ruleRepo.findByRuleCodeOrderByVersionNoAsc(ruleCode).stream()
                .filter(r -> r.getVersionNo() == rule.versionNo())
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Rule entity not found."));

        EmployerMonthAnalysis analysis = analyses.findByEmployerIdAndPeriodId(req.employerId(), req.periodId())
                .orElseGet(() -> analyses.save(new EmployerMonthAnalysis(req.employerId(), req.periodId())));

        int nextRun = snapshots.findTopByAnalysisIdOrderByRunNumberDesc(analysis.getAnalysisId())
                .map(s -> s.getRunNumber() + 1)
                .orElse(1);

        List<PayrollBatch> activeBatches = batches.findByEmployerEmployerIdAndPeriodPeriodId(req.employerId(), req.periodId()).stream()
                .filter(b -> "VALIDATED".equals(b.getStatus().name()))
                .toList();

        List<ReturnVersion> latestReturns = returns.findByEmployerIdAndPeriodId(req.employerId(), req.periodId()).stream()
                .flatMap(sr -> returnVersions.findTopByReturnIdOrderByVersionNoDesc(sr.getReturnId()).stream())
                .toList();

        List<PaymentAllocation> activeAllocations = allocations.findByAnalysisIdAndAllocationStatusOrderByAllocatedAtDesc(
                analysis.getAnalysisId(), PaymentAllocationStatus.ACTIVE);

        List<CompletenessAssessment> scopeAssessments = assessments.findByEmployerIdAndPeriodId(
                req.employerId(), req.periodId());

        String fingerprint = sha256(
                "E=" + req.employerId() + "|P=" + req.periodId() + "|R=" + ruleEntity.getRuleVersionId()
                        + "|B=" + activeBatches.stream().map(PayrollBatch::getPayrollBatchId).toList()
                        + "|RV=" + latestReturns.stream().map(ReturnVersion::getReturnVersionId).toList()
                        + "|PA=" + activeAllocations.stream().map(PaymentAllocation::getAllocationId).toList()
                        + "|CA=" + scopeAssessments.stream().map(CompletenessAssessment::getAssessmentId).toList()
        );

        boolean reportedUnknown = latestReturns.stream()
                .anyMatch(rv -> rv.getReportedTotalAmount() == null);

        boolean incompleteData = activeBatches.isEmpty() || reportedUnknown || scopeAssessments.stream()
                .anyMatch(a -> a.getAssessmentStatus() == AssessmentStatus.INCOMPLETE
                        || a.getAssessmentStatus() == AssessmentStatus.UNKNOWN);

        BigDecimal totalExpected = BigDecimal.ZERO;
        for (PayrollBatch b : activeBatches) {
            for (PayrollRecord rec : payrollRecords.findByPayrollBatchPayrollBatchId(b.getPayrollBatchId())) {
                CalculationResult res = calculator.calculate(rec.getEligibleGrossPay(), rule.parameters());
                if (res.status() == CalculationStatus.CALCULATED) {
                    totalExpected = totalExpected.add(res.totalAmount());
                }
            }
        }

        BigDecimal totalReported = latestReturns.stream()
                .map(ReturnVersion::getReportedTotalAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = activeAllocations.stream()
                .map(PaymentAllocation::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        SnapshotResult overall;
        if (incompleteData) {
            overall = SnapshotResult.DATA_INCOMPLETE;
        } else if (totalExpected.compareTo(totalReported) != 0 || totalExpected.compareTo(totalPaid) != 0) {
            overall = SnapshotResult.REQUIRES_REVIEW;
        } else {
            overall = SnapshotResult.NO_ISSUE_DETECTED;
        }

        AppUser actor = users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Actor not found."));

        AnalysisSnapshot snapshot = snapshots.save(new AnalysisSnapshot(
                analysis.getAnalysisId(), nextRun, startedAt,
                ruleEntity.getRuleVersionId(), LOGIC_VERSION, fingerprint, overall, actor.getUserId()
        ));

        for (PayrollBatch b : activeBatches) {
            em.createNativeQuery("INSERT INTO snapshot_payroll_batch (snapshot_id, payroll_batch_id) VALUES (?, ?)")
                    .setParameter(1, snapshot.getSnapshotId())
                    .setParameter(2, b.getPayrollBatchId())
                    .executeUpdate();

            for (PayrollRecord rec : payrollRecords.findByPayrollBatchPayrollBatchId(b.getPayrollBatchId())) {
                if (rec.getEligibleGrossPay() == null) {
                    dqFindings.save(new DataQualityFinding(
                            snapshot.getSnapshotId(),
                            "DQ_MISSING_ELIGIBLE_PAY",
                            "Payroll record #" + rec.getPayrollRecordId() + " has NULL eligible gross pay.",
                            "MEDIUM",
                            "PAYROLL_RECORD",
                            rec.getPayrollRecordId(),
                            null,
                            null
                    ));
                }
                CalculationResult res = calculator.calculate(rec.getEligibleGrossPay(), rule.parameters());
                if (res.status() == CalculationStatus.CALCULATED) {
                    calculations.save(new ContributionCalculationEntity(
                            snapshot.getSnapshotId(), rec.getPayrollRecordId(), b.getPayrollBatchId(),
                            ruleEntity.getRuleVersionId(), res.pensionableEarnings(),
                            res.employeeAmount(), res.employerAmount(), res.totalAmount(),
                            res.status().name(), res.explanationCode()
                    ));
                }
            }
        }

        for (ReturnVersion rv : latestReturns) {
            em.createNativeQuery("INSERT INTO snapshot_return_version (snapshot_id, return_version_id) VALUES (?, ?)")
                    .setParameter(1, snapshot.getSnapshotId())
                    .setParameter(2, rv.getReturnVersionId())
                    .executeUpdate();
            if (rv.getReportedTotalAmount() == null) {
                dqFindings.save(new DataQualityFinding(
                        snapshot.getSnapshotId(), "DQ_MISSING_REPORTED_TOTAL",
                        "Return version #" + rv.getReturnVersionId() + " has NULL reported total amount.",
                        "MEDIUM", "RETURN_VERSION", null, null, null));
            }
        }
        for (PaymentAllocation pa : activeAllocations) {
            em.createNativeQuery("INSERT INTO snapshot_payment_allocation (snapshot_id, allocation_id) VALUES (?, ?)")
                    .setParameter(1, snapshot.getSnapshotId())
                    .setParameter(2, pa.getAllocationId())
                    .executeUpdate();
        }
        for (CompletenessAssessment ca : scopeAssessments) {
            em.createNativeQuery("INSERT INTO snapshot_completeness_assessment (snapshot_id, assessment_id) VALUES (?, ?)")
                    .setParameter(1, snapshot.getSnapshotId())
                    .setParameter(2, ca.getAssessmentId())
                    .executeUpdate();
        }

        emitDeterministicFindings(snapshot, req.employerId(), req.periodId(),
                activeBatches, latestReturns, scopeAssessments, totalExpected, totalReported, totalPaid, reportedUnknown);

        audit.record(actor, "ANALYSIS_EXECUTED", "ANALYSIS_SNAPSHOT", snapshot.getSnapshotId().toString(),
                "Executed analysisId=" + analysis.getAnalysisId() + " run=" + nextRun + " result=" + overall);

        return SnapshotDetailResponse.of(
                snapshot, totalExpected, totalReported, totalPaid,
                calculations.findBySnapshotId(snapshot.getSnapshotId())
        );
    }

    private void emitDeterministicFindings(
            AnalysisSnapshot snapshot,
            Long employerId,
            Long periodId,
            List<PayrollBatch> activeBatches,
            List<ReturnVersion> latestReturns,
            List<CompletenessAssessment> scopeAssessments,
            BigDecimal totalExpected,
            BigDecimal totalReported,
            BigDecimal totalPaid,
            boolean reportedUnknown) {

        Long sid = snapshot.getSnapshotId();

        if (activeBatches.isEmpty()) {
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_MISSING_PAYROLL_BATCH", "POTENTIALLY_MISSING",
                    "No validated payroll batch found for employer #" + employerId + " in period #" + periodId + ".",
                    new BigDecimal("85.000"), new BigDecimal("0.98000"), "RULE",
                    "Deterministic rule check detected zero VALIDATED payroll batches in scope."
            ));
        }

        if (latestReturns.isEmpty() && !activeBatches.isEmpty()) {
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_MISSING_CONTRIBUTION_RETURN", "POTENTIALLY_MISSING",
                    "Validated payroll exists (" + totalExpected + " ZMW expected) but no contribution return was submitted.",
                    new BigDecimal("90.000"), new BigDecimal("0.99000"), "RULE",
                    "Expected statutory contribution is " + totalExpected + " ZMW with 0 submitted return versions."
            ));
        }

        if (scopeAssessments.stream().anyMatch(a ->
                a.getAssessmentStatus() == AssessmentStatus.INCOMPLETE || a.getAssessmentStatus() == AssessmentStatus.UNKNOWN)) {
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_INCOMPLETE_SCOPE_EVIDENCE", "POTENTIALLY_INCOMPLETE",
                    "One or more completeness assessments in scope are marked INCOMPLETE or UNKNOWN.",
                    new BigDecimal("72.500"), new BigDecimal("0.95000"), "RULE",
                    "Scope evidence completeness check flagged non-COMPLETE assessment records."
            ));
        }

        if (!activeBatches.isEmpty() && !latestReturns.isEmpty() && !reportedUnknown && totalReported.compareTo(totalExpected) < 0) {
            BigDecimal shortfall = totalExpected.subtract(totalReported);
            BigDecimal score = BigDecimal.valueOf(55.0).add(shortfall.divide(BigDecimal.valueOf(500), 3, RoundingMode.HALF_UP))
                    .min(new BigDecimal("100.000"));
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_UNDER_REPORTED_CONTRIBUTION", "POTENTIALLY_INCOMPLETE",
                    "Reported contribution (" + totalReported + " ZMW) is below statutory expected (" + totalExpected + " ZMW) by " + shortfall + " ZMW.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Expected=" + totalExpected + " ZMW vs Reported=" + totalReported + " ZMW (variance=" + shortfall + " ZMW)."
            ));
        }

        if (reportedUnknown) {
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_RETURN_AMOUNT_MISSING", "POTENTIALLY_INCOMPLETE",
                    "A submitted return version has no reported total amount, so reported contribution cannot be compared with expected.",
                    new BigDecimal("70.000"), new BigDecimal("0.95000"), "RULE",
                    "Reported total is NULL (not reported); it is treated as unknown, not zero."
            ));
        }

        if (!activeBatches.isEmpty() && totalPaid.compareTo(totalExpected) < 0) {
            BigDecimal unpaid = totalExpected.subtract(totalPaid);
            BigDecimal score = BigDecimal.valueOf(60.0).add(unpaid.divide(BigDecimal.valueOf(500), 3, RoundingMode.HALF_UP))
                    .min(new BigDecimal("100.000"));
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_UNREMITTED_CONTRIBUTION_SHORTFALL", "POTENTIALLY_DELAYED",
                    "Allocated confirmed payments (" + totalPaid + " ZMW) fall short of expected (" + totalExpected + " ZMW) by " + unpaid + " ZMW.",
                    score, new BigDecimal("0.99000"), "RULE",
                    "Expected=" + totalExpected + " ZMW vs Allocated Payments=" + totalPaid + " ZMW (shortfall=" + unpaid + " ZMW)."
            ));
        }

        if (!activeBatches.isEmpty() && (totalReported.compareTo(totalExpected) > 0 || totalPaid.compareTo(totalExpected) > 0)) {
            complianceFindings.save(new ComplianceFinding(
                    sid, "RULE_POSITIVE_CONTRIBUTION_VARIANCE", "UNUSUAL_PATTERN",
                    "Reported (" + totalReported + " ZMW) or paid (" + totalPaid + " ZMW) exceeds statutory expected (" + totalExpected + " ZMW).",
                    new BigDecimal("50.000"), new BigDecimal("0.92000"), "RULE",
                    "Positive variance detected between expected (" + totalExpected + "), reported (" + totalReported + "), and paid (" + totalPaid + ")."
            ));
        }
    }

    @Transactional(readOnly = true)
    public List<EmployerMonthAnalysis> listAnalyses() {
        return analyses.findAll();
    }

    @Transactional(readOnly = true)
    public List<AnalysisSnapshot> listSnapshots(Long analysisId) {
        return snapshots.findByAnalysisIdOrderByRunNumberDesc(analysisId);
    }

    @Transactional(readOnly = true)
    public SnapshotDetailResponse getSnapshot(Long snapshotId) {
        AnalysisSnapshot s = snapshots.findById(snapshotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Snapshot not found."));
        List<ContributionCalculationEntity> calcs = calculations.findBySnapshotId(snapshotId);
        BigDecimal totalExpected = calcs.stream()
                .map(ContributionCalculationEntity::getTotalExpected)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return SnapshotDetailResponse.of(s, totalExpected, null, null, calcs);
    }

    private static String sha256(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}