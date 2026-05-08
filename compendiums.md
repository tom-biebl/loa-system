# Feature: Test Compendiums

## Ziel

Erstelle einfache Test-Compendiums für das LoA-System, damit Waffen, Zauber, Consumables, Abilities und Rüstungen direkt in Foundry getestet werden können.

Die Compendiums dienen nur als technische Testdaten und müssen nicht vollständig gebalanced sein.

---

# Compendiums

Erstelle folgende Packs im System:

```txt
packs/
  weapons/
  armor/
  spells/
  abilities/
  consumables/
```

Registriere alle Packs in `system.json`.

---

# Weapons Compendium

Pack:

```txt
LoA Weapons
```

Erstelle mindestens folgende Waffen:

- Langschwert
- Dolch
- Kurzbogen
- Armbrust
- Jagdgewehr

Die Waffen sollen:
- Damage
- Damage Type
- Attack Bonus
- Attribute
- Range
- Action Cost

korrekt gesetzt haben.

Mindestens:
- eine Melee-Waffe
- eine Ranged-Waffe
- eine Schusswaffe

---

# Armor Compendium

Pack:

```txt
LoA Armor
```

Erstelle mindestens:

- Lederrüstung
- Kettenrüstung
- Plattenrüstung

Die Rüstungen sollen:
- AC Bonus
- Armor Type
- Equipped
- Slots

unterstützen.

---

# Spells Compendium

Pack:

```txt
LoA Spells
```

Erstelle mindestens:

- Feuerball (Damage)
- Heilung (Heal)
- Arkane Hand (Utility)
- Gegenzauber (Reaction Counter)

Die Spells sollen:
- unterschiedliche Effect Kinds nutzen
- Resonance Cost besitzen
- Action Costs besitzen
- Damage / Heal Formula besitzen
- Reaktions-Spells unterstützen

---

# Abilities Compendium

Pack:

```txt
LoA Abilities
```

Erstelle mindestens:

- Ausweichen (Reaction Dodge)
- Blocken (Reaction Damage Reduction)
- Kontern (Reaction Counter)
- Kampfschrei (Utility)

Abilities sollen:
- unterschiedliche Reaktionsarten testen
- Action Costs besitzen
- Reaktionswürfe unterstützen

---

# Consumables Compendium

Pack:

```txt
LoA Consumables
```

Erstelle mindestens:

- Kleiner Heiltrank
- Giftflasche
- Brandbombe
- Rauchbombe

Consumables sollen:
- Quantity besitzen
- unterschiedliche Usage Types nutzen
- Damage / Heal / Utility testen

---

# Anforderungen

Alle Test-Items sollen:
- Icons besitzen
- sinnvolle Namen besitzen
- direkt nutzbar sein
- im Actor Sheet funktionieren
- über Drag & Drop nutzbar sein
- über die Combat Pipeline funktionieren

---

# Technische Anforderungen

- Compendiums müssen Teil des Systems sein
- Packs müssen automatisch in Foundry sichtbar sein
- Alle Testdaten sollen gültige Item-Daten besitzen
- Keine leeren oder kaputten Items erzeugen
- Keine hardcodierten IDs verwenden

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Weapons Compendium existiert
- Armor Compendium existiert
- Spells Compendium existiert
- Abilities Compendium existiert
- Consumables Compendium existiert
- Alle Packs in Foundry sichtbar sind
- Items aus den Packs gezogen werden können
- Waffen Angriffe ausführen können
- Spells gewirkt werden können
- Abilities genutzt werden können
- Consumables benutzt werden können
- Reaktions-Abilities testbar sind