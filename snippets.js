'use strict';

// Each record is a complete sample so rotation can remove it as a unit.
function frameFor(language) {
  const frames = {
    'Git Config': ['[sample]\n', ''], INI: ['[sample]\n', ''],
    'Ansible (YAML)': ['- hosts: localhost\n  gather_facts: false\n  tasks:\n', ''],
    'OpenAPI (YAML)': ['openapi: 3.0.3\ninfo: {title: Samples, version: "1"}\npaths:\n', ''],
    'Vagrantfile (Ruby)': ['Vagrant.configure("2") do |config|\n', 'end\n'],
    'Protocol Buffers': ['syntax = "proto3";\n', ''], Dockerfile: ['FROM scratch\n', ''],
    Containerfile: ['FROM scratch\n', ''], Go: ['package samples\n', ''],
    XML: ['<samples>\n', '</samples>\n'], Vue: ['<template>\n  <main>\n', '  </main>\n</template>\n'],
    Nix: ['{\n', '}\n'], 'WebAssembly (WAT)': ['(module\n', ')\n'],
    Whitespace: ['', '\n\n\n'],
    QML: ['import QtQuick 2.15\nItem {\n', '}\n']
  };
  return Object.hasOwn(frames, language.label) ? frames[language.label] : ['', ''];
}
function headerFor(language) {
  const caution = 'Activity Lab generated this sample for a local simulation.';
  const custom = {
    ABAP: `* ${caution}`, COBOL: `      * ${caution}`, Smalltalk: `"${caution}"`,
    'WebAssembly (WAT)': `;; ${caution}`, Racket: `#lang racket\n; ${caution}`,
    Forth: `\\ ${caution}`, Brainfuck: 'ActivityLabSimulation', SAS: `* ${caution};`,
    Jinja: `{# ${caution} #}`, Twig: `{# ${caution} #}`, Pug: `//- ${caution}`,
    reStructuredText: `.. ${caution}\n`, Cypher: `// ${caution}`,
    Reason: `/* ${caution} */`, PHP: `<?php /* ${caution} */ ?>`, 'Regular Expression': `(?:ActivityLabSimulation)`
  };
  if (language.label === 'Whitespace') return 'ActivityLabSimulation';
  if (Object.hasOwn(custom, language.label)) return custom[language.label] + '\n';
  switch (language.comment) {
    case 'csv': return 'synthetic_test,value\n';
    case 'html': case 'xml': return `<!-- ${caution} -->\n`;
    case 'css': return `/* ${caution} */\n`;
    case 'markdown': return `<!-- ${caution} -->\n# Activity Lab Synthetic Notes\n`;
    case 'sql': case 'dash': return `-- ${caution}\n`;
    case 'semi': return `; ${caution}\n`;
    case 'percent': return `% ${caution}\n`;
    case 'bang': return `! ${caution}\n`;
    case 'paren': return `(* ${caution} *)\n`;
    case 'brace': return `{ ${caution} }\n`;
    case 'star': return `* ${caution}\n`;
    case 'quote': return `' ${caution}\n`;
    case 'rem': return `REM ${caution}\n`;
    case 'slash': return `// ${caution}\n`;
    default: return `# ${caution}\n`;
  }
}

const forms = {
  python: ['{snake} = [i * {a} for i in range({b})]', 'def {snake}(value):\n    return min(value, {a})', 'class {type}:\n    limit = {a}', 'for item in range({b}):\n    if item % 2:\n        {snake} = item'],
  javascript: ['const {camel} = [{a}, {b}].filter(value => value > 0);', 'function {camel}(value) {\n  return Math.min(value, {a});\n}', 'class {type} {\n  limit = {a};\n}'],
  javascriptreact: ['function {type}() { return <output>{{a}}</output>; }', 'const {camel} = <section aria-label="{words}"><span>{{b}}</span></section>;'],
  typescript: ['const {camel}: number[] = [{a}, {b}];', 'function {camel}(value: number): number {\n  return Math.min(value, {a});\n}', 'interface {type} {\n  count: number;\n  active?: boolean;\n}'],
  typescriptreact: ['function {type}({ count }: { count: number }) {\n  return <output>{count}</output>;\n}', 'const {camel} = (value: number) => <span>{value + {a}}</span>;'],
  c: ['static int {snake}(int n) {\n    return n > {a} ? {a} : n;\n}', 'enum { {upper} = {b} };', 'struct {snake} { int offset; int values[{b}]; };'],
  cpp: ['struct {type} { int count = {a}; };', 'constexpr int {snake}(int value) { return value < {b} ? 0 : value; }'],
  csharp: ['class {type} { public int Limit => {a}; }', 'record {type}(int Count, bool Enabled);'],
  java: ['class {type} {\n    static int cap(int value) { return Math.min(value, {a}); }\n}', 'enum {type} { READY, WAITING }', 'record {type}(int count, boolean active) {}'],
  go: ['func {camel}(value int) int {\n\tif value < {b} { return 0 }\n\treturn value\n}', 'type {type} struct { Count int }', 'var {camel} = []int{{a}, {b}}'],
  rust: ['fn {snake}(value: usize) -> usize { value.min({a}) }', 'struct {type} { count: usize, enabled: bool }', 'const {upper}: [u8; 2] = [{a}, {b}];'],
  sql: ['SELECT {a} AS {snake};', 'SELECT CASE WHEN {b} < {a} THEN {b} ELSE {a} END AS {snake};', 'SELECT SUM(amount) AS {snake} FROM (SELECT {a} AS amount UNION ALL SELECT {b}) samples;'],
  shellscript: ['{snake}=$(( {a} + {b} ))', '{snake}() {\n  printf \'%s\\n\' "${1:-{a}}"\n}', 'for {snake} in {a} {b}; do printf \'%s\\n\' "${snake}"; done'],
  fish: ['set -l {snake} {a} {b}', 'function {snake}\n    math "$argv[1] + {a}"\nend'],
  powershell: ['${camel} = @({a}, {b}) | Where-Object { $_ -gt 0 }', 'function Get-{type} { param([int]$Value) [Math]::Min($Value, {a}) }'],
  html: ['<section id="{kebab}"><h2>{title}</h2></section>', '<output data-limit="{a}">{b}</output>'],
  css: ['.{kebab} { padding: {b}px; }', '.{kebab} {\n  display: grid;\n  gap: {b}px;\n}'],
  sass: ['.{kebab}\n  padding: {b}px', '${kebab}: {a}px'],
  yaml: ['{snake}: [{a}, {b}]', '{snake}:\n  limit: {a}\n  enabled: true'],
  toml: ['{snake} = [{a}, {b}]', '{snake} = { limit = {a}, enabled = true }'],
  ini: ['{snake} = {a}', '{snake} = "{words}"'],
  markdown: ['## {title}\n', 'The {words} sample uses a limit of `{a}`.\n'],
  xml: ['  <sample id="{kebab}" limit="{a}"/>', '  <range name="{snake}"><min>{b}</min><max>{a}</max></range>'],
  csv: ['{snake},{a}', '"{words} {n}",{b}'],
  lua: ['local {snake} = {{a}, {b}}', 'local function {snake}(value)\n  return math.min(value, {a})\nend'],
  ruby: ['{snake} = [{a}, {b}].select(&:positive?)', 'def {snake}(value)\n  [value, {a}].min\nend'],
  php: ['<?php function {camel}(int $value): int { return min($value, {a}); } ?>', '<?php ${camel} = array_sum([{a}, {b}]); ?>'],
  abap: ['DATA {snake} TYPE i VALUE {a}.', 'CONSTANTS {snake} TYPE i VALUE {b}.'],
  ada: ['function {snake} (Value : Integer) return Integer is (Integer\'Min (Value, {a}));', '{snake} : constant Integer := {a} + {b};'],
  apex: ['public class {type} { public Integer limitValue = {a}; }', 'public enum {type} { Ready, Waiting }'],
  asciidoc: ['== {title}\n', 'Set `{snake}` to {a} for this sample.\n'],
  asm: ['{snake}: mov eax, {a}', '{snake}: add ecx, {b}'],
  bat: ['set /a "{snake}={a}+{b}"', 'if {a} GTR {b} set "{snake}=ready"'],
  bibtex: ['@misc{{snake}, title = {{title}}, year = {2026}}', '@book{{snake}, title = {{title}}, author = {Sample Team}, publisher = {Test Press}, year = {2026}}'],
  brainfuck: ['{plus}[>++<-]>', '>{plus}[<+>-]<'],
  clojure: ['(def {kebab} [{a} {b}])', '(defn {kebab} [value] (min value {a}))'],
  cmake: ['set({upper} {a} {b})', 'math(EXPR {upper} "{a} + {b}")'],
  cobol: ['       01 {kebab} PIC 99 VALUE {a}.', '       01 {kebab} PIC X({b}) VALUE SPACES.'],
  coffeescript: ['{camel} = (value) -> Math.min value, {a}', '{camel} = (n * {b} for n in [1..{a}])'],
  lisp: ['(defun {kebab} (value) (min value {a}))', '(defvar *{kebab}* (list {a} {b}))'],
  dockerfile: ['ARG {upper}={a}', 'LABEL sample.{kebab}="{words}"'],
  crystal: ['{snake} = [{a}, {b}].sum', 'def {snake}(value : Int32) : Int32\n  value.clamp(0, {a})\nend'],
  cypher: ['UNWIND [{a}, {b}] AS value RETURN sum(value) AS {snake};', 'RETURN {{camel}: {a}, active: true} AS sample;'],
  d: ['enum {camel} = {a};', 'int {camel}(int value) { return value < {a} ? value : {a}; }'],
  dart: ['final {camel} = <int>[{a}, {b}];', 'class {type} {\n  final int limit = {a};\n}'],
  pascal: ['const {type} = {a};', 'function {type}(Value: Integer): Integer;\nbegin\n  {type} := Value + {b};\nend;'],
  diff: ['--- /dev/null\n+++ b/{snake}\n@@ -0,0 +1 @@\n+limit = {a}', 'Binary files a/{snake} and b/{snake} differ', '--- a/{snake}\n+++ b/{snake}\n@@ -1 +1 @@\n-limit = {b}\n+limit = {a}', '--- a/{snake}\n+++ b/{snake}\n@@ -1 +1 @@\n-active = 0\n+active = 1'],
  elixir: ['defmodule {type} do\n  def limit(value), do: min(value, {a})\nend', '{snake} = Enum.sum([{a}, {b}])'],
  elm: ['{camel} value =\n    min value {a}', '{camel} =\n    List.sum [ {a}, {b} ]'],
  erlang: ['{snake}(Value) when Value > {a} -> {a};\n{snake}(Value) -> Value.', '{snake}() -> [{a}, {b}].'],
  fsharp: ['let {camel} value = min value {a}', 'type {type} = { Count: int; Active: bool }'],
  forth: [': {kebab} ( n -- n ) {a} min ;', '{b} constant {kebab}'],
  fortran: ['integer, parameter :: {snake} = {a}', 'integer, dimension(2) :: {snake} = [ {a}, {b} ]'],
  gdscript: ['var {snake}: int = {a}', 'func {snake}(value: int) -> int:\n\treturn mini(value, {b})'],
  glsl: ['float {camel}(float value) { return clamp(value, 0.0, {a}.0); }', 'const vec2 {camel} = vec2({a}.0, {b}.0);'],
  graphql: ['type {type} { count: Int!, active: Boolean! }', 'enum {type} { READY WAITING }'],
  groovy: ['def {camel} = [{a}, {b}].sum()', 'def {camel}(int value) { value < {a} ? value : {a} }'],
  handlebars: ['<output>{{ {camel} }}</output>', '{{#if {camel}}}<span>{title}</span>{{/if}}'],
  haskell: ['{camel} value = min value {a}', '{camel} = [n * {b} | n <- [1..{a}]]'],
  terraform: ['locals { {snake} = {a} }', 'variable "{snake}" { default = [{a}, {b}] }'],
  hlsl: ['float {camel}(float value) { return min(value, {a}.0); }', 'static const float2 {camel} = float2({a}.0, {b}.0);'],
  jinja: ['{% set {snake} = {a} %}', '{% for value in [{a}, {b}] %}<output>{{ value }}</output>{% endfor %}'],
  julia: ['{snake}(value) = min(value, {a})', '{snake} = [n * {b} for n in 1:{a}]'],
  kotlin: ['fun {camel}(value: Int) = value.coerceAtMost({a})', 'data class {type}(val count: Int = {a})'],
  latex: ['\\section{{title}}', 'The {words} sample contains ${a} + {b}$ entries.'],
  liquid: ['{% assign {snake} = {a} %}', '{% for value in (1..{b}) %}<span>{{ value }}</span>{% endfor %}'],
  makefile: ['{upper} := {a}', '{kebab}:\n\t@echo "{words}"'],
  matlab: ['{snake} = sum([{a}, {b}]);', '{snake} = @(value) min(value, {a});'],
  move: ['module 0x1::{snake} { public fun limit(): u64 { {a} } }', 'module 0x1::{snake} { const CAP: u64 = {b}; }'],
  nim: ['proc {camel}(value: int): int = min(value, {a})', 'let {camel} = @[{a}, {b}]'],
  nix: ['  {camel} = [ {a} {b} ];', '  {camel} = value: builtins.lessThan value {a};'],
  ocaml: ['let {snake} value = min value {a}', 'type {snake} = { count : int; active : bool }'],
  odin: ['{snake} :: proc(value: int) -> int { return min(value, {a}) }', '{type} :: struct { count: int, active: bool }'],
  perl: ['my @{snake} = ({a}, {b});', 'sub {snake} { my ($value) = @_; return $value < {a} ? $value : {a}; }'],
  prisma: ['model {type} {\n  id Int @id\n  count Int @default({a})\n}', 'enum {type} {\n  READY\n  WAITING\n}'],
  prolog: ['{snake}(Value, Result) :- Result is min(Value, {a}).', '{snake}([{a}, {b}]).'],
  proto3: ['message {type} { uint32 count = 1; bool active = 2; }', 'enum {type} { {upper}_UNSPECIFIED = 0; {upper}_READY = 1; }'],
  pug: ['section.{kebab}\n  h2 {title}', 'output(data-limit="{a}") {b}'],
  purescript: ['{camel} value = min value {a}', '{camel} = [ {a}, {b} ]'],
  qml: ['    property int {camel}: {a}', '    function {camel}(value) { return Math.min(value, {b}) }'],
  r: ['{snake} <- function(value) min(value, {a})', '{snake} <- seq_len({b}) * {a}'],
  racket: ['(define ({kebab} value) (min value {a}))', '(define {kebab} (list {a} {b}))'],
  reason: ['let {camel} = value => min(value, {a});', 'type {camel} = {count: int, active: bool};'],
  regexp: ['^{kebab}_[0-9]+$', '^(?:{snake}|sample)_[a-z]{{b}}$'],
  rescript: ['let {camel} = value => Int.min(value, {a})', 'type {camel} = {count: int, active: bool}'],
  restructuredtext: ['.. rubric:: {title}\n', 'Use ``{snake}`` for samples below {a}.\n'],
  sas: ['%let {snake} = {a};', 'data {snake};\n  do value = 1 to {b}; output; end;\nrun;'],
  scala: ['object {type} { val limit = {a} }', 'case class {type}(count: Int = {b})'],
  scheme: ['(define ({kebab} value) (min value {a}))', '(define {kebab} (vector {a} {b}))'],
  shaderlab: ['Shader "Samples/{type}" { SubShader { Pass { Color (1, 0, 0, 1) } } }', 'Shader "Samples/{type}" { Properties { _Limit ("Limit", Float) = {a} } SubShader { Pass {} } }'],
  smalltalk: ['Smalltalk at: #{type} put: ({a} max: {b}).', '#({a} {b}) collect: [:value | value + {a}].'],
  solidity: ['contract {type} { uint256 public constant LIMIT = {a}; }', 'library {type} { function cap(uint256 x) internal pure returns (uint256) { return x < {a} ? x : {a}; } }'],
  sparql: ['SELECT (SUM(?value) AS ?{snake}) WHERE { VALUES ?value { {a} {b} } }', 'ASK WHERE { VALUES ?{snake} { {a} } FILTER (?{snake} > {b}) }'],
  stata: ['local {snake} = min({a}, {b})', 'scalar {snake} = {a} + {b}'],
  svelte: ['{#each [{a}, {b}] as value}<output>{value}</output>{/each}', '<section class="{kebab}"><h2>{title}</h2></section>'],
  swift: ['func {camel}(_ value: Int) -> Int { min(value, {a}) }', 'struct {type} { let count = {b} }'],
  verilog: ['module {snake}(input wire a, output wire y); assign y = ~a; endmodule', 'module {snake}; localparam LIMIT = {a}; endmodule'],
  systemverilog: ['module {snake}(input logic a, output logic y); assign y = !a; endmodule', 'package {snake}; parameter int LIMIT = {a}; endpackage'],
  tcl: ['set {snake} [list {a} {b}]', 'proc {snake} {value} { expr {min($value, {a})} }'],
  thrift: ['struct {type} { 1: i32 count, 2: bool active }', 'const i32 {upper} = {a}'],
  twig: ['{% set {snake} = [{a}, {b}] %}', '{% for value in 1..{b} %}<output>{{ value }}</output>{% endfor %}'],
  v: ['fn {snake}(value int) int {\n\treturn if value > {a} { {a} } else { value }\n}', 'struct {type} {\n\tcount int\n}'],
  vb: ['Function {type}(ByVal value As Integer) As Integer\n    {type} = value + {a}\nEnd Function', 'Const {type} As Integer = {b}'],
  vhdl: ['package {snake} is constant limit_value : integer := {a}; end package;', 'entity {snake} is port (sample : in bit); end entity;'],
  vue: ['    <section class="{kebab}"><h2>{title}</h2></section>', '    <output :data-limit="{a}">{{ {a} + {b} }}</output>'],
  vyper: ['{upper}: constant(uint256) = {a}', '@internal\n@pure\ndef {snake}(value: uint256) -> uint256:\n    return min(value, {b})'],
  wat: ['  (func ${snake} (result i32) (i32.const {a}))', '  (global ${snake} i32 (i32.add (i32.const {a}) (i32.const {b})))'],
  wgsl: ['fn {snake}(value: u32) -> u32 { return min(value, {a}u); }', 'const {upper}: u32 = {b}u;'],
  zig: ['const {snake}: u32 = {a};', 'fn {camel}(value: u32) u32 { return @min(value, {b}); }'],
  'Assembly (GNU/GAS)': ['{snake}: movl ${a}, %eax', '{snake}: addl ${b}, %ecx'],
  'Ansible (YAML)': ['  - name: Count {words}\n    ansible.builtin.debug:\n      msg: "{a}"', '  - name: Set {words}\n    ansible.builtin.set_fact:\n      {snake}: {b}'],
  'OpenAPI (YAML)': ['  /{kebab}: {get: {responses: {"200": {description: {title}}}}}', '  /{kebab}:\n    get:\n      responses:\n        "200":\n          description: {title}', '  /{kebab}:\n    head:\n      responses:\n        "204":\n          description: No content'],
  'Angular Template': ['<output [attr.data-limit]="{a}">{{ {a} + {b} }}</output>', '<section class="{kebab}"><h2>{title}</h2></section>'],
  'Git Config': ['  {camel} = {a}', '  {camel} = "{words}"'],
  'MongoDB Query (JS)': ['db.samples.find({ count: { $gt: {b} } }).limit({a});', 'db.samples.aggregate([{ $group: { _id: "$category", {camel}: { $sum: 1 } } }]);'],
  'Vagrantfile (Ruby)': ['  config.vm.define "{kebab}" do |node|\n    node.vm.hostname = "{kebab}"\n  end', '  config.vm.define "{kebab}" do |node|\n    node.vm.box = "generic/debian12"\n  end'],
  EJS: ['<output><%= {a} + {b} %></output>', '<% for (const value of [{a}, {b}]) { %><span><%= value %></span><% } %>'],
  'PL/SQL': ['DECLARE {snake} NUMBER := {a}; BEGIN NULL; END;\n/', 'BEGIN IF {a} > {b} THEN NULL; END IF; END;\n/'],
  Whitespace: ['  {bits}\n \n\n', '  {bits}\n  {bits}\n\t    \n\n']
};

const aliases = { scss: 'css', less: 'css', mdx: 'markdown', octave: 'matlab', astro: 'html', luau: 'lua', 'objective-c': 'c', 'objective-cpp': 'cpp' };
const nouns = ['batch', 'queue', 'sample', 'frame', 'window', 'packet', 'index', 'buffer'];
const measures = ['limit', 'size', 'offset', 'count', 'range', 'weight', 'depth', 'score'];
const pick = list => list[Math.floor(Math.random() * list.length)];
const capitalize = word => word[0].toUpperCase() + word.slice(1);
const isJson = language => ['json', 'jsonc', 'json5'].includes(language.id);

function recordSize(language, record) {
  if (isJson(language) || language.label === 'Whitespace') return 1;
  return record.split('\n').length - 1;
}

function recordFor(language, sequence, maxLines = Infinity) {
  const noun = pick(nouns);
  const measure = pick(measures);
  const a = 12 + Math.floor(Math.random() * 80);
  const b = 2 + Math.floor(Math.random() * 9);
  const snake = `${noun}_${measure}_${sequence}`;
  const camel = noun + capitalize(measure) + sequence;
  if (isJson(language)) {
    return pick([{ label: snake, limit: a }, { label: camel, samples: [b, a] }, { label: snake, enabled: b % 2 === 0 }]);
  }
  const fields = {
    snake, camel, type: capitalize(camel), upper: snake.toUpperCase(), kebab: snake.replaceAll('_', '-'),
    title: capitalize(noun) + ' ' + measure, words: noun + ' ' + measure, n: sequence, a, b,
    plus: '+'.repeat(b), bits: ' ' + a.toString(2).replace(/0/g, ' ').replace(/1/g, '\t')
  };
  const key = Object.hasOwn(forms, language.label) ? language.label : aliases[language.id] || language.id;
  // Custom file types can use a grammar outside the bundled catalog.
  const variants = Object.hasOwn(forms, key) ? forms[key] : ['# {title} sample {n} ({a})'];
  const fitting = variants.filter(form => recordSize(language, form + '\n') <= maxLines);
  if (!fitting.length) return '\n';
  const pattern = pick(fitting);
  const expanded = pattern.replace(/\{(snake|camel|type|upper|kebab|title|words|n|a|b|plus|bits)\}/g, (_, key) => String(fields[key]));
  return language.label === 'Whitespace' ? expanded : expanded + '\n';
}

module.exports = { recordFor, isJson, recordSize, frameFor, headerFor };

