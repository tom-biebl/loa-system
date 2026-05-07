# Feature: Klassen-System

## Ziel

Das Klassen-System definiert die spielmechanische Grundausrichtung eines Characters.

Jeder Actor besitzt genau eine Hauptklasse.

Die gewählte Klasse bestimmt:
- verfügbare Klassenressourcen
- spätere Klassenfähigkeiten
- mögliche Subklassen
- bestimmte UI-Elemente im Character Sheet
- zukünftige Progression und Kampfmechaniken

Das System muss modular und erweiterbar aufgebaut sein.

---

# Verfügbare Klassen

| Key | Anzeigename |
|------|-------------|
| warrior | Krieger |
| warlock | Hexer |
| dark_ranger | Düsterpirscher |
| mage | Magier |
| experimental_weaver | Experimentalweber |
| monk | Kampfmönch |
| demon_hunter | Dämonenjäger |

---

# Subklassen

## Düsterpirscher

| Key | Anzeigename |
|------|-------------|
| soul_hunter | Soul Hunter |

Subklassen sind optional und abhängig von der gewählten Hauptklasse.

Ein Actor darf:
- maximal eine Hauptklasse besitzen
- maximal eine Subklasse besitzen

Subklassen dürfen nur auswählbar sein, wenn die Hauptklasse kompatibel ist.

---

# Actor Data Model

Die Klasse wird direkt am Actor gespeichert.

Pfad:

```txt
actor.system.class
```

Beispiel:

```json
{
  "class": {
    "key": "mage",
    "subclass": null
  }
}
```

Beispiel mit Subklasse:

```json
{
  "class": {
    "key": "dark_ranger",
    "subclass": "soul_hunter"
  }
}
```

---

# Klassenressourcen

Klassen besitzen unterschiedliche Ressourcen.

Diese Ressourcen sollen:
- dynamisch angezeigt werden
- nur bei passenden Klassen sichtbar sein
- später leicht erweiterbar bleiben

Die Ressourcen dürfen NICHT hartcodiert über große if/else-Blöcke im Sheet implementiert werden.

---

# Resonanzpunkte

Folgende Klassen besitzen Resonanzpunkte:

- Magier
- Experimentalweber
- Dämonenjäger
- Kampfmönch

Pfad:

```txt
actor.system.resources.resonance
```

Beispiel:

```json
{
  "resonance": {
    "current": 4,
    "max": 8
  }
}
```

Anzeige:
- Current / Max
- Optional später als Resource Bar

---

# Superiority Dice

Der Krieger besitzt Superiority Dice.

Diese werden für Battlemanöver verwendet.

Pfad:

```txt
actor.system.resources.superiorityDice
```

Beispiel:

```json
{
  "superiorityDice": {
    "dice": "1d6",
    "current": 3,
    "max": 3
  }
}
```

Diese Mechanik soll später erweiterbar sein:
- unterschiedliche Dice-Größen
- Verbrauch
- Rest-System
- Battlemanöver

---

# Hexer - Potion Inventory

Hexer besitzen ein zusätzliches spezialisiertes Inventar für Tränke.

Visuelle Vorstellung:
- ähnlich einem Munitionsgurt
- Potion Slots statt normales Listeninventar

Pfad:

```txt
actor.system.classResources.potions
```

Beispiel:

```json
{
  "potions": {
    "slots": 6,
    "items": []
  }
}
```

Anforderungen:
- separates UI
- nur für Hexer sichtbar
- vorbereitet für Drag & Drop
- vorbereitet für spezielle Potion-Items

---

# Düsterpirscher - Ammo System

Düsterpirscher besitzen ein Munition-System.

Sie verwenden:
- Pfeile
- Bolzen

Pfad:

```txt
actor.system.resources.ammo
```

Beispiel:

```json
{
  "ammo": {
    "arrows": 20,
    "bolts": 12
  }
}
```

---

# Soul Hunter - Spezialmunition

Die Subklasse Soul Hunter erweitert das Ammo-System.

Soul Hunter verwenden:
- Schusswaffen
- verschiedene Patronentypen

Munition soll:
- unterschiedliche Typen besitzen
- als Items existieren können
- später craftbar sein
- durch den GM erstellbar sein

Beispiele:
- Silbermunition
- Explosivmunition
- Dämonenpatronen

Pfad:

```txt
actor.system.resources.specialAmmo
```

Beispiel:

```json
{
  "specialAmmo": [
    {
      "type": "silver_round",
      "label": "Silberpatrone",
      "amount": 12
    }
  ]
}
```

Dieses System muss stark erweiterbar bleiben.

---

# Sheet-Anforderungen

## Klassenauswahl

Das Character Sheet benötigt:
- Dropdown für Hauptklasse
- Dropdown für Subklasse (nur wenn verfügbar)

Die Dropdowns müssen dynamisch aus einer zentralen Klassendefinition generiert werden.

---

# Dynamische Ressourcenanzeige

Nur Ressourcen der aktuell gewählten Klasse dürfen angezeigt werden.

Beispiele:

## Magier

Sichtbar:
- Resonanzpunkte

Nicht sichtbar:
- Superiority Dice
- Potion Inventory
- Ammo

---

## Krieger

Sichtbar:
- Superiority Dice

Nicht sichtbar:
- Resonanzpunkte
- Potion Inventory

---

## Hexer

Sichtbar:
- Potion Inventory

---

## Düsterpirscher

Sichtbar:
- Ammo

---

## Soul Hunter

Sichtbar:
- Ammo
- Spezialmunition

---

# Technische Anforderungen

- Klassen dürfen nicht hartcodiert im UI sein
- Ressourcenanzeige muss dynamisch sein
- Klassenkonfiguration soll zentral definiert werden
- Neue Klassen sollen leicht hinzufügbar sein
- Neue Ressourcen sollen leicht hinzufügbar sein
- Subklassen sollen modular erweiterbar bleiben
- Systeme müssen objektorientiert aufgebaut sein

---

# Architektur-Vorschlag

Empfohlene Struktur:

```txt
src/
  config/
    classes.ts

  module/
    actor/
      class-manager.ts
      resource-manager.ts

  templates/
    actor/
      partials/
        class-resources/
```

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Actors eine Hauptklasse auswählen können
- Actors optional eine Subklasse auswählen können
- Klassen persistent gespeichert werden
- Klassen dynamisch aus zentraler Definition geladen werden
- Ressourcen abhängig von der Klasse angezeigt werden
- Resonanzpunkte korrekt angezeigt werden
- Superiority Dice korrekt angezeigt werden
- Potion Inventory korrekt angezeigt wird
- Ammo korrekt angezeigt wird
- Spezialmunition korrekt angezeigt wird
- Subklassen nur bei kompatibler Hauptklasse auswählbar sind
- Das Sheet keine hartcodierten Klassen-UI-Blöcke besitzt
- Neue Klassen ohne große Refactors ergänzt werden können
- Neue Ressourcen ohne große Refactors ergänzt werden können