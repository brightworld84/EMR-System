import { getUiLocale } from './locale';

export const titleize = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return String(val)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const LANGUAGE_LABELS = {
  en: 'English',
  es: 'Spanish',
  vi: 'Vietnamese',
  zh: 'Chinese',
  ko: 'Korean',
  tl: 'Tagalog',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  other: 'Other',
};

export const RACE_LABELS = {
  american_indian: 'American Indian or Alaska Native',
  asian: 'Asian',
  black: 'Black or African American',
  pacific_islander: 'Native Hawaiian or Other Pacific Islander',
  white: 'White',
  other: 'Other',
  declined: 'Patient Declined',
};

export const ETHNICITY_LABELS = {
  hispanic: 'Hispanic or Latino',
  not_hispanic: 'Not Hispanic or Latino',
  declined: 'Patient Declined',
};

export const displayValue = (val, map = null) => {
  if (val === null || val === undefined || val === '') return '—';
  if (map && Object.prototype.hasOwnProperty.call(map, val)) return map[val];
  return titleize(val);
};

export const displayLanguage = (val, uiLocale = null) => {
  if (val === null || val === undefined || val === '') return '—';

  const code = String(val).trim();
  const locale = uiLocale || getUiLocale(); // ✅ uses saved locale

  // Prefer known mappings first
  if (LANGUAGE_LABELS[code]) return LANGUAGE_LABELS[code];

  // Try Intl.DisplayNames (modern browsers)
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'language' });
    const name = dn.of(code);
    if (name) return titleize(name);
  } catch (e) {
    // fall back
  }

  return titleize(code);
};

export const GENDER_IDENTITY_LABELS = {
  male: 'Male',
  female: 'Female',
  transgender_male: 'Transgender Male/Trans Man/Female-to-Male',
  transgender_female: 'Transgender Female/Trans Woman/Male-to-Female',
  non_binary: 'Non-Binary',
  genderqueer: 'Genderqueer',
  other: 'Other',
  decline: 'Choose not to disclose',
};

export const SEXUAL_ORIENTATION_LABELS = {
  straight: 'Straight or heterosexual',
  gay: 'Lesbian, gay, or homosexual',
  bisexual: 'Bisexual',
  other: 'Something else',
  unknown: "Don't know",
  decline: 'Choose not to disclose',
};

export const displayGenderIdentity = (val) => displayValue(val, GENDER_IDENTITY_LABELS);
export const displaySexualOrientation = (val) => displayValue(val, SEXUAL_ORIENTATION_LABELS);
