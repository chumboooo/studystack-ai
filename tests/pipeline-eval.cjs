/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const { buildStructuredDocument } = require("../src/lib/documents/structure.ts");
const { normalizePlainTextMath } = require("../src/lib/math/normalize.ts");
const { decomposeQueryParts } = require("../src/lib/retrieval/query-parts.ts");

function testQueryPlanning() {
  const sequence = decomposeQueryParts("Explain demand and then equilibrium");
  assert.equal(sequence.isMultiPart, true);
  assert.deepEqual(sequence.parts, ["demand", "equilibrium"]);

  const comparison = decomposeQueryParts("Compare mitosis and meiosis");
  assert.equal(comparison.intent, "comparison");
  assert.deepEqual(comparison.parts, ["mitosis", "meiosis"]);

  const ordinal = decomposeQueryParts("Tell me about Newton's First and Second Laws");
  assert.equal(ordinal.isMultiPart, true);
  assert.equal(ordinal.parts.length, 2);
}

function testMathNormalization() {
  const formula = normalizePlainTextMath("int u dv = uv - int v du");
  assert.match(formula, /\\int u\\,dv/);
  assert.match(formula, /\\int v\\,du/);
  assert.match(normalizePlainTextMath("dy/dx"), /\\frac\{dy\}\{dx\}/);
  assert.match(normalizePlainTextMath("sqrt(x)"), /\\sqrt\{x\}/);
  assert.equal(normalizePlainTextMath("This paragraph is normal prose."), "This paragraph is normal prose.");
}

function testStructuredIngestion() {
  const structured = buildStructuredDocument({
    title: "Compact Technical Notes",
    rawText: [
      "Integration Methods",
      "Recall the product rule.",
      "d/dx [u(x)v(x)] = u dv/dx + v du/dx",
      "Therefore int u dv = uv - int v du",
      "Example 1",
      "Let u = x and dv = cos(x) dx.",
    ].join("\n"),
    pages: [
      {
        pageNumber: 1,
        text: [
          "Integration Methods",
          "Recall the product rule.",
          "d/dx [u(x)v(x)] = u dv/dx + v du/dx",
          "Therefore int u dv = uv - int v du",
        ].join("\n"),
        lines: [
          "Integration Methods",
          "Recall the product rule.",
          "d/dx [u(x)v(x)] = u dv/dx + v du/dx",
          "Therefore int u dv = uv - int v du",
        ],
      },
      {
        pageNumber: 2,
        text: ["Example 1", "Let u = x and dv = cos(x) dx."].join("\n"),
        lines: ["Example 1", "Let u = x and dv = cos(x) dx."],
      },
    ],
  });

  assert.equal(structured.version, "structured-study-v1");
  assert.equal(structured.pages.length, 2);
  assert.ok(structured.nodes.some((node) => node.nodeType === "page"));
  assert.ok(structured.nodes.some((node) => node.nodeType === "section"));
  assert.ok(structured.chunks.length >= 2);
  assert.ok(structured.chunks.some((chunk) => chunk.metadata.has_math));
  assert.ok(structured.chunks.some((chunk) => chunk.metadata.example_count && chunk.metadata.example_count > 0));
}

testQueryPlanning();
testMathNormalization();
testStructuredIngestion();

console.log("Pipeline evals passed.");
