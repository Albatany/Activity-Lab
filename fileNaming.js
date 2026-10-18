'use strict';
const crypto = require('node:crypto');

const STEMS = Object.freeze({
  python: ['data_pipeline', 'model_training', 'debugging', 'feature_engineering', 'test_suite', 'service_core', 'analytics', 'projects'],
  sql: ['database_schema', 'query_report', 'customer_metrics', 'warehouse_models', 'data_audit', 'projects'],
  shellscript: ['deploy_script', 'log_analysis', 'bootstrap', 'server_check', 'debugging', 'projects'],
  powershell: ['system_check', 'automation', 'debugging', 'scripts', 'projects'],
  typescript: ['api_routes', 'app_config', 'service_layer', 'debugging', 'projects', 'things'],
  typescriptreact: ['dashboard_view', 'component_library', 'app_layout', 'projects', 'things'],
  javascript: ['api_client', 'debugging', 'event_handler', 'projects', 'things'],
  javascriptreact: ['component_library', 'dashboard_view', 'projects', 'things'],
  markdown: ['architecture_notes', 'project_notes', 'research_log', 'things', 'projects'],
  yaml: ['pipeline_config', 'environment_config', 'deployment_rules', 'projects'],
  json: ['app_settings', 'response_schema', 'debugging', 'project_config'],
  dockerfile: ['container_build', 'service_image', 'projects'],
  asm: ['memory_layout', 'register_notes', 'debugging', 'projects'],
  go: ['service_handler', 'internal_tools', 'data_collector', 'debugging', 'projects'],
  rust: ['service_core', 'memory_safety', 'compiler_notes', 'projects'],
  html: ['app_layout', 'landing_page', 'ui_prototype', 'projects'],
  css: ['layout_styles', 'design_system', 'component_theme', 'projects'],
  r: ['statistical_report', 'exploratory_analysis', 'data_cleaning', 'projects'],
  cpp: ['engine_core', 'debugging', 'algorithm_study', 'projects']
});
const GENERIC = ['demo', 'debugging', 'projects', 'things', 'experiment', 'sandbox', 'workflow', 'prototype', 'module', 'utils', 'research', 'notes'];
function stemFor(language, chooser = crypto.randomInt) {
  const pool = STEMS[language.id] || GENERIC;
  return pool[chooser(pool.length)];
}
function buildFileName(language, reserved, chooser = crypto.randomInt) {
  if (!language?.ext || !/^\.[a-z0-9._+-]{1,25}$/i.test(language.ext)) {
    throw new Error('Invalid synthetic scratch file extension.');
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const stem = stemFor(language, chooser);
    const code = chooser(0x1000000).toString(16).padStart(6, '0');
    const fileName = `${stem}_${code}${language.ext}`;
    if (!reserved.has(fileName.toLowerCase())) {
      reserved.add(fileName.toLowerCase());
      return fileName;
    }
  }
  throw new Error('Could not reserve a unique scratch file name');
}
function validateProjectName(name) {
  const value = (name || '').trim();
  if (!value) return null;
  if (value.length > 64 || !/^[\p{L}\p{N}][\p{L}\p{N} _().+]{0,63}$/u.test(value)) {
    return 'Gunakan 1 sampai 64 karakter: huruf, angka, spasi, garis bawah, titik, atau tanda kurung.';
  }
  return null;
}
module.exports = { STEMS, GENERIC, buildFileName, validateProjectName };
