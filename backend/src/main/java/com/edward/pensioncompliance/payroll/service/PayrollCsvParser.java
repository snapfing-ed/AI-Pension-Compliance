package com.edward.pensioncompliance.payroll.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class PayrollCsvParser {

    public record RawCsvRow(
            int rowNumber,
            String memberRef,
            String sourceMemberRef,
            String sourceRowRef,
            String rawEligibleGrossPay,
            String payrollStatus
    ) {}

    private PayrollCsvParser() {}

    public static List<RawCsvRow> parse(InputStream inputStream) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {

            String headerLine = nextNonBlankLine(reader, true);
            if (headerLine == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file is empty.");
            }
            List<String> headers = splitCsvLine(headerLine);
            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i < headers.size(); i++) {
                String normalized = headers.get(i).trim().toLowerCase(Locale.ROOT);
                if (!normalized.isEmpty()) {
                    colIndex.putIfAbsent(normalized, i);
                }
            }

            Integer memberCol = findCol(colIndex, "member_ref", "memberref", "member_id");
            Integer payCol = findCol(colIndex,
                    "eligible_gross_pay", "eligiblegrosspay", "gross_pay", "grosspay", "gross_earnings");
            if (memberCol == null || payCol == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "CSV header must include 'member_ref' and 'eligible_gross_pay' columns.");
            }

            Integer sourceMemberCol = findCol(colIndex, "source_member_ref", "sourcememberref");
            Integer sourceRowCol = findCol(colIndex, "source_row_ref", "sourcerowref", "row_ref");
            Integer statusCol = findCol(colIndex, "payroll_status", "payrollstatus");

            List<RawCsvRow> rows = new ArrayList<>();
            int dataRowNumber = 0;
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                dataRowNumber++;
                List<String> cells = splitCsvLine(line);
                rows.add(new RawCsvRow(
                        dataRowNumber,
                        cellAt(cells, memberCol),
                        cellAt(cells, sourceMemberCol),
                        cellAt(cells, sourceRowCol),
                        cellAt(cells, payCol),
                        cellAt(cells, statusCol)
                ));
            }
            if (rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "CSV file contains headers but no payroll rows.");
            }
            return rows;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read CSV file.");
        }
    }

    private static String nextNonBlankLine(BufferedReader reader, boolean stripBom) throws IOException {
        String line;
        boolean first = true;
        while ((line = reader.readLine()) != null) {
            if (first && stripBom && !line.isEmpty() && line.charAt(0) == '\uFEFF') {
                line = line.substring(1);
            }
            first = false;
            if (!line.isBlank()) {
                return line;
            }
        }
        return null;
    }

    private static Integer findCol(Map<String, Integer> map, String... aliases) {
        for (String alias : aliases) {
            Integer idx = map.get(alias);
            if (idx != null) {
                return idx;
            }
        }
        return null;
    }

    private static String cellAt(List<String> cells, Integer index) {
        if (index == null || index < 0 || index >= cells.size()) {
            return null;
        }
        return cells.get(index);
    }

    static List<String> splitCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    fields.add(current.toString());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
        }
        if (inQuotes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Malformed CSV line: unterminated quoted field.");
        }
        fields.add(current.toString());
        return fields;
    }
}