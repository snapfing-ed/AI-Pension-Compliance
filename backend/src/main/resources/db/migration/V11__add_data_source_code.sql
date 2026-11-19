ALTER TABLE data_source
    ADD COLUMN source_code VARCHAR(60);

UPDATE data_source
SET source_code = 'LEGACY-' || source_id
WHERE source_code IS NULL;

ALTER TABLE data_source
    ALTER COLUMN source_code SET NOT NULL;

ALTER TABLE data_source
    ADD CONSTRAINT uq_data_source_source_code UNIQUE (source_code);
