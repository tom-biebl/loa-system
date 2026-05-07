# Feature: Quick Action Menu

## Ziel

Sobald ein Combat aktiv ist, sollen Spieler ein Quick-Action-Menu öffnen können, ohne das Actor Sheet öffnen zu müssen.

Das Menü dient als schneller Zugriff auf:
- Waffen
- Spells
- Consumables
- später Abilities

Spieler sollen Aktionen direkt aus diesem Menü verwenden können.

---

# Grundverhalten

Das Quick-Action-Menu ist nur verfügbar wenn:

```txt
game.combat !== null
```

und ein Combat aktiv läuft.

Das Menü soll:
- schnell erreichbar sein
- während des Kampfes offen bleiben können
- nicht das Actor Sheet ersetzen
- nur kampfrelevante Aktionen anzeigen

---

# Angezeigte Inhalte

## Weapons

Zeige:
- Name
- Icon
- Damage
- Action Cost
- Equipped Status

Aktion:
- Angriff ausführen

Nur ausgerüstete Waffen sollen standardmäßig angezeigt werden.

---

## Spells

Zeige:
- Name
- Icon
- Resonanzkosten
- Effect Type
- Action Cost

Aktion:
- Zauber wirken

---

## Consumables

Zeige:
- Name
- Icon
- Quantity
- Usage Type

Aktion:
- Consumable benutzen

Consumables mit Quantity <= 0 dürfen nicht nutzbar sein.

---

# Ability Support

Abilities sollen vorbereitet werden, auch wenn sie im ersten Schritt optional sind.

Spätere Anzeige:
- aktive Fähigkeiten
- Reaktionen
- Kampfmanöver

---

# Action Integration

Aktionen aus dem Quick-Action-Menu müssen dieselbe Combat-Pipeline verwenden wie das Actor Sheet.

Es darf keine separate Kampf-Logik geben.

Beispiel:

```ts
useCombatItem(actor, item, context)
```

Das Menü ist nur eine alternative UI.

---

# Actor Binding

Das Menü zeigt immer die Inhalte des aktuell kontrollierten Actors.

Wenn mehrere Tokens ausgewählt sind:
- verwende den primär kontrollierten Token

Wenn kein gültiger Actor vorhanden ist:
- Menü deaktivieren

---

# UI-Anforderungen

Das Menü soll:
- kompakt sein
- Icons unterstützen
- während Combat schnell nutzbar sein
- in Kategorien gruppiert sein

Empfohlene Kategorien:

```txt
Weapons
Spells
Consumables
Abilities
```

---

# Combat Visibility

Das Menü soll automatisch:
- sichtbar werden können wenn Combat startet
- optional minimierbar sein
- optional schließbar sein

Wenn Combat endet:
- Menü schließen oder deaktivieren

---

# Technische Anforderungen

- Keine eigene Kampf-Logik im Menü
- Menü verwendet bestehende Services
- Inhalte dynamisch aus Actor Items generieren
- Keine hartcodierten Waffen oder Spells
- Unterstützung für Drag & Drop später vorbereiten
- Unterstützung für Hotkeys später vorbereiten

---

# Geplante Erweiterungen

Nicht Teil des ersten Implementierungsschritts:

- Hotbar Integration
- Cooldowns
- Favoriten
- Drag & Drop Reordering
- Reaktions-Buttons
- Ressourcenanzeige im Menü
- AoE-Templates
- Quick Targeting

---

# Akzeptanzkriterien

Das Feature gilt als fertig, wenn:

- Das Quick-Action-Menu im Combat geöffnet werden kann
- Das Menü Waffen anzeigt
- Das Menü Spells anzeigt
- Das Menü Consumables anzeigt
- Waffen direkt genutzt werden können
- Spells direkt gewirkt werden können
- Consumables direkt genutzt werden können
- Aktionen dieselbe Combat-Pipeline verwenden wie das Actor Sheet
- Nur der aktuelle Actor angezeigt wird
- Consumables mit Quantity 0 nicht nutzbar sind
- Das Menü ohne geöffnetes Actor Sheet funktioniert
- Das Menü keine hartcodierten Inhalte besitzt