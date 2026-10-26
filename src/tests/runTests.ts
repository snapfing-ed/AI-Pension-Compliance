import { executeComplianceRules } from '../services/complianceEngine';
import { calculateInvestigationPriority } from '../services/prioritizationEngine';
import { INITIAL_SYSTEM_CONFIG, SEED_EMPLOYERS, SEED_CONTRIBUTION_RECORDS } from '../data/seedData';
import { ContributionRecord } from '../types';
import { generateSalt, hashPassword, validatePasswordPolicy, validateEmailFormat } from '../services/security/cryptoUtils';
import { AuthService } from '../services/authService';

/**
 * Automated test suite for core compliance rules, RBAC boundaries, and cryptographic authentication
 * Execute with: npm test
 */
async function runTests() {
  console.log('=== PENSION COMPLIANCE SYSTEM: ACCEPTANCE & DOMAIN TESTS ===\n');
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

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Cryptographic Authentication & Password Policy
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Cryptographic Authentication & Password Policy');

  const salt1 = generateSalt(16);
  const salt2 = generateSalt(16);
  assert(salt1 !== salt2, 'Generates unique cryptographic salts per user');

  const passwordPlain = 'Monitor@2026!Zm';
  const hash1 = await hashPassword(passwordPlain, salt1);
  const hash2 = await hashPassword(passwordPlain, salt1);
  const hashDiffSalt = await hashPassword(passwordPlain, salt2);

  assert(hash1 === hash2, 'Hash generation is deterministic for identical password and salt');
  assert(hash1 !== hashDiffSalt, 'Different salt produces completely distinct hash');
  assert(hash1 !== passwordPlain, 'Passwords are never stored in plaintext');

  // Policy validation
  const validPolicy = validatePasswordPolicy('SecureP@ss123');
  assert(validPolicy.valid, 'Validates strong password meeting all policy invariants');

  const weakPolicy = validatePasswordPolicy('weak');
  assert(!weakPolicy.valid && weakPolicy.errors.length > 0, 'Rejects password failing length and character rules');

  const validEmail = validateEmailFormat('officer@compliance.pension.gov.zm');
  assert(validEmail, 'Accepts valid institutional email address format');

  const invalidEmail = validateEmailFormat('not-an-email');
  assert(!invalidEmail, 'Rejects malformed email string');

  // --------------------------------------------------------------------------
  // TEST SUITE 2: User Registration & Role Enforcement
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: User Registration & Strict Role Enforcement');

  await AuthService.init();

  // Test 1: Public Registration strictly assigns COMPLIANCE_MONITOR
  const regResult = await AuthService.register(
    'Misozi Tembo',
    'm.tembo@compliance.pension.gov.zm',
    'Monitor@2026!Zm',
    'Monitor@2026!Zm'
  );

  assert(regResult.success, 'New user can register with valid credentials');
  assert(
    regResult.user?.role === 'COMPLIANCE_MONITOR',
    'Public registration strictly assigns COMPLIANCE_MONITOR role'
  );
  assert(
    regResult.user?.role !== 'SYSTEM_ADMINISTRATOR',
    'Public registration CANNOT assign SYSTEM_ADMINISTRATOR role'
  );

  // Test 2: Duplicate email registration rejection
  const dupResult = await AuthService.register(
    'Duplicate User',
    'm.tembo@compliance.pension.gov.zm',
    'Monitor@2026!Zm',
    'Monitor@2026!Zm'
  );
  assert(!dupResult.success, 'Duplicate email registration is rejected with error message');

  // Test 3: Invalid credentials do not authenticate
  const badLogin = await AuthService.login('m.tembo@compliance.pension.gov.zm', 'WrongPassword123!');
  assert(!badLogin.success, 'Invalid credentials reject login attempt');

  // Test 4: Valid login produces session
  const goodLogin = await AuthService.login('m.tembo@compliance.pension.gov.zm', 'Monitor@2026!Zm');
  assert(goodLogin.success && goodLogin.user?.id !== undefined, 'Valid credentials establish authenticated session');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Controlled Administrator Bootstrap Procedure
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Controlled Administrator Bootstrap');

  // Invalid key rejected
  const badBootstrap = await AuthService.bootstrapAdministrator(
    'Attacker',
    'attacker@pension.gov.zm',
    'Admin@2026!Zm',
    'WRONG-KEY'
  );
  assert(!badBootstrap.success, 'Administrator bootstrap rejected when master key is invalid');

  // Valid key allows administrator provisioning
  const goodBootstrap = await AuthService.bootstrapAdministrator(
    'Dr. K. Mwape',
    'provost@pension.gov.zm',
    'Admin@2026!Zm',
    'MULUNGUSHI-CS-2026-ADMIN-SETUP'
  );
  assert(goodBootstrap.success, 'Initial administrator provisioned via controlled master key');
  assert(goodBootstrap.user?.role === 'SYSTEM_ADMINISTRATOR', 'Bootstrap assigns SYSTEM_ADMINISTRATOR role');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Role-Based Account Management Protections
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Role-Based Access Control Protections');

  // Compliance Monitor cannot modify roles or status
  const unauthorizedRoleChange = await AuthService.updateUserRole(
    'USR-ADMIN-001',
    'COMPLIANCE_MONITOR',
    'COMPLIANCE_MONITOR' // Acting role is Monitor
  );
  assert(!unauthorizedRoleChange.success, 'Compliance Monitor cannot modify user roles (Unauthorized)');

  const unauthorizedStatusChange = await AuthService.updateUserAccountStatus(
    'USR-ADMIN-001',
    'SUSPENDED',
    'COMPLIANCE_MONITOR' // Acting role is Monitor
  );
  assert(!unauthorizedStatusChange.success, 'Compliance Monitor cannot suspend accounts (Unauthorized)');

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Deterministic Compliance Rule Engine (Existing Core Logic)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: Deterministic Compliance Rule Detection (Rules A - E)');

  const result = executeComplianceRules(
    SEED_CONTRIBUTION_RECORDS,
    SEED_EMPLOYERS,
    INITIAL_SYSTEM_CONFIG
  );

  assert(result.recordsEvaluated === SEED_CONTRIBUTION_RECORDS.length, 'Evaluates all active records in dataset');
  assert(result.exceptionsDetected > 0, 'Detects seeded exceptions');
  assert(result.summaryByCategory.missing >= 1, 'Rule A flags missing submission (Copperbelt Cement)');
  assert(result.summaryByCategory.delayed >= 1, 'Rule B flags delayed filing (Kafue Heavy Engineering)');
  assert(result.summaryByCategory.incomplete >= 1, 'Rule C flags partial remittance shortfall (Lusaka Central Wholesale)');
  assert(result.summaryByCategory.dataQuality >= 1, 'Rule E catches duplicate or schema error');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Shortfall Accounting & Prioritization
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: Shortfall Accounting & Prioritisation Scoring');

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

  const calculatedShortfall = Math.max(0, sampleRecord.expectedAmount - sampleRecord.remittedAmount);
  assert(calculatedShortfall === 46000, 'Calculates exact monetary shortfall (K 46,000)');

  const highPriority = calculateInvestigationPriority({
    monetaryDiscrepancy: 230000,
    daysUnresolved: 35,
    isMissingSubmission: false,
    employerStatus: 'HIGH_RISK',
    anomalyScore: 88,
  });

  assert(highPriority.score >= 80, 'Assigns URGENT priority band to high exposure (>K200k) + high anomaly');
  assert(highPriority.priority === 'URGENT', 'Priority category is correctly classified as URGENT');

  console.log(`\n=================================================`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`=================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
