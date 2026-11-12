'use strict';

// Selection data only. Profiles are file formats, not validated skill or work history.
const MAX_SELECTED_LANGUAGES = 48;
const MAX_PRESETS = 20;
// Keep the v5 keys so an in-place v6 upgrade retains the user's selections.
const PRESET_STORAGE_KEY = 'activityLab.languagePresets.v5';
const LAST_SELECTED_KEY = 'activityLab.lastLanguageSelection.v5';

function normalizeProfiles(profiles, catalog, max = MAX_SELECTED_LANGUAGES) {
  if (!Array.isArray(profiles)) throw new TypeError('Languages must be an array.');
  const available = new Map(catalog.map(item => [item.label.toLowerCase(), item]));
  const distinct = new Map();
  for (const entry of profiles) {
    const label = typeof entry === 'string' ? entry : entry?.label;
    if (typeof label !== 'string') continue;
    const profile = available.get(label.toLowerCase());
    if (profile) distinct.set(profile.label.toLowerCase(), profile);
  }
  if (distinct.size === 0) throw new Error('Select at least one supported language.');
  if (distinct.size > max) throw new Error(`Choose up to ${max} languages per session to keep VS Code responsive.`);
  return [...distinct.values()];
}
function validatePresetName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed.length < 1 || trimmed.length > 40) return 'Use 1 to 40 characters.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _().+]{0,39}$/u.test(trimmed)) return 'Use letters, numbers, spaces, underscores, or parentheses.';
  return null;
}
function readPresets(state, catalog) {
  const raw = state?.get?.(PRESET_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  const unique = new Set();
  return raw.slice(0, MAX_PRESETS).flatMap(entry => {
    if (!entry || typeof entry.name !== 'string' || validatePresetName(entry.name)) return [];
    const name = entry.name.trim();
    if (unique.has(name.toLowerCase())) return [];
    try {
      const profiles = normalizeProfiles(entry.languages, catalog);
      unique.add(name.toLowerCase());
      return [{ name, languages: profiles.map(profile => profile.label) }];
    } catch (_) { return []; }
  });
}
async function savePreset(state, catalog, name, profiles) {
  if (!state?.update) throw new Error('Preset storage is unavailable.');
  const error = validatePresetName(name);
  if (error) throw new Error(error);
  const normalized = normalizeProfiles(profiles, catalog).map(profile => profile.label);
  const existing = readPresets(state, catalog);
  const idx = existing.findIndex(entry => entry.name.toLowerCase() === name.trim().toLowerCase());
  if (idx < 0 && existing.length >= MAX_PRESETS) throw new Error(`You can save up to ${MAX_PRESETS} presets.`);
  if (idx >= 0) existing.splice(idx, 1);
  existing.push({ name: name.trim(), languages: normalized });
  await state.update(PRESET_STORAGE_KEY, existing);
  return existing;
}
async function deletePreset(state, catalog, name) {
  if (!state?.update) throw new Error('Preset storage is unavailable.');
  const result = readPresets(state, catalog).filter(entry => entry.name.toLowerCase() !== name.trim().toLowerCase());
  await state.update(PRESET_STORAGE_KEY, result);
  return result;
}
async function renamePreset(state, catalog, oldName, newName) {
  if (!state?.update) throw new Error('Preset storage is unavailable.');
  const error = validatePresetName(newName);
  if (error) throw new Error(error);
  const result = readPresets(state, catalog);
  const index = result.findIndex(entry => entry.name.toLowerCase() === oldName.trim().toLowerCase());
  if (index < 0) throw new Error('This preset no longer exists.');
  const name = newName.trim();
  if (result.some((entry, i) => i !== index && entry.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A preset with that name already exists. Choose another name.');
  }
  result[index] = { ...result[index], name };
  await state.update(PRESET_STORAGE_KEY, result);
  return result;
}
function buildQuickPickItems(catalog, selected = []) {
  const previouslySelected = new Set((Array.isArray(selected) ? selected : []).map(s => String(s).toLowerCase()));
  return catalog.map(profile => ({
    label: profile.label,
    description: `${profile.category} · ${profile.ext}`,
    detail: `VS Code language ID: ${profile.id}`,
    picked: previouslySelected.has(profile.label.toLowerCase()),
    profile
  }));
}
module.exports = {
  MAX_SELECTED_LANGUAGES, MAX_PRESETS, PRESET_STORAGE_KEY, LAST_SELECTED_KEY,
  normalizeProfiles, validatePresetName, readPresets, savePreset, deletePreset, renamePreset, buildQuickPickItems
};
