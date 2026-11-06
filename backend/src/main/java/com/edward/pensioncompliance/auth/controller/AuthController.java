
package com.edward.pensioncompliance.auth.controller;

import com.edward.pensioncompliance.auth.dto.AuthResponse;
import com.edward.pensioncompliance.auth.dto.LoginRequest;
import com.edward.pensioncompliance.auth.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken csrfToken) {
        return ResponseEntity.ok(
                Map.of(
                        "token", csrfToken.getToken(),
                        "headerName", csrfToken.getHeaderName()
                )
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        AuthResponse authResponse = authService.login(
                loginRequest,
                request,
                response
        );

        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> currentUser(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                authService.getCurrentUser(authentication)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        authService.logout(
                authentication,
                request,
                response
        );

        return ResponseEntity.noContent().build();
    }
}
