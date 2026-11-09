package com.edward.pensioncompliance.period.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.period.dto.ContributionPeriodResponse;
import com.edward.pensioncompliance.period.dto.CreateContributionPeriodRequest;
import com.edward.pensioncompliance.period.dto.UpdateContributionPeriodStatusRequest;
import com.edward.pensioncompliance.period.entity.ContributionPeriod;
import com.edward.pensioncompliance.period.entity.ContributionPeriodStatus;
import com.edward.pensioncompliance.period.repository.ContributionPeriodRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

class ContributionPeriodServiceTest {

    private final ContributionPeriodRepository periods = mock(ContributionPeriodRepository.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final Authentication auth = mock(Authentication.class);
    private final AppUser actor = mock(AppUser.class);

    private final ContributionPeriodService service =
            new ContributionPeriodService(periods, users, audit);

    @BeforeEach
    void actorIsResolvable() {
        when(auth.getName()).thenReturn("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(actor));
    }

    private static ContributionPeriod existing(long id, int year, int month, ContributionPeriodStatus status) {
        ContributionPeriod p = new ContributionPeriod(year, month);
        ReflectionTestUtils.setField(p, "periodId", id);
        if (status == ContributionPeriodStatus.CLOSED) {
            p.transitionTo(ContributionPeriodStatus.CLOSED);
        } else if (status == ContributionPeriodStatus.ARCHIVED) {
            p.transitionTo(ContributionPeriodStatus.CLOSED);
            p.transitionTo(ContributionPeriodStatus.ARCHIVED);
        }
        return p;
    }

    private static void assertStatus(Throwable t, HttpStatus expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(expected.value()));
    }

    @Test
    void create_leapYearFebruary_derivesDatesAndLabel_startsOpen_andAudits() {
        when(periods.existsByPeriodYearAndPeriodMonth((short) 2024, (short) 2)).thenReturn(false);
        when(periods.save(any(ContributionPeriod.class))).thenAnswer(inv -> {
            ContributionPeriod p = inv.getArgument(0);
            ReflectionTestUtils.setField(p, "periodId", 10L);
            return p;
        });

        ContributionPeriodResponse r = service.create(new CreateContributionPeriodRequest(2024, 2), auth);

        assertThat(r.periodId()).isEqualTo(10L);
        assertThat(r.periodYear()).isEqualTo(2024);
        assertThat(r.periodMonth()).isEqualTo(2);
        assertThat(r.periodStart()).isEqualTo(LocalDate.of(2024, 2, 1));
        assertThat(r.periodEnd()).isEqualTo(LocalDate.of(2024, 2, 29));
        assertThat(r.periodLabel()).isEqualTo("February 2024");
        assertThat(r.status()).isEqualTo("OPEN");
        verify(audit).record(eq(actor), eq("CONTRIBUTION_PERIOD_CREATED"),
                eq("CONTRIBUTION_PERIOD"), eq("10"), any());
    }

    @Test
    void create_nonLeapFebruary_endsOnTwentyEighth() {
        when(periods.existsByPeriodYearAndPeriodMonth((short) 2026, (short) 2)).thenReturn(false);
        when(periods.save(any(ContributionPeriod.class))).thenAnswer(inv -> {
            ContributionPeriod p = inv.getArgument(0);
            ReflectionTestUtils.setField(p, "periodId", 11L);
            return p;
        });

        ContributionPeriodResponse r = service.create(new CreateContributionPeriodRequest(2026, 2), auth);

        assertThat(r.periodStart()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(r.periodEnd()).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(r.periodLabel()).isEqualTo("February 2026");
    }

    @Test
    void create_duplicateYearAndMonth_isConflict_andNothingIsSavedOrAudited() {
        when(periods.existsByPeriodYearAndPeriodMonth((short) 2026, (short) 3)).thenReturn(true);

        assertThatThrownBy(() -> service.create(new CreateContributionPeriodRequest(2026, 3), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(periods, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void create_raceOnUniqueConstraint_isStillConflict() {
        when(periods.existsByPeriodYearAndPeriodMonth((short) 2026, (short) 4)).thenReturn(false);
        when(periods.save(any(ContributionPeriod.class)))
                .thenThrow(new DataIntegrityViolationException("uq_contribution_period_year_month"));

        assertThatThrownBy(() -> service.create(new CreateContributionPeriodRequest(2026, 4), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void updateStatus_openToClosed_succeedsAndAudits() {
        ContributionPeriod p = existing(1L, 2026, 1, ContributionPeriodStatus.OPEN);
        when(periods.findById(1L)).thenReturn(Optional.of(p));

        ContributionPeriodResponse r = service.updateStatus(
                1L, new UpdateContributionPeriodStatusRequest(" closed "), auth);

        assertThat(r.status()).isEqualTo("CLOSED");
        verify(audit).record(eq(actor), eq("CONTRIBUTION_PERIOD_STATUS_CHANGED"),
                eq("CONTRIBUTION_PERIOD"), eq("1"), any());
    }

    @Test
    void updateStatus_closedToArchived_succeedsAndAudits() {
        ContributionPeriod p = existing(2L, 2026, 1, ContributionPeriodStatus.CLOSED);
        when(periods.findById(2L)).thenReturn(Optional.of(p));

        ContributionPeriodResponse r = service.updateStatus(
                2L, new UpdateContributionPeriodStatusRequest("ARCHIVED"), auth);

        assertThat(r.status()).isEqualTo("ARCHIVED");
        verify(audit).record(eq(actor), eq("CONTRIBUTION_PERIOD_STATUS_CHANGED"),
                eq("CONTRIBUTION_PERIOD"), eq("2"), any());
    }

    @Test
    void updateStatus_openToArchived_isConflict_andWritesNoAudit() {
        ContributionPeriod p = existing(3L, 2026, 1, ContributionPeriodStatus.OPEN);
        when(periods.findById(3L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.updateStatus(
                3L, new UpdateContributionPeriodStatusRequest("ARCHIVED"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        assertThat(p.getStatus()).isEqualTo(ContributionPeriodStatus.OPEN);
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void updateStatus_closedToOpen_isConflict_andWritesNoAudit() {
        ContributionPeriod p = existing(4L, 2026, 1, ContributionPeriodStatus.CLOSED);
        when(periods.findById(4L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.updateStatus(
                4L, new UpdateContributionPeriodStatusRequest("OPEN"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void updateStatus_archivedToClosedOrOpen_isConflict() {
        ContributionPeriod p = existing(5L, 2026, 1, ContributionPeriodStatus.ARCHIVED);
        when(periods.findById(5L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.updateStatus(
                5L, new UpdateContributionPeriodStatusRequest("CLOSED"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));
        assertThatThrownBy(() -> service.updateStatus(
                5L, new UpdateContributionPeriodStatusRequest("OPEN"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void updateStatus_sameStatus_writesNoAuditRecord() {
        ContributionPeriod p = existing(6L, 2026, 1, ContributionPeriodStatus.OPEN);
        when(periods.findById(6L)).thenReturn(Optional.of(p));

        ContributionPeriodResponse r = service.updateStatus(
                6L, new UpdateContributionPeriodStatusRequest("OPEN"), auth);

        assertThat(r.status()).isEqualTo("OPEN");
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void updateStatus_unknownStatus_isBadRequest() {
        ContributionPeriod p = existing(7L, 2026, 1, ContributionPeriodStatus.OPEN);
        when(periods.findById(7L)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.updateStatus(
                7L, new UpdateContributionPeriodStatusRequest("BANANA"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));
    }

    @Test
    void get_unknownId_isNotFound() {
        when(periods.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(999L))
                .satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));
    }

    @Test
    void list_capsPageSizeAtOneHundred_andRejectsUnknownStatus() {
        when(periods.findAll(ArgumentMatchers.<Specification<ContributionPeriod>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.list(2026, null, 0, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(periods).findAll(ArgumentMatchers.<Specification<ContributionPeriod>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);

        assertThatThrownBy(() -> service.list(null, "BOGUS", 0, 20))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));
    }
}