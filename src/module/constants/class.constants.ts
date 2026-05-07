/**
 * Zentrale Klassen-Definitionen. Neue Klassen werden hier ergänzt — der
 * ClassManager und das Sheet ziehen sich alles aus dieser Liste, kein Sheet-Code
 * darf Klassen hartkodieren.
 */

export type ClassResourceKey =
  | "resonance"
  | "superiorityDice"
  | "potions"
  | "ammo"
  | "specialAmmo";

export interface SubclassDefinition {
  key: string;
  label: string;
  /** Zusätzliche Ressourcen über die der Hauptklasse hinaus. */
  additionalResources: ClassResourceKey[];
}

export interface ClassDefinition {
  key: string;
  label: string;
  resources: ClassResourceKey[];
  subclasses: SubclassDefinition[];
}

export const NO_CLASS_KEY = "none";

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  { key: "warrior", label: "Krieger", resources: ["superiorityDice"], subclasses: [] },
  { key: "warlock", label: "Hexer", resources: ["potions"], subclasses: [] },
  {
    key: "dark_ranger",
    label: "Düsterpirscher",
    resources: ["ammo"],
    subclasses: [
      {
        key: "soul_hunter",
        label: "Soul Hunter",
        additionalResources: ["specialAmmo"],
      },
    ],
  },
  { key: "mage", label: "Magier", resources: ["resonance"], subclasses: [] },
  {
    key: "experimental_weaver",
    label: "Experimentalweber",
    resources: ["resonance"],
    subclasses: [],
  },
  { key: "monk", label: "Kampfmönch", resources: ["resonance"], subclasses: [] },
  {
    key: "demon_hunter",
    label: "Dämonenjäger",
    resources: ["resonance"],
    subclasses: [],
  },
];

export const NULL_CLASS_LABEL = "— keine Klasse —";
