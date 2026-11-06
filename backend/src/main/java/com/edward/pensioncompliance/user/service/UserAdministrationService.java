package com.edward.pensioncompliance.user.service;

import com.edward.pensioncompliance.audit.dto.AuditEventResponse;
import com.edward.pensioncompliance.audit.entity.AuditEvent;
import com.edward.pensioncompliance.audit.repository.AuditEventRepository;
import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.role.entity.AppRole;
import com.edward.pensioncompliance.role.repository.AppRoleRepository;
import com.edward.pensioncompliance.user.dto.*;
import com.edward.pensioncompliance.user.entity.AccountStatus;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.entity.UserRole;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import com.edward.pensioncompliance.user.repository.UserRoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class UserAdministrationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppUserRepository      users;
    private final UserRoleRepository     roles;
    private final AppRoleRepository      appRoles;
    private final AuditEventRepository   auditEvents;
    private final PasswordEncoder        encoder;
    private final AuditService           audit;

    public UserAdministrationService(
            AppUserRepository    users,
            UserRoleRepository   roles,
            AppRoleRepository    appRoles,
            AuditEventRepository auditEvents,
            PasswordEncoder      encoder,
            AuditService         audit) {
        this.users       = users;
        this.roles       = roles;
        this.appRoles    = appRoles;
        this.auditEvents = auditEvents;
        this.encoder     = encoder;
        this.audit       = audit;
    }

    // ── List users ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public List<UserAccountResponse> list() {
        return users.findAll().stream()
                .map(u -> toResponse(u,
                        roles.findByUser_UserId(u.getUserId())
                             .map(r -> r.getRole().getRoleCode())
                             .orElse("")))
                .toList();
    }

    // ── Create user ──────────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ProvisionedUserResponse create(CreateUserRequest request, Authentication auth) {
        String username = request.username().trim();
        String email    = request.institutionalEmail().trim().toLowerCase();

        if (users.existsByUsername(username) || users.existsByInstitutionalEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Username or institutional email is already in use.");

        AppRole role  = appRoles.findByRoleCode(request.roleCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role."));
        AppUser actor = resolveActor(auth);

        String  temporaryPassword = generateTemporaryPassword();
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setInstitutionalEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(encoder.encode(temporaryPassword));
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.requirePasswordChange();
        user.setPasswordChangedAt(OffsetDateTime.now(ZoneOffset.UTC));
        users.saveAndFlush(user);
        roles.save(new UserRole(user, role, actor));

        audit.record(actor, "USER_ACCOUNT_CREATED", "APP_USER", user.getUserId().toString(),
                "Created account " + user.getUsername() + " with role " + role.getRoleCode() + ".");

        return new ProvisionedUserResponse(toResponse(user, role.getRoleCode()), temporaryPassword);
    }

    // ── Change account status ─────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public UserAccountResponse changeStatus(Long targetId, ChangeStatusRequest request, Authentication auth) {

        AppUser target    = resolveTarget(targetId);
        AppUser actor     = resolveActor(auth);
        AccountStatus newStatus = AccountStatus.valueOf(request.accountStatus());
        AccountStatus oldStatus = target.getAccountStatus();

        if (oldStatus == newStatus)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Account is already " + newStatus.name() + ".");

        // Prevent locking or disabling the last active administrator.
        if (target.getUserId().equals(actor.getUserId())
                && newStatus != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You cannot change the status of your own account.");
        }

        if (isLastActiveAdmin(target) && newStatus != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot deactivate the only active System Administrator account.");
        }

        target.setAccountStatus(newStatus);

        // If the account is being locked administratively, clear the automatic
        // lockout timestamp so it does not auto-release after 15 minutes.
        if (newStatus == AccountStatus.LOCKED) {
            target.setLockedUntil(null);
        }

        String roleCode = roles.findByUser_UserId(targetId)
                .map(r -> r.getRole().getRoleCode()).orElse("");

        audit.record(actor, "USER_STATUS_CHANGED", "APP_USER", targetId.toString(),
                "Account " + target.getUsername() + " status changed from "
                        + oldStatus.name() + " to " + newStatus.name() + ".");

        return toResponse(target, roleCode);
    }

    // ── Change user role ──────────────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public UserAccountResponse changeRole(Long targetId, ChangeRoleRequest request, Authentication auth) {

        AppUser target  = resolveTarget(targetId);
        AppUser actor   = resolveActor(auth);
        AppRole newRole = appRoles.findByRoleCode(request.roleCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role."));

        UserRole existing = roles.findByUser_UserId(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "User has no assigned role."));

        String oldRoleCode = existing.getRole().getRoleCode();

        if (oldRoleCode.equals(request.roleCode()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User already holds the " + request.roleCode() + " role.");

        // Prevent demoting the last active administrator.
        if ("SYSTEM_ADMINISTRATOR".equals(oldRoleCode)
                && !"SYSTEM_ADMINISTRATOR".equals(request.roleCode())
                && isLastActiveAdmin(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot demote the only active System Administrator.");
        }

        // Role change: delete the existing row, insert the new one.
        // The unique constraint on user_id requires this sequence.
        roles.delete(existing);
        roles.flush();
        roles.save(new UserRole(target, newRole, actor));

        audit.record(actor, "USER_ROLE_CHANGED", "APP_USER", targetId.toString(),
                "Role for " + target.getUsername() + " changed from "
                        + oldRoleCode + " to " + request.roleCode() + ".");

        return toResponse(target, request.roleCode());
    }

    // ── Reset temporary password ──────────────────────────────────────────────

    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ProvisionedUserResponse resetPassword(Long targetId, Authentication auth) {

        AppUser target = resolveTarget(targetId);
        AppUser actor  = resolveActor(auth);

        String temporaryPassword = generateTemporaryPassword();
        target.setPasswordHash(encoder.encode(temporaryPassword));
        target.requirePasswordChange();
        target.setPasswordChangedAt(OffsetDateTime.now(ZoneOffset.UTC));

        String roleCode = roles.findByUser_UserId(targetId)
                .map(r -> r.getRole().getRoleCode()).orElse("");

        audit.record(actor, "USER_PASSWORD_RESET", "APP_USER", targetId.toString(),
                "Password reset for account " + target.getUsername()
                        + ". Must change password on next login.");

        return new ProvisionedUserResponse(toResponse(target, roleCode), temporaryPassword);
    }

    // ── Change own password (first-login or voluntary) ────────────────────────

    @Transactional
    public void changePassword(ChangePasswordRequest request, Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();

        if (!encoder.matches(request.currentPassword(), user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");

        if (request.currentPassword().equals(request.newPassword()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Choose a password different from the current password.");

        user.changePassword(encoder.encode(request.newPassword()), OffsetDateTime.now(ZoneOffset.UTC));

        audit.record(user, "AUTH_PASSWORD_CHANGED", "APP_USER", user.getUserId().toString(),
                "Password changed successfully.");
    }

    // ── Audit event log ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public Map<String, Object> auditEventPage(int page, int size) {
        // Clamp size to prevent excessively large responses.
        int safeSize = Math.min(size, 100);
        PageRequest pageRequest = PageRequest.of(page, safeSize,
                Sort.by(Sort.Direction.DESC, "eventTimestamp"));
        Page<AuditEvent> resultPage = auditEvents.findAll(pageRequest);

        List<AuditEventResponse> content = resultPage.getContent().stream()
                .map(this::toAuditResponse)
                .toList();

        return Map.of(
                "content",       content,
                "page",          resultPage.getNumber(),
                "size",          resultPage.getSize(),
                "totalElements", resultPage.getTotalElements(),
                "totalPages",    resultPage.getTotalPages()
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private AppUser resolveTarget(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User account not found."));
    }

    private AppUser resolveActor(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Authenticated user account could not be resolved."));
    }

    /**
     * Returns true when the given user is a System Administrator and they are
     * the only active one. Used to prevent accidental system lockout.
     */
    private boolean isLastActiveAdmin(AppUser target) {
        String targetRole = roles.findByUser_UserId(target.getUserId())
                .map(r -> r.getRole().getRoleCode()).orElse("");
        if (!"SYSTEM_ADMINISTRATOR".equals(targetRole)) return false;

        long activeAdminCount = users.findAll().stream()
                .filter(u -> u.getAccountStatus() == AccountStatus.ACTIVE)
                .filter(u -> roles.findByUser_UserId(u.getUserId())
                        .map(r -> "SYSTEM_ADMINISTRATOR".equals(r.getRole().getRoleCode()))
                        .orElse(false))
                .count();
        return activeAdminCount <= 1;
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private UserAccountResponse toResponse(AppUser u, String role) {
        return new UserAccountResponse(
                u.getUserId(), u.getUsername(), u.getDisplayName(),
                u.getInstitutionalEmail(), role, u.getAccountStatus().name(),
                u.getCreatedAt(), u.getLastLoginAt(), u.isMustChangePassword());
    }

    private AuditEventResponse toAuditResponse(AuditEvent e) {
        String actorUsername = e.getActorUser() != null ? e.getActorUser().getUsername() : "system";
        return new AuditEventResponse(
                e.getAuditEventId(), actorUsername, e.getEventType(),
                e.getEntityType(), e.getEntityId(), e.getActionSummary(),
                e.getEventTimestamp());
    }
}