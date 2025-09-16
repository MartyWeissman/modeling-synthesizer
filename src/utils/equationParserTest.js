// src/utils/equationParserTest.js
// Comprehensive test suite for the equation parser

import { CompiledEquation, DynamicalSystem } from './equationParser.js';

/**
 * Test cases for equation parser
 * Each test has: equation, test points, expected results, description
 */
const testCases = [
  // Basic arithmetic operations
  {
    equation: "X + Y",
    testPoints: [[1, 2], [0, 0], [-1, 3]],
    expected: [3, 0, 2],
    description: "Basic addition"
  },
  {
    equation: "X - Y",
    testPoints: [[5, 3], [0, 2], [-1, -4]],
    expected: [2, -2, 3],
    description: "Basic subtraction"
  },
  {
    equation: "X * Y",
    testPoints: [[2, 3], [0, 5], [-2, 4]],
    expected: [6, 0, -8],
    description: "Basic multiplication"
  },
  {
    equation: "X / Y",
    testPoints: [[6, 2], [10, 5], [-8, 4]],
    expected: [3, 2, -2],
    description: "Basic division"
  },
  {
    equation: "X^2",
    testPoints: [[3, 0], [-2, 0], [0, 0]],
    expected: [9, 4, 0],
    description: "Power operation"
  },

  // Basic functions
  {
    equation: "sin(X)",
    testPoints: [[0, 0], [Math.PI/2, 0], [Math.PI, 0]],
    expected: [0, 1, Math.sin(Math.PI)], // Math.sin(π) ≈ 0 (small floating point error)
    description: "Sine function",
    tolerance: 1e-10
  },
  {
    equation: "cos(Y)",
    testPoints: [[0, 0], [0, Math.PI/2], [0, Math.PI]],
    expected: [1, Math.cos(Math.PI/2), -1], // Math.cos(π/2) ≈ 0
    description: "Cosine function",
    tolerance: 1e-10
  },
  {
    equation: "tan(X)",
    testPoints: [[0, 0], [Math.PI/4, 0]],
    expected: [0, 1],
    description: "Tangent function"
  },
  {
    equation: "sqrt(X)",
    testPoints: [[4, 0], [9, 0], [16, 0]],
    expected: [2, 3, 4],
    description: "Square root function"
  },
  {
    equation: "exp(X)",
    testPoints: [[0, 0], [1, 0], [2, 0]],
    expected: [1, Math.E, Math.E * Math.E],
    description: "Exponential function"
  },
  {
    equation: "log(X)",
    testPoints: [[1, 0], [Math.E, 0], [Math.E * Math.E, 0]],
    expected: [0, 1, 2],
    description: "Natural logarithm"
  },
  {
    equation: "abs(X)",
    testPoints: [[5, 0], [-3, 0], [0, 0]],
    expected: [5, 3, 0],
    description: "Absolute value"
  },
  {
    equation: "pow(X, Y)",
    testPoints: [[2, 3], [5, 2], [3, 4]],
    expected: [8, 25, 81],
    description: "Power function"
  },

  // Constants
  {
    equation: "pi",
    testPoints: [[0, 0]],
    expected: [Math.PI],
    description: "Pi constant"
  },
  {
    equation: "e",
    testPoints: [[0, 0]],
    expected: [Math.E],
    description: "E constant"
  },
  {
    equation: "pi * X",
    testPoints: [[1, 0], [2, 0]],
    expected: [Math.PI, 2 * Math.PI],
    description: "Pi in expression"
  },

  // Negative numbers
  {
    equation: "-X",
    testPoints: [[5, 0], [-3, 0], [0, 0]],
    expected: [-5, 3, 0],
    description: "Leading negative sign"
  },
  {
    equation: "-sin(X)",
    testPoints: [[0, 0], [Math.PI/2, 0]],
    expected: [0, -1],
    description: "Negative function result"
  },

  // Complex expressions
  {
    equation: "sin(pi * X) + cos(e * Y)",
    testPoints: [[0.5, 0], [1, 0]],
    expected: [Math.sin(Math.PI * 0.5) + Math.cos(Math.E * 0), Math.sin(Math.PI * 1) + Math.cos(Math.E * 0)],
    description: "Complex expression with constants and functions",
    tolerance: 1e-10
  },
  {
    equation: "sqrt(X^2 + Y^2)",
    testPoints: [[3, 4], [0, 5], [12, 5]],
    expected: [5, 5, 13],
    description: "Distance formula"
  },
  {
    equation: "exp(-X^2) * cos(Y)",
    testPoints: [[0, 0], [1, Math.PI/2]],
    expected: [Math.exp(0) * Math.cos(0), Math.exp(-1) * Math.cos(Math.PI/2)],
    description: "Gaussian-like function",
    tolerance: 1e-10
  }
];

/**
 * Error test cases - these should fail compilation
 */
const errorTestCases = [
  {
    equation: "x + y", // lowercase variables
    description: "Lowercase variables should error"
  },
  {
    equation: "X++",
    description: "Invalid syntax should error"
  },
  {
    equation: "foo(X)",
    description: "Unknown function should error"
  },
  {
    equation: "X + ",
    description: "Incomplete expression should error"
  },
  {
    equation: "(X + Y",
    description: "Mismatched parentheses should error"
  },
  {
    equation: "",
    description: "Empty equation should error"
  },
  {
    equation: "X*/Y",
    description: "Consecutive operators should error"
  }
];

/**
 * Test runner function
 */
function runEquationParserTests() {
  console.log("🧪 Running Equation Parser Test Suite");
  console.log("=====================================");

  let passCount = 0;
  let failCount = 0;

  // Test valid equations
  console.log("\n📊 Testing Valid Equations:");
  console.log("----------------------------");

  testCases.forEach((testCase, index) => {
    const { equation, testPoints, expected, description, tolerance = 1e-12 } = testCase;

    try {
      const compiledEq = new CompiledEquation(equation);

      if (!compiledEq.isValid) {
        console.log(`❌ Test ${index + 1}: ${description}`);
        console.log(`   Equation: ${equation}`);
        console.log(`   Error: ${compiledEq.getError()}`);
        failCount++;
        return;
      }

      let testPassed = true;
      const results = [];

      for (let i = 0; i < testPoints.length; i++) {
        const [x, y] = testPoints[i];
        const result = compiledEq.evaluate(x, y);
        const expectedValue = expected[i];

        const diff = Math.abs(result - expectedValue);
        const withinTolerance = diff <= tolerance;

        results.push({ x, y, result, expected: expectedValue, diff, withinTolerance });

        if (!withinTolerance) {
          testPassed = false;
        }
      }

      if (testPassed) {
        console.log(`✅ Test ${index + 1}: ${description}`);
        passCount++;
      } else {
        console.log(`❌ Test ${index + 1}: ${description}`);
        console.log(`   Equation: ${equation}`);
        results.forEach(r => {
          if (!r.withinTolerance) {
            console.log(`   At (${r.x}, ${r.y}): got ${r.result}, expected ${r.expected}, diff ${r.diff}`);
          }
        });
        failCount++;
      }

    } catch (error) {
      console.log(`❌ Test ${index + 1}: ${description}`);
      console.log(`   Equation: ${equation}`);
      console.log(`   Unexpected error: ${error.message}`);
      failCount++;
    }
  });

  // Test error cases
  console.log("\n🚫 Testing Error Cases:");
  console.log("------------------------");

  errorTestCases.forEach((testCase, index) => {
    const { equation, description } = testCase;

    try {
      const compiledEq = new CompiledEquation(equation);

      if (compiledEq.isValid) {
        console.log(`❌ Error Test ${index + 1}: ${description}`);
        console.log(`   Equation: "${equation}" should have failed but compiled successfully`);
        failCount++;
      } else {
        console.log(`✅ Error Test ${index + 1}: ${description}`);
        console.log(`   Correctly rejected: "${equation}" - ${compiledEq.getError()}`);
        passCount++;
      }

    } catch (error) {
      console.log(`✅ Error Test ${index + 1}: ${description}`);
      console.log(`   Correctly threw error: "${equation}" - ${error.message}`);
      passCount++;
    }
  });

  // Test dynamical system
  console.log("\n🔄 Testing Dynamical System:");
  console.log("-----------------------------");

  try {
    const system = new DynamicalSystem("Y", "-X");

    if (system.isValidSystem()) {
      const field1 = system.evaluateField(1, 0);
      const field2 = system.evaluateField(0, 1);

      const expectedField1 = { vx: 0, vy: -1 };
      const expectedField2 = { vx: 1, vy: 0 };

      const system1Valid = Math.abs(field1.vx - expectedField1.vx) < 1e-12 &&
                          Math.abs(field1.vy - expectedField1.vy) < 1e-12;
      const system2Valid = Math.abs(field2.vx - expectedField2.vx) < 1e-12 &&
                          Math.abs(field2.vy - expectedField2.vy) < 1e-12;

      if (system1Valid && system2Valid) {
        console.log(`✅ Dynamical System: Circular field X'=Y, Y'=-X`);
        passCount++;
      } else {
        console.log(`❌ Dynamical System: Field evaluation mismatch`);
        console.log(`   At (1,0): got (${field1.vx}, ${field1.vy}), expected (0, -1)`);
        console.log(`   At (0,1): got (${field2.vx}, ${field2.vy}), expected (1, 0)`);
        failCount++;
      }
    } else {
      console.log(`❌ Dynamical System: Failed to compile - ${system.getError()}`);
      failCount++;
    }
  } catch (error) {
    console.log(`❌ Dynamical System: Unexpected error - ${error.message}`);
    failCount++;
  }

  // Summary
  console.log("\n📈 Test Summary:");
  console.log("=================");
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${passCount + failCount}`);
  console.log(`🎯 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log("\n🎉 All tests passed! Equation parser is working correctly.");
  } else {
    console.log(`\n⚠️  ${failCount} test(s) failed. Please review the issues above.`);
  }

  return { passed: passCount, failed: failCount, total: passCount + failCount };
}

/**
 * Quick test function for specific equation
 */
function testEquation(equation, x, y) {
  console.log(`\n🔬 Quick Test: "${equation}" at (${x}, ${y})`);

  try {
    const compiled = new CompiledEquation(equation);

    if (compiled.isValid) {
      const result = compiled.evaluate(x, y);
      console.log(`✅ Result: ${result}`);
      return result;
    } else {
      console.log(`❌ Compilation Error: ${compiled.getError()}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Unexpected Error: ${error.message}`);
    return null;
  }
}

export { runEquationParserTests, testEquation, testCases, errorTestCases };
