package com.edward.pensioncompliance.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.member.dto.CreateMemberRequest;
import com.edward.pensioncompliance.member.dto.MemberResponse;
import com.edward.pensioncompliance.member.entity.Member;
import com.edward.pensioncompliance.member.entity.MemberStatus;
import com.edward.pensioncompliance.member.repository.MemberRepository;
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

import java.util.List;
import java.util.Optional;

class MemberServiceTest {

    private final MemberRepository members = mock(MemberRepository.class);
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final Authentication auth = mock(Authentication.class);
    private final AppUser actor = mock(AppUser.class);

    private final MemberService service = new MemberService(members, users, audit);

    @BeforeEach
    void actorIsResolvable() {
        when(auth.getName()).thenReturn("admin");
        when(users.findByUsername("admin")).thenReturn(Optional.of(actor));
    }

    private static Member existing(long id, String ref, String sourceRef, MemberStatus status) {
        Member m = new Member(ref, sourceRef, status);
        ReflectionTestUtils.setField(m, "memberId", id);
        return m;
    }

    private static void assertStatus(Throwable t, HttpStatus expected) {
        assertThat(t).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(expected.value()));
    }

    @Test
    void create_savesTrimmedValues_defaultsActive_andAudits() {
        when(members.existsByMemberRef("MBR-001")).thenReturn(false);
        when(members.save(any(Member.class))).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "memberId", 12L);
            return m;
        });

        MemberResponse r = service.create(
                new CreateMemberRequest(" MBR-001 ", "   ", null), auth);

        assertThat(r.memberId()).isEqualTo(12L);
        assertThat(r.memberRef()).isEqualTo("MBR-001");
        assertThat(r.sourceMemberRef()).isNull();
        assertThat(r.status()).isEqualTo("ACTIVE");
        verify(audit).record(eq(actor), eq("MEMBER_CREATED"), eq("MEMBER"), eq("12"), any());
    }

    @Test
    void create_explicitStatus_persistsNormalizedStatus() {
        when(members.existsByMemberRef("MBR-002")).thenReturn(false);
        when(members.save(any(Member.class))).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "memberId", 13L);
            return m;
        });

        MemberResponse r = service.create(
                new CreateMemberRequest("MBR-002", " SRC-2 ", " unknown "), auth);

        assertThat(r.sourceMemberRef()).isEqualTo("SRC-2");
        assertThat(r.status()).isEqualTo("UNKNOWN");
    }

    @Test
    void create_unknownStatus_isBadRequest_andWritesNothing() {
        when(members.existsByMemberRef("MBR-003")).thenReturn(false);

        assertThatThrownBy(() -> service.create(
                new CreateMemberRequest("MBR-003", null, "BOGUS"), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));

        verify(members, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void create_duplicateReference_isConflict_andNothingIsSavedOrAudited() {
        when(members.existsByMemberRef("MBR-001")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new CreateMemberRequest("MBR-001", null, null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(members, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void create_raceOnUniqueConstraint_isStillConflict() {
        when(members.existsByMemberRef("MBR-001")).thenReturn(false);
        when(members.save(any(Member.class))).thenThrow(new DataIntegrityViolationException("uq_member_ref"));

        assertThatThrownBy(() -> service.create(
                new CreateMemberRequest("MBR-001", null, null), auth))
                .satisfies(t -> assertStatus(t, HttpStatus.CONFLICT));

        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void findOrCreateForImport_existingMember_reusesWithoutSavingOrAuditing() {
        Member m = existing(4L, "MBR-010", "SRC-10", MemberStatus.ACTIVE);
        when(members.findByMemberRef("MBR-010")).thenReturn(Optional.of(m));

        Member resolved = service.findOrCreateForImport(" MBR-010 ", "SRC-IGNORED", actor);

        assertThat(resolved).isSameAs(m);
        verify(members, never()).save(any());
        verify(audit, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void findOrCreateForImport_newMember_createsActiveAndAudits() {
        when(members.findByMemberRef("MBR-011")).thenReturn(Optional.empty());
        when(members.save(any(Member.class))).thenAnswer(inv -> {
            Member m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "memberId", 15L);
            return m;
        });

        Member created = service.findOrCreateForImport(" MBR-011 ", " SRC-11 ", actor);

        assertThat(created.getMemberId()).isEqualTo(15L);
        assertThat(created.getMemberRef()).isEqualTo("MBR-011");
        assertThat(created.getSourceMemberRef()).isEqualTo("SRC-11");
        assertThat(created.getStatus()).isEqualTo(MemberStatus.ACTIVE);
        verify(audit).record(eq(actor), eq("MEMBER_CREATED"), eq("MEMBER"), eq("15"), any());
    }

    @Test
    void get_unknownId_isNotFound() {
        when(members.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(99L))
                .satisfies(t -> assertStatus(t, HttpStatus.NOT_FOUND));
    }

    @Test
    void list_capsPageSizeAtOneHundred_andRejectsUnknownStatus() {
        when(members.findAll(ArgumentMatchers.<Specification<Member>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.list("mbr", "ACTIVE", 0, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(members).findAll(ArgumentMatchers.<Specification<Member>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);

        assertThatThrownBy(() -> service.list(null, "BOGUS", 0, 20))
                .satisfies(t -> assertStatus(t, HttpStatus.BAD_REQUEST));
    }
}