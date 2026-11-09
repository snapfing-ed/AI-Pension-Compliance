package com.edward.pensioncompliance.payroll.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.datasource.entity.DataSource;
import com.edward.pensioncompliance.datasource.entity.DataSourceStatus;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.member.entity.Member;
import com.edward.pensioncompliance.member.entity.MemberStatus;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

class PayrollBatchServiceTest {

    private final PayrollBatchRepository batches = mock(PayrollBatchRepository.class);
    private final PayrollRecordRepository records = mock(PayrollRecordRepository.class);
    private final PayrollQuarantineRecordRepository quarantines = mock(PayrollQuarantineRecordRepository.class);
    private final EmployerRepository employers = mock(EmployerRepository.class);
    private final ContributionPeriodRepository periods = mock(ContributionPeriodRepository.class);
    private final DataSourceRepository sources = mock(DataSourceRepository.class);
    private final MemberRepository members = mock(MemberRepository.class);
    private final MemberService memberService = mock(MemberService.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final Authentication auth = mock(Authentication.class);
    private final AppUser actor = mock(AppUser.class);

    // Chunk size of 2 verifies multi-chunk flushing, caching, and detaching.
    private final PayrollBatchService service = new PayrollBatchService(
            batches, records, quarantines, employers, periods, sources,
            members, memberService, users, audit, 2, entityManager);

    private Employer employer;
    private ContributionPeriod openPeriod;
    private DataSource activeSource;

    @BeforeEach
    void setup() {
        when(auth.getName()).thenReturn("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(actor));

        employer = new Employer("EMP-100", "Zambia Copper Holdings", "ZCH");
        ReflectionTestUtils.setField(employer, "employerId", 10L);

        openPeriod = new ContributionPeriod(2026, 10);
        ReflectionTestUtils.setField(openPeriod, "periodId", 20L);

        activeSource = new DataSource("Synthetic Generator", "SYNTHETIC", "Team", "AUTH-1",
                "Testing", OffsetDateTime.now(ZoneOffset.UTC), null);
        ReflectionTestUtils.setField(activeSource, "sourceId", 30L);

        when(employers.findById(10L)).thenReturn(Optional.of(employer));
        when(employers.existsById(10L)).thenReturn(true);
        when(periods.findById(20L)).thenReturn(Optional.of(openPeriod));
        when(periods.existsById(20L)).thenReturn(true);
        when(sources.findById(30L)).thenReturn(Optional.of(activeSource));

        AtomicLong batchSeq = new AtomicLong(100L);
        when(batches.save(any(PayrollBatch.class))).thenAnswer(inv -> {
            PayrollBatch b = inv.getArgument(0);
            if (b.getPayrollBatchId() == null) {
                ReflectionTestUtils.setField(b, "payrollBatchId", batchSeq.getAndIncrement());
            }
            return b;
        });

        AtomicLong recordSeq = new AtomicLong(1000L);
        when(records.saveAll(anyList())).thenAnswer(inv -> {
            List<PayrollRecord> list = inv.getArgument(0);
            for (PayrollRecord r : list) {
                if (r.getPayrollRecordId() == null) {
                    ReflectionTestUtils.setField(r, "payrollRecordId", recordSeq.getAndIncrement());
                }
            }
            return list;
        });

        AtomicLong quarSeq = new AtomicLong(5000L);
        when(quarantines.saveAll(anyList())).thenAnswer(inv -> {
            List<PayrollQuarantineRecord> list = inv.getArgument(0);
            for (PayrollQuarantineRecord q : list) {
                if (q.getQuarantineRecordId() == null) {
                    ReflectionTestUtils.setField(q, "quarantineRecordId", quarSeq.getAndIncrement());
                }
            }
            return list;
        });

        when(batches.findCurrentCandidates(eq(10L), eq(20L), any(Pageable.class)))
                .thenReturn(List.of());
    }

    private static void assertStatus(Throwable t, HttpStatus expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(expected.value()));
    }

    @Test
    void importJson_mixedValidZeroNullAndInvalidRows_chunksPersistsQuarantinesAndAudits() {
        Member existingM1 = new Member("MBR-001", "SRC-1", MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(existingM1, "memberId", 1L);
        Member createdM2 = new Member("MBR-002", "SRC-2", MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(createdM2, "memberId", 2L);
        Member createdM3 = new Member("MBR-003", "SRC-3", MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(createdM3, "memberId", 3L);

        when(members.findByMemberRefIn(any())).thenAnswer(inv -> {
            java.util.Collection<String> refs = inv.getArgument(0);
            return refs.contains("MBR-001") ? List.of(existingM1) : List.of();
        });
        when(memberService.findOrCreateForImport(eq("MBR-002"), eq("SRC-2"), eq(actor))).thenReturn(createdM2);
        when(memberService.findOrCreateForImport(eq("MBR-003"), eq("SRC-3"), eq(actor))).thenReturn(createdM3);

        List<ImportPayrollRowRequest> rows = List.of(
                new ImportPayrollRowRequest("MBR-001", "SRC-1", "R-1", new BigDecimal("20000"), "ACTIVE"),
                new ImportPayrollRowRequest("MBR-002", "SRC-2", "R-2", new BigDecimal("0.00"), "ACTIVE"),
                new ImportPayrollRowRequest("MBR-003", "SRC-3", "R-3", null, "ACTIVE"),
                new ImportPayrollRowRequest("   ", "SRC-X", "R-4", new BigDecimal("5000.00"), "ACTIVE"),
                new ImportPayrollRowRequest("MBR-NEG", "SRC-N", "R-5", new BigDecimal("-150.00"), "ACTIVE"),
                new ImportPayrollRowRequest("MBR-001", "SRC-1", "R-6", new BigDecimal("20000.00"), "ACTIVE"),
                new ImportPayrollRowRequest("MBR-DEC", "SRC-D", "R-7", new BigDecimal("100.125"), "ACTIVE")
        );

        PayrollImportResponse res = service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, " BATCH-2026-10 ", null, null, rows),
                auth);

        assertThat(res.batch().batchRef()).isEqualTo("BATCH-2026-10");
        assertThat(res.batch().versionNo()).isEqualTo(1);
        assertThat(res.batch().status()).isEqualTo("VALIDATED");
        assertThat(res.totalRowsEvaluated()).isEqualTo(7);
        assertThat(res.validRecordCount()).isEqualTo(2);
        assertThat(res.missingPayRecordCount()).isEqualTo(1);
        assertThat(res.quarantinedRecordCount()).isEqualTo(4);
        assertThat(res.duplicateRowCount()).isEqualTo(1);
        assertThat(res.autoCreatedMemberCount()).isEqualTo(2);
        assertThat(res.processingTimeMs()).isGreaterThanOrEqualTo(0L);

        // Verify valid vs null vs zero records stored without altering null to zero.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PayrollRecord>> recCaptor = ArgumentCaptor.forClass(List.class);
        verify(records, atLeast(1)).saveAll(recCaptor.capture());
        List<PayrollRecord> allStored = new ArrayList<>();
        recCaptor.getAllValues().forEach(allStored::addAll);
        assertThat(allStored).hasSize(3);
        assertThat(allStored.get(0).getEligibleGrossPay()).isEqualByComparingTo("20000.00");
        assertThat(allStored.get(0).getDataQualityStatus()).isEqualTo(PayrollQualityStatus.VALID);
        assertThat(allStored.get(1).getEligibleGrossPay()).isEqualByComparingTo("0.00");
        assertThat(allStored.get(1).getDataQualityStatus()).isEqualTo(PayrollQualityStatus.VALID);
        assertThat(allStored.get(2).getEligibleGrossPay()).isNull();
        assertThat(allStored.get(2).getDataQualityStatus()).isEqualTo(PayrollQualityStatus.ISSUE);

        // Verify quarantine reasons and no spurious member created for quarantined rows.
        assertThat(res.quarantinedRows()).extracting(PayrollQuarantineRecordResponse::reasonCode)
                .containsExactly(
                        "MISSING_MEMBER_REF",
                        "NEGATIVE_GROSS_PAY",
                        "DUPLICATE_MEMBER_IN_BATCH",
                        "INVALID_PAY_FORMAT");
        assertThat(res.quarantinedRows().get(1).rawEligibleGrossPay()).isEqualTo("-150.00");
        verify(memberService, never()).findOrCreateForImport(eq("MBR-NEG"), any(), any());

        // 7 rows with chunk size 2 = 4 chunks + initial batch save flush.
        verify(entityManager, times(5)).flush();
        verify(entityManager, times(3)).detach(any(PayrollRecord.class));
        verify(entityManager, times(4)).detach(any(PayrollQuarantineRecord.class));
        verify(audit).record(eq(actor), eq("PAYROLL_BATCH_IMPORTED"), eq("PAYROLL_BATCH"), eq("100"), any());
    }

    @Test
    void importJson_allInvalidRows_marksBatchRejectedAndAudits() {
        List<ImportPayrollRowRequest> rows = List.of(
                new ImportPayrollRowRequest("", null, null, new BigDecimal("1000"), null),
                new ImportPayrollRowRequest("MBR-NEG", null, null, new BigDecimal("-1.00"), null)
        );

        PayrollImportResponse res = service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, "BATCH-BAD", null, null, rows),
                auth);

        assertThat(res.batch().status()).isEqualTo("REJECTED");
        assertThat(res.batch().current()).isFalse();
        assertThat(res.validRecordCount()).isZero();
        assertThat(res.quarantinedRecordCount()).isEqualTo(2);
        verify(records, never()).saveAll(anyList());
        verify(audit).record(eq(actor), eq("PAYROLL_BATCH_REJECTED"), eq("PAYROLL_BATCH"), eq("100"), any());
    }

    @Test
    void importJson_supersession_incrementsVersionMarksPriorSupersededInOneTransaction() {
        PayrollBatch v1 = new PayrollBatch(employer, openPeriod, activeSource, "BATCH-SUP", 1, null, null);
        v1.markValidated();
        ReflectionTestUtils.setField(v1, "payrollBatchId", 50L);

        when(batches.findById(50L)).thenReturn(Optional.of(v1));
        when(batches.existsBySupersedesBatchPayrollBatchId(50L)).thenReturn(false);
        when(batches.findTopBySourceSourceIdAndBatchRefOrderByVersionNoDesc(30L, "BATCH-SUP"))
                .thenReturn(Optional.of(v1));
        when(batches.findBySourceAndBatchRefWithStatusIn(eq(30L), eq("BATCH-SUP"), any()))
                .thenReturn(List.of(v1));

        Member m1 = new Member("MBR-001", null, MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(m1, "memberId", 1L);
        when(members.findByMemberRefIn(any())).thenReturn(List.of(m1));

        PayrollImportResponse res = service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, "BATCH-SUP", null, 50L,
                        List.of(new ImportPayrollRowRequest("MBR-001", null, "R-1", new BigDecimal("25000.00"), null))),
                auth);

        assertThat(v1.getStatus()).isEqualTo(PayrollBatchStatus.SUPERSEDED);
        assertThat(res.batch().versionNo()).isEqualTo(2);
        assertThat(res.batch().status()).isEqualTo("VALIDATED");
        assertThat(res.batch().supersedesBatchId()).isEqualTo(50L);
        verify(audit).record(eq(actor), eq("PAYROLL_BATCH_SUPERSEDED"), eq("PAYROLL_BATCH"), eq("50"), any());
        verify(audit).record(eq(actor), eq("PAYROLL_BATCH_IMPORTED"), eq("PAYROLL_BATCH"), eq("100"), any());
    }

    @Test
    void importJson_supersedingBatchMismatchContextOrAlreadySuperseded_isConflict() {
        Employer otherEmp = new Employer("EMP-999", "Other Co", null);
        ReflectionTestUtils.setField(otherEmp, "employerId", 99L);

        PayrollBatch wrongEmployerBatch = new PayrollBatch(
                otherEmp, openPeriod, activeSource, "BATCH-X", 1, null, null);
        wrongEmployerBatch.markValidated();
        ReflectionTestUtils.setField(wrongEmployerBatch, "payrollBatchId", 60L);
        when(batches.findById(60L)).thenReturn(Optional.of(wrongEmployerBatch));

        assertThatThrownBy(() -> service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, "BATCH-X", null, 60L,
                        List.of(new ImportPayrollRowRequest("MBR-1", null, null, BigDecimal.TEN, null))),
                auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        PayrollBatch alreadySuperseded = new PayrollBatch(
                employer, openPeriod, activeSource, "BATCH-Y", 1, null, null);
        alreadySuperseded.markSuperseded();
        ReflectionTestUtils.setField(alreadySuperseded, "payrollBatchId", 61L);
        when(batches.findById(61L)).thenReturn(Optional.of(alreadySuperseded));

        assertThatThrownBy(() -> service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, "BATCH-Y", null, 61L,
                        List.of(new ImportPayrollRowRequest("MBR-1", null, null, BigDecimal.TEN, null))),
                auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));
    }

    @Test
    void importJson_archivedPeriodOrInactiveSource_isConflict() {
        openPeriod.transitionTo(ContributionPeriodStatus.CLOSED);
        openPeriod.transitionTo(ContributionPeriodStatus.ARCHIVED);

        assertThatThrownBy(() -> service.importJson(
                new ImportPayrollBatchRequest(10L, 20L, 30L, "B-ARCH", null, null,
                        List.of(new ImportPayrollRowRequest("MBR-1", null, null, BigDecimal.TEN, null))),
                auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        ContributionPeriod closedPeriod = new ContributionPeriod(2026, 9);
        closedPeriod.transitionTo(ContributionPeriodStatus.CLOSED);
        ReflectionTestUtils.setField(closedPeriod, "periodId", 21L);
        when(periods.findById(21L)).thenReturn(Optional.of(closedPeriod));

        ReflectionTestUtils.setField(activeSource, "status", DataSourceStatus.INACTIVE);

        assertThatThrownBy(() -> service.importJson(
                new ImportPayrollBatchRequest(10L, 21L, 30L, "B-INACT", null, null,
                        List.of(new ImportPayrollRowRequest("MBR-1", null, null, BigDecimal.TEN, null))),
                auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));
    }

    @Test
    void importCsv_handlesNullPayBadNumberAndValidRows() {
        String csv = "member_ref,eligible_gross_pay,payroll_status\n"
                + "MBR-001,15000.00,ACTIVE\n"
                + "MBR-002,,ACTIVE\n"
                + "MBR-003,not-a-number,ACTIVE\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "payroll.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        Member m1 = new Member("MBR-001", null, MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(m1, "memberId", 1L);
        Member m2 = new Member("MBR-002", null, MemberStatus.ACTIVE);
        ReflectionTestUtils.setField(m2, "memberId", 2L);
        when(members.findByMemberRefIn(any())).thenReturn(List.of(m1, m2));

        PayrollImportResponse res = service.importCsv(
                10L, 20L, 30L, "CSV-BATCH-1", null, null, file, auth);

        assertThat(res.validRecordCount()).isEqualTo(1);
        assertThat(res.missingPayRecordCount()).isEqualTo(1);
        assertThat(res.quarantinedRecordCount()).isEqualTo(1);
        assertThat(res.quarantinedRows().get(0).reasonCode()).isEqualTo("INVALID_PAY_FORMAT");
    }

    @Test
    void listAndGet_enforcePaginationCapAndFilterValidation() {
        when(batches.findAll(ArgumentMatchers.<Specification<PayrollBatch>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.listBatches(10L, 20L, 30L, "VALIDATED", true, "b", 0, 500);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(batches).findAll(ArgumentMatchers.<Specification<PayrollBatch>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);

        assertThatThrownBy(() -> service.listBatches(null, null, null, "BOGUS", false, null, 0, 20))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));

        assertThatThrownBy(() -> service.getBatch(999L))
                .satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> service.getCurrentBatch(10L, 20L))
                .satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));
    }
}