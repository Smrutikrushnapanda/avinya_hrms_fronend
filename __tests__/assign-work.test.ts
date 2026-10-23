import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

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
  assert.deepEqual(extractWorkPoints("Excel upload feature for all screens"), [
    "Excel upload feature for all screens",
  ]);
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

test("unstructured descriptions use the first five nonempty trimmed lines", () => {
  assert.deepEqual(
    extractWorkPoints("  First  \n\n Second\n   \nThird\nFourth\nFifth\nSixth"),
    ["First", "Second", "Third", "Fourth", "Fifth"],
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
  assert.deepEqual(extractWorkPoints(description), [description.trim()]);
});

test("large numbered lists retain all work points", () => {
  const points = Array.from({ length: 1_000 }, (_, index) => `Work item ${index + 1}`);
  const description = points.map((point, index) => `${index + 1}. ${point}`).join("\n");
  assert.deepEqual(extractWorkPoints(description), points);
});
