import assert from 'node:assert/strict';
import { tabFromPathname } from '../context/AppContext';

assert.equal(tabFromPathname('/'), null);
assert.equal(tabFromPathname('/login'), null);
assert.equal(tabFromPathname('/change-password'), null);
assert.equal(tabFromPathname('/admin-overview'), 'admin-overview');
assert.equal(tabFromPathname('/employers'), 'employers');
assert.equal(tabFromPathname('/returns-payments/'), 'returns-payments');
assert.equal(tabFromPathname('/compliance'), 'compliance');
assert.equal(tabFromPathname('/cases'), 'cases');
assert.equal(tabFromPathname('/unknown-route'), null);

console.log('ALL FRONTEND ROUTE TESTS PASSED');