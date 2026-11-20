package com.edward.pensioncompliance.analysis.service;

import com.edward.pensioncompliance.analysis.dto.FindingDraft;
import com.edward.pensioncompliance.analysis.dto.RuleInputs;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeterministicRuleParityTest {

    private final DeterministicRuleEvaluator evaluator = new DeterministicRuleEvaluator();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void matchesGoldenParityVectors() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/golden/rule_parity_vectors.json")) {
            assertThat(is).isNotNull();
            JsonNode root = mapper.readTree(is);
            for (JsonNode vec : root) {
                String name = vec.get("name").asText();
                JsonNode in = vec.get("inputs");
                RuleInputs inputs = new RuleInputs(
                        in.get("employerId").asLong(),
                        in.get("periodId").asLong(),
                        in.get("activeBatchCount").asInt(),
                        in.get("latestReturnCount").asInt(),
                        in.get("reportedUnknown").asBoolean(),
                        in.get("scopeEvidenceIncomplete").asBoolean(),
                        new BigDecimal(in.get("totalExpected").asText()),
                        new BigDecimal(in.get("totalReported").asText()),
                        new BigDecimal(in.get("totalPaid").asText()),
                        in.get("maxReturnDaysLate").asInt(),
                        in.get("maxPaymentDaysLate").asInt()
                );
                List<FindingDraft> actual = evaluator.evaluate(inputs);
                JsonNode exp = vec.get("expected");
                assertThat(actual).as("Vector %s finding count", name).hasSize(exp.size());
                for (int i = 0; i < exp.size(); i++) {
                    assertThat(actual.get(i).findingCode()).as(name).isEqualTo(exp.get(i).get("findingCode").asText());
                    assertThat(actual.get(i).category()).as(name).isEqualTo(exp.get(i).get("category").asText());
                    assertThat(actual.get(i).priorityScore()).as(name)
                            .isEqualByComparingTo(exp.get(i).get("priorityScore").asText());
                }
            }
        }
    }
}