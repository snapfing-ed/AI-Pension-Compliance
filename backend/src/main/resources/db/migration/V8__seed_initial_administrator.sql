-- V8: Insert the initial System Administrator account.
-- Password hash generated offline from a known value; never stored in plaintext.
-- Set must_change_password = TRUE so the administrator is forced to set
-- a permanent password on first login, following the same workflow as
-- accounts provisioned through the application.

DO $$
DECLARE
    v_user_id BIGINT;
    v_role_id BIGINT;
BEGIN
    -- Only insert if no administrator already exists.
    IF NOT EXISTS (
        SELECT 1 FROM app_user u
        JOIN user_role ur ON ur.user_id = u.user_id
        JOIN app_role r   ON r.role_id  = ur.role_id
        WHERE r.role_code = 'SYSTEM_ADMINISTRATOR'
    ) THEN
        INSERT INTO app_user (
            username, institutional_email, display_name,
            password_hash, account_status, must_change_password
        )
        VALUES (
            'admin',
            'admin@smartcompliance.local',
            'System Administrator',
            '$2a$12$HTV/EmeOpLbVPiL9t8ePR.r/H74rYNxTPmvdbziPEDMTEjkx2sJC.',
            'ACTIVE',
            TRUE
        )
        RETURNING user_id INTO v_user_id;

        SELECT role_id INTO v_role_id
        FROM app_role
        WHERE role_code = 'SYSTEM_ADMINISTRATOR';

        INSERT INTO user_role (user_id, role_id)
        VALUES (v_user_id, v_role_id);

        INSERT INTO audit_event (event_type, entity_type, entity_id, action_summary)
        VALUES (
            'ADMIN_SEED',
            'APP_USER',
            v_user_id::TEXT,
            'Initial System Administrator account created by database migration.'
        );
    END IF;
END;
$$;