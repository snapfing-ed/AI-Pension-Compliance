
package com.edward.pensioncompliance.security;

import com.edward.pensioncompliance.user.entity.AccountStatus;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.repository.AppUserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ActiveAccountSessionFilter extends OncePerRequestFilter {

    private final AppUserRepository appUserRepository;

    public ActiveAccountSessionFilter(
            AppUserRepository appUserRepository
    ) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {

            AppUser appUser = appUserRepository
                    .findByUsername(authentication.getName())
                    .orElse(null);

            if (appUser == null
                    || appUser.getAccountStatus() != AccountStatus.ACTIVE) {

                SecurityContextHolder.clearContext();

                if (request.getSession(false) != null) {
                    request.getSession(false).invalidate();
                }

                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Account is no longer active."
                );

                return;
            }

            if (appUser.isMustChangePassword()
                    && !request.getRequestURI().equals("/api/auth/me")
                    && !request.getRequestURI().equals("/api/auth/logout")
                    && !request.getRequestURI().equals("/api/auth/password/change")
                    && !request.getRequestURI().equals("/api/auth/csrf")) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                        "Change your temporary password before continuing.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
