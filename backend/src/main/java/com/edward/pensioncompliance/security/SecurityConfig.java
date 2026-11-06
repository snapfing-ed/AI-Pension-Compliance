
package com.edward.pensioncompliance.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;

import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.context.SecurityContextHolderFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public RoleHierarchy roleHierarchy() {

        return RoleHierarchyImpl.fromHierarchy("""
            ROLE_SYSTEM_ADMINISTRATOR > ROLE_COMPLIANCE_SUPERVISOR
            ROLE_COMPLIANCE_SUPERVISOR > ROLE_COMPLIANCE_MONITOR
            """);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {

        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {

        return new HttpSessionSecurityContextRepository();
    }

    /**
     * Prevents the filter from being registered twice.
     * It will be managed by the Spring Security filter chain.
     */
    @Bean
    public FilterRegistrationBean<ActiveAccountSessionFilter>
    activeAccountFilterRegistration(
            ActiveAccountSessionFilter filter
    ) {

        FilterRegistrationBean<ActiveAccountSessionFilter> registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            ActiveAccountSessionFilter activeAccountSessionFilter
    ) throws Exception {

        http
            .securityContext(context -> context
                .securityContextRepository(securityContextRepository)
            )

            .authorizeHttpRequests(auth -> auth

                .requestMatchers("/actuator/health").permitAll()

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/auth/csrf"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/login"
                ).permitAll()

                .anyRequest().authenticated()
            )

            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionFixation(fixation -> fixation.migrateSession())
            )

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Authentication required.\"}"
                    );
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write(
                        "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"You are not authorised to perform this operation.\"}"
                    );
                })
            )

            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)

            .addFilterAfter(
                activeAccountSessionFilter,
                SecurityContextHolderFilter.class
            );

        // CSRF protection remains enabled.

        return http.build();
    }
}
