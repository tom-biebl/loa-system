/**
 * Erfahrungs-Bereiche und Rang-Tabelle. Dynamisch verwendet vom Sheet
 * und vom ExperienceService — nichts wird im UI hartkodiert.
 */

export type ExperienceRank = "none" | "novice" | "scholar" | "expert" | "master";

export interface RankInfo {
  key: ExperienceRank;
  label: string;
  xpRequired: number;
  bonus: number;
}

export const EXPERIENCE_RANKS: RankInfo[] = [
  { key: "none", label: "Keine Erfahrung", xpRequired: 0, bonus: 0 },
  { key: "novice", label: "Novize", xpRequired: 5, bonus: 1 },
  { key: "scholar", label: "Gelehrter", xpRequired: 15, bonus: 2 },
  { key: "expert", label: "Experte", xpRequired: 30, bonus: 3 },
  { key: "master", label: "Meister", xpRequired: 50, bonus: 4 },
];

export interface ExperienceArea {
  key: string;
  label: string;
  category: string;
}

export const EXPERIENCE_CATEGORIES = [
  "Kampf",
  "Magie",
  "Wissen",
  "Überleben & Exploration",
  "Soziales",
  "Heimlichkeit & Kriminalität",
  "Handwerk",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export const EXPERIENCE_AREAS: ExperienceArea[] = [
  // Kampf
  { key: "swordsmanship", label: "Schwertkampf", category: "Kampf" },
  { key: "axe_combat", label: "Axtkampf", category: "Kampf" },
  { key: "spear_combat", label: "Speerkampf", category: "Kampf" },
  { key: "dagger_combat", label: "Dolchkampf", category: "Kampf" },
  { key: "bow_combat", label: "Bogenschießen", category: "Kampf" },
  { key: "crossbow_combat", label: "Armbrustkampf", category: "Kampf" },
  { key: "firearm_combat", label: "Schusswaffen", category: "Kampf" },
  { key: "shield_usage", label: "Schildkampf", category: "Kampf" },
  { key: "heavy_armor", label: "Schwere Rüstung", category: "Kampf" },
  { key: "light_armor", label: "Leichte Rüstung", category: "Kampf" },
  { key: "unarmed_combat", label: "Waffenkampf", category: "Kampf" },

  // Magie
  { key: "arcane_magic", label: "Arkane Magie", category: "Magie" },
  { key: "elemental_magic", label: "Elementarmagie", category: "Magie" },
  { key: "blood_magic", label: "Blutmagie", category: "Magie" },
  { key: "holy_magic", label: "Heilige Magie", category: "Magie" },
  { key: "dark_magic", label: "Dunkle Magie", category: "Magie" },
  { key: "ritual_magic", label: "Ritualmagie", category: "Magie" },
  { key: "alchemy", label: "Alchemie", category: "Magie" },
  { key: "enchanting", label: "Verzauberung", category: "Magie" },

  // Wissen
  { key: "history", label: "Geschichte", category: "Wissen" },
  { key: "religion", label: "Religion", category: "Wissen" },
  {
    key: "ancient_civilizations",
    label: "Alte Zivilisationen",
    category: "Wissen",
  },
  { key: "medicine", label: "Medizin", category: "Wissen" },
  { key: "nature", label: "Naturkunde", category: "Wissen" },
  { key: "engineering", label: "Ingenieurskunst", category: "Wissen" },
  { key: "astronomy", label: "Astronomie", category: "Wissen" },
  { key: "politics", label: "Politik", category: "Wissen" },

  // Überleben & Exploration
  { key: "survival", label: "Überleben", category: "Überleben & Exploration" },
  { key: "tracking", label: "Fährtenlesen", category: "Überleben & Exploration" },
  { key: "hunting", label: "Jagd", category: "Überleben & Exploration" },
  { key: "fishing", label: "Fischerei", category: "Überleben & Exploration" },
  { key: "climbing", label: "Klettern", category: "Überleben & Exploration" },
  { key: "swimming", label: "Schwimmen", category: "Überleben & Exploration" },
  { key: "navigation", label: "Navigation", category: "Überleben & Exploration" },

  // Soziales
  { key: "persuasion", label: "Überzeugen", category: "Soziales" },
  { key: "deception", label: "Täuschung", category: "Soziales" },
  { key: "intimidation", label: "Einschüchtern", category: "Soziales" },
  { key: "performance", label: "Auftreten", category: "Soziales" },
  { key: "leadership", label: "Führung", category: "Soziales" },

  // Heimlichkeit & Kriminalität
  {
    key: "stealth",
    label: "Heimlichkeit",
    category: "Heimlichkeit & Kriminalität",
  },
  {
    key: "lockpicking",
    label: "Schlossknacken",
    category: "Heimlichkeit & Kriminalität",
  },
  {
    key: "pickpocketing",
    label: "Taschendiebstahl",
    category: "Heimlichkeit & Kriminalität",
  },
  {
    key: "trap_disarming",
    label: "Fallen entschärfen",
    category: "Heimlichkeit & Kriminalität",
  },
  {
    key: "poisoncraft",
    label: "Giftkunde",
    category: "Heimlichkeit & Kriminalität",
  },

  // Handwerk
  { key: "blacksmithing", label: "Schmiedekunst", category: "Handwerk" },
  { key: "woodworking", label: "Holzbearbeitung", category: "Handwerk" },
  { key: "leatherworking", label: "Lederverarbeitung", category: "Handwerk" },
  { key: "tailoring", label: "Schneiderei", category: "Handwerk" },
  { key: "cooking", label: "Kochen", category: "Handwerk" },
  { key: "brewing", label: "Braukunst", category: "Handwerk" },
];
