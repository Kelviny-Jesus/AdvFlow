export type UserPrefs = {
  docFontFamily: string; // e.g. 'Times New Roman', 'Arial', 'Courier New'
  docFontSize: number;   // pt
  docLineSpacing: number; // 1.0, 1.5, 2.0
  ragEnabled: boolean;
  ragTopK: number; // número de docs adicionais para contexto
};

const KEY = 'advflow:user-prefs:v1';

const DEFAULTS: UserPrefs = {
  docFontFamily: 'Times New Roman',
  docFontSize: 12,
  docLineSpacing: 1.5,
  ragEnabled: false,
  ragTopK: 5,
};

export function getUserPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed } as UserPrefs;
  } catch {
    return { ...DEFAULTS };
  }
}

export function setUserPrefs(next: Partial<UserPrefs>): UserPrefs {
  const current = getUserPrefs();
  const merged = { ...current, ...next } as UserPrefs;
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

// Helpers de mapeamento
export function mapJsPdfFontFamily(family: string): 'times' | 'helvetica' | 'courier' {
  const f = (family || '').toLowerCase();
  // Serif comuns em documentos jurídicos → mapear para 'times'
  const serifHints = ['time', 'garamond', 'georgia', 'cambria', 'book antiqua', 'palatino'];
  if (serifHints.some(h => f.includes(h))) return 'times';
  // Sans-serif comuns → 'helvetica'
  if (f.includes('helvet') || f.includes('arial') || f.includes('calibri')) return 'helvetica';
  // Monoespaçada
  if (f.includes('courier')) return 'courier';
  return 'helvetica';
}

export function getDocxFontFamily(family: string): string {
  // Retorna a string original (o Word tenta resolver). Para safety, mapeia Arial/Times/Courier.
  const f = (family || '').toLowerCase();
  if (f.includes('time')) return 'Times New Roman';
  if (f.includes('courier')) return 'Courier New';
  if (f.includes('helvet') || f.includes('arial')) return 'Arial';
  return 'Times New Roman';
}

export function cssFontStackFromFamily(family: string): string {
  const f = (family || '').toLowerCase();
  if (f.includes('courier')) return `'${family}', Courier, monospace`;
  if (f.includes('arial') || f.includes('calibri') || f.includes('helvet')) return `'${family}', Arial, Helvetica, sans-serif`;
  return `'${family}', Times, 'Times New Roman', serif`;
}

export function pointsToHalfPoints(pt: number): number {
  return Math.max(1, Math.round(pt * 2));
}

export function lineSpacingToTwips(multiplier: number, base: number = 240): number {
  // 240 twips ≈ single spacing. 1.5 => 360; 2.0 => 480
  const m = typeof multiplier === 'number' && isFinite(multiplier) ? multiplier : 1.0;
  return Math.max(1, Math.round(base * m));
}


