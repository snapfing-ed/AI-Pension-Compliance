package com.edward.pensioncompliance.datasource.controller;

import com.edward.pensioncompliance.common.dto.PageResponse;
import com.edward.pensioncompliance.datasource.dto.CreateDataSourceRequest;
import com.edward.pensioncompliance.datasource.dto.DataSourceResponse;
import com.edward.pensioncompliance.datasource.service.DataSourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data-sources")
public class DataSourceController {

    private final DataSourceService service;

    public DataSourceController(DataSourceService service) {
        this.service = service;
    }

    // GET /api/data-sources?search=&sourceType=&status=&page=&size=
    @GetMapping
    public PageResponse<DataSourceResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(search, sourceType, status, page, size);
    }

    // GET /api/data-sources/{id}
    @GetMapping("/{id}")
    public DataSourceResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // POST /api/data-sources
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DataSourceResponse create(
            @Valid @RequestBody CreateDataSourceRequest request,
            Authentication auth) {
        return service.create(request, auth);
    }
}