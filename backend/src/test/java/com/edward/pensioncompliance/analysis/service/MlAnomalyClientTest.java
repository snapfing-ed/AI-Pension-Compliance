package com.edward.pensioncompliance.analysis.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class MlAnomalyClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void parsesValidAnomalyPredictionFromPythonService() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/predict", exchange -> {
            String resp = """
                    {
                      "model_name": "smartcompliance-iforest",
                      "model_version": "1.0.0",
                      "is_anomaly": true,
                      "finding_code": "ML_UNUSUAL_CONTRIBUTION_PATTERN",
                      "category": "UNUSUAL_PATTERN",
                      "priority_score": 82.45,
                      "confidence_score": 0.91234,
                      "raw_anomaly_score": 0.64,
                      "explanation": "Advisory ML indicator: Month-over-month active headcount change (%) is -0.53 (19.5 SD below norm). Requires human compliance review.",
                      "top_features": [],
                      "inference_ms": 2.1
                    }
                    """;
            byte[] bytes = resp.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        server.start();

        int port = server.getAddress().getPort();
        MlAnomalyClient client = new MlAnomalyClient(true, "http://localhost:" + port, 2000);

        MlAnomalyClient.ObservationPayload target = new MlAnomalyClient.ObservationPayload(
                51L, 3L, "2026-03", 1, 1, 24, 5,
                210000.0, 21000.0, 21000.0, 21000.0, false, false, 0, 0
        );
        Optional<MlAnomalyClient.MlPrediction> pred = client.predict(new MlAnomalyClient.PredictPayload(target, List.of()));

        assertThat(pred).isPresent();
        assertThat(pred.get().isAnomaly()).isTrue();
        assertThat(pred.get().modelName()).isEqualTo("smartcompliance-iforest");
        assertThat(pred.get().category()).isEqualTo("UNUSUAL_PATTERN");
        assertThat(pred.get().priorityScore()).isEqualByComparingTo("82.450");
        assertThat(pred.get().confidenceScore()).isEqualByComparingTo("0.91234");
    }

    @Test
    void failsOpenWhenMlServiceIsUnreachable() {
        MlAnomalyClient client = new MlAnomalyClient(true, "http://localhost:59999", 400);
        MlAnomalyClient.ObservationPayload target = new MlAnomalyClient.ObservationPayload(
                51L, 3L, "2026-03", 1, 1, 40, 0,
                400000.0, 40000.0, 40000.0, 40000.0, false, false, 0, 0
        );
        Optional<MlAnomalyClient.MlPrediction> pred = client.predict(new MlAnomalyClient.PredictPayload(target, List.of()));
        assertThat(pred).isEmpty();
    }
}