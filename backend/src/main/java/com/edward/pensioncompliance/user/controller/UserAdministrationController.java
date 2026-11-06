package com.edward.pensioncompliance.user.controller;

import com.edward.pensioncompliance.user.dto.*;
import com.edward.pensioncompliance.user.service.UserAdministrationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserAdministrationController {

    private final UserAdministrationService service;

    public UserAdministrationController(UserAdministrationService service) {
        this.service = service;
    }

    // GET /api/admin/users
    @GetMapping("/admin/users")
    public List<UserAccountResponse> users() {
        return service.list();
    }

    // POST /api/admin/users
    @PostMapping("/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ProvisionedUserResponse create(
            @Valid @RequestBody CreateUserRequest request,
            Authentication auth) {
        return service.create(request, auth);
    }

    // PATCH /api/admin/users/{id}/status
    @PatchMapping("/admin/users/{id}/status")
    public UserAccountResponse changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeStatusRequest request,
            Authentication auth) {
        return service.changeStatus(id, request, auth);
    }

    // PATCH /api/admin/users/{id}/roles
    @PatchMapping("/admin/users/{id}/roles")
    public UserAccountResponse changeRole(
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request,
            Authentication auth) {
        return service.changeRole(id, request, auth);
    }

    // POST /api/admin/users/{id}/password-reset
    @PostMapping("/admin/users/{id}/password-reset")
    public ProvisionedUserResponse resetPassword(
            @PathVariable Long id,
            Authentication auth) {
        return service.resetPassword(id, auth);
    }

    // POST /api/auth/password/change  (own password)
    @PostMapping("/auth/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication auth) {
        service.changePassword(request, auth);
    }

    // GET /api/admin/audit-events
    @GetMapping("/admin/audit-events")
    public Map<String, Object> auditEvents(
            @RequestParam(defaultValue = "0")  @Min(0)   int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        return service.auditEventPage(page, size);
    }
}