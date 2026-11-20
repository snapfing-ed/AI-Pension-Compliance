package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.ExecuteAnalysisRequest;
import com.edward.pensioncompliance.analysis.dto.FindingDraft;
import com.edward.pensioncompliance.analysis.dto.RuleInputs;
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
import com.edward.pensioncompliance.payments.entity.PaymentTransaction;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class AnalysisExecutionService {

    private static final String LOGIC_VERSION = "PHASE3E-HYBRID-V1";

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
    private final MlAnomalyClient mlClient;
    private final ContributionCalculator calculator = new ContributionCalculator();
    private final DeterministicRuleEvaluator ruleEvaluator = new DeterministicRuleEvaluator();
    private final DueDateCalculator dueDateCalculator = new DueDateCalculator();

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
        this(analyses, snapshots, calculations, complianceFindings, dqFindings, employers, periods,
                batches, payrollRecords, returns, returnVersions, allocations, assessments,
                ruleService, ruleRepo, users, audit, em,
                new MlAnomalyClient(false, "http://localhost:8090", 1000));
    }

    @Autowired
    public AnalysisExecutionService(
            EmployerMonthAnalysisRepository analyses, AnalysisSnapshotRepository snapshots,
            ContributionCalculationRepository calculations, ComplianceFindingRepository complianceFindings,
            DataQualityFindingRepository dqFindings, EmployerRepository employers,
            ContributionPeriodRepository periods, PayrollBatchRepository batches,
            PayrollRecordRepository payrollRecords, SubmittedReturnRepository returns,
            ReturnVersionRepository returnVersions, PaymentAllocationRepository allocations,
            CompletenessAssessmentRepository assessments, ContributionRuleService ruleService,
            ContributionRuleVersionRepository ruleRepo, AppUserRepository users,
            AuditService audit, EntityManager em, MlAnomalyClient mlClient) {
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
        this.mlClient = mlClient;
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
        BigDecimal totalGrossPay = BigDecimal.ZERO;
        int activeMemberCount = 0;

        for (PayrollBatch b : activeBatches) {
            for (PayrollRecord rec : payrollRecords.findByPayrollBatchPayrollBatchId(b.getPayrollBatchId())) {
                if (rec.getEligibleGrossPay() != null) {
                    totalGrossPay = totalGrossPay.add(rec.getEligibleGrossPay());
                }
                if ("ACTIVE".equalsIgnoreCase(rec.getPayrollStatus())) {
                    activeMemberCount++;
                }
                CalculationResult res = calculator.calculate(rec.getEligibleGrossPay(), rule.parameters());
                if (res.status() == CalculationStatus.CALCULATED) {
                    totalExpected = totalExpected.add(res.totalAmount());
                }
            }
        }

        BigDecimal totalReported = latestReturns.stream()
                .map(ReturnVersion::getReportedTotalAmount)
                .filter(Objects::nonNull)
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

        LocalDate dueDate = dueDateCalculator.resolveDueDate(
                period, ruleEntity.getDueDayRule(), DueDateCalculator.WeekendAdjustment.NEXT_BUSINESS_DAY);

        int maxReturnDaysLate = latestReturns.stream()
                .map(ReturnVersion::getSubmittedAt)
                .filter(Objects::nonNull)
                .map(ts -> ts.atZoneSameInstant(DueDateCalculator.ZAMBIA_ZONE).toLocalDate())
                .filter(d -> d.isAfter(dueDate))
                .mapToInt(d -> (int) ChronoUnit.DAYS.between(dueDate, d))
                .max()
                .orElse(0);

        int maxPaymentDaysLate = activeAllocations.stream()
                .map(pa -> em.find(PaymentTransaction.class, pa.getPaymentId()))
                .filter(Objects::nonNull)
                .map(PaymentTransaction::getPaidAt)
                .filter(Objects::nonNull)
                .map(ts -> ts.atZoneSameInstant(DueDateCalculator.ZAMBIA_ZONE).toLocalDate())
                .filter(d -> d.isAfter(dueDate))
                .mapToInt(d -> (int) ChronoUnit.DAYS.between(dueDate, d))
                .max()
                .orElse(0);

        boolean scopeEvidenceIncomplete = scopeAssessments.stream().anyMatch(a ->
                a.getAssessmentStatus() == AssessmentStatus.INCOMPLETE
                        || a.getAssessmentStatus() == AssessmentStatus.UNKNOWN);

        RuleInputs ruleInputs = new RuleInputs(
                req.employerId(), req.periodId(), activeBatches.size(), latestReturns.size(),
                reportedUnknown, scopeEvidenceIncomplete, totalExpected, totalReported, totalPaid,
                maxReturnDaysLate, maxPaymentDaysLate);

        List<FindingDraft> ruleDrafts = ruleEvaluator.evaluate(ruleInputs);
        for (FindingDraft d : ruleDrafts) {
            complianceFindings.save(new ComplianceFinding(
                    snapshot.getSnapshotId(), d.findingCode(), d.category(), d.description(),
                    d.priorityScore(), d.confidenceScore(), d.detectionMethod(), d.explanation()));
        }

        // Phase 3E: Advisory ML anomaly scoring (fail-open if service unavailable)
        int quarantinedCount = countQuarantinedRows(activeBatches);
        MlAnomalyClient.ObservationPayload targetObs = new MlAnomalyClient.ObservationPayload(
                req.employerId(),
                req.periodId(),
                formatPeriodYm(period),
                activeBatches.size(),
                latestReturns.size(),
                activeMemberCount,
                quarantinedCount,
                totalGrossPay.doubleValue(),
                totalExpected.doubleValue(),
                totalReported.doubleValue(),
                totalPaid.doubleValue(),
                reportedUnknown,
                scopeEvidenceIncomplete,
                maxReturnDaysLate,
                maxPaymentDaysLate
        );

        List<MlAnomalyClient.ObservationPayload> historyObs = buildEmployerHistory(req.employerId(), req.periodId());
        mlClient.predict(new MlAnomalyClient.PredictPayload(targetObs, historyObs)).ifPresent(pred -> {
            snapshot.setModelInfo(pred.modelName(), pred.modelVersion());
            if (pred.isAnomaly()) {
                String method = ruleDrafts.isEmpty() ? "ML" : "HYBRID";
                complianceFindings.save(new ComplianceFinding(
                        snapshot.getSnapshotId(),
                        pred.findingCode(),
                        pred.category(),
                        "Unusual employer-period contribution pattern flagged by Isolation Forest anomaly detector.",
                        pred.priorityScore(),
                        pred.confidenceScore(),
                        method,
                        pred.explanation()
                ));
                if (snapshot.getOverallResult() == SnapshotResult.NO_ISSUE_DETECTED) {
                    snapshot.updateOverallResult(SnapshotResult.REQUIRES_REVIEW);
                }
            }
            snapshots.save(snapshot);
        });

        audit.record(actor, "ANALYSIS_EXECUTED", "ANALYSIS_SNAPSHOT", snapshot.getSnapshotId().toString(),
                "Executed analysisId=" + analysis.getAnalysisId() + " run=" + nextRun + " result=" + snapshot.getOverallResult());

        return SnapshotDetailResponse.of(
                snapshot, totalExpected, totalReported, totalPaid,
                calculations.findBySnapshotId(snapshot.getSnapshotId())
        );
    }

    private int countQuarantinedRows(List<PayrollBatch> activeBatches) {
        if (activeBatches.isEmpty()) {
            return 0;
        }
        List<Long> batchIds = activeBatches.stream().map(PayrollBatch::getPayrollBatchId).toList();
        Object result = em.createQuery(
                        "SELECT COUNT(q) FROM PayrollQuarantineRecord q WHERE q.payrollBatch.payrollBatchId IN :ids")
                .setParameter("ids", batchIds)
                .getSingleResult();
        return ((Number) result).intValue();
    }

    private List<MlAnomalyClient.ObservationPayload> buildEmployerHistory(Long employerId, Long currentPeriodId) {
        List<EmployerMonthAnalysis> priorAnalyses = em.createQuery(
                        "SELECT a FROM EmployerMonthAnalysis a WHERE a.employerId = :empId AND a.periodId <> :currPeriod",
                        EmployerMonthAnalysis.class)
                .setParameter("empId", employerId)
                .setParameter("currPeriod", currentPeriodId)
                .getResultList();

        List<MlAnomalyClient.ObservationPayload> history = new ArrayList<>();
        for (EmployerMonthAnalysis prior : priorAnalyses) {
            ContributionPeriod p = periods.findById(prior.getPeriodId()).orElse(null);
            if (p == null) {
                continue;
            }
            List<PayrollBatch> pBatches = batches.findByEmployerEmployerIdAndPeriodPeriodId(employerId, p.getPeriodId()).stream()
                    .filter(b -> "VALIDATED".equals(b.getStatus().name()))
                    .toList();
            if (pBatches.isEmpty()) {
                continue;
            }
            BigDecimal pGross = BigDecimal.ZERO;
            int pMembers = 0;
            for (PayrollBatch b : pBatches) {
                for (PayrollRecord rec : payrollRecords.findByPayrollBatchPayrollBatchId(b.getPayrollBatchId())) {
                    if (rec.getEligibleGrossPay() != null) {
                        pGross = pGross.add(rec.getEligibleGrossPay());
                    }
                    if ("ACTIVE".equalsIgnoreCase(rec.getPayrollStatus())) {
                        pMembers++;
                    }
                }
            }
            List<ReturnVersion> pReturns = returns.findByEmployerIdAndPeriodId(employerId, p.getPeriodId()).stream()
                    .flatMap(sr -> returnVersions.findTopByReturnIdOrderByVersionNoDesc(sr.getReturnId()).stream())
                    .toList();
            BigDecimal pReported = pReturns.stream()
                    .map(ReturnVersion::getReportedTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal pPaid = allocations.findByAnalysisIdAndAllocationStatusOrderByAllocatedAtDesc(
                            prior.getAnalysisId(), PaymentAllocationStatus.ACTIVE).stream()
                    .map(PaymentAllocation::getAllocatedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            history.add(new MlAnomalyClient.ObservationPayload(
                    employerId,
                    p.getPeriodId(),
                    formatPeriodYm(p),
                    pBatches.size(),
                    pReturns.size(),
                    pMembers,
                    countQuarantinedRows(pBatches),
                    pGross.doubleValue(),
                    pGross.multiply(new BigDecimal("0.10")).doubleValue(),
                    pReported.doubleValue(),
                    pPaid.doubleValue(),
                    pReturns.stream().anyMatch(rv -> rv.getReportedTotalAmount() == null),
                    false,
                    0,
                    0
            ));
        }
        history.sort(Comparator.comparing(MlAnomalyClient.ObservationPayload::period_ym));
        return history;
    }

    private static String formatPeriodYm(ContributionPeriod p) {
        return String.format("%04d-%02d", p.getPeriodYear(), p.getPeriodMonth());
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