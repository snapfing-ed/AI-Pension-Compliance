package com.edward.pensioncompliance.payroll.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

class PayrollCsvParserTest {

    @Test
    void parse_stripsBom_preservesBlankPayAsNull_andZeroAsZero() {
        String csv = "\uFEFFmember_ref,source_member_ref,source_row_ref,eligible_gross_pay,payroll_status\n"
                + "MBR-001,SRC-1,ROW-1,20000.00,ACTIVE\n"
                + "MBR-002,SRC-2,ROW-2,0.00,ACTIVE\n"
                + "MBR-003,SRC-3,ROW-3,,ACTIVE\n"
                + "MBR-004,\"SRC,4\",ROW-4,-500.00,INACTIVE\n";

        List<PayrollCsvParser.RawCsvRow> rows = PayrollCsvParser.parse(
                new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8)));

        assertThat(rows).hasSize(4);
        assertThat(rows.get(0).memberRef()).isEqualTo("MBR-001");
        assertThat(rows.get(0).rawEligibleGrossPay()).isEqualTo("20000.00");
        assertThat(rows.get(1).rawEligibleGrossPay()).isEqualTo("0.00");
        assertThat(rows.get(2).rawEligibleGrossPay()).isEmpty();
        assertThat(rows.get(3).sourceMemberRef()).isEqualTo("SRC,4");
        assertThat(rows.get(3).rawEligibleGrossPay()).isEqualTo("-500.00");
    }

    @Test
    void parse_missingRequiredHeaders_throwsBadRequest() {
        String csv = "wrong_col,other_col\n1,2\n";
        assertThatThrownBy(() -> PayrollCsvParser.parse(
                new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(HttpStatus.BAD_REQUEST.value()));
    }

    @Test
    void parse_headersOnlyNoRows_throwsBadRequest() {
        String csv = "member_ref,eligible_gross_pay\n\n";
        assertThatThrownBy(() -> PayrollCsvParser.parse(
                new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(HttpStatus.BAD_REQUEST.value()));
    }
}