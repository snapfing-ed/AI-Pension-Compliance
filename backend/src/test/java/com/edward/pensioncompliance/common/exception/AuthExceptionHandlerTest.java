package com.edward.pensioncompliance.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

class AuthExceptionHandlerTest {

    private final AuthExceptionHandler handler = new AuthExceptionHandler();

    private static MockHttpServletRequest request() {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRequestURI("/api/employers/9");
        return r;
    }

    @SuppressWarnings("unused")
    void dummy(String s) { }

    @Test
    void notFound_usesTheSpecifiedShape() {
        ResponseEntity<Map<String, Object>> res = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Employer not found."), request());
        assertThat(res.getStatusCode().value()).isEqualTo(404);
        assertThat(res.getBody())
                .containsEntry("status", 404)
                .containsEntry("error", "Not Found")
                .containsEntry("message", "Employer not found.")
                .containsEntry("path", "/api/employers/9")
                .containsKey("timestamp");
    }

    @Test
    void conflict_returns409WithMessage() {
        ResponseEntity<Map<String, Object>> res = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.CONFLICT, "Employer reference already exists."), request());
        assertThat(res.getStatusCode().value()).isEqualTo(409);
        assertThat(res.getBody()).containsEntry("message", "Employer reference already exists.");
    }

    @Test
    void serverError_hidesInternalDetail() {
        ResponseEntity<Map<String, Object>> res = handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "secret internal detail"), request());
        assertThat(res.getBody().get("message").toString()).doesNotContain("secret");
    }

    @Test
    void validationError_listsFieldNamesButNotValues() throws Exception {
        BeanPropertyBindingResult binding = new BeanPropertyBindingResult(new Object(), "request");
        binding.addError(new FieldError("request", "legalName", "must not be blank"));
        MethodParameter parameter = new MethodParameter(
                AuthExceptionHandlerTest.class.getDeclaredMethod("dummy", String.class), 0);

        ResponseEntity<Map<String, Object>> res = handler.handleValidationException(
                new MethodArgumentNotValidException(parameter, binding), request());

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody()).containsEntry("fields", List.of("legalName"));
    }
}