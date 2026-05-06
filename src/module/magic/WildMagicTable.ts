/**
 * Datengetriebene Wild-Magic-Tabelle. Wird zur Laufzeit als Foundry RollTable
 * angelegt, damit GMs sie editieren können — fällt auf In-Memory-Auswahl zurück.
 */
export interface WildMagicEntry {
  /** 1-basierter Bereich (inklusive). Muss zur Formel passen. */
  range: [number, number];
  text: string;
}

export const WILD_MAGIC_TABLE_NAME = "LoA Wild Magic Surge";
export const WILD_MAGIC_FORMULA = "1d20";

export const WILD_MAGIC_ENTRIES: WildMagicEntry[] = [
  { range: [1, 1], text: "Münzen im Umkreis von 1,5 m oxidieren schlagartig." },
  { range: [2, 2], text: "Die Luft im Umkreis von 3 m flackert violett für 1 Minute." },
  { range: [3, 3], text: "Der Zaubernde leuchtet 1 Stunde lang sichtbar." },
  { range: [4, 4], text: "Ein Schwarm Motten erscheint und verschwindet nach 1 Runde." },
  { range: [5, 5], text: "Der nächste Wurf des Zaubernden im Kampf ist ein Patzer." },
  { range: [6, 6], text: "Ein zufälliges Ziel im Umkreis erhält Vorteil auf den nächsten Wurf." },
  { range: [7, 7], text: "Alle Lichter im Umkreis von 9 m verlöschen für 1 Runde." },
  { range: [8, 8], text: "Der Zaubernde wird unsichtbar bis zum Ende des nächsten Zugs." },
  { range: [9, 9], text: "Ein Donnerschlag rollt — alle hören ihn 100 m weit." },
  { range: [10, 10], text: "Der Boden im Umkreis von 1,5 m wird glatt wie Eis (1 Runde)." },
  { range: [11, 11], text: "Der nächste Zauber des Zaubernden kostet doppelte RP." },
  { range: [12, 12], text: "Eine zufällige Resistenz hält 1 Minute (W4: 1 Feuer, 2 Kälte, 3 Blitz, 4 Nekro)." },
  { range: [13, 13], text: "Eine harmlose magische Illusion erscheint — wirkt für 1 Minute." },
  { range: [14, 14], text: "Der Zaubernde erhält 1d6 temporäre HP." },
  { range: [15, 15], text: "Die nächste Attacke gegen den Zaubernden hat Vorteil." },
  { range: [16, 16], text: "Ein zufälliger Verbündeter erhält 1 Bonusaktion am Ende seines nächsten Zugs." },
  { range: [17, 17], text: "Magische Spur: Der Zaubernde hinterlässt für 10 Minuten leuchtende Fußabdrücke." },
  { range: [18, 18], text: "Alle nicht magischen Türen im Umkreis von 9 m schwingen einmal auf und zu." },
  { range: [19, 19], text: "Der Zaubernde wird kurz schwerelos und schwebt 1 Runde 30 cm über dem Boden." },
  { range: [20, 20], text: "Resonanz entlädt sich gefahrlos: alle RP des Zaubernden werden auf 0 gesetzt." },
];
