# Feature: Consumable Items

## Ziel

Consumables sind verbrauchbare Items, die einen vordefinierten Effekt besitzen und nach der Nutzung reduziert oder entfernt werden können.

Beispiele:
- Heiltrank
- Gift
- Wurföl
- Brandflasche
- Rauchbombe
- Gegengift

Consumables sollen sowohl trinkbar als auch werfbar sein können.

---

# Item Type

Dieses Feature betrifft Items vom Typ:

```txt
consumable
```

---

# Grundprinzip

Ein Consumable besitzt:

- Namen
- Beschreibung
- Anzahl
- Nutzungsart
- Effekt-Typ
- Effekt-Werte
- Verbrauchsregel

---

# Consumable Usage Types

Consumables können unterschiedliche Nutzungsarten besitzen.

| Key | Anzeigename | Beschreibung |
|------|-------------|--------------|
| drinkable | Trinkbar | Wird vom Actor selbst oder einem Ziel getrunken |
| throwable | Werfbar | Wird auf ein Ziel oder eine Fläche geworfen |
| applicable | Auftragbar | Wird auf eine Waffe, Oberfläche oder ein Objekt aufgetragen |

---

# Vordefinierte Effekt-Typen

Consumables sollen aus vordefinierten Effekten wählen können.

| Key | Anzeigename | Beschreibung |
|------|-------------|--------------|
| healing | Heilung | Stellt Lebenspunkte wieder her |
| poison | Gift | Verursacht Giftschaden oder einen Giftzustand |
| antidote | Gegengift | Entfernt oder reduziert Gift |
| damage | Schaden | Verursacht direkten Schaden |
| fire | Feuer | Verursacht Feuerschaden oder Brennen |
| smoke | Rauch | Erzeugt Sichtbehinderung |
| buff | Buff | Gewährt temporären Vorteil |
| debuff | Debuff | Verursacht temporären Nachteil |
| utility | Utility | Sonstiger besonderer Effekt |

---

# Item Data Model

Pfad:

```txt
item.system
```

Beispiel:

```json
{
  "quantity": 3,
  "usageType": "drinkable",
  "effect": {
    "type": "healing",
    "formula": "1d6 + 2",
    "target": "self",
    "duration": null,
    "condition": null
  },
  "consume": {
    "onUse": true,
    "amount": 1,
    "removeAtZero": true
  }
}
```

---

# Effekt-Datenmodell

Jeder Effekt besitzt folgende Felder:

```json
{
  "type": "healing",
  "formula": "1d6 + 2",
  "target": "self",
  "duration": null,
  "condition": null
}
```

## Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| type | string | Effekt-Typ, z. B. healing, poison, damage |
| formula | string | Würfelformel, z. B. 1d6 + 2 |
| target | string | Ziel des Effekts |
| duration | number/null | Dauer in Runden |
| condition | string/null | Zustand, der angewendet wird |

---

# Target Types

| Key | Anzeigename |
|------|-------------|
| self | Selbst |
| single_target | Einzelnes Ziel |
| area | Fläche |
| weapon | Waffe |
| object | Objekt |

---

# Beispiele

## Heiltrank

```json
{
  "quantity": 2,
  "usageType": "drinkable",
  "effect": {
    "type": "healing",
    "formula": "1d6 + 2",
    "target": "self",
    "duration": null,
    "condition": null
  },
  "consume": {
    "onUse": true,
    "amount": 1,
    "removeAtZero": true
  }
}
```

---

## Giftflasche

```json
{
  "quantity": 1,
  "usageType": "applicable",
  "effect": {
    "type": "poison",
    "formula": "1d4",
    "target": "weapon",
    "duration": 3,
    "condition": "poisoned"
  },
  "consume": {
    "onUse": true,
    "amount": 1,
    "removeAtZero": true
  }
}
```

---

## Brandflasche

```json
{
  "quantity": 1,
  "usageType": "throwable",
  "effect": {
    "type": "fire",
    "formula": "2d6",
    "target": "area",
    "duration": 2,
    "condition": "burning"
  },
  "consume": {
    "onUse": true,
    "amount": 1,
    "removeAtZero": true
  }
}
```

---

# Sheet-Anforderungen

Das Consumable Item Sheet benötigt folgende Felder:

## Allgemein

- Name
- Beschreibung
- Anzahl

## Nutzung

- Nutzungsart als Dropdown
  - Trinkbar
  - Werfbar
  - Auftragbar

## Effekt

- Effekt-Typ als Dropdown
  - Heilung
  - Gift
  - Gegengift
  - Schaden
  - Feuer
  - Rauch
  - Buff
  - Debuff
  - Utility

- Formel-Feld
- Ziel-Dropdown
- Dauer-Feld
- Zustand-Feld

## Verbrauch

- Checkbox: Bei Nutzung verbrauchen
- Verbrauchsmenge
- Checkbox: Bei 0 entfernen

---

# Use Action

Consumables sollen im Actor Sheet eine Aktion besitzen:

```txt
Benutzen
```

Beim Benutzen soll:

1. geprüft werden, ob quantity > 0 ist
2. der Effekt verarbeitet werden
3. optional ein Roll ausgeführt werden
4. eine Chat-Nachricht erzeugt werden
5. quantity reduziert werden
6. das Item bei quantity 0 optional entfernt werden

---

# Chat-Ausgabe

Bei Benutzung eines Consumables soll eine Chat-Nachricht erzeugt werden.

Beispiel:

```txt
Kael benutzt Heiltrank.

Effekt: Heilung
Wurf: 1d6 + 2
Ergebnis: 7

Heilung: 7 LP
```

Bei werfbaren Items:

```txt
Kael wirft Brandflasche.

Effekt: Feuer
Wurf: 2d6
Ergebnis: 9

Ziel: Fläche
Zustand: Brennend
Dauer: 2 Runden
```

---

# Technische Anforderungen

- Consumable-Effekte dürfen nicht hartcodiert im Sheet sein
- Effekt-Typen sollen zentral konfiguriert werden
- Nutzungsarten sollen zentral konfiguriert werden
- Verbrauchslogik soll wiederverwendbar sein
- Roll-Logik soll später erweiterbar sein
- Zustände sollen später mit Active Effects verbunden werden können
- Werfbare Items sollen später mit Reichweite und AoE erweitert werden können

---

# Geplante Erweiterungen

Nicht Teil dieses ersten Implementierungsschritts:

- automatische Zielauswahl über Tokens
- automatische HP-Anpassung
- automatische Active Effects
- Reichweite für Wurfitems
- Flächenmessung
- Rettungswürfe
- Item-Crafting
- Potion Belt Integration für Hexer
- Spezialmunition-Integration für Soul Hunter

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Consumable Items ein eigenes Datenmodell besitzen
- Consumables eine Menge besitzen
- Consumables eine Nutzungsart besitzen
- Consumables einen vordefinierten Effekt-Typ besitzen
- Heilung als Effekt auswählbar ist
- Gift als Effekt auswählbar ist
- Trinkbar als Nutzungsart auswählbar ist
- Werfbar als Nutzungsart auswählbar ist
- Consumables über das Actor Sheet benutzt werden können
- Beim Benutzen eine Chat-Nachricht erzeugt wird
- Optional eine Würfelformel ausgewertet wird
- Die Menge nach Benutzung reduziert wird
- Items bei Menge 0 optional entfernt werden können
- Effekt-Typen zentral konfigurierbar sind
- Nutzungsarten zentral konfigurierbar sind