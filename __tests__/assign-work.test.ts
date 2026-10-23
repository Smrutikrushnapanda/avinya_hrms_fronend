import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { hasWorkDescription, workPointProgress, workPointStatus } from "../lib/assign-work";

function extractWorkPoints(description: string): string[] {
  // A separate process lets the timeout stop a synchronous parsing loop.
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `const { extractWorkPoints } = require(process.argv[1]);
       const input = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
       process.stdout.write(JSON.stringify(extractWorkPoints(input)));`,
      require.resolve("../lib/assign-work"),
    ],
    { input: JSON.stringify(description), encoding: "utf8", timeout: 2_000 },
  );
  return JSON.parse(output);
}

test("plain descriptions return without an infinite loop at offset zero", () => {
  assert.deepEqual(extractWorkPoints("Excel upload feature for all screens"), []);
});

test("numbered descriptions include the first line", () => {
  assert.deepEqual(
    extractWorkPoints("1. Add relationship field\n2. Fix batch dropdown\n12. Review changes"),
    ["Add relationship field", "Fix batch dropdown", "Review changes"],
  );
});

test("dash, dot and star bullets produce trimmed work points", () => {
  assert.deepEqual(
    extractWorkPoints("- Fix login  \n•   Refresh assignments\n* Review progress  "),
    ["Fix login", "Refresh assignments", "Review progress"],
  );
});

test("mixed numbered and bulleted points retain their order", () => {
  assert.deepEqual(
    extractWorkPoints("Summary\n1. Fix admin form\n- Add batch master\n2. Verify data entry"),
    ["Fix admin form", "Add batch master", "Verify data entry"],
  );
});

test("line-by-line descriptions retain every nonempty trimmed point", () => {
  assert.deepEqual(
    extractWorkPoints("  First  \n\n Second\n   \nThird\nFourth\nFifth\nSixth"),
    ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"],
  );
});

test("Windows line endings do not leak carriage returns into work points", () => {
  assert.deepEqual(
    extractWorkPoints("1. Fix admin screen\r\n\r\n2. Verify dropdown\r\n"),
    ["Fix admin screen", "Verify dropdown"],
  );
});

test("empty and whitespace descriptions produce no work points", () => {
  for (const description of ["", " ", "\t\r\n  \n"]) {
    assert.deepEqual(extractWorkPoints(description), []);
  }
});

test("long free text descriptions finish within the process timeout", () => {
  const description = "Update admin form and dropdown. ".repeat(10_000);
  assert.deepEqual(extractWorkPoints(description), []);
});

test("large numbered lists retain all work points", () => {
  const points = Array.from({ length: 1_000 }, (_, index) => `Work item ${index + 1}`);
  const description = points.map((point, index) => `${index + 1}. ${point}`).join("\n");
  assert.deepEqual(extractWorkPoints(description), points);
});

test("checkbox markers and parenthesized numbers produce read-only step text", () => {
  assert.deepEqual(extractWorkPoints("- [ ] Build form\n- [x] Test form\n[X] Review\n4) Release"), [
    "Build form", "Test form", "Review", "Release",
  ]);
});

test("empty list markers never create blank checkboxes", () => {
  assert.deepEqual(extractWorkPoints("- [ ]\n1.\n*\n- Ship"), ["Ship"]);
  assert.deepEqual(extractWorkPoints("- [ ]\n1."), []);
});

test("description requires content beyond whitespace and list markers", () => {
  for (const description of ["", " \n\t", "\u200b", "\u00a0", "- [ ]\n1."]) {
    assert.equal(hasWorkDescription(description), false);
  }
  assert.equal(hasWorkDescription("- [ ] Build form"), true);
  assert.equal(hasWorkDescription("One paragraph of work"), true);
});

test("plain description text retains code tags, comparisons and literal entities", () => {
  assert.deepEqual(extractWorkPoints("- Add <Select> component\n- Test <input> validation"), [
    "Add <Select> component", "Test <input> validation",
  ]);
  assert.deepEqual(extractWorkPoints("- Check x < 10\n- Check y > 0"), [
    "Check x < 10", "Check y > 0",
  ]);
  assert.equal(hasWorkDescription("<Select>"), true);
  assert.equal(hasWorkDescription("&nbsp;"), true);
  assert.deepEqual(extractWorkPoints("- Review 👩‍💻 display\n- Verify"), ["Review 👩‍💻 display", "Verify"]);
});

test("checklist percentage rounds completed steps and can return to zero", () => {
  assert.equal(workPointProgress([]), 0);
  assert.equal(workPointProgress([{ completed: true }, { completed: false }, { completed: false }]), 33);
  assert.equal(workPointProgress([{ completed: true }, { completed: true }, { completed: false }]), 67);
  assert.equal(workPointProgress([{ completed: true }, { completed: true }, { completed: true }]), 100);
  assert.equal(workPointProgress([{ completed: false }, { completed: false }, { completed: false }]), 0);
});

test("large checklists reach one hundred percent only when every point is complete", () => {
  for (const total of [200, 1000]) {
    const points = Array.from({ length: total }, (_, index) => ({ completed: index !== total - 1 }));
    assert.equal(workPointProgress(points), 99);
    assert.equal(workPointStatus("client", "in_progress", workPointProgress(points)), "in_progress");
    points[total - 1].completed = true;
    assert.equal(workPointProgress(points), 100);
  }
});

test("checklist status completes and reopens work without losing issue or cancelled state", () => {
  assert.equal(workPointStatus("client", "pending", 33), "in_progress");
  assert.equal(workPointStatus("client", "in_progress", 100), "completed");
  assert.equal(workPointStatus("client", "completed", 67), "in_progress");
  assert.equal(workPointStatus("client", "completed", 0), "pending");
  assert.equal(workPointStatus("client", "in_progress", 0), "pending");
  assert.equal(workPointStatus("client", "issue", 33), "issue");
  assert.equal(workPointStatus("client", "cancelled", 33), "cancelled");
  assert.equal(workPointStatus("internal", "pending", 100), "resolved");
  assert.equal(workPointStatus("internal", "resolved", 67), "pending");
});
