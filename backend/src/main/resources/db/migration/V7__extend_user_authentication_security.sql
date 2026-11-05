ALTER TABLE app_user
    ADD COLUMN must_change_password
        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN password_changed_at
        TIMESTAMPTZ,
    ADD COLUMN failed_login_attempts
        INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN locked_until
        TIMESTAMPTZ;

ALTER TABLE app_user
    ADD CONSTRAINT chk_failed_login_attempts
        CHECK (failed_login_attempts >= 0);

CREATE UNIQUE INDEX uq_user_role_one_primary_role
    ON user_role (user_id);