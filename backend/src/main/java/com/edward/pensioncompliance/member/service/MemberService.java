package com.edward.pensioncompliance.member.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.member.dto.CreateMemberRequest;
import com.edward.pensioncompliance.member.dto.MemberResponse;
import com.edward.pensioncompliance.member.entity.Member;
import com.edward.pensioncompliance.member.entity.MemberStatus;
import com.edward.pensioncompliance.member.repository.MemberRepository;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import jakarta.persistence.criteria.Predicate;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class MemberService {

    private static final int MAX_PAGE_SIZE = 100;

    private final MemberRepository members;
    private final AppUserRepository users;
    private final AuditService audit;

    public MemberService(
            MemberRepository members,
            AppUserRepository users,
            AuditService audit) {
        this.members = members;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberResponse> list(String search, String status, int page, int size) {
        MemberStatus statusFilter = parseOptionalStatus(status);
        String term = (search == null) ? "" : search.trim().toLowerCase(Locale.ROOT);

        Specification<Member> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }
            if (!term.isEmpty()) {
                String like = "%" + escapeLike(term) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("memberRef")), like, '\\'),
                        cb.like(cb.lower(root.get("sourceMemberRef")), like, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by("memberRef").ascending());
        Page<Member> result = members.findAll(spec, pageable);
        return PageResponse.of(result.map(MemberResponse::from));
    }

    @Transactional(readOnly = true)
    public MemberResponse get(Long id) {
        return MemberResponse.from(find(id));
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public MemberResponse create(CreateMemberRequest request, Authentication auth) {
        String ref = request.memberRef().trim();
        if (members.existsByMemberRef(ref)) {
            throw duplicateReference();
        }
        MemberStatus initialStatus = parseCreateStatus(request.status());
        AppUser actor = resolveActor(auth);
        Member saved;
        try {
            saved = members.save(new Member(ref, blankToNull(request.sourceMemberRef()), initialStatus));
        } catch (DataIntegrityViolationException e) {
            throw duplicateReference();
        }
        audit.record(actor, "MEMBER_CREATED", "MEMBER",
                saved.getMemberId().toString(),
                "Pseudonymous member " + ref + " created.");
        return MemberResponse.from(saved);
    }

    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    @Transactional
    public Member findOrCreateForImport(String rawMemberRef, String sourceMemberRef, AppUser actor) {
        String ref = (rawMemberRef == null) ? "" : rawMemberRef.trim();
        if (ref.isEmpty() || ref.length() > 50) {
            throw new IllegalArgumentException("Member reference must be between 1 and 50 characters.");
        }
        return members.findByMemberRef(ref).orElseGet(() -> {
            Member saved = members.save(new Member(ref, blankToNull(sourceMemberRef), MemberStatus.ACTIVE));
            audit.record(actor, "MEMBER_CREATED", "MEMBER",
                    saved.getMemberId().toString(),
                    "Pseudonymous member " + ref + " created during payroll import.");
            return saved;
        });
    }

    private Member find(Long id) {
        return members.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Member not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    private static MemberStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return parseStatus(status);
    }

    private static MemberStatus parseCreateStatus(String status) {
        if (status == null || status.isBlank()) {
            return MemberStatus.ACTIVE;
        }
        return parseStatus(status);
    }

    private static MemberStatus parseStatus(String status) {
        try {
            return MemberStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown member status.");
        }
    }

    private static ResponseStatusException duplicateReference() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Member reference already exists.");
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}