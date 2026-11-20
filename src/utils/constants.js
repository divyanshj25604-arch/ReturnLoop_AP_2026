// Allowed values shared by validation, the engine and the database constraints.
// Keep in sync with dbms/03_schema.sql and docs/api.md.

const RETURN_STATUSES = [
  'RECEIVED',
  'UNDER_INSPECTION',
  'EVALUATED',
  'DECIDED',
  'COMPLETED',
  'CANCELLED',
];

const DISPOSITIONS = ['Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off'];

const CONDITION_GRADES = ['Excellent', 'Good', 'Fair', 'Damaged'];

const FUNCTIONAL_STATUSES = [
  'Fully Functional',
  'Minor Glitch',
  'Defective Hardware',
  'Non-functional',
];

// Ordered from lowest to highest access.
const APP_ROLES = ['INSPECTOR', 'SUPERVISOR', 'ADMIN'];

module.exports = {
  RETURN_STATUSES,
  DISPOSITIONS,
  CONDITION_GRADES,
  FUNCTIONAL_STATUSES,
  APP_ROLES,
};
