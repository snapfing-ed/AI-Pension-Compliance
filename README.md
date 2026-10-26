# Pension Compliance Intelligence System
## AI-Based Pension Contribution Compliance Monitoring System
**Mulungushi University — Bachelor of Science in Computer Science Capstone Project**

---

### 1. Project Overview & Objectives
This application is an administrative decision-support system designed for authorised pension compliance personnel. It monitors employer pension contributions, detects compliance exceptions and anomalous contribution distributions, prioritises investigations through multi-factor scoring, and produces comprehensive compliance reports.

The prototype directly fulfills the three official capstone research objectives:
1. **Objective 1 (Detection & Anomaly Engine):** Combines deterministic rule-based compliance checking (Rules A through E) with a replaceable statistical anomaly detection model (Isolation Forest + Z-score deviation).
2. **Objective 2 (Cloud-Ready Operational Dashboard):** Provides a 13-module administrative dashboard with real-time recalculation, tripartite reconciliation, prioritised investigation queues, and case management workflows.
3. **Objective 3 (Empirical Evaluation):** Features a dedicated model evaluation module reporting Precision (91.3%), Recall (93.3%), F1-Score (92.3%), Specificity (98.2%), Confusion Matrix metrics, and sub-millisecond execution benchmarks.

---

### 2. Authentication & Two-Role RBAC Implementation

**All simulated user switching and demo dropdowns have been removed.** The system features a genuine authentication gateway and persistent browser storage.

#### A. Role Separation
- **ROLE 1: SYSTEM ADMINISTRATOR (`SYSTEM_ADMINISTRATOR`)**
  - Access: System Administration Console, User Management, Account Activation/Suspension, Role Reallocation, Registration Approval, System Settings & Filing Deadlines, Security Audit Logs, Model Specs, and Read-Only Compliance Oversight.
  - Restrictions: Cannot delete audit history or bypass validation.
- **ROLE 2: COMPLIANCE MONITOR / SUPERVISOR (`COMPLIANCE_MONITOR`)**
  - Access: Compliance Monitoring Dashboard, Employer Cadastre, Members Directory, Contribution Reconciliation Ledger, Rule-Based Engine Checks, AI Anomaly Analysis & Explainability, Prioritised Work Queue, Investigation Cases, Evidence Notes, Outcomes, and Compliance Reports.
  - Restrictions: Prohibited from accessing user management, reallocating roles, modifying security settings, or viewing administrative credentials. Direct navigation triggers an **Access Denied** response and logs an audit security event.

#### B. Cryptographic Storage & Persistence
- **IndexedDB Database:** Account records and session tokens persist in the browser's `PensionCompliancePrototypeDB` across page reloads.
- **SHA-256 Salted Hashing:** Passwords are cryptographically salted (16-byte random salt) and hashed using standard SHA-256. Plaintext passwords are never stored.
- **Public Registration Invariant:** Public registration exclusively provisions `COMPLIANCE_MONITOR` accounts. Public users cannot request or assign themselves administrator status.
- **Controlled Administrator Bootstrap:** The `SYSTEM_ADMINISTRATOR` role is provisioned exclusively through a controlled bootstrap gateway requiring the master setup key (`MULUNGUSHI-CS-2026-ADMIN-SETUP`).

#### C. Seeded Evaluation Credentials
For rapid evaluation in a fresh browser session:
- **System Administrator:** `admin@pension.gov.zm` / `Admin@2026!Zm`
- **Compliance Monitor:** `monitor@pension.gov.zm` / `Monitor@2026!Zm`

---

### 3. Architecture & Layer Separation

```
├── Authentication & Security Layer
│   ├── src/services/security/cryptoUtils.ts # SHA-256 + Salt hashing & password policy
│   ├── src/services/db/indexedDB.ts        # IndexedDB storage for accounts and sessions
│   ├── src/services/authService.ts         # Authentication, registration, and RBAC service
│   ├── src/context/AuthContext.tsx         # Global session state & authentication provider
│   ├── src/components/auth/AccessDeniedView.tsx # Route & action permission guards
│   └── src/views/auth/                     # Login, Registration & Administrator Bootstrap screens
│
├── Presentation Layer
│   ├── src/App.tsx                        # Router coordinating authentication gateway & views
│   ├── src/components/layout/Sidebar.tsx  # Dynamic RBAC sidebar navigation (no simulated switcher)
│   ├── src/components/layout/Header.tsx   # Verified identity, breadcrumbs, and Sign Out
│   └── src/views/                         # 13 dedicated operational views (Admin Console & Monitor Dashboard)
│
├── Domain & Business Rules Layer
│   ├── src/services/complianceEngine.ts   # Deterministic Rules (A: Missing, B: Late, C: Shortfall, D: Unusual, E: Quality)
│   ├── src/services/prioritizationEngine.ts# Multi-factor investigation queue scoring formula
│   └── src/types/index.ts                 # Strongly-typed domain models
│
├── AI / Machine Learning Service Layer
│   └── src/services/anomalyService.ts     # Replaceable Isolation Forest + Z-score deviation model with feature explainability
│
└── Testing & Utilities
    ├── src/tests/runTests.ts              # 28 automated tests for Auth, RBAC, and Domain Logic
    └── src/utils/formatters.ts            # Zambian Kwacha (ZMW), date, and CSV parser/generator
```

---

### 4. Running and Testing

```bash
# Run Development Server
npm run dev

# Run Automated Acceptance Tests (28 tests)
npm test

# Run TypeScript Linter & Production Build
npm run lint
npm run build
```
