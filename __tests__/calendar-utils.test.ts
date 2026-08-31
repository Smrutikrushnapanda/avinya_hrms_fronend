/**
 * Regression tests for isOrgOffDay and date-key generation.
 *
 * Run:  npx tsx __tests__/calendar-utils.test.ts
 *
 * These tests prove the exact off-day calculation that the mobile-web
 * calendar uses, covering every rule in the organization's config:
 *   - Every Sunday = OFF
 *   - 1st Saturday = OFF
 *   - 3rd Saturday = OFF
 *   - Other Saturdays = WORKING
 */

// ─── Copied from lib/calendar-utils.ts (pure logic, no React deps) ─────────

type AttendanceStatus =
  | "present"
  | "absent"
  | "half-day"
  | "half-leave"
  | "pending"
  | "weekend"
  | "holiday";

function isOrgOffDay(
  date: Date,
  workingDays?: number[],
  weekdayOffRules?: Record<string, number[]>,
): boolean {
  const dow = date.getDay(); // 0=Sun
  const weekNum = Math.ceil(date.getDate() / 7);

  if (Array.isArray(workingDays) && workingDays.length && !workingDays.includes(dow)) return true;

  if (weekdayOffRules && Array.isArray(weekdayOffRules[dow])) {
    if (weekdayOffRules[dow].includes(weekNum)) return true;
  }

  if (!workingDays && !weekdayOffRules) {
    if (dow === 0) return true;
  }

  return false;
}

function mapApiStatus(status: string): AttendanceStatus {
  switch (status?.toLowerCase()) {
    case "present": return "present";
    case "absent": return "absent";
    case "half-day":
    case "half_day": return "half-day";
    case "holiday": return "holiday";
    case "weekend": return "weekend";
    case "on-leave":
    case "half-leave": return "half-leave";
    default: return "pending";
  }
}

/** Build a YYYY-MM-DD key using LOCAL timezone (matching date-fns format()). */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Build a YYYY-MM-DD key using UTC (the BUGGY toISOString pattern). */
function utcDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Organization config: Sunday + 1st/3rd Saturday off ─────────────────────

// workingDays: 0=Sun excluded, 1-6=Mon-Sat
const orgWorkingDays = [1, 2, 3, 4, 5, 6];
// weekdayOffRules: Saturday (6) weeks 1 and 3 off
const orgWeekdayOffRules: Record<string, number[]> = { "6": [1, 3] };

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ─── TEST 1: Every Sunday must be OFF ──────────────────────────────────────

console.log("\n─── TEST 1: Every Sunday must be OFF ───");

const august2026Sundays = [2, 9, 16, 23, 30];
for (const day of august2026Sundays) {
  const d = new Date(2026, 7, day); // August 2026
  assertEqual(d.getDay(), 0, `Aug ${day} is Sunday`);
  assert(isOrgOffDay(d, orgWorkingDays, orgWeekdayOffRules), `Aug ${day} (Sun) must be OFF`);
}

// Sundays in other months
const september2026Sundays = [6, 13, 20, 27];
for (const day of september2026Sundays) {
  const d = new Date(2026, 8, day);
  assertEqual(d.getDay(), 0, `Sep ${day} is Sunday`);
  assert(isOrgOffDay(d, orgWorkingDays, orgWeekdayOffRules), `Sep ${day} (Sun) must be OFF`);
}

const february2026Sundays = [1, 8, 15, 22];
for (const day of february2026Sundays) {
  const d = new Date(2026, 1, day);
  assertEqual(d.getDay(), 0, `Feb ${day} is Sunday`);
  assert(isOrgOffDay(d, orgWorkingDays, orgWeekdayOffRules), `Feb ${day} (Sun) must be OFF`);
}

// ─── TEST 2: 1st Saturday must be OFF ─────────────────────────────────────

console.log("\n─── TEST 2: 1st Saturday must be OFF ───");

// August 2026: 1st Saturday = Aug 1
assert(isOrgOffDay(new Date(2026, 7, 1), orgWorkingDays, orgWeekdayOffRules), "Aug 1 (1st Sat) must be OFF");
// September 2026: 1st Saturday = Sep 5
assert(isOrgOffDay(new Date(2026, 8, 5), orgWorkingDays, orgWeekdayOffRules), "Sep 5 (1st Sat) must be OFF");
// October 2026: 1st Saturday = Oct 3
assert(isOrgOffDay(new Date(2026, 9, 3), orgWorkingDays, orgWeekdayOffRules), "Oct 3 (1st Sat) must be OFF");
// February 2026: 1st Saturday = Feb 7
assert(isOrgOffDay(new Date(2026, 1, 7), orgWorkingDays, orgWeekdayOffRules), "Feb 7 (1st Sat) must be OFF");
// January 2027: 1st Saturday = Jan 2
assert(isOrgOffDay(new Date(2027, 0, 2), orgWorkingDays, orgWeekdayOffRules), "Jan 2 2027 (1st Sat) must be OFF");

// ─── TEST 3: 3rd Saturday must be OFF ─────────────────────────────────────

console.log("\n─── TEST 3: 3rd Saturday must be OFF ───");

// August 2026: 3rd Saturday = Aug 15
assert(isOrgOffDay(new Date(2026, 7, 15), orgWorkingDays, orgWeekdayOffRules), "Aug 15 (3rd Sat) must be OFF");
// September 2026: 3rd Saturday = Sep 19
assert(isOrgOffDay(new Date(2026, 8, 19), orgWorkingDays, orgWeekdayOffRules), "Sep 19 (3rd Sat) must be OFF");
// October 2026: 3rd Saturday = Oct 17
assert(isOrgOffDay(new Date(2026, 9, 17), orgWorkingDays, orgWeekdayOffRules), "Oct 17 (3rd Sat) must be OFF");

// ─── TEST 4: 2nd Saturday must be WORKING ─────────────────────────────────

console.log("\n─── TEST 4: 2nd Saturday must be WORKING ───");

// August 2026: 2nd Saturday = Aug 8
assert(!isOrgOffDay(new Date(2026, 7, 8), orgWorkingDays, orgWeekdayOffRules), "Aug 8 (2nd Sat) must be WORKING");
// September 2026: 2nd Saturday = Sep 12
assert(!isOrgOffDay(new Date(2026, 8, 12), orgWorkingDays, orgWeekdayOffRules), "Sep 12 (2nd Sat) must be WORKING");
// October 2026: 2nd Saturday = Oct 10
assert(!isOrgOffDay(new Date(2026, 9, 10), orgWorkingDays, orgWeekdayOffRules), "Oct 10 (2nd Sat) must be WORKING");

// ─── TEST 5: 4th Saturday must be WORKING ─────────────────────────────────

console.log("\n─── TEST 5: 4th Saturday must be WORKING ───");

// August 2026: 4th Saturday = Aug 22
assert(!isOrgOffDay(new Date(2026, 7, 22), orgWorkingDays, orgWeekdayOffRules), "Aug 22 (4th Sat) must be WORKING");
// September 2026: 4th Saturday = Sep 26
assert(!isOrgOffDay(new Date(2026, 8, 26), orgWorkingDays, orgWeekdayOffRules), "Sep 26 (4th Sat) must be WORKING");
// October 2026: 4th Saturday = Oct 24
assert(!isOrgOffDay(new Date(2026, 9, 24), orgWorkingDays, orgWeekdayOffRules), "Oct 24 (4th Sat) must be WORKING");

// ─── TEST 6: 5th Saturday must be WORKING ─────────────────────────────────

console.log("\n─── TEST 6: 5th Saturday must be WORKING ───");

// August 2026: 5th Saturday = Aug 29
assert(!isOrgOffDay(new Date(2026, 7, 29), orgWorkingDays, orgWeekdayOffRules), "Aug 29 (5th Sat) must be WORKING");
// May 2026: 5th Saturday = May 30
assert(!isOrgOffDay(new Date(2026, 4, 30), orgWorkingDays, orgWeekdayOffRules), "May 30 (5th Sat) must be WORKING");

// ─── TEST 7: August 2026 full expected table ──────────────────────────────

console.log("\n─── TEST 7: August 2026 full expected table ───");

interface ExpectedDay {
  day: number;
  expectedOff: boolean;
  label: string;
}

const august2026Expected: ExpectedDay[] = [
  { day: 1, expectedOff: true,  label: "1st Sat → OFF" },
  { day: 2, expectedOff: true,  label: "Sun → OFF" },
  { day: 3, expectedOff: false, label: "Mon → WORKING" },
  { day: 4, expectedOff: false, label: "Tue → WORKING" },
  { day: 5, expectedOff: false, label: "Wed → WORKING" },
  { day: 6, expectedOff: false, label: "Thu → WORKING" },
  { day: 7, expectedOff: false, label: "Fri → WORKING" },
  { day: 8, expectedOff: false, label: "2nd Sat → WORKING" },
  { day: 9, expectedOff: true,  label: "Sun → OFF" },
  { day: 10, expectedOff: false, label: "Mon → WORKING" },
  { day: 11, expectedOff: false, label: "Tue → WORKING" },
  { day: 12, expectedOff: false, label: "Wed → WORKING" },
  { day: 13, expectedOff: false, label: "Thu → WORKING" },
  { day: 14, expectedOff: false, label: "Fri → WORKING" },
  { day: 15, expectedOff: true,  label: "3rd Sat → OFF" },
  { day: 16, expectedOff: true,  label: "Sun → OFF" },
  { day: 17, expectedOff: false, label: "Mon → WORKING" },
  { day: 18, expectedOff: false, label: "Tue → WORKING" },
  { day: 19, expectedOff: false, label: "Wed → WORKING" },
  { day: 20, expectedOff: false, label: "Thu → WORKING" },
  { day: 21, expectedOff: false, label: "Fri → WORKING" },
  { day: 22, expectedOff: false, label: "4th Sat → WORKING" },
  { day: 23, expectedOff: true,  label: "Sun → OFF" },
  { day: 24, expectedOff: false, label: "Mon → WORKING" },
  { day: 25, expectedOff: false, label: "Tue → WORKING" },
  { day: 26, expectedOff: false, label: "Wed → WORKING" },
  { day: 27, expectedOff: false, label: "Thu → WORKING" },
  { day: 28, expectedOff: false, label: "Fri → WORKING" },
  { day: 29, expectedOff: false, label: "5th Sat → WORKING" },
  { day: 30, expectedOff: true,  label: "Sun → OFF" },
  { day: 31, expectedOff: false, label: "Mon → WORKING" },
];

for (const { day, expectedOff, label } of august2026Expected) {
  const d = new Date(2026, 7, day);
  const actual = isOrgOffDay(d, orgWorkingDays, orgWeekdayOffRules);
  assertEqual(actual, expectedOff, `Aug ${day}: ${label}`);
}

// ─── TEST 8: Date-key generation — local vs UTC ───────────────────────────

console.log("\n─── TEST 8: Date-key generation (local vs UTC) ───");

// For IST users at midnight Aug 1 2026:
// - Local key should be "2026-08-01"
// - UTC toISOString() gives "2026-07-31T18:30:00.000Z" → "2026-07-31" (WRONG!)
function testDateKey(year: number, month: number, day: number, expectedKey: string) {
  const d = new Date(year, month - 1, day);
  const localKey = localDateKey(d);
  const utcKey = utcDateKey(d);
  assertEqual(localKey, expectedKey, `localDateKey(${year}-${month}-${day}) = ${expectedKey}`);
  // UTC key may differ for positive-offset timezones — document it
  if (utcKey !== expectedKey) {
    console.log(`  INFO: utcDateKey(${year}-${month}-${day}) = ${utcKey} (shifted from ${expectedKey})`);
  }
}

testDateKey(2026, 8, 1, "2026-08-01");
testDateKey(2026, 8, 15, "2026-08-15");
testDateKey(2026, 8, 31, "2026-08-31");
testDateKey(2026, 1, 1, "2026-01-01");
testDateKey(2026, 12, 31, "2026-12-31");
testDateKey(2027, 2, 28, "2027-02-28");

// ─── TEST 9: Month boundary — February (no 5th Saturday) ──────────────────

console.log("\n─── TEST 9: February 2026 (no 5th Saturday) ───");

// Feb 2026 starts on Sunday
// Saturdays: Feb 7 (1st), Feb 14 (2nd), Feb 21 (3rd), Feb 28 (4th)
assert(isOrgOffDay(new Date(2026, 1, 1), orgWorkingDays, orgWeekdayOffRules), "Feb 1 (Sun) must be OFF");
assert(isOrgOffDay(new Date(2026, 1, 7), orgWorkingDays, orgWeekdayOffRules), "Feb 7 (1st Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 1, 14), orgWorkingDays, orgWeekdayOffRules), "Feb 14 (2nd Sat) must be WORKING");
assert(isOrgOffDay(new Date(2026, 1, 21), orgWorkingDays, orgWeekdayOffRules), "Feb 21 (3rd Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 1, 28), orgWorkingDays, orgWeekdayOffRules), "Feb 28 (4th Sat) must be WORKING");

// ─── TEST 10: Month starting on Saturday ───────────────────────────────────

console.log("\n─── TEST 10: Month starting on Saturday ───");

// Aug 2026 starts on Saturday (Aug 1 = Saturday)
const aug1 = new Date(2026, 7, 1);
assertEqual(aug1.getDay(), 6, "Aug 1 is Saturday");
assert(isOrgOffDay(aug1, orgWorkingDays, orgWeekdayOffRules), "Aug 1 (1st Sat, starts month) must be OFF");

// Nov 2026 starts on Sunday
const nov1 = new Date(2026, 10, 1);
assertEqual(nov1.getDay(), 0, "Nov 1 is Sunday");
assert(isOrgOffDay(nov1, orgWorkingDays, orgWeekdayOffRules), "Nov 1 (starts month, Sun) must be OFF");

// ─── TEST 11: Month starting on Sunday ─────────────────────────────────────

console.log("\n─── TEST 11: Month starting on Sunday ───");

// Feb 2026 starts on Sunday
const feb1 = new Date(2026, 1, 1);
assertEqual(feb1.getDay(), 0, "Feb 1 is Sunday");
assert(isOrgOffDay(feb1, orgWorkingDays, orgWeekdayOffRules), "Feb 1 (starts month, Sun) must be OFF");

// ─── TEST 12: Default fallback (no settings → Sunday only) ────────────────

console.log("\n─── TEST 12: Default fallback (no settings) ───");

// Without workingDays and weekdayOffRules, only Sundays are off
assert(isOrgOffDay(new Date(2026, 7, 2), undefined, undefined), "Aug 2 (Sun) must be OFF with no settings");
assert(!isOrgOffDay(new Date(2026, 7, 1), undefined, undefined), "Aug 1 (Sat) must be WORKING with no settings");
assert(!isOrgOffDay(new Date(2026, 7, 8), undefined, undefined), "Aug 8 (Sat) must be WORKING with no settings");
assert(!isOrgOffDay(new Date(2026, 7, 3), undefined, undefined), "Aug 3 (Mon) must be WORKING with no settings");

// ─── TEST 13: Multi-tenant — two orgs with different rules ────────────────

console.log("\n─── TEST 13: Multi-tenant — different weekly-off configs ───");

// Org A: Sunday + 1st/3rd Saturday off
const orgA_workingDays = [1, 2, 3, 4, 5, 6];
const orgA_offRules: Record<string, number[]> = { "6": [1, 3] };

// Org B: Only Sunday off (no Saturday rules)
const orgB_workingDays = [1, 2, 3, 4, 5, 6];
const orgB_offRules: Record<string, number[]> = {};

// Aug 1 (1st Saturday) → OFF for Org A, WORKING for Org B
assert(isOrgOffDay(new Date(2026, 7, 1), orgA_workingDays, orgA_offRules), "Org A: Aug 1 (1st Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 7, 1), orgB_workingDays, orgB_offRules), "Org B: Aug 1 (1st Sat) must be WORKING");

// Aug 15 (3rd Saturday) → OFF for Org A, WORKING for Org B
assert(isOrgOffDay(new Date(2026, 7, 15), orgA_workingDays, orgA_offRules), "Org A: Aug 15 (3rd Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 7, 15), orgB_workingDays, orgB_offRules), "Org B: Aug 15 (3rd Sat) must be WORKING");

// Aug 2 (Sunday) → OFF for both
assert(isOrgOffDay(new Date(2026, 7, 2), orgA_workingDays, orgA_offRules), "Org A: Aug 2 (Sun) must be OFF");
assert(isOrgOffDay(new Date(2026, 7, 2), orgB_workingDays, orgB_offRules), "Org B: Aug 2 (Sun) must be OFF");

// ─── TEST 14: mapApiStatus handles "weekend" ───────────────────────────────

console.log("\n─── TEST 14: mapApiStatus handles 'weekend' ───");

assertEqual(mapApiStatus("weekend"), "weekend", "mapApiStatus('weekend') = 'weekend'");
assertEqual(mapApiStatus("Weekend"), "weekend", "mapApiStatus('Weekend') = 'weekend'");
assertEqual(mapApiStatus("WEEKEND"), "weekend", "mapApiStatus('WEEKEND') = 'weekend'");
assertEqual(mapApiStatus("present"), "present", "mapApiStatus('present') = 'present'");
assertEqual(mapApiStatus("absent"), "absent", "mapApiStatus('absent') = 'absent'");
assertEqual(mapApiStatus("holiday"), "holiday", "mapApiStatus('holiday') = 'holiday'");
assertEqual(mapApiStatus("pending"), "pending", "mapApiStatus('pending') = 'pending'");
assertEqual(mapApiStatus(""), "pending", "mapApiStatus('') = 'pending'");

// ─── TEST 15: weekOfMonth calculation ──────────────────────────────────────

console.log("\n─── TEST 15: weekOfMonth calculation ───");

// weekNum = Math.ceil(date.getDate() / 7)
function weekNum(day: number): number {
  return Math.ceil(day / 7);
}

assertEqual(weekNum(1), 1, "Day 1 → week 1");
assertEqual(weekNum(7), 1, "Day 7 → week 1");
assertEqual(weekNum(8), 2, "Day 8 → week 2");
assertEqual(weekNum(14), 2, "Day 14 → week 2");
assertEqual(weekNum(15), 3, "Day 15 → week 3");
assertEqual(weekNum(21), 3, "Day 21 → week 3");
assertEqual(weekNum(22), 4, "Day 22 → week 4");
assertEqual(weekNum(28), 4, "Day 28 → week 4");
assertEqual(weekNum(29), 5, "Day 29 → week 5");
assertEqual(weekNum(31), 5, "Day 31 → week 5");

// ─── TEST 16: Months with only 4 Saturdays ────────────────────────────────

console.log("\n─── TEST 16: Months with only 4 Saturdays ───");

// March 2026: starts on Sunday → Saturdays: 7, 14, 21, 28 (only 4)
const marchSaturdays = [7, 14, 21, 28];
for (const day of marchSaturdays) {
  assertEqual(new Date(2026, 2, day).getDay(), 6, `Mar ${day} is Saturday`);
}
assert(isOrgOffDay(new Date(2026, 2, 7), orgWorkingDays, orgWeekdayOffRules), "Mar 7 (1st Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 2, 14), orgWorkingDays, orgWeekdayOffRules), "Mar 14 (2nd Sat) must be WORKING");
assert(isOrgOffDay(new Date(2026, 2, 21), orgWorkingDays, orgWeekdayOffRules), "Mar 21 (3rd Sat) must be OFF");
assert(!isOrgOffDay(new Date(2026, 2, 28), orgWorkingDays, orgWeekdayOffRules), "Mar 28 (4th Sat) must be WORKING");

// ─── TEST 17: Working weekdays are NOT off ─────────────────────────────────

console.log("\n─── TEST 17: Working weekdays are NOT off ───");

const weekdays = [
  { day: 3, name: "Mon" }, { day: 4, name: "Tue" }, { day: 5, name: "Wed" },
  { day: 6, name: "Thu" }, { day: 7, name: "Fri" },
];
for (const { day, name } of weekdays) {
  assert(!isOrgOffDay(new Date(2026, 7, day), orgWorkingDays, orgWeekdayOffRules), `Aug ${day} (${name}) must be WORKING`);
}

// ─── RESULTS ───────────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"=".repeat(60)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\nAll tests passed!\n");
}
