package com.edward.pensioncompliance.user.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.role.entity.AppRole;
import com.edward.pensioncompliance.role.repository.AppRoleRepository;
import com.edward.pensioncompliance.user.dto.*;
import com.edward.pensioncompliance.user.entity.AccountStatus;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.entity.UserRole;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import com.edward.pensioncompliance.user.repository.UserRoleRepository;
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

@Service
public class UserAdministrationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final AppUserRepository users;
    private final UserRoleRepository roles;
    private final AppRoleRepository appRoles;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public UserAdministrationService(AppUserRepository users, UserRoleRepository roles,
            AppRoleRepository appRoles, PasswordEncoder encoder, AuditService audit) {
        this.users = users; this.roles = roles; this.appRoles = appRoles;
        this.encoder = encoder; this.audit = audit;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public List<UserAccountResponse> list() {
        return users.findAll().stream().map(u -> toResponse(u,
            roles.findByUser_UserId(u.getUserId()).map(x -> x.getRole().getRoleCode()).orElse(""))).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ProvisionedUserResponse create(CreateUserRequest request, Authentication auth) {
        String username = request.username().trim();
        String email = request.institutionalEmail().trim().toLowerCase();
        if (users.existsByUsername(username) || users.existsByInstitutionalEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username or institutional email is already in use.");
        AppRole role = appRoles.findByRoleCode(request.roleCode())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role."));
        AppUser actor = users.findByUsername(auth.getName()).orElseThrow();
        String temporaryPassword = generateTemporaryPassword();
        AppUser user = new AppUser();
        user.setUsername(username); user.setInstitutionalEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(encoder.encode(temporaryPassword));
        user.setAccountStatus(AccountStatus.ACTIVE); user.requirePasswordChange();
        user.setPasswordChangedAt(OffsetDateTime.now(ZoneOffset.UTC));
        users.saveAndFlush(user);
        roles.save(new UserRole(user, role, actor));
        audit.record(actor, "USER_ACCOUNT_CREATED", "APP_USER", user.getUserId().toString(),
            "Created account " + user.getUsername() + " with role " + role.getRoleCode() + ".");
        return new ProvisionedUserResponse(toResponse(user, role.getRoleCode()), temporaryPassword);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request, Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        if (!encoder.matches(request.currentPassword(), user.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        if (request.currentPassword().equals(request.newPassword()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a password different from the temporary password.");
        user.changePassword(encoder.encode(request.newPassword()), OffsetDateTime.now(ZoneOffset.UTC));
        audit.record(user, "AUTH_PASSWORD_CHANGED", "APP_USER", user.getUserId().toString(), "Password changed successfully.");
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[24]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private UserAccountResponse toResponse(AppUser u, String role) {
        return new UserAccountResponse(u.getUserId(), u.getUsername(), u.getDisplayName(),
            u.getInstitutionalEmail(), role, u.getAccountStatus().name(), u.getCreatedAt(),
            u.getLastLoginAt(), u.isMustChangePassword());
    }
}
