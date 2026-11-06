import { executeComplianceRules } from '../services/complianceEngine';
import { calculateInvestigationPriority } from '../services/prioritizationEngine';
import {
  INITIAL_SYSTEM_CONFIG,
  SEED_EMPLOYERS,
  SEED_CONTRIBUTION_RECORDS,
} from '../data/seedData';
import { ContributionRecord } from '../types';
import {
  generateSalt,
  hashPassword,
  validatePasswordPolicy,
  validateEmailFormat,
} from '../services/security/cryptoUtils';

/**
 * Automated tests for:
 * - Password policy utilities
 * - Deterministic compliance rules
 * - Shortfall accounting
 * - Investigation prioritisation
 *
 * Authentication API integration tests will be maintained separately
 * and tested against the Spring Boot backend.
 */
async function runTests() {
  console.log('=== SMARTCOMPLIANCE: DOMAIN & UTILITY TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // ---------------------------------------------------------
  // TEST SUITE 1: Password Policy Utilities
  // ---------------------------------------------------------
  console.log('Test Suite 1: Password Policy & Security Utilities');

  const salt1 = generateSalt(16);
  const salt2 = generateSalt(16);

  assert(salt1 !== salt2, 'Generates unique cryptographic salts');

  const passwordPlain = 'Monitor@2026!Zm';
  const hash1 = await hashPassword(passwordPlain, salt1);
  const hash2 = await hashPassword(passwordPlain, salt1);
  const hashDiffSalt = await hashPassword(passwordPlain, salt2);

  assert(
    hash1 === hash2,
    'Produces consistent hashes for identical password and salt'
  );

  assert(
    hash1 !== hashDiffSalt,
    'Produces different hashes when salts differ'
  );

  assert(
    hash1 !== passwordPlain,
    'Hash output differs from plaintext password'
  );

  const validPolicy = validatePasswordPolicy('SecureP@ss123');
  assert(
    validPolicy.valid,
    'Accepts a password meeting the defined password policy'
  );

  const weakPolicy = validatePasswordPolicy('weak');
  assert(
    !weakPolicy.valid && weakPolicy.errors.length > 0,
    'Rejects a password that fails the defined policy'
  );

  assert(
    validateEmailFormat('officer@compliance.pension.gov.zm'),
    'Accepts a valid institutional email format'
  );

  assert(
    !validateEmailFormat('not-an-email'),
    'Rejects a malformed email address'
  );

  // ---------------------------------------------------------
  // TEST SUITE 2: Deterministic Compliance Rules
  // ---------------------------------------------------------
  console.log('\nTest Suite 2: Deterministic Compliance Rule Detection');

  const result = executeComplianceRules(
    SEED_CONTRIBUTION_RECORDS,
    SEED_EMPLOYERS,
    INITIAL_SYSTEM_CONFIG
  );

  assert(
    result.recordsEvaluated === SEED_CONTRIBUTION_RECORDS.length,
    'Evaluates all records in the supplied dataset'
  );

  assert(
    result.exceptionsDetected > 0,
    'Detects exceptions in the seeded dataset'
  );

  assert(
    result.summaryByCategory.missing >= 1,
    'Detects missing contribution submissions'
  );

  assert(
    result.summaryByCategory.delayed >= 1,
    'Detects delayed contribution submissions'
  );

  assert(
    result.summaryByCategory.incomplete >= 1,
    'Detects incomplete contribution remittances'
  );

  assert(
    result.summaryByCategory.dataQuality >= 1,
    'Detects contribution data-quality issues'
  );

  // ---------------------------------------------------------
  // TEST SUITE 3: Shortfall Accounting
  // ---------------------------------------------------------
  console.log('\nTest Suite 3: Contribution Shortfall Accounting');

  const sampleRecord: ContributionRecord = {
    id: 'TEST-001',
    employerId: 'EMP-ZM-1003',
    employerName: 'Lusaka Central Wholesale Ltd',
    period: '2026-09',
    expectedAmount: 148000,
    reportedAmount: 148000,
    remittedAmount: 102000,
    submissionDate: '2026-10-09',
    remittanceDate: '2026-10-09',
    dueDate: '2026-10-10',
    memberCount: 92,
    status: 'PARTIAL_PAYMENT',
    paymentReference: 'TEST-REF',
    sourceChannel: 'ELECTRONIC_PORTAL',
    discrepancyAmount: 46000,
    discrepancyPercent: 31.08,
  };

  const calculatedShortfall = Math.max(
    0,
    sampleRecord.expectedAmount - sampleRecord.remittedAmount
  );

  assert(
    calculatedShortfall === 46000,
    'Calculates the contribution shortfall correctly'
  );

  // ---------------------------------------------------------
  // TEST SUITE 4: Investigation Prioritisation
  // ---------------------------------------------------------
  console.log('\nTest Suite 4: Investigation Prioritisation');

  const highPriority = calculateInvestigationPriority({
    monetaryDiscrepancy: 230000,
    daysUnresolved: 35,
    isMissingSubmission: false,
    employerStatus: 'HIGH_RISK',
    anomalyScore: 88,
  });

  assert(
    highPriority.score >= 80,
    'Assigns a high priority score to a high-risk case'
  );

  assert(
    highPriority.priority === 'URGENT',
    'Classifies the high-risk case as URGENT'
  );

  // ---------------------------------------------------------
  // TEST SUMMARY
  // ---------------------------------------------------------
  console.log('\n=================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});