# Feature: Erfahrungssystem

## Ziel

Das Erfahrungssystem ermöglicht es Charakteren, in bestimmten Wissens-, Kampf- oder Fertigkeitsbereichen Erfahrung zu sammeln und dadurch bessere Ergebnisse bei passenden Proben zu erzielen.

Das System orientiert sich konzeptionell an Proficiency-Systemen aus anderen Pen-and-Paper-Systemen, verwendet jedoch frei definierbare Erfahrungsbereiche anstelle fester Skills.

Erfahrung ist unabhängig vom Charakterlevel.

Ein Charakter kann:
- Meister in einem Bereich sein
- gleichzeitig unerfahren in anderen Bereichen bleiben

---

# Grundprinzip

Ein Erfahrungsbereich besitzt:
- Erfahrungspunkte (EP)
- einen Rang
- einen daraus resultierenden Bonus

Wenn eine Probe zu einem Erfahrungsbereich passt, wird der Erfahrungsbonus auf den Wurf addiert.

Beispiel:
- Charakter besitzt "Arkane Magie" auf Experte
- Experte gewährt +3
- Der Charakter erhält +3 auf passende Würfe

---

# Erfahrungsstufen

| Stufe | Key | Benötigte EP | Bonus |
|------|------|--------------|--------|
| Keine Erfahrung | none | 0 | +0 |
| Novize | novice | 5 | +1 |
| Gelehrter | scholar | 15 | +2 |
| Experte | expert | 30 | +3 |
| Meister | master | 50 | +4 |

---

# Rangberechnung

Der Rang wird automatisch anhand der EP berechnet.

```ts
if (xp >= 50) {
  rank = "master";
} else if (xp >= 30) {
  rank = "expert";
} else if (xp >= 15) {
  rank = "scholar";
} else if (xp >= 5) {
  rank = "novice";
} else {
  rank = "none";
}
```

---

# Bonusberechnung

Der Bonus wird aus dem Rang berechnet.

```ts
const EXPERIENCE_BONUS = {
  none: 0,
  novice: 1,
  scholar: 2,
  expert: 3,
  master: 4
};
```

---

# Actor Data Model

Erfahrungsbereiche werden direkt am Actor gespeichert.

Pfad:

```txt
actor.system.experience
```

Beispiel:

```json
{
  "experience": [
    {
      "key": "arcane_magic",
      "label": "Arkane Magie",
      "xp": 22
    },
    {
      "key": "swordsmanship",
      "label": "Schwertkampf",
      "xp": 37
    }
  ]
}
```

Rang und Bonus werden nicht gespeichert, sondern dynamisch berechnet.

---

# Standard-Erfahrungsbereiche

Das System soll standardmäßig folgende Erfahrungsbereiche besitzen.

## Kampf

| Key | Anzeigename |
|------|-------------|
| swordsmanship | Schwertkampf |
| axe_combat | Axtkampf |
| spear_combat | Speerkampf |
| dagger_combat | Dolchkampf |
| bow_combat | Bogenschießen |
| crossbow_combat | Armbrustkampf |
| firearm_combat | Schusswaffen |
| shield_usage | Schildkampf |
| heavy_armor | Schwere Rüstung |
| light_armor | Leichte Rüstung |
| unarmed_combat | Waffenkampf |

---

## Magie

| Key | Anzeigename |
|------|-------------|
| arcane_magic | Arkane Magie |
| elemental_magic | Elementarmagie |
| blood_magic | Blutmagie |
| holy_magic | Heilige Magie |
| dark_magic | Dunkle Magie |
| ritual_magic | Ritualmagie |
| alchemy | Alchemie |
| enchanting | Verzauberung |

---

## Wissen

| Key | Anzeigename |
|------|-------------|
| history | Geschichte |
| religion | Religion |
| ancient_civilizations | Alte Zivilisationen |
| medicine | Medizin |
| nature | Naturkunde |
| engineering | Ingenieurskunst |
| astronomy | Astronomie |
| politics | Politik |

---

## Überleben & Exploration

| Key | Anzeigename |
|------|-------------|
| survival | Überleben |
| tracking | Fährtenlesen |
| hunting | Jagd |
| fishing | Fischerei |
| climbing | Klettern |
| swimming | Schwimmen |
| navigation | Navigation |

---

## Soziales

| Key | Anzeigename |
|------|-------------|
| persuasion | Überzeugen |
| deception | Täuschung |
| intimidation | Einschüchtern |
| performance | Auftreten |
| leadership | Führung |

---

## Heimlichkeit & Kriminalität

| Key | Anzeigename |
|------|-------------|
| stealth | Heimlichkeit |
| lockpicking | Schlossknacken |
| pickpocketing | Taschendiebstahl |
| trap_disarming | Fallen entschärfen |
| poisoncraft | Giftkunde |

---

## Handwerk

| Key | Anzeigename |
|------|-------------|
| blacksmithing | Schmiedekunst |
| woodworking | Holzbearbeitung |
| leatherworking | Lederverarbeitung |
| tailoring | Schneiderei |
| cooking | Kochen |
| brewing | Braukunst |

---

# Character Creation

Bei der Charaktererstellung wählt jeder Spieler:
- 3 Interessen

Diese starten automatisch auf:
- 5 EP
- Rang Novize
- Bonus +1

Alle anderen Bereiche starten mit:
- 0 EP
- Rang none
- Bonus +0

---

# Sheet-Anforderungen

Das Character Sheet benötigt einen Bereich für Erfahrung.

Jeder Eintrag zeigt:
- Name
- XP
- Rang
- Bonus

Beispiel:

```txt
Arkane Magie
22 EP
Gelehrter
+2
```

---

# Technische Anforderungen

- Erfahrungsbereiche dürfen nicht hartcodiert im Sheet sein
- UI muss dynamisch rendern
- Neue Erfahrungsbereiche müssen leicht hinzufügbar sein
- Rang und Bonus müssen automatisch berechnet werden
- Alle Keys müssen stabil bleiben
- Anzeigenamen müssen zentral übersetzbar sein

---

# Geplante Erweiterungen

Dieses Feature soll später erweitert werden um:
- bereichsspezifische Vorteile
- automatische Kampfboni
- Magie-Lernsysteme
- Tooltips
- Spezialisierungen
- Würfelintegration
- Klassen-Synergien

Diese Features sind nicht Teil der ersten Implementierung.

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Actors Erfahrungsbereiche besitzen können
- Erfahrungsbereiche im Sheet angezeigt werden
- XP bearbeitet werden können
- Rang automatisch berechnet wird
- Bonus automatisch berechnet wird
- Änderungen persistent gespeichert werden
- Das UI dynamisch funktioniert
- Keine Erfahrungsbereiche hartcodiert sind