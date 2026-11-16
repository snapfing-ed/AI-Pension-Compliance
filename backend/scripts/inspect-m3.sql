\pset pager off
\echo === flyway_schema_history ===
SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;

\echo === data_source columns ===
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='data_source' ORDER BY ordinal_position;

\echo === Module 3 table columns ===
SELECT table_name, ordinal_position AS pos, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN (
 'employer_month_analysis','analysis_snapshot','contribution_calculation',
 'snapshot_payroll_batch','snapshot_return_version','snapshot_payment_allocation',
 'snapshot_completeness_assessment','submitted_return','return_version','return_line',
 'payment_transaction','payment_allocation','completeness_assessment',
 'compliance_finding','data_quality_finding','investigation_case','case_finding',
 'case_assignment_history','case_data_quality_finding')
ORDER BY table_name, ordinal_position;

\echo === check and unique constraints ===
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace='public'::regnamespace AND contype IN ('c','u')
  AND conrelid::regclass::text IN (
 'employer_month_analysis','analysis_snapshot','compliance_finding','data_quality_finding',
 'investigation_case','case_finding','case_assignment_history','return_version',
 'payment_transaction','payment_allocation','completeness_assessment','data_source')
ORDER BY 1, 2;

\echo === row counts ===
SELECT 'employer' AS t, count(*) FROM employer UNION ALL
SELECT 'member', count(*) FROM member UNION ALL
SELECT 'contribution_period', count(*) FROM contribution_period UNION ALL
SELECT 'data_source', count(*) FROM data_source UNION ALL
SELECT 'payroll_batch', count(*) FROM payroll_batch UNION ALL
SELECT 'payroll_record', count(*) FROM payroll_record UNION ALL
SELECT 'submitted_return', count(*) FROM submitted_return UNION ALL
SELECT 'payment_transaction', count(*) FROM payment_transaction UNION ALL
SELECT 'completeness_assessment', count(*) FROM completeness_assessment UNION ALL
SELECT 'employer_month_analysis', count(*) FROM employer_month_analysis;
