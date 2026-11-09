package com.edward.pensioncompliance.employer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.employer.dto.CreateEmployerRequest;
import com.edward.pensioncompliance.employer.dto.EmployerResponse;
import com.edward.pensioncompliance.employer.dto.UpdateEmployerRequest;
import com.edward.pensioncompliance.employer.entity.Employer;
import com.edward.pensioncompliance.employer.repository.EmployerRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class EmployerServiceTest {

    private final EmployerRepository employers = mock(EmployerRepository.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final Authentication auth = mock(Authentication.class);
    private final AppUser actor = mock(AppUser.class);
    private final EmployerService service = new EmployerService(employers, users, audit);

    @BeforeEach
    void actorIsResolvable() {
        when(auth.getName()).thenReturn("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(actor));
    }

    private static Employer existing(long id, String ref, String legal, String trading) {
        Employer e = new Employer(ref, legal, trading);
        ReflectionTestUtils.setField(e, "employerId", id);
        return e;
    }

    private static void assertStatus(Throwable t, HttpStatus expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(expected.value()));
    }

    @Test
    void create_savesTrimmedValuesAndAudits() {
        when(employers.existsByEmployerRef("EMP-001")).thenReturn(false);
        when(employers.save(any(Employer.class))).thenAnswer(inv -> {
            Employer e = inv.getArgument(0);
            ReflectionTestUtils.setField(e, "employerId", 7L);
            return e;
        });

        EmployerResponse r = service.create(
                new CreateEmployerRequest(" EMP-001 ", " Acme Ltd ", null), auth);

        assertThat(r.employerRef()).isEqualTo("EMP-001");
        assertThat(r.legalName()).isEqualTo("Acme Ltd");
        assertThat(r.status()).isEqualTo("ACTIVE");
        verify(audit).record(eq(actor), eq("EMPLOYER_CREATED"), eq("EMPLOYER"), eq("7"), any());
    }

    @Test
    void create_duplicateReference_isConflict_andNothingIsSavedOrAudited() {
        when(employers.existsByEmployerRef("EMP-001")).thenReturn(true);

        assertThatThrownBy(() -> service.create(new CreateEmployerRequest("EMP-001", "Acme", null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(employers, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void create_losingTheRaceOnTheUniqueConstraint_isStillConflict() {
        when(employers.existsByEmployerRef("EMP-001")).thenReturn(false);
        when(employers.save(any(Employer.class))).thenThrow(new DataIntegrityViolationException("uq_employer_ref"));

        assertThatThrownBy(() -> service.create(new CreateEmployerRequest("EMP-001", "Acme", null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void get_unknownId_isNotFound() {
        when(employers.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(99L)).satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));
    }

    @Test
    void update_changesOnlyProvidedFields_andAuditsWhatChanged() {
        Employer e = existing(1L, "EMP-001", "Old Name", "Old Trade");
        when(employers.findById(1L)).thenReturn(Optional.of(e));

        EmployerResponse r = service.update(1L, new UpdateEmployerRequest("New Name", null, "SUSPENDED"), auth);

        assertThat(r.legalName()).isEqualTo("New Name");
        assertThat(r.tradingName()).isEqualTo("Old Trade");
        assertThat(r.status()).isEqualTo("SUSPENDED");

        ArgumentCaptor<String> summary = ArgumentCaptor.forClass(String.class);
        verify(audit).record(eq(actor), eq("EMPLOYER_UPDATED"), eq("EMPLOYER"), eq("1"), summary.capture());
        assertThat(summary.getValue()).contains("legalName").contains("status").doesNotContain("tradingName");
    }

    @Test
    void update_withNoRealChange_writesNoAuditRecord() {
        Employer e = existing(1L, "EMP-001", "Same Name", null);
        when(employers.findById(1L)).thenReturn(Optional.of(e));

        service.update(1L, new UpdateEmployerRequest("Same Name", null, "ACTIVE"), auth);

        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void update_blankTradingName_clearsIt() {
        Employer e = existing(1L, "EMP-001", "Acme", "Old Trade");
        when(employers.findById(1L)).thenReturn(Optional.of(e));

        EmployerResponse r = service.update(1L, new UpdateEmployerRequest(null, "   ", null), auth);

        assertThat(r.tradingName()).isNull();
    }

    @Test
    void list_capsThePageSizeAtOneHundred() {
        when(employers.findAll(ArgumentMatchers.<Specification<Employer>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.list(null, null, 0, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(employers).findAll(ArgumentMatchers.<Specification<Employer>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void list_unknownStatusFilter_isBadRequest() {
        assertThatThrownBy(() -> service.list(null, "BANANA", 0, 20))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));
    }
}