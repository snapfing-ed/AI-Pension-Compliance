package com.edward.pensioncompliance.payroll.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.datasource.entity.DataSource;
import com.edward.pensioncompliance.datasource.entity.DataSourceStatus;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.member.entity.Member;
import com.edward.pensioncompliance.member.repository.MemberRepository;
import com.edward.pensioncompliance.member.service.MemberService;
import com.edward.pensioncompliance.payroll.dto.*;
import com.edward.pensioncompliance.payroll.entity.*;
import com.edward.pensioncompliance.payroll.repository.PayrollBatchRepository;
import com.edward.pensioncompliance.payroll.repository.PayrollQuarantineRecordRepository;
import com.edward.pensioncompliance.payroll.repository.PayrollRecordRepository;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.entity.ContributionPeriodStatus;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class PayrollBatchService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_CHUNK_SIZE = 500;
    private static final int MAX_RESPONSE_QUARANTINE_PREVIEW = 200;
    private static final BigDecimal MAX_GROSS_PAY = new BigDecimal("9999999999999.99");

    private final PayrollBatchRepository batches;
    private final PayrollRecordRepository records;
    private final PayrollQuarantineRecordRepository quarantines;
    private final EmployerRepository employers;
    private final ContributionPeriodRepository periods;
    private final DataSourceRepository sources;
    private final MemberRepository members;
    private final MemberService memberService;
    private final AppUserRepository users;
    private final AuditService audit;
    private final int chunkSize;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public PayrollBatchService(
            PayrollBatchRepository batches,
            PayrollRecordRepository records,
            PayrollQuarantineRecordRepository quarantines,
            EmployerRepository employers,
            ContributionPeriodRepository periods,
            DataSourceRepository sources,
            MemberRepository members,
            MemberService memberService,
            AppUserRepository users,
            AuditService audit,
            @Value("${app.payroll.import-chunk-size:500}") int chunkSize) {
        this.batches = batches;
        this.records = records;
        this.quarantines = quarantines;
        this.employers = employers;
        this.periods = periods;
        this.sources = sources;
        this.members = members;
        this.memberService = memberService;
        this.users = users;
        this.audit = audit;
        this.chunkSize = Math.max(chunkSize, 1);
    }

    // Convenience constructor for unit tests with custom chunk size and EntityManager.
    PayrollBatchService(
            PayrollBatchRepository batches,
            PayrollRecordRepository records,
            PayrollQuarantineRecordRepository quarantines,
            EmployerRepository employers,
            ContributionPeriodRepository periods,
            DataSourceRepository sources,
            MemberRepository members,
            MemberService memberService,
            AppUserRepository users,
            AuditService audit,
            int chunkSize,
            EntityManager entityManager) {
        this(batches, records, quarantines, employers, periods, sources,
                members, memberService, users, audit, chunkSize);
        this.entityManager = entityManager;
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public PayrollImportResponse importJson(ImportPayrollBatchRequest request, Authentication auth) {
        List<RawRow> rawRows = new ArrayList<>(request.rows().size());
        for (int i = 0; i < request.rows().size(); i++) {
            ImportPayrollRowRequest r = request.rows().get(i);
            if (r == null) {
                rawRows.add(new RawRow(i + 1, null, null, null, null, null, null, false));
            } else {
                String rawPayStr = (r.eligibleGrossPay() != null) ? r.eligibleGrossPay().toPlainString() : null;
                rawRows.add(new RawRow(
                        i + 1,
                        r.memberRef(),
                        r.sourceMemberRef(),
                        r.sourceRowRef(),
                        r.eligibleGrossPay(),
                        rawPayStr,
                        r.payrollStatus(),
                        true));
            }
        }
        return executeImport(
                request.employerId(),
                request.periodId(),
                request.sourceId(),
                request.batchRef(),
                request.receivedAt(),
                request.supersedesBatchId(),
                rawRows,
                auth);
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public PayrollImportResponse importCsv(
            Long employerId,
            Long periodId,
            Long sourceId,
            String batchRef,
            OffsetDateTime receivedAt,
            Long supersedesBatchId,
            MultipartFile file,
            Authentication auth) {
        if (employerId == null || periodId == null || sourceId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "employerId, periodId and sourceId are required.");
        }
        if (batchRef == null || batchRef.isBlank() || batchRef.trim().length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "batchRef must be between 1 and 100 characters.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file must not be empty.");
        }
        List<PayrollCsvParser.RawCsvRow> csvRows;
        try {
            csvRows = PayrollCsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded CSV file.");
        }
        List<RawRow> rawRows = new ArrayList<>(csvRows.size());
        for (PayrollCsvParser.RawCsvRow c : csvRows) {
            rawRows.add(new RawRow(
                    c.rowNumber(),
                    c.memberRef(),
                    c.sourceMemberRef(),
                    c.sourceRowRef(),
                    null,
                    c.rawEligibleGrossPay(),
                    c.payrollStatus(),
                    false));
        }
        return executeImport(
                employerId, periodId, sourceId, batchRef, receivedAt, supersedesBatchId, rawRows, auth);
    }

    private PayrollImportResponse executeImport(
            Long employerId,
            Long periodId,
            Long sourceId,
            String rawBatchRef,
            OffsetDateTime receivedAt,
            Long supersedesBatchId,
            List<RawRow> rows,
            Authentication auth) {
        long startNanos = System.nanoTime();
        String batchRef = rawBatchRef.trim();
        AppUser actor = resolveActor(auth);

        Employer employer = employers.findById(employerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found."));
        ContributionPeriod period = periods.findById(periodId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribution period not found."));
        if (period.getStatus() == ContributionPeriodStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot import payroll batch into an ARCHIVED contribution period.");
        }
        DataSource source = sources.findById(sourceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Data source not found."));
        if (source.getStatus() == DataSourceStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot import payroll batch using an INACTIVE data source.");
        }

        PayrollBatch prior = null;
        int versionNo = 1;
        if (supersedesBatchId == null) {
            if (batches.existsBySourceSourceIdAndBatchRef(sourceId, batchRef)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Batch reference already exists for this data source. Supply supersedesBatchId to submit a correction version.");
            }
        } else {
            prior = batches.findById(supersedesBatchId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Target batch to supersede not found."));
            if (!prior.getEmployer().getEmployerId().equals(employerId)
                    || !prior.getPeriod().getPeriodId().equals(periodId)
                    || !prior.getSource().getSourceId().equals(sourceId)
                    || !prior.getBatchRef().equals(batchRef)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Superseding batch must share employer, contribution period, data source and batch reference.");
            }
            if (prior.getStatus() == PayrollBatchStatus.SUPERSEDED
                    || batches.existsBySupersedesBatchPayrollBatchId(prior.getPayrollBatchId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Target batch has already been superseded.");
            }
            Optional<PayrollBatch> latestForRef = batches
                    .findTopBySourceSourceIdAndBatchRefOrderByVersionNoDesc(sourceId, batchRef);
            if (latestForRef.isPresent()
                    && !latestForRef.get().getPayrollBatchId().equals(prior.getPayrollBatchId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Superseding batch must reference the latest version ("
                                + latestForRef.get().getVersionNo() + ") of this batch reference.");
            }
            versionNo = prior.getVersionNo() + 1;
        }

        PayrollBatch batch;
        try {
            batch = batches.save(new PayrollBatch(employer, period, source, batchRef, versionNo, receivedAt, prior));
            if (entityManager != null) {
                entityManager.flush();
            }
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Batch version conflicts with an existing batch for this source and batch reference.");
        }

        Map<String, Integer> firstRowByMemberRef = new HashMap<>();
        Set<String> seenSourceRowRefs = new HashSet<>();
        Map<String, Member> memberCache = new HashMap<>();

        long validCount = 0;
        long issueCount = 0;
        long quarantinedCount = 0;
        long duplicateRowCount = 0;
        int autoCreatedMembers = 0;
        List<PayrollQuarantineRecordResponse> quarantinePreview = new ArrayList<>();
        boolean previewTruncated = false;

        for (int start = 0; start < rows.size(); start += chunkSize) {
            int end = Math.min(start + chunkSize, rows.size());
            List<RawRow> chunk = rows.subList(start, end);

            List<ValidatedRow> evaluated = new ArrayList<>(chunk.size());
            Set<String> memberRefsToLookup = new LinkedHashSet<>();

            for (RawRow raw : chunk) {
                ValidatedRow v = validateRow(raw, firstRowByMemberRef, seenSourceRowRefs);
                evaluated.add(v);
                if (v.isValid() && !memberCache.containsKey(v.memberRef)) {
                    memberRefsToLookup.add(v.memberRef);
                }
            }

            if (!memberRefsToLookup.isEmpty()) {
                for (Member found : members.findByMemberRefIn(memberRefsToLookup)) {
                    memberCache.put(found.getMemberRef(), found);
                }
            }

            List<PayrollRecord> validToSave = new ArrayList<>();
            List<PayrollQuarantineRecord> quarantineToSave = new ArrayList<>();

            for (ValidatedRow v : evaluated) {
                if (!v.isValid()) {
                    QuarantineReasonCode code = (v.errors.size() == 1)
                            ? v.errors.get(0).code()
                            : QuarantineReasonCode.MULTIPLE_VALIDATION_ERRORS;
                    String detail = formatErrorDetails(v.errors);
                    PayrollQuarantineRecord q = new PayrollQuarantineRecord(
                            batch,
                            v.raw.rowNumber,
                            v.raw.sourceRowRef,
                            v.raw.memberRef,
                            v.raw.sourceMemberRef,
                            v.raw.rawEligibleGrossPay,
                            v.raw.payrollStatus,
                            code,
                            detail);
                    quarantineToSave.add(q);
                    quarantinedCount++;
                    if (v.hasDuplicateError()) {
                        duplicateRowCount++;
                    }
                    continue;
                }

                Member member = memberCache.get(v.memberRef);
                if (member == null) {
                    member = memberService.findOrCreateForImport(
                            v.memberRef, v.sourceMemberRef, actor);
                    memberCache.put(v.memberRef, member);
                    autoCreatedMembers++;
                }

                PayrollQualityStatus quality = (v.eligibleGrossPay == null)
                        ? PayrollQualityStatus.ISSUE
                        : PayrollQualityStatus.VALID;
                if (quality == PayrollQualityStatus.ISSUE) {
                    issueCount++;
                } else {
                    validCount++;
                }

                validToSave.add(new PayrollRecord(
                        batch,
                        member,
                        v.sourceRowRef,
                        v.eligibleGrossPay,
                        v.payrollStatus,
                        quality));
            }

            if (!validToSave.isEmpty()) {
                records.saveAll(validToSave);
            }
            if (!quarantineToSave.isEmpty()) {
                List<PayrollQuarantineRecord> savedQ = quarantines.saveAll(quarantineToSave);
                for (PayrollQuarantineRecord q : savedQ) {
                    if (quarantinePreview.size() < MAX_RESPONSE_QUARANTINE_PREVIEW) {
                        quarantinePreview.add(PayrollQuarantineRecordResponse.from(q));
                    } else {
                        previewTruncated = true;
                    }
                }
            }
            if (entityManager != null) {
                entityManager.flush();
                for (PayrollRecord rec : validToSave) {
                    entityManager.detach(rec);
                }
                for (PayrollQuarantineRecord q : quarantineToSave) {
                    entityManager.detach(q);
                }
            }
        }

        long storedCount = validCount + issueCount;
        List<Long> supersededBatchIds = new ArrayList<>();
        if (storedCount > 0) {
            batch.markValidated();
            if (prior != null) {
                List<PayrollBatch> priorActive = batches.findBySourceAndBatchRefWithStatusIn(
                        sourceId,
                        batchRef,
                        List.of(PayrollBatchStatus.VALIDATED, PayrollBatchStatus.RECEIVED));
                for (PayrollBatch p : priorActive) {
                    if (!p.getPayrollBatchId().equals(batch.getPayrollBatchId())) {
                        p.markSuperseded();
                        supersededBatchIds.add(p.getPayrollBatchId());
                    }
                }
            }
        } else {
            // Preserve rejected batch & quarantined rows without invalidating prior valid batch.
            batch.markRejected();
        }
        batches.save(batch);

        long processingTimeMs = Math.max(0L, (System.nanoTime() - startNanos) / 1_000_000L);

        for (Long supId : supersededBatchIds) {
            audit.record(actor, "PAYROLL_BATCH_SUPERSEDED", "PAYROLL_BATCH", supId.toString(),
                    "Payroll batch " + batchRef + " superseded by batchId=" + batch.getPayrollBatchId()
                            + " (version " + versionNo + ").");
        }

        String eventType = (batch.getStatus() == PayrollBatchStatus.REJECTED)
                ? "PAYROLL_BATCH_REJECTED"
                : "PAYROLL_BATCH_IMPORTED";
        audit.record(actor, eventType, "PAYROLL_BATCH", batch.getPayrollBatchId().toString(),
                "Payroll batch " + batchRef + " v" + versionNo + " for employer " + employer.getEmployerRef()
                        + " (" + period.getPeriodLabel() + "): valid=" + validCount
                        + ", missingPay=" + issueCount + ", quarantined=" + quarantinedCount
                        + ", duplicates=" + duplicateRowCount + ", processingTimeMs=" + processingTimeMs + ".");

        boolean isCurrent = isBatchCurrent(batch);
        PayrollBatchResponse batchDto = PayrollBatchResponse.from(
                batch, isCurrent, null, validCount, issueCount, 0L, quarantinedCount);

        return new PayrollImportResponse(
                batchDto,
                rows.size(),
                validCount,
                issueCount,
                quarantinedCount,
                duplicateRowCount,
                autoCreatedMembers,
                processingTimeMs,
                previewTruncated,
                quarantinePreview);
    }

    @Transactional(readOnly = true)
    public PageResponse<PayrollBatchResponse> listBatches(
            Long employerId,
            Long periodId,
            Long sourceId,
            String status,
            boolean currentOnly,
            String search,
            int page,
            int size) {
        PayrollBatchStatus statusFilter = parseOptionalBatchStatus(status);
        String term = (search == null) ? "" : search.trim().toLowerCase(Locale.ROOT);

        Specification<PayrollBatch> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (employerId != null) {
                predicates.add(cb.equal(root.get("employer").get("employerId"), employerId));
            }
            if (periodId != null) {
                predicates.add(cb.equal(root.get("period").get("periodId"), periodId));
            }
            if (sourceId != null) {
                predicates.add(cb.equal(root.get("source").get("sourceId"), sourceId));
            }
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }
            if (!term.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("batchRef")), "%" + escapeLike(term) + "%", '\\'));
            }
            if (currentOnly) {
                predicates.add(cb.not(root.get("status").in(
                        PayrollBatchStatus.SUPERSEDED, PayrollBatchStatus.REJECTED)));

                Subquery<Long> newerSub = query.subquery(Long.class);
                Root<PayrollBatch> b2 = newerSub.from(PayrollBatch.class);
                newerSub.select(b2.get("payrollBatchId"));
                newerSub.where(
                        cb.equal(b2.get("employer"), root.get("employer")),
                        cb.equal(b2.get("period"), root.get("period")),
                        cb.not(b2.get("status").in(
                                PayrollBatchStatus.SUPERSEDED, PayrollBatchStatus.REJECTED)),
                        cb.or(
                                cb.greaterThan(b2.get("receivedAt"), root.get("receivedAt")),
                                cb.and(
                                        cb.equal(b2.get("receivedAt"), root.get("receivedAt")),
                                        cb.greaterThan(b2.get("versionNo"), root.get("versionNo"))),
                                cb.and(
                                        cb.equal(b2.get("receivedAt"), root.get("receivedAt")),
                                        cb.equal(b2.get("versionNo"), root.get("versionNo")),
                                        cb.greaterThan(b2.get("payrollBatchId"), root.get("payrollBatchId")))
                        ));
                predicates.add(cb.not(cb.exists(newerSub)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("recordedAt"), Sort.Order.desc("payrollBatchId")));
        Page<PayrollBatch> result = batches.findAll(spec, pageable);
        return PageResponse.of(mapBatchPage(result));
    }

    @Transactional(readOnly = true)
    public PayrollBatchResponse getBatch(Long id) {
        PayrollBatch b = findBatch(id);
        return mapSingleBatch(b);
    }

    @Transactional(readOnly = true)
    public PayrollBatchResponse getCurrentBatch(Long employerId, Long periodId) {
        if (!employers.existsById(employerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found.");
        }
        if (!periods.existsById(periodId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribution period not found.");
        }
        List<PayrollBatch> candidates = batches.findCurrentCandidates(employerId, periodId, PageRequest.of(0, 1));
        if (candidates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No current payroll batch exists for this employer and period.");
        }
        return mapSingleBatch(candidates.get(0));
    }

    @Transactional(readOnly = true)
    public PageResponse<PayrollRecordResponse> listRecords(
            Long batchId,
            String dataQualityStatus,
            String payrollStatus,
            String search,
            int page,
            int size) {
        if (!batches.existsById(batchId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll batch not found.");
        }
        PayrollQualityStatus qualityFilter = parseOptionalQualityStatus(dataQualityStatus);
        PayrollRecordStatus payrollStatusFilter = parseOptionalRecordStatus(payrollStatus);
        String term = (search == null) ? "" : search.trim().toLowerCase(Locale.ROOT);

        Specification<PayrollRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("payrollBatch").get("payrollBatchId"), batchId));
            if (qualityFilter != null) {
                predicates.add(cb.equal(root.get("dataQualityStatus"), qualityFilter));
            }
            if (payrollStatusFilter != null) {
                predicates.add(cb.equal(root.get("payrollStatus"), payrollStatusFilter));
            }
            if (!term.isEmpty()) {
                String like = "%" + escapeLike(term) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("member").get("memberRef")), like, '\\'),
                        cb.like(cb.lower(root.get("member").get("sourceMemberRef")), like, '\\'),
                        cb.like(cb.lower(root.get("sourceRowRef")), like, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by("payrollRecordId").ascending());
        Page<PayrollRecord> result = records.findAll(spec, pageable);
        return PageResponse.of(result.map(PayrollRecordResponse::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<PayrollQuarantineRecordResponse> listQuarantinedRecords(
            Long batchId,
            String reasonCode,
            int page,
            int size) {
        if (!batches.existsById(batchId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll batch not found.");
        }
        QuarantineReasonCode reasonFilter = parseOptionalReasonCode(reasonCode);

        Specification<PayrollQuarantineRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("payrollBatch").get("payrollBatchId"), batchId));
            if (reasonFilter != null) {
                predicates.add(cb.equal(root.get("reasonCode"), reasonFilter));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by("rowNumber").ascending());
        Page<PayrollQuarantineRecord> result = quarantines.findAll(spec, pageable);
        return PageResponse.of(result.map(PayrollQuarantineRecordResponse::from));
    }

    private PayrollBatchResponse mapSingleBatch(PayrollBatch b) {
        List<Long> ids = List.of(b.getPayrollBatchId());
        Map<Long, EnumMap<PayrollQualityStatus, Long>> qCounts = loadRecordCounts(ids);
        Map<Long, Long> quarCounts = loadQuarantineCounts(ids);
        Map<Long, Long> supersededBy = loadSupersededByMap(ids);
        boolean current = isBatchCurrent(b);
        return toBatchResponse(b, current, supersededBy, qCounts, quarCounts);
    }

    private Page<PayrollBatchResponse> mapBatchPage(Page<PayrollBatch> page) {
        List<PayrollBatch> content = page.getContent();
        if (content.isEmpty()) {
            return page.map(b -> null);
        }
        List<Long> ids = content.stream().map(PayrollBatch::getPayrollBatchId).toList();
        Map<Long, EnumMap<PayrollQualityStatus, Long>> qCounts = loadRecordCounts(ids);
        Map<Long, Long> quarCounts = loadQuarantineCounts(ids);
        Map<Long, Long> supersededBy = loadSupersededByMap(ids);

        Map<String, Long> currentByContext = new HashMap<>();
        for (PayrollBatch b : content) {
            if (b.getStatus() == PayrollBatchStatus.SUPERSEDED || b.getStatus() == PayrollBatchStatus.REJECTED) {
                continue;
            }
            String key = b.getEmployer().getEmployerId() + ":" + b.getPeriod().getPeriodId();
            if (!currentByContext.containsKey(key)) {
                List<PayrollBatch> cand = batches.findCurrentCandidates(
                        b.getEmployer().getEmployerId(), b.getPeriod().getPeriodId(), PageRequest.of(0, 1));
                currentByContext.put(key, cand.isEmpty() ? -1L : cand.get(0).getPayrollBatchId());
            }
        }

        return page.map(b -> {
            String key = b.getEmployer().getEmployerId() + ":" + b.getPeriod().getPeriodId();
            boolean current = Objects.equals(currentByContext.get(key), b.getPayrollBatchId());
            return toBatchResponse(b, current, supersededBy, qCounts, quarCounts);
        });
    }

    private static PayrollBatchResponse toBatchResponse(
            PayrollBatch b,
            boolean current,
            Map<Long, Long> supersededBy,
            Map<Long, EnumMap<PayrollQualityStatus, Long>> qCounts,
            Map<Long, Long> quarCounts) {
        Long id = b.getPayrollBatchId();
        EnumMap<PayrollQualityStatus, Long> counts = qCounts.getOrDefault(id, new EnumMap<>(PayrollQualityStatus.class));
        long valid = counts.getOrDefault(PayrollQualityStatus.VALID, 0L);
        long issue = counts.getOrDefault(PayrollQualityStatus.ISSUE, 0L);
        long pending = counts.getOrDefault(PayrollQualityStatus.PENDING, 0L);
        long quar = quarCounts.getOrDefault(id, 0L);
        return PayrollBatchResponse.from(b, current, supersededBy.get(id), valid, issue, pending, quar);
    }

    private boolean isBatchCurrent(PayrollBatch b) {
        if (b.getStatus() == PayrollBatchStatus.SUPERSEDED || b.getStatus() == PayrollBatchStatus.REJECTED) {
            return false;
        }
        List<PayrollBatch> cand = batches.findCurrentCandidates(
                b.getEmployer().getEmployerId(), b.getPeriod().getPeriodId(), PageRequest.of(0, 1));
        return !cand.isEmpty() && cand.get(0).getPayrollBatchId().equals(b.getPayrollBatchId());
    }

    private Map<Long, EnumMap<PayrollQualityStatus, Long>> loadRecordCounts(List<Long> batchIds) {
        Map<Long, EnumMap<PayrollQualityStatus, Long>> map = new HashMap<>();
        for (Object[] row : records.countByBatchIdsAndQualityStatus(batchIds)) {
            Long batchId = (Long) row[0];
            PayrollQualityStatus status = (PayrollQualityStatus) row[1];
            Long count = ((Number) row[2]).longValue();
            map.computeIfAbsent(batchId, k -> new EnumMap<>(PayrollQualityStatus.class)).put(status, count);
        }
        return map;
    }

    private Map<Long, Long> loadQuarantineCounts(List<Long> batchIds) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : quarantines.countByBatchIds(batchIds)) {
            map.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private Map<Long, Long> loadSupersededByMap(List<Long> batchIds) {
        Map<Long, Long> map = new HashMap<>();
        for (PayrollBatch child : batches.findBySupersedesBatchPayrollBatchIdIn(batchIds)) {
            if (child.getSupersedesBatch() != null) {
                map.putIfAbsent(child.getSupersedesBatch().getPayrollBatchId(), child.getPayrollBatchId());
            }
        }
        return map;
    }

    private ValidatedRow validateRow(
            RawRow raw,
            Map<String, Integer> firstRowByMemberRef,
            Set<String> seenSourceRowRefs) {
        List<RowError> errors = new ArrayList<>();

        String memberRef = trimToNull(raw.memberRef);
        if (memberRef == null) {
            errors.add(new RowError(QuarantineReasonCode.MISSING_MEMBER_REF,
                    "Member reference is missing or blank."));
        } else if (memberRef.length() > 50) {
            errors.add(new RowError(QuarantineReasonCode.INVALID_MEMBER_REF,
                    "Member reference exceeds maximum length of 50 characters."));
        } else {
            Integer existingRow = firstRowByMemberRef.putIfAbsent(memberRef, raw.rowNumber);
            if (existingRow != null) {
                errors.add(new RowError(QuarantineReasonCode.DUPLICATE_MEMBER_IN_BATCH,
                        "Duplicate member reference '" + memberRef + "' within batch (first seen at row " + existingRow + ")."));
            }
        }

        String sourceRowRef = trimToNull(raw.sourceRowRef);
        if (sourceRowRef != null) {
            if (sourceRowRef.length() > 100) {
                errors.add(new RowError(QuarantineReasonCode.INVALID_SOURCE_ROW_REF,
                        "Source row reference exceeds maximum length of 100 characters."));
            } else if (!seenSourceRowRefs.add(sourceRowRef)) {
                errors.add(new RowError(QuarantineReasonCode.DUPLICATE_SOURCE_ROW_REF,
                        "Duplicate source row reference '" + sourceRowRef + "' within batch."));
            }
        }

        BigDecimal parsedPay = null;
        if (raw.fromJson) {
            parsedPay = validateDecimalPay(raw.jsonPay, raw.rawEligibleGrossPay, errors);
        } else {
            String rawPayTrimmed = trimToNull(raw.rawEligibleGrossPay);
            if (rawPayTrimmed != null) {
                try {
                    BigDecimal candidate = new BigDecimal(rawPayTrimmed);
                    parsedPay = validateDecimalPay(candidate, rawPayTrimmed, errors);
                } catch (NumberFormatException e) {
                    errors.add(new RowError(QuarantineReasonCode.INVALID_PAY_FORMAT,
                            "Eligible gross pay '" + rawPayTrimmed + "' is not a valid decimal number."));
                }
            }
        }

        PayrollRecordStatus parsedStatus = PayrollRecordStatus.ACTIVE;
        String statusTrimmed = trimToNull(raw.payrollStatus);
        if (statusTrimmed != null) {
            try {
                parsedStatus = PayrollRecordStatus.valueOf(statusTrimmed.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                errors.add(new RowError(QuarantineReasonCode.INVALID_PAYROLL_STATUS,
                        "Unknown payroll status '" + statusTrimmed + "'."));
            }
        }

        String sourceMemberRef = trimToNull(raw.sourceMemberRef);
        if (sourceMemberRef != null && sourceMemberRef.length() > 100) {
            sourceMemberRef = sourceMemberRef.substring(0, 100);
        }

        return new ValidatedRow(raw, memberRef, sourceMemberRef, sourceRowRef, parsedPay, parsedStatus, errors);
    }

    private static BigDecimal validateDecimalPay(BigDecimal pay, String rawDisplay, List<RowError> errors) {
        if (pay == null) {
            return null;
        }
        if (pay.compareTo(BigDecimal.ZERO) < 0) {
            errors.add(new RowError(QuarantineReasonCode.NEGATIVE_GROSS_PAY,
                    "Eligible gross pay (" + rawDisplay + ") cannot be negative."));
            return null;
        }
        try {
            BigDecimal scaled = pay.setScale(2, RoundingMode.UNNECESSARY);
            if (scaled.compareTo(MAX_GROSS_PAY) > 0) {
                errors.add(new RowError(QuarantineReasonCode.INVALID_PAY_FORMAT,
                        "Eligible gross pay (" + rawDisplay + ") exceeds NUMERIC(15,2) maximum."));
                return null;
            }
            return scaled;
        } catch (ArithmeticException e) {
            errors.add(new RowError(QuarantineReasonCode.INVALID_PAY_FORMAT,
                    "Eligible gross pay (" + rawDisplay + ") exceeds 2 decimal places."));
            return null;
        }
    }

    private static String formatErrorDetails(List<RowError> errors) {
        if (errors.size() == 1) {
            return errors.get(0).detail();
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < errors.size(); i++) {
            if (i > 0) sb.append(" ");
            sb.append('[').append(errors.get(i).code().name()).append("] ").append(errors.get(i).detail());
        }
        return sb.toString();
    }

    private PayrollBatch findBatch(Long id) {
        return batches.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll batch not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    private static PayrollBatchStatus parseOptionalBatchStatus(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return PayrollBatchStatus.valueOf(s.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payroll batch status.");
        }
    }

    private static PayrollQualityStatus parseOptionalQualityStatus(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return PayrollQualityStatus.valueOf(s.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown data quality status.");
        }
    }

    private static PayrollRecordStatus parseOptionalRecordStatus(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return PayrollRecordStatus.valueOf(s.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payroll record status.");
        }
    }

    private static QuarantineReasonCode parseOptionalReasonCode(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return QuarantineReasonCode.valueOf(s.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown quarantine reason code.");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private record RawRow(
            int rowNumber,
            String memberRef,
            String sourceMemberRef,
            String sourceRowRef,
            BigDecimal jsonPay,
            String rawEligibleGrossPay,
            String payrollStatus,
            boolean fromJson) {}

    private record RowError(QuarantineReasonCode code, String detail) {}

    private record ValidatedRow(
            RawRow raw,
            String memberRef,
            String sourceMemberRef,
            String sourceRowRef,
            BigDecimal eligibleGrossPay,
            PayrollRecordStatus payrollStatus,
            List<RowError> errors) {

        boolean isValid() { return errors.isEmpty(); }

        boolean hasDuplicateError() {
            return errors.stream().anyMatch(e ->
                    e.code() == QuarantineReasonCode.DUPLICATE_MEMBER_IN_BATCH
                            || e.code() == QuarantineReasonCode.DUPLICATE_SOURCE_ROW_REF);
        }
    }
}