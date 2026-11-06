package com.edward.pensioncompliance.security;

import com.edward.pensioncompliance.user.entity.AccountStatus;
import com.edward.pensioncompliance.user.entity.AppUser;
import com.edward.pensioncompliance.user.entity.UserRole;
import com.edward.pensioncompliance.user.repository.AppUserRepository;
import com.edward.pensioncompliance.user.repository.UserRoleRepository;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;
    private final UserRoleRepository userRoleRepository;

    public CustomUserDetailsService(
            AppUserRepository appUserRepository,
            UserRoleRepository userRoleRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier)
            throws UsernameNotFoundException {

        AppUser appUser = appUserRepository.findByUsername(identifier)
                .or(() -> appUserRepository
                        .findByInstitutionalEmail(identifier))
                .orElseThrow(() ->
                        new UsernameNotFoundException("Invalid credentials"));

        UserRole assignment = userRoleRepository
                .findByUser_UserId(appUser.getUserId())
                .orElseThrow(() ->
                        new UsernameNotFoundException("Invalid credentials"));

        String authority = "ROLE_" + assignment.getRole().getRoleCode();

        AccountStatus status = appUser.getAccountStatus();

        return User.withUsername(appUser.getUsername())
                .password(appUser.getPasswordHash())
                .authorities(authority)
                .disabled(
                        status == AccountStatus.PENDING
                                || status == AccountStatus.DISABLED
                )
                .accountLocked(status == AccountStatus.LOCKED)
                .build();
    }
}