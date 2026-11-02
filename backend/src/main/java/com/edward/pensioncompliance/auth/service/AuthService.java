package com.edward.pensioncompliance.auth.service;

import com.edward.pensioncompliance.audit.service.AuditService;
import com.edward.pensioncompliance.auth.dto.AuthResponse;
import com.edward.pensioncompliance.auth.dto.LoginRequest;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.entity.UserRole;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import com.edward.pensioncompliance.user.repository.UserRoleRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository appUserRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuditService auditService;
    private final SecurityContextRepository securityContextRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            AppUserRepository appUserRepository,
            UserRoleRepository userRoleRepository,
            AuditService auditService,
            SecurityContextRepository securityContextRepository
    ) {
        this.authenticationManager = authenticationManager;
        this.appUserRepository = appUserRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditService = auditService;
        this.securityContextRepository = securityContextRepository;
    }

    @Transactional(noRollbackFor = AuthenticationException.class)
    public AuthResponse login(
            LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {

        String identifier = loginRequest.identifier().trim();

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        AppUser appUser = appUserRepository
                .findByIdentifierForUpdate(identifier)
                .orElse(null);

        // Release an expired automatic lock before authentication.
        if (appUser != null) {
            appUser.releaseExpiredAutomaticLock(now);
        }

        Authentication authentication;

        try {

            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            identifier,
                            loginRequest.password()
                    )
            );

        } catch (AuthenticationException exception) {

            SecurityContextHolder.clearContext();

            // Only active accounts accumulate failed password attempts.
            if (appUser != null) {

                if (appUser.getAccountStatus()
                        == com.edward.pensioncompliance.user.entity.AccountStatus.ACTIVE) {

                    appUser.recordFailedLoginAttempt(now);
                }

                auditService.record(
                        appUser,
                        "AUTH_LOGIN_FAILED",
                        "APP_USER",
                        String.valueOf(appUser.getUserId()),
                        "Failed login attempt."
                );

            } else {

                auditService.record(
                        null,
                        "AUTH_LOGIN_FAILED",
                        "AUTHENTICATION",
                        null,
                        "Failed login attempt for an unrecognised account."
                );
            }

            // Do not disclose whether an account exists or its status.
            throw new BadCredentialsException(
                    "Invalid username/email or password."
            );
        }

        if (appUser == null) {
            throw new IllegalStateException(
                    "Authenticated account could not be retrieved."
            );
        }

        // Reset failed attempts and update the last successful login.
        appUser.recordSuccessfulLogin(now);

        UserRole assignment = userRoleRepository
                .findByUser_UserId(appUser.getUserId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated user has no assigned role."
                        )
                );

        // Protect against session fixation.
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        // Explicitly persist the authenticated security context.
        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);

        SecurityContextHolder.setContext(context);

        securityContextRepository.saveContext(
                context,
                request,
                response
        );

        auditService.record(
                appUser,
                "AUTH_LOGIN_SUCCESS",
                "APP_USER",
                String.valueOf(appUser.getUserId()),
                "Successful login."
        );

        return new AuthResponse(
                appUser.getUserId(),
                appUser.getUsername(),
                appUser.getDisplayName(),
                appUser.getInstitutionalEmail(),
                assignment.getRole().getRoleCode(),
                appUser.isMustChangePassword()
        );
    }
}