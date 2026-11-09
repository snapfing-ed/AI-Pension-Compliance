package com.edward.pensioncompliance.member.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.member.dto.CreateMemberRequest;
import com.edward.pensioncompliance.member.dto.MemberResponse;
import com.edward.pensioncompliance.member.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    // GET /api/members?search=&status=&page=&size=
    @GetMapping
    public PageResponse<MemberResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(search, status, page, size);
    }

    // GET /api/members/{id}
    @GetMapping("/{id}")
    public MemberResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // POST /api/members
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse create(
            @Valid @RequestBody CreateMemberRequest request,
            Authentication auth) {
        return service.create(request, auth);
    }
}