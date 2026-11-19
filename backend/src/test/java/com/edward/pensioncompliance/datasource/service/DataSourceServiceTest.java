package com.edward.pensioncompliance.datasource.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.datasource.dto.CreateDataSourceRequest;
import com.edward.pensioncompliance.datasource.dto.DataSourceResponse;
import com.edward.pensioncompliance.datasource.entity.DataSource;
import com.edward.pensioncompliance.datasource.repository.DataSourceRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

class DataSourceServiceTest {

    private final DataSourceRepository sources = mock(DataSourceRepository.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final Authentication auth = mock(Authentication.class);
    private final AppUser actor = mock(AppUser.class);

    private final DataSourceService service =
            new DataSourceService(sources, users, audit);

    @BeforeEach
    void actorIsResolvable() {
        when(auth.getName()).thenReturn("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(actor));
        when(sources.existsBySourceCodeIgnoreCase(any())).thenReturn(false);
    }

    private static void assertStatus(Throwable t, HttpStatus expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(expected.value()));
    }

    @Test
    void create_normalizesSyntheticType_defaultsReceivedAtAndActive_andAudits() {
        when(sources.saveAndFlush(any(DataSource.class))).thenAnswer(inv -> {
            DataSource ds = inv.getArgument(0);
            ReflectionTestUtils.setField(ds, "sourceId", 5L);
            return ds;
        });

        DataSourceResponse r = service.create(new CreateDataSourceRequest(
                "  src-payroll-01  ",
                "  Synthetic Batch A  ",
                " synthetic ",
                "   ",
                null,
                "  Prototype compliance testing  ",
                null,
                "   "
        ), auth);

        assertThat(r.sourceId()).isEqualTo(5L);
        assertThat(r.sourceCode()).isEqualTo("SRC-PAYROLL-01");
        assertThat(r.sourceName()).isEqualTo("Synthetic Batch A");
        assertThat(r.sourceType()).isEqualTo("SYNTHETIC");
        assertThat(r.ownerName()).isNull();
        assertThat(r.authorityReference()).isNull();
        assertThat(r.coverageNotes()).isNull();
        assertThat(r.permittedPurpose()).isEqualTo("Prototype compliance testing");
        assertThat(r.receivedAt()).isNotNull();
        assertThat(r.status()).isEqualTo("ACTIVE");
        verify(audit).record(eq(actor), eq("DATA_SOURCE_CREATED"), eq("DATA_SOURCE"), eq("5"), any());
    }

    @Test
    void create_preservesExplicitReceivedAt() {
        OffsetDateTime received = OffsetDateTime.of(2026, 11, 1, 9, 30, 0, 0, ZoneOffset.UTC);
        when(sources.saveAndFlush(any(DataSource.class))).thenAnswer(inv -> {
            DataSource ds = inv.getArgument(0);
            ReflectionTestUtils.setField(ds, "sourceId", 6L);
            return ds;
        });

        DataSourceResponse r = service.create(new CreateDataSourceRequest(
                "PAYROLL-GENERATOR-1",
                "Payroll Generator v1",
                "SYNTHETIC",
                "Edward Kasongo",
                "MU-CS-2026",
                "Capstone evaluation",
                received,
                "12 months simulated"
        ), auth);

        assertThat(r.receivedAt()).isEqualTo(received);
        assertThat(r.sourceCode()).isEqualTo("PAYROLL-GENERATOR-1");
        assertThat(r.ownerName()).isEqualTo("Edward Kasongo");
        assertThat(r.authorityReference()).isEqualTo("MU-CS-2026");
        assertThat(r.coverageNotes()).isEqualTo("12 months simulated");
    }

    @Test
    void create_invalidSourceTypeCharacters_isBadRequest() {
        assertThatThrownBy(() -> service.create(new CreateDataSourceRequest(
                "BAD-SOURCE", "Bad Source", "INVALID TYPE!", null, null, "Testing", null, null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));

        verify(sources, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void create_duplicateSourceCode_isConflict_andNothingIsSavedOrAudited() {
        when(sources.existsBySourceCodeIgnoreCase("SRC-PAYROLL-01")).thenReturn(true);

        assertThatThrownBy(() -> service.create(new CreateDataSourceRequest(
                "src-payroll-01", "Payroll Export", "PAYROLL_EXPORT", null, null,
                "Monthly compliance import", null, null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(sources, never()).saveAndFlush(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void get_unknownId_isNotFound() {
        when(sources.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(99L))
                .satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));
    }

    @Test
    void list_capsPageSizeAtOneHundred_andRejectsUnknownStatus() {
        when(sources.findAll(ArgumentMatchers.<Specification<DataSource>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.list(null, "SYNTHETIC", null, 0, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(sources).findAll(ArgumentMatchers.<Specification<DataSource>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);

        assertThatThrownBy(() -> service.list(null, null, "UNKNOWN", 0, 20))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));
    }
}
