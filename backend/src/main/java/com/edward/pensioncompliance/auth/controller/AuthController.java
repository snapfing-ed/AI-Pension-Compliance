package com.edward.pensioncompliance.auth.controller;

import com.edward.pensioncompliance.auth.dto.AuthResponse;
import com.edward.pensioncompliance.auth.dto.LoginRequest;
import com.edward.pensioncompliance.auth.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
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

    /**
     * Provides a CSRF token for the frontend.
     * The frontend must send it in the X-CSRF-TOKEN header
     * when making POST, PUT, PATCH or DELETE requests.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken csrfToken) {

        return ResponseEntity.ok(
                Map.of("token", csrfToken.getToken())
        );
    }

    /**
     * Authenticates a user and establishes a server-side session.
     */
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
}