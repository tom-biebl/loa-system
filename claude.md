# CLAUDE.md

## Projektkontext

Dieses Projekt ist ein eigenes **Foundry VTT System** für das Pen-&-Paper-Regelwerk / die Kampagne **Legends of Arxanum**.

Ziel ist kein loses Makro- oder Skriptprojekt, sondern ein langfristig wartbares, objektorientiertes TypeScript-System mit klarer Architektur, wiederverwendbaren Komponenten und sauberer Dokumentation.

Das System soll Foundry-VTT-native Konzepte wie Actors, Items, Sheets, Active Effects, Hooks, Combat, Rolls und Chat Cards strukturiert kapseln und möglichst wenig Spielmechanik in ungeordneten Makros belassen.

---

## Grundprinzipien

### 1. Objektorientierte Architektur

Bevorzuge eine objektorientierte Struktur mit klaren Verantwortlichkeiten.

Nutze Klassen für zentrale Domänenkonzepte wie:

* Actor-Logik
* Item-Logik
* Kampfsystem
* Roll-Mechaniken
* Ressourcenverwaltung
* Effekte
* Chat-Ausgaben
* Sheet-Controller
* Utility-Services

Klassen sollen nicht alles selbst tun. Zerlege Logik in kleine, verständliche Services und Manager.

Beispiele für gewünschte Struktur:

```ts
class LoAActor extends Actor {}
class LoAItem extends Item {}
class CombatManager {}
class RollManager {}
class EffectManager {}
class ResourceManager {}
class ChatCardRenderer {}
class SheetDataBuilder {}
```

Eine Klasse soll eine klare Aufgabe haben. Vermeide God Classes.

---

### 2. Wiederverwendbarkeit vor Speziallösung

Wenn eine Funktionalität wahrscheinlich mehrfach gebraucht wird, abstrahiere sie früh sinnvoll.

Beispiele:

* Würfelwürfe nicht direkt in Sheets oder Hooks implementieren, sondern über einen `RollManager`.
* Chat Cards nicht inline als HTML-Strings verstreuen, sondern über Renderer / Templates erzeugen.
* Actor- und Item-Datenzugriffe über typisierte Hilfsfunktionen kapseln.
* Effekte über zentrale Effect-Services anwenden, entfernen und prüfen.
* Wiederkehrende UI-Komponenten als eigene Templates oder Helper strukturieren.

Keine Copy-Paste-Logik über mehrere Sheets, Macros oder Hooks hinweg.

---

### 3. TypeScript-first

Der Code soll in TypeScript geschrieben werden.

Wichtige Regeln:

* Keine unnötigen `any`-Typen.
* Wenn Foundry-Typen fehlen oder unvollständig sind, lieber eigene Interfaces ergänzen.
* Datenmodelle explizit typisieren.
* Rückgabewerte öffentlicher Methoden möglichst angeben.
* Optionalität sauber behandeln.
* Defensive Checks bei Foundry-Objekten verwenden, weil viele Objekte zur Laufzeit `undefined` sein können.

Beispiel:

```ts
interface LoAActorSystemData {
  attributes: Record<string, LoAAttribute>;
  resources: Record<string, LoAResource>;
}

interface LoAResource {
  value: number;
  max: number;
}
```

---

### 4. Foundry-VTT-kompatibel arbeiten

Achte immer darauf, dass Code zu Foundry VTT passt.

Beachte insbesondere:

* Foundry-Version und API-Kompatibilität prüfen, bevor neue Patterns eingeführt werden.
* Hooks zentral registrieren.
* Keine unnötigen globalen Seiteneffekte.
* Keine Logik direkt im globalen Scope ausführen, wenn sie sauber initialisiert werden kann.
* Foundry-Dokumente wie Actor, Item, TokenDocument, Combatant und ActiveEffect respektieren.
* Updates an Dokumenten immer über Foundry-Update-Methoden durchführen.

Beispiel:

```ts
await actor.update({ "system.resources.hp.value": newHp });
```

Nicht direkt verschachtelte Daten mutieren, wenn Foundry davon nichts mitbekommt.

---

## Architekturleitlinien

### Gewünschte Ordnerstruktur

Orientiere dich an dieser Struktur, sofern kein besserer Grund dagegen spricht:

```txt
src/
  module/
    actors/
      LoAActor.ts
      LoAActorSheet.ts
      ActorDataBuilder.ts
    items/
      LoAItem.ts
      LoAItemSheet.ts
      ItemDataBuilder.ts
    combat/
      CombatManager.ts
      DamageService.ts
      InitiativeService.ts
    rolls/
      RollManager.ts
      RollFormulaBuilder.ts
      RollResult.ts
    effects/
      EffectManager.ts
      EffectFactory.ts
    resources/
      ResourceManager.ts
    chat/
      ChatCardRenderer.ts
      ChatMessageService.ts
    sheets/
      SheetRenderService.ts
      SheetTabs.ts
    templates/
      TemplatePreloader.ts
    hooks/
      registerHooks.ts
      actorHooks.ts
      itemHooks.ts
      combatHooks.ts
    utils/
      Logger.ts
      foundry-helpers.ts
      object-utils.ts
    types/
      actor.types.ts
      item.types.ts
      roll.types.ts
      foundry-extensions.d.ts
    constants/
      system.constants.ts
      paths.constants.ts
  styles/
  templates/
```

Diese Struktur ist eine Empfehlung. Halte sie konsistent und ändere sie nur mit nachvollziehbarer Begründung.

---

### Zentrale Manager / Services

Verwende Manager und Services, um Domänenlogik aus Foundry-Klassen und Sheets herauszuhalten.

Beispiel:

```ts
export class DamageService {
  static async applyDamage(actor: LoAActor, amount: number): Promise<void> {
    const currentHp = actor.system.resources.hp.value;
    const newHp = Math.max(currentHp - amount, 0);

    await actor.update({
      "system.resources.hp.value": newHp,
    });
  }
}
```

Sheets sollen primär Darstellung und Benutzerinteraktion koordinieren, nicht die komplette Spiellogik enthalten.

---

### Trennung von Domäne, UI und Foundry-API

Trenne möglichst sauber zwischen:

1. Domänenlogik
2. Foundry-Dokumentoperationen
3. UI / Sheet Rendering
4. Chat-Ausgabe
5. Hilfsfunktionen

Schlecht:

```ts
// Sheet-Methode macht alles: liest Daten, berechnet Schaden, updated Actor, rendert Chat HTML
```

Besser:

```ts
// Sheet ruft Service auf
await DamageService.rollAndApplyDamage(actor, weapon);
```

---

## Coding Standards

### Allgemein

* Schreibe klaren, wartbaren Code.
* Bevorzuge kleine Funktionen.
* Vermeide unnötige Abstraktion, aber abstrahiere wiederkehrende Muster.
* Keine Magic Strings, wenn Konstanten sinnvoll sind.
* Keine versteckten Seiteneffekte.
* Keine stillen Fehler.
* Fehler entweder behandeln oder bewusst loggen.

---

### Benennung

Nutze sprechende Namen.

Beispiele:

```ts
calculateAttributeModifier()
applyActiveEffect()
buildAttackRollFormula()
renderWeaponChatCard()
getSelectedActor()
```

Vermeide Namen wie:

```ts
doStuff()
handleThing()
processData()
manager2()
```

---

### Logging

Nutze einen zentralen Logger statt verstreuter `console.log`-Aufrufe.

```ts
Logger.debug("Applying damage", { actorId: actor.id, amount });
Logger.warn("Actor has no HP resource", { actorId: actor.id });
Logger.error("Failed to apply effect", error);
```

Debug-Logs sollen deaktivierbar sein.

---

### Fehlerbehandlung

Defensive Programmierung ist wichtig, weil Foundry-Objekte häufig optional sind.

Beispiel:

```ts
if (!actor) {
  Logger.warn("No actor provided");
  return;
}
```

Bei user-facing Fehlern nach Möglichkeit eine Foundry Notification verwenden:

```ts
ui.notifications?.warn("Kein Charakter ausgewählt.");
```

---

## Dokumentation

### Code-Dokumentation

Dokumentiere öffentliche Klassen und öffentliche Methoden mit JSDoc, besonders wenn sie von mehreren Modulen genutzt werden.

Beispiel:

```ts
/**
 * Applies direct damage to an actor and clamps HP to a minimum of 0.
 */
async function applyDamage(actor: LoAActor, amount: number): Promise<void> {}
```

Nicht jede triviale private Hilfsfunktion braucht einen Kommentar. Kommentare sollen erklären, warum etwas passiert, nicht nur was passiert.

---

### Architektur-Dokumentation

Wenn eine größere Architekturentscheidung getroffen wird, dokumentiere sie kurz in `/docs`.

Beispiele:

```txt
docs/
  architecture.md
  combat-system.md
  actor-data-model.md
  item-data-model.md
  sheet-system.md
```

Dokumentation soll kurz, konkret und wartbar bleiben.

---

## Token-effizientes Arbeiten mit Claude / LLMs

Dieses Projekt soll bewusst so strukturiert sein, dass spätere KI-Unterstützung mit wenig Token-Verbrauch möglich bleibt.

### Wichtige Regeln

* Dateien klein und fokussiert halten.
* Keine sehr großen Monolith-Dateien.
* Jede Datei soll einen klaren Zweck haben.
* Öffentliche APIs von Klassen klar dokumentieren.
* Wiederverwendbare Logik zentral bündeln.
* Komplexe Entscheidungen in kurzen Markdown-Dokumenten festhalten.
* Keine unnötig langen Kommentare.
* Keine redundanten Implementierungen.

### Ziel

Claude oder andere LLMs sollen einzelne Dateien verstehen können, ohne ständig das gesamte Projekt lesen zu müssen.

Bevorzuge daher:

```txt
kleine Datei + klare Namen + JSDoc + zentrale Typen
```

statt:

```txt
riesige Datei + implizite Abhängigkeiten + verstreute Magic Strings
```

---

## Arbeitsweise für Claude

Wenn du Code für dieses Projekt erzeugst oder änderst, halte dich an folgende Regeln:

### Vor jeder Änderung

1. Prüfe, welche bestehende Architektur betroffen ist.
2. Verwende bestehende Services, Manager, Typen und Konstanten wieder.
3. Erzeuge keine zweite Implementierung für vorhandene Logik.
4. Vermeide unnötige Dateigröße.
5. Wenn Kontext fehlt, mache eine begründete Annahme und dokumentiere sie kurz.

---

### Bei Code-Ausgaben

Wenn du Code erzeugst:

* Gib den vollständigen Inhalt der betroffenen Datei aus, wenn die Datei neu ist oder stark verändert wird.
* Gib gezielte Patches / Ausschnitte aus, wenn nur kleine Stellen geändert werden.
* Nenne immer den Dateipfad.
* Erkläre kurz, warum die Datei existiert.
* Halte Erklärungen knapp und technisch.

---

### Bei Refactorings

Wenn du refactorst:

* Erhalte bestehendes Verhalten, außer es wird ausdrücklich geändert.
* Benenne Breaking Changes klar.
* Entferne tote oder doppelte Logik.
* Verbessere Typisierung.
* Ziehe wiederverwendbare Logik in Services oder Utilities.
* Vermeide rein kosmetische Änderungen, wenn sie nicht helfen.

---

### Bei Architekturfragen

Antworte bevorzugt mit:

1. Empfohlener Lösung
2. Begründung
3. Minimalem Beispiel
4. Konsequenzen / Trade-offs

Keine langen theoretischen Ausführungen, wenn eine konkrete technische Entscheidung gebraucht wird.

---

## Foundry-spezifische Leitlinien

### Actor-System

Actor-spezifische Spiellogik gehört bevorzugt in:

```txt
src/module/actors/
src/module/resources/
src/module/combat/
```

Die Actor-Klasse darf Komfortmethoden haben, soll aber nicht das komplette Regelwerk enthalten.

Beispiel:

```ts
actor.getResource("hp")
actor.spendResource("mana", 2)
actor.rollAttribute("strength")
```

Komplexere Berechnung gehört in Services.

---

### Item-System

Items sollen typisiert und nach Item-Arten unterscheidbar sein.

Beispiele:

* weapon
* armor
* spell
* ability
* consumable
* equipment

Item-Logik soll nicht direkt in Chat Cards oder Sheets dupliziert werden.

---

### Rolls

Rolls sollen zentralisiert werden.

Würfelformeln, Modifikatoren, kritische Treffer, Patzer und Ergebnisinterpretation gehören nicht verstreut in UI-Code.

Bevorzugte Orte:

```txt
src/module/rolls/RollManager.ts
src/module/rolls/RollFormulaBuilder.ts
src/module/rolls/RollResult.ts
```

---

### Chat Cards

Chat Cards sollen über Templates oder zentrale Renderer erzeugt werden.

Keine großen HTML-Strings direkt in Gameplay-Services, wenn vermeidbar.

Bevorzugt:

```ts
ChatCardRenderer.renderAttackResult(result)
```

---

### Hooks

Hooks zentral registrieren.

Beispiel:

```ts
export function registerHooks(): void {
  registerActorHooks();
  registerItemHooks();
  registerCombatHooks();
}
```

Keine unkoordinierten Hook-Registrierungen über viele Dateien verstreuen.

---

## Tests und Validierung

Wenn möglich, schreibe Logik so, dass sie ohne Foundry-Laufzeit testbar ist.

Bevorzuge reine Funktionen für Berechnungen:

```ts
calculateDamageReduction()
buildRollFormula()
clampResourceValue()
```

Diese Funktionen können später leichter getestet werden.

Foundry-API-nahe Logik darf separat gekapselt werden.

---

## Performance

Achte auf Foundry-Performance.

* Keine unnötigen Re-Renders.
* Keine teuren Berechnungen in jedem Sheet-Render, wenn sie gecached oder vorbereitet werden können.
* Keine unnötigen Updates an Actor-/Item-Dokumenten.
* Batch-Updates bevorzugen, wenn mehrere Werte gleichzeitig geändert werden.
* Hooks nicht überladen.
* Große Listen effizient rendern.

---

## UI / Sheets

Sheets sollen modern, klar und wartbar sein.

Wichtige Regeln:

* Templates übersichtlich halten.
* Komplexe Datenaufbereitung vor dem Rendern in Builder-Klassen auslagern.
* CSS modular strukturieren.
* Wiederkehrende Sheet-Elemente wiederverwendbar machen.
* Keine komplexe Spiellogik direkt in Handlebars-Templates.

---

## Integrationsziel mit bestehender Battle Engine

Wenn eine bestehende `loa-battle-engine` oder ähnliche Manager-basierte Logik integriert wird, soll sie nicht blind kopiert werden.

Stattdessen:

1. Prüfe vorhandene Manager-Klassen.
2. Identifiziere wiederverwendbare Domänenlogik.
3. Kapsle Foundry-spezifische Adapter separat.
4. Halte Engine-Logik möglichst unabhängig von Foundry.
5. Verwende Adapter, um Foundry Actors, Items und Tokens in Engine-kompatible Datenstrukturen zu übersetzen.

Beispielidee:

```txt
Foundry Actor -> ActorAdapter -> Battle Engine Actor Model -> CombatManager -> Result -> Foundry Update / Chat Card
```

---

## Gewünschter Antwortstil von Claude

Antworte technisch, direkt und konkret.

Bevorzuge:

* konkrete Dateipfade
* konkrete Klassen
* konkrete Interfaces
* konkrete Codebeispiele
* kurze Begründungen
* klare Trade-offs

Vermeide:

* lange allgemeine Erklärungen
* übertriebene Theorie
* unnötige Wiederholungen
* große Codeblöcke ohne Kontext
* neue Architekturkonzepte ohne Notwendigkeit

---

## Definition of Done

Eine Änderung gilt erst als sauber, wenn:

* sie typisiert ist,
* sie zur bestehenden Architektur passt,
* sie keine unnötige Duplikation erzeugt,
* sie dokumentiert ist, wenn sie öffentlich oder architektonisch relevant ist,
* sie Foundry-kompatibel ist,
* sie wiederverwendbare Logik nicht in UI-Code versteckt,
* sie keine unnötig großen Dateien erzeugt,
* sie spätere KI-Unterstützung durch klare Struktur erleichtert.

---

## Regelwerk-spezifische Architektur

Das folgende Regelwerk ist systemkritisch und muss bei Architekturentscheidungen berücksichtigt werden.

Das Kampfsystem orientiert sich grundsätzlich an DnD 5e, verwendet jedoch eigene Ressourcen-, Progressions- und Magiemechaniken.

---

# Kampfsystem

## Aktionen pro Runde

Jeder Actor besitzt standardmäßig:

* 1 Aktion
* 1 Bonusaktion
* 1 Reaktion

Diese Werte dürfen NICHT hartcodiert werden.

Die Anzahl muss dynamisch im Actor gespeichert werden, damit:

* Bossgegner mehrere Reaktionen besitzen können
* Klassen zusätzliche Bonusaktionen erhalten können
* Debuffs oder Zustände Aktionen reduzieren können
* Fähigkeiten temporär zusätzliche Aktionen verleihen können

Beispielhafte Struktur:

```ts
interface ActionEconomy {
  actions: number;
  bonusActions: number;
  reactions: number;
}
```

Die Action Economy soll generisch erweiterbar bleiben.

Keine feste Annahme im Code, dass Actors immer exakt eine Aktion besitzen.

---

# Attribute

Jeder Actor besitzt folgende Hauptattribute:

* Strength
* Dexterity
* Constitution
* Intelligence
* Wisdom
* Charisma

Jedes Attribut besitzt:

* einen numerischen Wert
* einen Modifier
* Point-Buy-Kosten

Modifier-Berechnung:

```txt
Modifier = floor((Attribut - 10) / 2)
```

Die Modifier-Logik soll zentralisiert implementiert werden.

Beispiel:

```ts
AttributeService.calculateModifier(value)
```

Keine mehrfach duplizierte Modifier-Berechnung.

---

# Point-Buy System

Das System verwendet ein erweitertes Point-Buy-System bis Attributwert 20.

| Wert | Gesamtkosten | Zusätzliche Kosten zum vorherigen Wert | Modifier |
| ---- | ------------ | -------------------------------------- | -------- |
| 8    | 0            | —                                      | -1       |
| 9    | 1            | +1                                     | -1       |
| 10   | 2            | +1                                     | +0       |
| 11   | 3            | +1                                     | +0       |
| 12   | 4            | +1                                     | +1       |
| 13   | 5            | +1                                     | +1       |
| 14   | 7            | +2                                     | +2       |
| 15   | 9            | +2                                     | +2       |
| 16   | 12           | +3                                     | +3       |
| 17   | 15           | +3                                     | +3       |
| 18   | 19           | +4                                     | +4       |
| 19   | 24           | +5                                     | +4       |
| 20   | 30           | +6                                     | +5       |

Wichtige Regeln:

* Kosten sind Gesamtkosten
* Höhere Werte skalieren exponentiell teurer
* Attribute können durch neue Point-Buy-Punkte bei Level-Ups gesteigert werden
* Es existiert KEIN klassisches DnD-ASI-System

Die Point-Buy-Logik soll NICHT im UI versteckt sein.

Bevorzugte Struktur:

```txt
src/module/attributes/
  AttributeService.ts
  PointBuyService.ts
  AttributeCostTable.ts
```

---

# Zaubersystem

Das Magiesystem verwendet KEINE Spellslots.

Stattdessen existieren Resonanzpunkte (RP).

---

# Resonanzpunkte (RP)

Fast jeder Zauber erzeugt RP.

Cantrips erzeugen keine RP.

Beispiele:

* Zauber A erzeugt 2 RP
* Zauber B erzeugt 2 RP
* Gesamt: 4 RP

RP repräsentieren instabile magische Energie.

Die RP-Mechanik ist eine Kernmechanik des Systems und muss modular implementiert werden.

Beispielstruktur:

```txt
src/module/magic/
  ResonanceManager.ts
  StabilityCheckService.ts
  WildMagicService.ts
  SpellScalingService.ts
```

---

# Resonanz-Thresholds

Mit steigenden RP werden Zauber stärker, aber gefährlicher.

## 5 RP

Effekt:

* +1d4 Schaden
  ODER
* +5 Fuß Reichweite / AOE-Größe

Keine Stabilitätsprobe.

---

## 10 RP

Effekt:

* +1d6 Schaden
  ODER
* +10 Fuß AOE-Größe

Zusätzlich:

* Stabilitätswurf gegen DC 10

---

## 15 RP

Effekt:

* +10 flacher Schaden
  ODER
* +15 Fuß AOE-Größe

Zusätzlich:

* Stabilitätswurf gegen DC 15

---

## 20 RP

Effekt:

* +15 flacher Schaden
  ODER
* +20 Fuß AOE-Größe

Zusätzlich:

* Stabilitätswurf gegen DC 20

---

# Stabilitätswurf

Ein Stabilitätswurf prüft, ob magische Belastung kontrolliert werden kann.

Mechanik:

* D20-Wurf
* plus passendes Spellcasting-Attribut

Mögliche Attribute:

* Intelligence
* Wisdom
* Charisma
* weitere zukünftige Attribute

Die Spellcasting-Quelle darf NICHT hartcodiert werden.

Zauberklassen oder Builds müssen definieren können, welches Attribut verwendet wird.

---

# Konsequenzen bei Fehlschlag

## Mehr als 5 unter DC

* Zauber scheitert
* RP bleiben bestehen

---

## 1 bis 5 unter DC

* Wild Magic Effekt
* Nutzung einer Wild Magic Table

---

## Natural 1

* Zauber implodiert
* Effekt trifft den Zaubernden selbst

Diese Logik soll datengetrieben und erweiterbar aufgebaut werden.

Keine harten if/else-Ketten über viele Dateien hinweg.

---

# RP abbauen

## Konzentration

* baut 1d4 RP ab

## Kleine Rast

* baut 1d10 RP ab

## Große Rast

* entfernt alle RP

Diese Mechaniken sollen über generische Ressourcenregeln abbildbar sein.

---

# Cantrips

Cantrips:

* kosten keine RP
* erzeugen keine RP
* benötigen nur ihre jeweilige Aktion

Sie gelten als stabile Magie.

Cantrips sollen technisch nicht als Sonderfall-Hacks implementiert werden.

Stattdessen:

```ts
spell.generatesResonance === false
```

oder ähnliche datengetriebene Eigenschaften.

---

# Ressourcen-Systeme

Das System unterstützt beliebige Ressourcenarten.

Nicht nur Magier besitzen Ressourcen.

Beispiele:

## Krieger

* Superiority Dice

## Fernkämpfer

* Munition
* Pfeile
* Kugeln

## Allgemein

Jede Ressource soll besitzen:

* eigenen Pool
* eigene Regeneration
* eigene Verbrauchsregeln
* eigene UI-Komponente
* eigene Skalierungsregeln

Das Ressourcen-System muss vollständig modular aufgebaut sein.

Bevorzugte Architektur:

```txt
src/module/resources/
  ResourceManager.ts
  ResourceDefinition.ts
  ResourceRegenerationService.ts
  ResourceConsumptionService.ts
```

Das Kampfsystem soll generisch genug sein, um neue Ressourcenarten ohne größere Refactorings hinzufügen zu können.

---

## Kurzfassung für Claude

Baue ein objektorientiertes, typisiertes, wartbares Foundry-VTT-System in TypeScript.

Halte Logik wiederverwendbar, dokumentiert und modular.

Trenne Foundry-API, Domänenlogik, UI und Chat-Ausgabe.

Vermeide Monolithen, Magic Strings, Copy-Paste und verstreute Makro-Logik.

Das Regelwerk verwendet:

* dynamische Action Economy
* erweitertes Point-Buy-System
* modulare Ressourcen
* Resonanzpunkte statt Spellslots
* datengetriebene Magieskalierung
* Stabilitätswürfe
* Wild Magic

Die Architektur muss darauf vorbereitet sein.

Optimiere die Projektstruktur so, dass einzelne Dateien mit wenig Kontext verständlich bleiben.
