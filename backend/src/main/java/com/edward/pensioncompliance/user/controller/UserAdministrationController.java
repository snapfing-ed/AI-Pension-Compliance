package com.edward.pensioncompliance.user.controller;

import com.edward.pensioncompliance.user.dto.*;
import com.edward.pensioncompliance.user.service.UserAdministrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class UserAdministrationController {
    private final UserAdministrationService service;
    public UserAdministrationController(UserAdministrationService service) { this.service = service; }

    @GetMapping("/admin/users")
    public List<UserAccountResponse> users() { return service.list(); }

    @PostMapping("/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    public ProvisionedUserResponse create(@Valid @RequestBody CreateUserRequest request, Authentication auth) {
        return service.create(request, auth);
    }

    @PostMapping("/auth/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication auth) {
        service.changePassword(request, auth);
    }
}
