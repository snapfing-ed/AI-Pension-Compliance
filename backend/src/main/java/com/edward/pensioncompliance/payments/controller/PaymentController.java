package com.edward.pensioncompliance.payments.controller;

import com.edward.pensioncompliance.payments.dto.AllocatePaymentRequest;
import com.edward.pensioncompliance.payments.dto.RecordPaymentRequest;
import com.edward.pensioncompliance.payments.entity.PaymentAllocation;
import com.edward.pensioncompliance.payments.entity.PaymentTransaction;
import com.edward.pensioncompliance.payments.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentTransaction record(@Valid @RequestBody RecordPaymentRequest request, Authentication auth) {
        return service.recordPayment(request, auth);
    }

    @PostMapping("/allocations")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentAllocation allocate(@Valid @RequestBody AllocatePaymentRequest request, Authentication auth) {
        return service.allocatePayment(request, auth);
    }

    @GetMapping
    public List<PaymentTransaction> list() {
        return service.listPayments();
    }
}