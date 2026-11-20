package com.edward.pensioncompliance.analysis.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Component
public class MlAnomalyClient {

    private static final Logger log = LoggerFactory.getLogger(MlAnomalyClient.class);

    public record ObservationPayload(
            long employer_id,
            long period_id,
            String period_ym,
            int active_batch_count,
            int latest_return_count,
            int active_member_count,
            int quarantined_count,
            double total_gross_pay,
            double total_expected,
            double total_reported,
            double total_paid,
            boolean reported_unknown,
            boolean scope_evidence_incomplete,
            int return_days_late,
            int payment_days_late
    ) {}

    public record PredictPayload(
            ObservationPayload target,
            List<ObservationPayload> history
    ) {}

    public record MlPrediction(
            String modelName,
            String modelVersion,
            boolean isAnomaly,
            String findingCode,
            String category,
            BigDecimal priorityScore,
            BigDecimal confidenceScore,
            String explanation
    ) {}

    private final boolean enabled;
    private final String baseUrl;
    private final Duration timeout;
    private final HttpClient httpClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public MlAnomalyClient(
            @Value("${smartcompliance.ml.enabled:true}") boolean enabled,
            @Value("${smartcompliance.ml.base-url:http://localhost:8090}") String baseUrl,
            @Value("${smartcompliance.ml.timeout-ms:3000}") long timeoutMs) {
        this.enabled = enabled;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.timeout = Duration.ofMillis(Math.max(250, timeoutMs));
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(this.timeout)
                .build();
    }

    public Optional<MlPrediction> predict(PredictPayload payload) {
        if (!enabled) {
            return Optional.empty();
        }
        try {
            String jsonBody = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/predict"))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("ML anomaly service returned HTTP {} — failing open to deterministic rules.", response.statusCode());
                return Optional.empty();
            }

            JsonNode root = mapper.readTree(response.body());
            double rawConf = Math.max(0.0, Math.min(0.99999, root.path("confidence_score").asDouble(0.5)));
            double rawPrio = Math.max(0.0, Math.min(100.0, root.path("priority_score").asDouble(50.0)));

            return Optional.of(new MlPrediction(
                    root.path("model_name").asText("smartcompliance-iforest"),
                    root.path("model_version").asText("1.0.0"),
                    root.path("is_anomaly").asBoolean(false),
                    root.path("finding_code").asText("ML_UNUSUAL_CONTRIBUTION_PATTERN"),
                    root.path("category").asText("UNUSUAL_PATTERN"),
                    BigDecimal.valueOf(rawPrio).setScale(3, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(rawConf).setScale(5, RoundingMode.HALF_UP),
                    root.path("explanation").asText("Advisory ML anomaly indicator requiring compliance review.")
            ));
        } catch (Exception ex) {
            log.warn("ML anomaly service unreachable ({}) — failing open to deterministic rules.", ex.getMessage());
            return Optional.empty();
        }
    }
}