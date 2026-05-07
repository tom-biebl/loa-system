# Feature: Combat Action Economy

## Ziel

Das System soll die Aktionsökonomie eines Actors im Kampf sauber abbilden.

Jeder Actor besitzt pro eigenem Turn standardmäßig:

- 1 Aktion
- 1 Bonusaktion
- 1 Reaktion

Diese Werte müssen pro Actor konfigurierbar sein, damit Sonderfälle möglich sind.

Beispiele:
- Bossgegner mit mehreren Reaktionen
- schnelle Klassen mit zusätzlichen Bonusaktionen
- Debuffs, die Aktionen reduzieren
- Buffs, die zusätzliche Reaktionen gewähren

---

# Grundregel pro Turn

Ein Actor darf in seinem eigenen Turn standardmäßig verwenden:

```txt
1 Aktion
1 Bonusaktion
1 Reaktion
```

Aktionen und Bonusaktionen werden nur im eigenen Turn verwendet.

Reaktionen können auch außerhalb des eigenen Turns verwendet werden.

---

# Action Types

| Key | Anzeigename | Beschreibung |
|------|-------------|--------------|
| action | Aktion | Hauptaktion des eigenen Turns |
| bonus_action | Bonusaktion | zusätzliche kleinere Handlung im eigenen Turn |
| reaction | Reaktion | Antwort auf eine Aktion oder einen Trigger |
| free_action | Freie Aktion | kurze Handlung ohne Ressourcenverbrauch |

---

# Actor Data Model

Die Aktionsressourcen werden am Actor gespeichert.

Pfad:

```txt
actor.system.combat.actions
```

Beispiel:

```json
{
  "combat": {
    "actions": {
      "action": {
        "current": 1,
        "max": 1
      },
      "bonusAction": {
        "current": 1,
        "max": 1
      },
      "reaction": {
        "current": 1,
        "max": 1
      }
    }
  }
}
```

---

# Turn Reset Logic

Am Anfang des eigenen Turns werden die Aktionsressourcen des Actors zurückgesetzt.

```ts
actor.system.combat.actions.action.current = actor.system.combat.actions.action.max;
actor.system.combat.actions.bonusAction.current = actor.system.combat.actions.bonusAction.max;
actor.system.combat.actions.reaction.current = actor.system.combat.actions.reaction.max;
```

Wichtig:

- Reaktionen werden am Anfang des eigenen Turns zurückgesetzt.
- Nicht verbrauchte Aktionen werden nicht in den nächsten Turn übertragen.
- Current darf niemals höher als Max sein.
- Current darf niemals kleiner als 0 sein.

---

# Aktionen

Eine Aktion ist die primäre Handlung eines Actors in seinem Turn.

Beispiele:

- Angriff
- Zauber wirken
- Sprinten
- Interagieren
- Item benutzen
- Spezialfähigkeit verwenden

Regel:

```txt
Wenn action.current > 0, darf der Actor eine Aktion ausführen.
Nach Ausführung wird action.current um 1 reduziert.
```

Wenn keine Aktion mehr verfügbar ist:

```txt
Die Aktion darf nicht ausgeführt werden.
Es soll eine Warnung angezeigt werden.
```

---

# Bonusaktionen

Eine Bonusaktion ist eine zusätzliche Handlung im eigenen Turn.

Beispiele:

- schnelle Klassenfähigkeit
- Nebenhand-Angriff
- kurze Bewegungstechnik
- bestimmte Items verwenden
- kleinere Spezialfähigkeit

Regel:

```txt
Wenn bonusAction.current > 0, darf der Actor eine Bonusaktion ausführen.
Nach Ausführung wird bonusAction.current um 1 reduziert.
```

Bonusaktionen sind getrennt von normalen Aktionen.

Eine nicht genutzte Aktion gibt nicht automatisch eine zusätzliche Bonusaktion.

Eine nicht genutzte Bonusaktion gibt nicht automatisch eine zusätzliche Aktion.

---

# Reaktionen

Eine Reaktion ist eine Antwort auf eine andere Aktion oder einen Trigger.

Reaktionen können:
- im eigenen Turn
- außerhalb des eigenen Turns
- direkt nach einer Aktion
- direkt nach einem Angriff
- direkt nach erlittenem Schaden
- bei Bewegung eines Gegners
- bei Auslösen eines Effekts

verwendet werden.

Regel:

```txt
Wenn reaction.current > 0, darf der Actor eine Reaktion ausführen.
Nach Ausführung wird reaction.current um 1 reduziert.
```

---

# Reaktionsarten

Das System soll folgende Reaktionsarten vorbereiten:

| Key | Anzeigename | Beschreibung |
|------|-------------|--------------|
| dodge | Ausweichen | Reaktion, um einem Angriff auszuweichen oder dessen Trefferchance zu beeinflussen |
| reduce_damage | Schaden reduzieren | Reaktion, um eingehenden Schaden zu verringern |
| counter | Kontern | Reaktion, um nach einer gegnerischen Aktion zurückzuschlagen |
| interrupt | Unterbrechen | Reaktion, um eine laufende Aktion zu stören |
| protect | Schützen | Reaktion, um Schaden für einen Verbündeten abzufangen |
| opportunity_attack | Gelegenheitsangriff | Reaktion auf Bewegung eines Gegners |

---

# Trigger-Logik für Reaktionen

Reaktionen werden nicht einfach beliebig ausgeführt, sondern reagieren auf ein Ereignis.

Ein Trigger beschreibt, wann eine Reaktion angeboten werden darf.

## Mögliche Trigger

| Key | Beschreibung |
|------|--------------|
| after_action_declared | Nachdem eine Aktion angekündigt wurde |
| before_attack_roll | Bevor ein Angriff gewürfelt wird |
| after_attack_roll | Nachdem ein Angriff gewürfelt wurde |
| before_damage_applied | Bevor Schaden angewendet wird |
| after_damage_applied | Nachdem Schaden angewendet wurde |
| on_enemy_movement | Wenn sich ein Gegner aus Reichweite bewegt |
| on_spell_cast | Wenn ein Zauber gewirkt wird |
| on_ally_hit | Wenn ein Verbündeter getroffen wird |

---

# Beispiel: Ausweichen

Ausweichen ist eine Reaktion.

Trigger:

```txt
before_attack_roll
```

Ablauf:

1. Angreifer kündigt Angriff an.
2. Ziel bekommt Möglichkeit zur Reaktion.
3. Wenn Ziel reaction.current > 0 besitzt, kann es Ausweichen wählen.
4. Die Reaktion wird verbraucht.
5. Der Angriff wird mit dem Ausweich-Effekt verarbeitet.

Erster Implementierungsschritt:

- Reaktion verbrauchen
- Chat-Nachricht erzeugen
- kein automatischer Trefferwurf-Modifikator notwendig

---

# Beispiel: Schaden reduzieren

Schaden reduzieren ist eine Reaktion.

Trigger:

```txt
before_damage_applied
```

Ablauf:

1. Schaden wird berechnet.
2. Ziel bekommt Möglichkeit zur Reaktion.
3. Wenn Ziel reaction.current > 0 besitzt, kann es Schaden reduzieren wählen.
4. Die Reaktion wird verbraucht.
5. Reduktionsformel wird gewürfelt.
6. Reduzierter Schaden wird im Chat angezeigt.

Beispiel:

```txt
Eingehender Schaden: 12
Schadensreduktion: 1d6
Wurf: 4
Finaler Schaden: 8
```

---

# Beispiel: Kontern

Kontern ist eine Reaktion.

Trigger:

```txt
after_attack_roll
```

oder:

```txt
after_damage_applied
```

Ablauf:

1. Gegner führt eine Aktion aus.
2. Actor darf reagieren, wenn er eine verfügbare Reaktion besitzt.
3. Actor wählt Kontern.
4. Reaktion wird verbraucht.
5. Chat-Nachricht wird erzeugt.
6. Später kann daraus ein Gegenangriff entstehen.

Erster Implementierungsschritt:

- Reaktion verbrauchen
- Chat-Nachricht erzeugen
- kein vollständiger Gegenangriff notwendig

---

# Action Spending Logic

Alle Aktionen sollen über eine zentrale Methode verbraucht werden.

Beispiel:

```ts
spendAction(actor, actionType)
```

Pseudo-Code:

```ts
function spendAction(actor, actionType) {
  const action = actor.system.combat.actions[actionType];

  if (!action) {
    ui.notifications.warn("Diese Aktionsart existiert nicht.");
    return false;
  }

  if (action.current <= 0) {
    ui.notifications.warn("Keine verfügbare Aktion mehr.");
    return false;
  }

  action.current = Math.max(0, action.current - 1);

  actor.update({
    [`system.combat.actions.${actionType}.current`]: action.current
  });

  return true;
}
```

---

# Action Reset Logic

Alle Aktionen sollen über eine zentrale Methode zurückgesetzt werden.

Beispiel:

```ts
resetActionsForTurn(actor)
```

Pseudo-Code:

```ts
function resetActionsForTurn(actor) {
  const actions = actor.system.combat.actions;

  const updates = {};

  for (const [key, value] of Object.entries(actions)) {
    updates[`system.combat.actions.${key}.current`] = value.max;
  }

  actor.update(updates);
}
```

---

# Reaktionsangebot nach Aktionen

Nach bestimmten Aktionen soll das System später Reaktionen anbieten können.

Erster Implementierungsschritt:

- keine automatische Zielauswahl erforderlich
- keine Dialogpflicht
- aber die Architektur muss Reaktionen nach Triggern ermöglichen

Beispielhafte Struktur:

```ts
offerReactions(trigger, context)
```

```ts
const context = {
  sourceActor,
  targetActor,
  actionType: "attack",
  damage: 12
};
```

---

# Chat-Ausgabe

Jede verbrauchte Aktion soll im Chat nachvollziehbar sein.

Beispiel Aktion:

```txt
Kael verwendet eine Aktion: Angriff.
Verbleibende Aktionen: 0 / 1
```

Beispiel Bonusaktion:

```txt
Kael verwendet eine Bonusaktion: Schattenstep.
Verbleibende Bonusaktionen: 0 / 1
```

Beispiel Reaktion:

```txt
Kael verwendet eine Reaktion: Ausweichen.
Verbleibende Reaktionen: 0 / 1
```

---

# UI-Anforderungen

Das Actor Sheet soll anzeigen:

```txt
Aktionen: 1 / 1
Bonusaktionen: 1 / 1
Reaktionen: 1 / 1
```

Anforderungen:

- current bearbeitbar
- max bearbeitbar
- Ressourcen dürfen nicht unter 0 fallen
- Ressourcen dürfen nicht über max steigen
- Buttons zum manuellen Verbrauch
- Button zum manuellen Zurücksetzen

---

# Combat Tracker Integration

Wenn möglich, soll beim Start des Turns eines Actors automatisch `resetActionsForTurn(actor)` ausgeführt werden.

Falls die Combat Tracker Integration noch fehleranfällig ist, reicht im ersten Schritt:

- manueller Reset-Button im Actor Sheet
- saubere zentrale Reset-Methode
- spätere Integration vorbereiten

---

# Technische Anforderungen

- Aktionslogik darf nicht im Sheet hardcoded sein
- Verbrauchslogik muss zentralisiert sein
- Reset-Logik muss zentralisiert sein
- Reaktionen müssen triggerbasiert vorbereitet werden
- Reaktionen dürfen außerhalb des eigenen Turns möglich sein
- Max-Werte müssen pro Actor konfigurierbar sein
- Current-Werte müssen persistent gespeichert werden
- Kein Current-Wert darf kleiner als 0 sein
- Kein Current-Wert darf größer als Max sein

---

# Nicht Teil dieses ersten Implementierungsschritts

- vollständige automatische Reaktionsdialoge
- automatische Token-Zielauswahl
- automatische Schadensanwendung
- automatische Trefferwurfmodifikation
- vollständige Battlemanöver
- vollständige Counter-Attack-Logik
- komplexe Interrupt-Regeln
- Netzwerk-/Multiplayer-Permission-Handling

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Jeder Actor Aktionen, Bonusaktionen und Reaktionen besitzt
- Standardwerte 1 / 1 für alle drei Ressourcen gesetzt sind
- Max-Werte pro Actor konfigurierbar sind
- Current-Werte pro Actor konfigurierbar sind
- Aktionen verbraucht werden können
- Bonusaktionen verbraucht werden können
- Reaktionen verbraucht werden können
- Verbrauch niemals unter 0 fällt
- Current niemals über Max steigt
- Ein manueller Reset alle Current-Werte auf Max setzt
- Reaktionen auch außerhalb des eigenen Turns verbraucht werden können
- Nach Verbrauch eine Chat-Nachricht erzeugt wird
- Die Logik zentral implementiert ist
- Sheet-Code nur UI ist und keine Kernlogik enthält
- Die Architektur spätere triggerbasierte Reaktionen unterstützt