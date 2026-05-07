# Feature: Solides Combat-System

## Ziel

Der Kampf soll zuverlässig, konsistent und erweiterbar funktionieren.

Alle Kampfhandlungen müssen über zentrale Services laufen. Sheets, Templates und Chatkarten dürfen keine eigene Kampf-Logik enthalten.

---

# Grundregel

Jede Kampfhandlung folgt dieser Pipeline:

```txt
Item benutzen
→ Action Cost prüfen
→ Action Cost verbrauchen
→ Ziel bestimmen
→ Effekt ausführen
→ ggf. Angriff würfeln
→ ggf. Treffer prüfen
→ ggf. Pending Damage erzeugen
→ ggf. Reaktion anbieten
→ finalen Schaden anwenden
→ Chat aktualisieren
```

Betroffene Item-Typen:

- weapon
- spell
- ability
- consumable

---

# Zentrale Architekturregel

Es darf nur eine zentrale Combat-Pipeline geben.

Empfohlen:

```ts
CombatItemUseService.use(actor, item, context)
```

Diese Methode entscheidet intern anhand von Item-Typ und Effektart:

```txt
weapon      → WeaponAttackHandler
spell       → SpellHandler
ability     → AbilityHandler
consumable  → ConsumableHandler
```

Keine doppelte Logik in:

- ActorSheet
- ItemSheet
- ChatHooks
- Templates

---

# Verantwortlichkeiten

## ActorSheet

Darf nur:

- Button-Klicks erfassen
- Actor und Item ermitteln
- zentrale Combat-Pipeline aufrufen

Darf nicht:

- Schaden berechnen
- HP verändern
- Reaktionen ausführen
- Angriffswürfe selbst bauen

---

## ItemSheet

Darf nur:

- Item-Daten editieren
- optional zentrale Use-Methode aufrufen

Darf nicht:

- eigene Kampf-Logik enthalten

---

## ChatHooks

Dürfen nur:

- Chat-Buttons binden
- ReactionService oder PendingDamageService aufrufen

Dürfen nicht:

- HP direkt ändern
- Schaden selbst berechnen
- Reaktionen selbst auswerten

---

# Action Economy

Alle Kampfhandlungen mit `actionCost` müssen über `ActionEconomyService` laufen.

Gültige Werte:

```ts
type ActionCost = "action" | "bonusAction" | "reaction" | "freeAction";
```

Regeln:

- `action` verbraucht Aktion
- `bonusAction` verbraucht Bonusaktion
- `reaction` verbraucht Reaktion
- `freeAction` verbraucht nichts
- außerhalb von Combat wird nichts verbraucht
- innerhalb von Combat darf eine Handlung nicht ausgeführt werden, wenn der Slot leer ist

Kanonischer Actor-Pfad:

```txt
system.combat.actions.{action,bonusAction,reaction}.{current,max}
```

Alte Pfade dürfen nicht mehr verwendet werden:

```txt
system.actionEconomy.*
```

---

# Zielauswahl

Alle Zielabfragen laufen ausschließlich über:

```ts
TargetService
```

Keine direkten Zugriffe auf:

```ts
game.user.targets
```

außerhalb von `TargetService`.

Regeln:

- Angriffe gegen Targets erzeugen Trefferwürfe.
- Damage ohne Target darf nur als Chat-Ausgabe passieren.
- Heal ohne Target wirkt auf den ausführenden Actor.
- Mehrere Targets müssen unterstützt werden.

---

# Angriff

Ein Angriff besteht aus:

```txt
1d20 + Attributsmodifikator + attackBonus
```

Pflichtfelder am Item:

```txt
system.attribute
system.attackBonus
system.damage
system.damageType
```

Trefferprüfung:

```txt
attackTotal >= target.system.ac.value
```

Bei Treffer:

- Schaden würfeln
- Pending Damage erzeugen
- Schaden noch nicht direkt anwenden

Bei Fehlschlag:

- nur Chat-Ausgabe
- kein Pending Damage

---

# AC

AC wird ausschließlich am Actor vorbereitet.

Kanonischer Pfad:

```txt
system.ac.value
```

Regel:

```txt
AC = Dexterity Modifier + Summe(equipped armor.acBonus) + system.ac.bonus
```

Wichtig:

- Nur `armor.system.equipped === true` zählt.
- Kein Service darf AC selbst anders berechnen, außer ein zentraler `ArmorService`, falls vorhanden.
- Angriffssystem liest nur `target.system.ac.value`.

---

# Damage

HP darf nur über `DamageService` verändert werden.

Kanonischer HP-Pfad:

```txt
system.resources.hp.value
system.resources.hp.max
```

Regeln:

- Schaden reduziert HP nie unter 0.
- Heilung erhöht HP nie über max.
- Resistenzlogik läuft später über `DamageService.applyResistances()`.
- Kein anderer Service darf HP direkt manipulieren.

---

# Pending Damage

Schaden durch Treffer wird nie sofort angewendet.

Stattdessen:

```txt
ReactionService.createPending()
```

oder ein eigener:

```txt
PendingDamageService.create()
```

erzeugt eine Pending-Damage-Chatkarte.

Pending Damage muss speichern:

```ts
interface PendingDamageData {
  kind: "pending-damage";

  attackerName: string;
  attackerActorId: string | null;

  targetName: string;
  targetActorId: string;

  source: string;

  originalDamage: number;
  finalDamage: number;
  damageType: string;

  reactionUsed: string | null;
  reactionItemId: string | null;

  resolved: boolean;
  dc: number | null;
}
```

Wichtig:

- `originalDamage` bleibt immer unverändert.
- `finalDamage` wird durch Reaktionen verändert.
- `resolved` verhindert doppeltes Anwenden.
- Bereits aufgelöster Schaden darf nicht erneut angewendet werden.

---

# Reaktionen

Reaktionen sind Items mit:

```txt
system.effectKind = "reaction"
system.actionCost = "reaction"
```

Reaktionen dürfen nicht direkt aus dem Actor Sheet normal benutzt werden.

Sie werden nur im Pending-Damage-Workflow angeboten.

## Reagieren-Button

Beim Klick auf `Reagieren`:

```txt
1. Pending Damage aus Message Flags lesen
2. Prüfen: resolved === false
3. Ziel-Actor laden
4. Prüfen: reaction.current > 0
5. Reaktionsitems des Ziel-Actors sammeln
6. Dialog öffnen
7. gewählte Reaktion ausführen
8. Reaktion verbrauchen
9. finalDamage aktualisieren
10. Chatkarte aktualisieren
```

Wenn keine Reaktion verfügbar ist:

```txt
Keine Reaktion verfügbar.
```

---

# Reaktionsmodi

## flat

Feste oder gewürfelte Schadensreduktion.

```txt
finalDamage = max(0, finalDamage - reduction)
```

`reactionFormula` darf Zahl oder Rollformel sein.

---

## rolled

Attributswurf gegen DC.

```txt
1d20 + reactionAttribute modifier >= dc
```

Bei Erfolg:

```txt
finalDamage = max(0, finalDamage - reduction)
```

Bei Fehlschlag:

```txt
finalDamage bleibt unverändert
```

---

## counter

Attributswurf gegen DC.

Bei Erfolg:

```txt
finalDamage = 0
```

Bei Fehlschlag:

```txt
finalDamage bleibt unverändert
```

Ein echter Gegenangriff ist noch nicht Teil dieses Features.

---

# Schaden anwenden

Beim Klick auf `Schaden anwenden`:

```txt
1. Pending Damage aus Message Flags lesen
2. Prüfen: resolved === false
3. Ziel-Actor laden
4. DamageService.applyDamage(targetActor, finalDamage, damageType)
5. resolved = true setzen
6. Chatkarte aktualisieren
7. Damage-Chatkarte erzeugen
```

Wenn `resolved === true`:

```txt
Schaden wurde bereits angewendet.
```

---

# Spells

Spells laufen ebenfalls über die zentrale Combat-Pipeline.

EffectKind:

```txt
damage
heal
utility
reaction
```

## damage

- Action Cost prüfen
- Resonanzlogik ausführen
- Angriff gegen Targets würfeln
- bei Treffer Pending Damage erzeugen

## heal

- Action Cost prüfen
- healFormula würfeln
- Target heilen, falls vorhanden
- sonst Self heilen

## utility

- Action Cost prüfen
- Chatkarte erzeugen

## reaction

- nicht direkt castbar
- nur als Reaktion im Pending-Damage-Workflow nutzbar

---

# Abilities

Abilities laufen über dieselbe Combat-Pipeline.

EffectKind:

```txt
damage
heal
utility
reaction
```

Regeln:

- `damage` erzeugt Pending Damage.
- `heal` nutzt DamageService.heal().
- `utility` erzeugt Chat.
- `reaction` wird nur im Pending-Damage-Workflow angeboten.

---

# Consumables

Consumables müssen ebenfalls in die Combat-Pipeline integriert werden.

Mindestanforderungen:

```txt
quantity
effectKind
usageType
damage
damageType
healFormula
actionCost
```

Regeln:

- quantity <= 0 darf nicht nutzbar sein
- nach Benutzung quantity -1
- bei 0 optional löschen
- healing nutzt DamageService.heal()
- damage erzeugt Pending Damage
- utility erzeugt Chat

---

# Chat

Chatkarten sind nur UI.

Chatkarten dürfen:

- Ergebnisse anzeigen
- Buttons bereitstellen
- Message Flags speichern

Chatkarten dürfen nicht:

- selbst Schaden berechnen
- selbst HP verändern
- selbst Reaktionen auswerten

Langfristig sollen Chatkarten über Templates gerendert werden. Für dieses Feature reicht bestehender `ChatCardRenderer`, solange Logik nicht dort landet.

---

# Conditions / Active Effects

Bestehende alte Pfade müssen korrigiert werden.

Insbesondere:

```txt
EffectFactory.stunned()
```

darf nicht mehr schreiben auf:

```txt
system.actionEconomy.*
```

sondern muss schreiben auf:

```txt
system.combat.actions.*
```

Stun sollte im ersten Schritt bewirken:

```txt
action.max = 0
bonusAction.max = 0
reaction.max = 0
```

oder alternativ current auf 0 setzen, je nach bestehender Effect-Strategie.

Wichtig: Keine deprecated Pfade mehr verwenden.

---

# Combat Hooks

Beim Combat-Start und Turn-Wechsel:

```txt
ActionEconomyService.resetTurn(activeActor)
```

Regeln:

- Nur aktiver Combatant wird zurückgesetzt.
- Kein globaler Reset für alle Actor.
- Reaktionen werden am Anfang des eigenen Turns zurückgesetzt.
- Current wird auf Max gesetzt.

---

# Quick Action Menu

Wenn Quick Action Menu existiert:

- es darf nur zentrale Combat-Pipeline aufrufen
- keine eigene Use-Logik
- keine eigenen Schadenswürfe
- keine eigenen HP-Updates

---

# Logging und Fehler

Bei fehlender Voraussetzung muss das System sauber abbrechen:

- kein Actor
- kein Item
- kein Target, falls Target erforderlich
- keine Aktion verfügbar
- keine Reaktion verfügbar
- Pending Damage bereits resolved
- Item quantity <= 0
- ungültige Formel
- fehlender HP-Pfad
- fehlender AC-Wert

Jeder Abbruch soll eine klare Notification oder Debug-Log erzeugen.

---

# Akzeptanzkriterien

Das Combat-System gilt als solide, wenn:

- Waffen über die zentrale Pipeline genutzt werden
- Spells über die zentrale Pipeline genutzt werden
- Abilities über die zentrale Pipeline genutzt werden
- Consumables über die zentrale Pipeline genutzt werden
- Action Cost immer vor der Ausführung geprüft wird
- Slots im Combat korrekt verbraucht werden
- außerhalb Combat keine Slots verbraucht werden
- Angriffe gegen AC geprüft werden
- Treffer Pending Damage erzeugen
- Fehlschläge keinen Schaden erzeugen
- Pending Damage originalDamage und finalDamage speichert
- Reagieren-Button echte Reaktionen des Ziel-Actors anbietet
- Reaktionen eine Reaktion verbrauchen
- flat-Reaktionen Schaden reduzieren
- rolled-Reaktionen gegen DC würfeln
- counter-Reaktionen bei Erfolg Schaden negieren
- Schaden anwenden nur finalDamage anwendet
- Schaden nicht doppelt angewendet werden kann
- HP nur über DamageService verändert wird
- Targets nur über TargetService gelesen werden
- alte `system.actionEconomy.*` Pfade nicht mehr verwendet werden
- Combat-Hooks nur den aktiven Actor resetten
- Quick Action Menu keine eigene Kampflogik enthält
- Sheets keine Kampfberechnungen enthalten
- Templates keine Kampfberechnungen enthalten
- ChatHooks keine Kampfberechnungen enthalten