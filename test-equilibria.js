// Quick test script for equilibrium finding
// Run with: node test-equilibria.js

import { DynamicalSystem1D } from "./src/utils/equationParser.js";
import { findEquilibria1D } from "./src/utils/mathHelpers.js";

console.log("Testing Equilibrium Finder with Hybrid Approach\n");
console.log("=".repeat(50));

// Test Case 1: X² (tangent root at X=0)
console.log("\nTest 1: f(X) = X*X");
console.log("Expected: One equilibrium at X=0 (tangent root)");
const system1 = new DynamicalSystem1D("X*X", []);
const equilibria1 = findEquilibria1D(system1, {}, -1, 1);
console.log(`Found: ${equilibria1.length} equilibria`);
equilibria1.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 2: X³ (inflection point at X=0)
console.log("\nTest 2: f(X) = X*X*X");
console.log("Expected: One equilibrium at X=0 (inflection, sign change)");
const system2 = new DynamicalSystem1D("X*X*X", []);
const equilibria2 = findEquilibria1D(system2, {}, -1, 1);
console.log(`Found: ${equilibria2.length} equilibria`);
equilibria2.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 3: k*X*(1-X) (logistic, two sign-change roots)
console.log("\nTest 3: f(X) = k*X*(1-X) with k=0.5");
console.log("Expected: Two equilibria at X=0 and X=1 (both sign changes)");
const system3 = new DynamicalSystem1D("k*X*(1-X)", ["k"]);
const equilibria3 = findEquilibria1D(system3, { k: 0.5 }, -0.5, 1.5);
console.log(`Found: ${equilibria3.length} equilibria`);
equilibria3.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 4: (X-0.5)² (tangent root at X=0.5)
console.log("\nTest 4: f(X) = (X-0.5)*(X-0.5)");
console.log("Expected: One equilibrium at X=0.5 (tangent root)");
const system4 = new DynamicalSystem1D("(X-0.5)*(X-0.5)", []);
const equilibria4 = findEquilibria1D(system4, {}, 0, 1);
console.log(`Found: ${equilibria4.length} equilibria`);
equilibria4.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 5: X⁴ - X² (multiple roots)
console.log("\nTest 5: f(X) = X*X*X*X - X*X");
console.log("Expected: Three equilibria at X=-1, X=0 (tangent), X=1");
const system5 = new DynamicalSystem1D("X*X*X*X - X*X", []);
const equilibria5 = findEquilibria1D(system5, {}, -1.5, 1.5);
console.log(`Found: ${equilibria5.length} equilibria`);
equilibria5.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

console.log("\n" + "=".repeat(50));
console.log("ADVANCED TESTS WITH TRANSCENDENTAL FUNCTIONS");
console.log("=".repeat(50));

// Test Case 6: sin(X) (sign change roots at multiples of π)
console.log("\nTest 6: f(X) = sin(X)");
console.log(
  "Expected: Three equilibria at X≈-3.14159, 0, 3.14159 (sign changes)",
);
const system6 = new DynamicalSystem1D("sin(X)", []);
const equilibria6 = findEquilibria1D(system6, {}, -4, 4);
console.log(`Found: ${equilibria6.length} equilibria`);
equilibria6.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 7: exp(X) - 1 (sign change at X=0)
console.log("\nTest 7: f(X) = exp(X) - 1");
console.log("Expected: One equilibrium at X=0 (sign change)");
const system7 = new DynamicalSystem1D("exp(X) - 1", []);
const equilibria7 = findEquilibria1D(system7, {}, -2, 2);
console.log(`Found: ${equilibria7.length} equilibria`);
equilibria7.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 8: log(X) (sign change at X=1)
console.log("\nTest 8: f(X) = log(X)");
console.log("Expected: One equilibrium at X=1 (sign change, log crosses zero)");
const system8 = new DynamicalSystem1D("log(X)", []);
const equilibria8 = findEquilibria1D(system8, {}, 0.1, 3);
console.log(`Found: ${equilibria8.length} equilibria`);
equilibria8.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 9: sqrt(X)*sqrt(X) - X (tangent root at X=0, essentially X - X = 0 everywhere)
console.log("\nTest 9: f(X) = X - sqrt(X)*sqrt(X)");
console.log(
  "Expected: Degenerate (identically zero for X≥0) - may find multiple or none",
);
const system9 = new DynamicalSystem1D("X - sqrt(X)*sqrt(X)", []);
const equilibria9 = findEquilibria1D(system9, {}, 0.1, 2);
console.log(`Found: ${equilibria9.length} equilibria`);
equilibria9.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 10: (sin(X))² (tangent roots at multiples of π)
console.log("\nTest 10: f(X) = sin(X)*sin(X)");
console.log("Expected: Three tangent roots at X≈-3.14159, 0, 3.14159");
const system10 = new DynamicalSystem1D("sin(X)*sin(X)", []);
const equilibria10 = findEquilibria1D(system10, {}, -4, 4);
console.log(`Found: ${equilibria10.length} equilibria`);
equilibria10.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

// Test Case 11: exp(-X*X) in [5,6] (near-root, should find nothing)
console.log("\nTest 11: f(X) = exp(-X*X) in [5, 6]");
console.log(
  "Expected: Zero equilibria (function very small ~1e-11 but never zero)",
);
const system11 = new DynamicalSystem1D("exp(-X*X)", []);
const equilibria11 = findEquilibria1D(system11, {}, 5, 6);
console.log(`Found: ${equilibria11.length} equilibria`);
if (equilibria11.length > 0) {
  equilibria11.forEach((eq) => {
    const val = system11.evaluateDerivative(eq, {});
    console.log(`  X* = ${eq.toFixed(6)}, f(X*) = ${val.toExponential(3)}`);
  });
} else {
  console.log(
    "  (Correctly found no roots - function approaches but never reaches zero)",
  );
}

// Test Case 12: X*exp(-X) - 0.1 (transcendental with sign changes)
console.log("\nTest 12: f(X) = X*exp(-X) - 0.1");
console.log(
  "Expected: Two equilibria (transcendental equation with two solutions)",
);
const system12 = new DynamicalSystem1D("X*exp(-X) - 0.1", []);
const equilibria12 = findEquilibria1D(system12, {}, 0, 5);
console.log(`Found: ${equilibria12.length} equilibria`);
equilibria12.forEach((eq) => console.log(`  X* = ${eq.toFixed(6)}`));

console.log("\n" + "=".repeat(50));
console.log("Testing complete!");
