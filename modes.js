'use strict';

// A profession mode is a thematic rotation of scratch file formats.
// It is not a credential, skill certification, or real work history.
const MODES = Object.freeze([
  { title: 'Full Stack Developer', category: 'Pengembangan aplikasi', summary: 'Frontend, API, database, dan deployment', languages: ['HTML','CSS','JavaScript (React JSX)','TypeScript (React TSX)','Python','SQL','Dockerfile','YAML','Markdown'] },
  { title: 'Frontend Engineer', category: 'Pengembangan aplikasi', summary: 'Antarmuka, komponen, dan aksesibilitas', languages: ['HTML','CSS','SCSS','TypeScript','TypeScript (React TSX)','Vue','Svelte','JSON','Markdown'] },
  { title: 'Backend Engineer', category: 'Pengembangan aplikasi', summary: 'Layanan, skema data, dan API', languages: ['Python','Go','Java','TypeScript','PostgreSQL (SQL)','GraphQL','Dockerfile','YAML'] },
  { title: 'API Developer', category: 'Pengembangan aplikasi', summary: 'Kontrak layanan, endpoint, dan pengujian', languages: ['TypeScript','Python','Go','OpenAPI (YAML)','GraphQL','JSON','SQL','Markdown'] },
  { title: 'Mobile Developer', category: 'Pengembangan aplikasi', summary: 'Aplikasi Android, iOS, dan lintas platform', languages: ['Kotlin','Swift','Flutter (Dart)','JSON','XML','Markdown'] },
  { title: 'Desktop Application Developer', category: 'Pengembangan aplikasi', summary: 'Perangkat lunak desktop dan integrasi sistem', languages: ['C#','C++','Rust','TypeScript','Python','JSON','XML','Markdown'] },
  { title: 'Game Developer', category: 'Pengembangan aplikasi', summary: 'Gameplay, scripting, dan shader', languages: ['C#','C++','GDScript','Lua','GLSL','JSON','Markdown'] },
  { title: 'Software QA Engineer', category: 'Pengembangan aplikasi', summary: 'Test case, otomasi, dan laporan uji', languages: ['Python','JavaScript','TypeScript','Java','JSON','YAML','Markdown'] },
  { title: 'Data Analyst', category: 'Data dan kecerdasan buatan', summary: 'Eksplorasi data, visualisasi, dan laporan', languages: ['Python','SQL','R','CSV','JSON','Markdown'] },
  { title: 'Data Scientist', category: 'Data dan kecerdasan buatan', summary: 'Eksperimen, analisis, dan pemodelan', languages: ['Python','R','Julia','SQL','CSV','YAML','Markdown'] },
  { title: 'Data Engineer', category: 'Data dan kecerdasan buatan', summary: 'ETL, warehouse, dan orkestrasi data', languages: ['Python','SQL','Scala','Bash','YAML','JSON','Dockerfile'] },
  { title: 'Analytics Engineer', category: 'Data dan kecerdasan buatan', summary: 'Transformasi data dan model analitik', languages: ['SQL','Python','Jinja','YAML','CSV','Markdown'] },
  { title: 'AI Engineer', category: 'Data dan kecerdasan buatan', summary: 'Aplikasi AI, model, dan integrasi layanan', languages: ['Python','TypeScript','JSON','YAML','SQL','Dockerfile','Markdown'] },
  { title: 'Machine Learning Engineer', category: 'Data dan kecerdasan buatan', summary: 'Pipeline pelatihan dan evaluasi model', languages: ['Python','C++','SQL','YAML','Bash','Dockerfile','Markdown'] },
  { title: 'MLOps Engineer', category: 'Data dan kecerdasan buatan', summary: 'Deployment model, pipeline, dan monitoring', languages: ['Python','Bash','Dockerfile','YAML','HCL / Terraform','SQL','JSON'] },
  { title: 'Natural Language Processing Engineer', category: 'Data dan kecerdasan buatan', summary: 'Pemrosesan teks, model bahasa, dan evaluasi', languages: ['Python','JSON','CSV','SQL','YAML','Markdown'] },
  { title: 'Computer Vision Engineer', category: 'Data dan kecerdasan buatan', summary: 'Pengolahan citra dan eksperimen model', languages: ['Python','C++','JSON','YAML','Markdown'] },
  { title: 'Cloud Engineer', category: 'Infrastruktur dan keamanan', summary: 'Infrastruktur cloud dan konfigurasi layanan', languages: ['HCL / Terraform','YAML','Bash','Python','Dockerfile','JSON','PowerShell'] },
  { title: 'DevOps Engineer', category: 'Infrastruktur dan keamanan', summary: 'Build, CI/CD, dan deployment', languages: ['Bash','Python','Go','Dockerfile','YAML','HCL / Terraform','Makefile'] },
  { title: 'Site Reliability Engineer', category: 'Infrastruktur dan keamanan', summary: 'Reliability, observability, dan otomasi', languages: ['Go','Python','Bash','YAML','HCL / Terraform','SQL','Markdown'] },
  { title: 'Cyber Security Analyst', category: 'Infrastruktur dan keamanan', summary: 'Analisis pertahanan dan dokumentasi insiden', languages: ['Python','Bash','PowerShell','YAML','JSON','SQL','Markdown'] },
  { title: 'Security Engineer', category: 'Infrastruktur dan keamanan', summary: 'Konfigurasi, pengujian, dan defensive tooling', languages: ['Python','Go','Rust','Bash','YAML','HCL / Terraform','Markdown'] },
  { title: 'DevSecOps Engineer', category: 'Infrastruktur dan keamanan', summary: 'Keamanan dalam pipeline delivery', languages: ['Python','Bash','YAML','Dockerfile','HCL / Terraform','JSON','Markdown'] },
  { title: 'Digital Forensics Researcher', category: 'Infrastruktur dan keamanan', summary: 'Analisis artefak dan laporan forensik', languages: ['Python','PowerShell','Bash','JSON','CSV','Markdown'] },
  { title: 'Network Automation Engineer', category: 'Infrastruktur dan keamanan', summary: 'Konfigurasi jaringan dan otomasi infrastruktur', languages: ['Python','Go','Bash','YAML','JSON','PowerShell','Markdown'] },
  { title: 'Systems Programmer', category: 'Sistem dan riset', summary: 'Memori, compiler, dan pemrograman tingkat rendah', languages: ['Assembly (x86/NASM)','C','C++','Rust','Zig','CMake','Makefile'] },
  { title: 'Embedded Systems Engineer', category: 'Sistem dan riset', summary: 'Firmware, perangkat keras, dan protokol', languages: ['C','C++','Rust','Assembly (GNU/GAS)','CMake','Makefile','Markdown'] },
  { title: 'Robotics Developer', category: 'Sistem dan riset', summary: 'Perangkat otonom dan algoritma robotika', languages: ['Python','C++','CMake','YAML','XML','Markdown'] },
  { title: 'Blockchain Developer', category: 'Sistem dan riset', summary: 'Kontrak pintar dan ekosistem Web3', languages: ['Solidity','Rust','TypeScript','JavaScript','JSON','YAML','Markdown'] },
  { title: 'Database Engineer', category: 'Sistem dan riset', summary: 'Query, indeks, dan skema database', languages: ['SQL','PostgreSQL (SQL)','MySQL (SQL)','SQLite (SQL)','PL/SQL','T-SQL','Python'] },
  { title: 'Scientific Computing Researcher', category: 'Sistem dan riset', summary: 'Komputasi numerik dan reproduksi riset', languages: ['Python','R','Julia','MATLAB','Fortran','LaTeX','Markdown'] },
  { title: 'Technical Writer', category: 'Sistem dan riset', summary: 'Panduan teknis, API docs, dan dokumentasi', languages: ['Markdown','MDX','reStructuredText','AsciiDoc','OpenAPI (YAML)','JSON','HTML'] },
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
