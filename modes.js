'use strict';

// A profession mode is a thematic rotation of scratch file formats.
// It is not a credential, skill certification, or real work history.
const MODES = Object.freeze([
  { title: 'Full Stack Developer', icon: 'layers', category: 'Application development', summary: 'Build a web interface and the services that support it.', languages: ['HTML','CSS','JavaScript (React JSX)','TypeScript (React TSX)','Python','SQL','Dockerfile','YAML','Markdown'] },
  { title: 'Frontend Engineer', icon: 'browser', category: 'Application development', summary: 'Build accessible interfaces with reusable components.', languages: ['HTML','CSS','SCSS','TypeScript','TypeScript (React TSX)','Vue','Svelte','JSON','Markdown'] },
  { title: 'Backend Engineer', icon: 'server', category: 'Application development', summary: 'Implement service logic and model the data behind an API.', languages: ['Python','Go','Java','TypeScript','PostgreSQL (SQL)','GraphQL','Dockerfile','YAML'] },
  { title: 'API Developer', icon: 'plug', category: 'Application development', summary: 'Define API contracts and test endpoint responses.', languages: ['TypeScript','Python','Go','OpenAPI (YAML)','GraphQL','JSON','SQL','Markdown'] },
  { title: 'Mobile Developer', icon: 'device-mobile', category: 'Application development', summary: 'Build native and cross-platform mobile screens.', languages: ['Kotlin','Swift','Flutter (Dart)','JSON','XML','Markdown'] },
  { title: 'Desktop Application Developer', icon: 'device-desktop', category: 'Application development', summary: 'Connect desktop interfaces to local services.', languages: ['C#','C++','Rust','TypeScript','Python','JSON','XML','Markdown'] },
  { title: 'Game Developer', icon: 'play', category: 'Application development', summary: 'Script gameplay and write rendering effects.', languages: ['C#','C++','GDScript','Lua','GLSL','JSON','Markdown'] },
  { title: 'Software QA Engineer', icon: 'bug', category: 'Application development', summary: 'Automate regression tests and document failures.', languages: ['Python','JavaScript','TypeScript','Java','JSON','YAML','Markdown'] },
  { title: 'Data Analyst', icon: 'graph', category: 'Data and AI', summary: 'Query datasets and turn the results into reports.', languages: ['Python','SQL','R','CSV','JSON','Markdown'] },
  { title: 'Data Scientist', icon: 'graph-scatter', category: 'Data and AI', summary: 'Explore datasets and compare statistical models.', languages: ['Python','R','Julia','SQL','CSV','YAML','Markdown'] },
  { title: 'Data Engineer', icon: 'database', category: 'Data and AI', summary: 'Move source data into a warehouse and schedule transformations.', languages: ['Python','SQL','Scala','Bash','YAML','JSON','Dockerfile'] },
  { title: 'Analytics Engineer', icon: 'table', category: 'Data and AI', summary: 'Model warehouse data for reporting.', languages: ['SQL','Python','Jinja','YAML','CSV','Markdown'] },
  { title: 'AI Engineer', icon: 'hubot', category: 'Data and AI', summary: 'Connect models to application code and services.', languages: ['Python','TypeScript','JSON','YAML','SQL','Dockerfile','Markdown'] },
  { title: 'Machine Learning Engineer', icon: 'symbol-function', category: 'Data and AI', summary: 'Train models and measure their performance.', languages: ['Python','C++','SQL','YAML','Bash','Dockerfile','Markdown'] },
  { title: 'MLOps Engineer', icon: 'server-process', category: 'Data and AI', summary: 'Package trained models and monitor deployments.', languages: ['Python','Bash','Dockerfile','YAML','HCL / Terraform','SQL','JSON'] },
  { title: 'Natural Language Processing Engineer', icon: 'symbol-string', category: 'Data and AI', summary: 'Prepare text corpora and evaluate language models.', languages: ['Python','JSON','CSV','SQL','YAML','Markdown'] },
  { title: 'Computer Vision Engineer', icon: 'eye', category: 'Data and AI', summary: 'Process image data and evaluate vision models.', languages: ['Python','C++','JSON','YAML','Markdown'] },
  { title: 'Cloud Engineer', icon: 'cloud', category: 'Infrastructure and security', summary: 'Define cloud resources and configure services.', languages: ['HCL / Terraform','YAML','Bash','Python','Dockerfile','JSON','PowerShell'] },
  { title: 'DevOps Engineer', icon: 'git-branch', category: 'Infrastructure and security', summary: 'Automate builds and deployments.', languages: ['Bash','Python','Go','Dockerfile','YAML','HCL / Terraform','Makefile'] },
  { title: 'Site Reliability Engineer', icon: 'pulse', category: 'Infrastructure and security', summary: 'Measure service reliability and automate recovery tasks.', languages: ['Go','Python','Bash','YAML','HCL / Terraform','SQL','Markdown'] },
  { title: 'Cyber Security Analyst', icon: 'shield', category: 'Infrastructure and security', summary: 'Review event logs and document security incidents.', languages: ['Python','Bash','PowerShell','YAML','JSON','SQL','Markdown'] },
  { title: 'Security Engineer', icon: 'lock', category: 'Infrastructure and security', summary: 'Build defensive tools and maintain security controls.', languages: ['Python','Go','Rust','Bash','YAML','HCL / Terraform','Markdown'] },
  { title: 'DevSecOps Engineer', icon: 'workspace-trusted', category: 'Infrastructure and security', summary: 'Add security checks to build and release pipelines.', languages: ['Python','Bash','YAML','Dockerfile','HCL / Terraform','JSON','Markdown'] },
  { title: 'Digital Forensics Researcher', icon: 'inspect', category: 'Infrastructure and security', summary: 'Examine digital artifacts and document findings.', languages: ['Python','PowerShell','Bash','JSON','CSV','Markdown'] },
  { title: 'Network Automation Engineer', icon: 'radio-tower', category: 'Infrastructure and security', summary: 'Automate network configuration and inventory.', languages: ['Python','Go','Bash','YAML','JSON','PowerShell','Markdown'] },
  { title: 'Systems Programmer', icon: 'terminal', category: 'Systems and research', summary: 'Work with memory layouts and low-level system interfaces.', languages: ['Assembly (x86/NASM)','C','C++','Rust','Zig','CMake','Makefile'] },
  { title: 'Embedded Systems Engineer', icon: 'circuit-board', category: 'Systems and research', summary: 'Write firmware and implement device protocols.', languages: ['C','C++','Rust','Assembly (GNU/GAS)','CMake','Makefile','Markdown'] },
  { title: 'Robotics Developer', icon: 'settings-gear', category: 'Systems and research', summary: 'Connect control algorithms to sensors and actuators.', languages: ['Python','C++','CMake','YAML','XML','Markdown'] },
  { title: 'Blockchain Developer', icon: 'link', category: 'Systems and research', summary: 'Write smart contracts and connect client applications.', languages: ['Solidity','Rust','TypeScript','JavaScript','JSON','YAML','Markdown'] },
  { title: 'Database Engineer', icon: 'database', category: 'Systems and research', summary: 'Design database schemas and tune queries.', languages: ['SQL','PostgreSQL (SQL)','MySQL (SQL)','SQLite (SQL)','PL/SQL','T-SQL','Python'] },
  { title: 'Scientific Computing Researcher', icon: 'beaker', category: 'Systems and research', summary: 'Implement numerical methods and reproduce experiments.', languages: ['Python','R','Julia','MATLAB','Fortran','LaTeX','Markdown'] },
  { title: 'Technical Writer', icon: 'book', category: 'Systems and research', summary: 'Write API references and maintain technical guides.', languages: ['Markdown','MDX','reStructuredText','AsciiDoc','OpenAPI (YAML)','JSON','HTML'] },
  { title: 'Accessibility Engineer', icon: 'keyboard', category: 'Application development', summary: 'Build keyboard interactions and accessible interfaces.', languages: ['HTML','CSS','TypeScript','JavaScript (React JSX)','Markdown'] },
  { title: 'Developer Tools Engineer', icon: 'tools', category: 'Application development', summary: 'Build editor tools and test command line workflows.', languages: ['TypeScript','Rust','Go','JSON','Markdown'] },
  { title: 'Compiler Engineer', icon: 'symbol-operator', category: 'Systems and research', summary: 'Work on parsers, code generation and compiler tests.', languages: ['C++','Rust','Assembly (GNU/GAS)','CMake','Python'] },
  { title: 'Graphics Engineer', icon: 'symbol-color', category: 'Systems and research', summary: 'Write shaders and prepare rendering tests.', languages: ['C++','GLSL','HLSL','WGSL','CMake'] },
  { title: 'FPGA Engineer', icon: 'circuit-board', category: 'Systems and research', summary: 'Describe digital circuits and automate simulation builds.', languages: ['SystemVerilog','VHDL','Verilog','Tcl','Makefile'] },
  { title: 'Audio Software Engineer', icon: 'unmute', category: 'Systems and research', summary: 'Prototype audio filters and implement signal processing routines.', languages: ['C++','C','MATLAB','Python','CMake'] },
  { title: 'Geospatial Developer', icon: 'globe', category: 'Data and AI', summary: 'Process map layers and query geographic datasets.', languages: ['Python','PostgreSQL (SQL)','R','JavaScript','JSON'] },
  { title: 'Statistical Programmer', icon: 'graph-line', category: 'Data and AI', summary: 'Prepare study tables and reproduce statistical analyses.', languages: ['R','SAS','Stata','SQL','CSV'] },
  { title: 'Search Engineer', icon: 'search', category: 'Data and AI', summary: 'Build indexing jobs and evaluate query results.', languages: ['Java','Python','SQL','JSON','YAML'] },
  { title: 'Release Engineer', icon: 'package', category: 'Infrastructure and security', summary: 'Package builds and automate release checks.', languages: ['Bash','PowerShell','Makefile','YAML','Dockerfile'] },
  { title: 'Observability Engineer', icon: 'dashboard', category: 'Infrastructure and security', summary: 'Instrument services and query logs and metrics.', languages: ['Go','Python','SQL','YAML','JSON'] },
  { title: 'Design Systems Engineer', icon: 'paintcan', category: 'Application development', summary: 'Maintain shared components, design tokens and usage examples.', languages: ['TypeScript (React TSX)','CSS','SCSS','JSON','MDX'] },
]);

function resolveModes(modes, catalog) {
  const known = new Map(catalog.map(language => [language.label.toLowerCase(), language]));
  return modes.map(mode => ({
    ...mode,
    profiles: mode.languages.map(label => {
      const value = known.get(label.toLowerCase());
      if (!value) throw new Error(`Mode ${mode.title} references an unavailable language: ${label}`);
      return value;
    })
  }));
}

module.exports = { MODES, resolveModes };
