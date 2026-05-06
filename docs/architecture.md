# LoA System – Architekturüberblick

Foundry-VTT-System für *Legends of Arxanum*. TypeScript, OOP, modular,
keine Battle-Engine als Adapter — die Engine ist Teil des Systems selbst.

## Build

- TypeScript-Quellen unter `src/`
- Bundling über **webpack** zu `dist/loa-system.js` (ESM, target `web`)
- `system.json` lädt das Bundle als ESM
- Befehle:
  - `npm run build` – Production-Bundle
  - `npm run build:dev` – Development-Bundle
  - `npm run watch` – Inkrementeller Rebuild
  - `npm run typecheck` – `tsc --noEmit`
  - `npm run version:set 0.2.0` – Version in `system.json` setzen
  - `npm run package` – `loa-system.zip` lokal erzeugen

## Modulgliederung

```
src/
  loa-system.ts                       Einstieg, registriert Hooks und Services
  module/
    actors/      LoAActor, LoAActorSheet, ActorDataBuilder
    items/       LoAItem, LoAItemSheet
    attributes/  AttributeService, PointBuyService, AttributeCostTable
    resources/   ResourceManager
    combat/      ActionEconomyService, DamageService, InitiativeService
    effects/     EffectManager, EffectFactory
    rolls/       RollManager, RollFormulaBuilder
    magic/       ResonanceManager, StabilityCheckService,
                 WildMagicService, WildMagicTable, WildMagicTableInstaller
    chat/        ChatCardRenderer
    hooks/       registerHooks, combatHooks
    templates/   TemplatePreloader
    constants/   system.constants, paths.constants
    types/       actor.types, item.types, roll.types, foundry-extensions.d
    utils/       Logger
```

## Verantwortlichkeiten

- **Actor / Item Klassen** – Komfortmethoden, delegieren Logik an Services.
- **DataBuilder** – mappt Foundry-System-Daten in Sheet-View-Models.
- **Sheets** – koordinieren UI / Inputs, delegieren an Services.
- **Manager / Services** – datengetrieben, Foundry-arm, einfach testbar.
- **Hooks** – zentral in `registerHooks` und `combatHooks` gebündelt.

## Kampfsystem (Battle Engine im System)

Die Engine läuft direkt auf Foundry-Objekten — kein Adapter-Layer.

- `ActionEconomyService` – dynamische Aktion / Bonusaktion / Reaktion je `value`/`max`.
- `DamageService` – `applyDamage`, `rollAndApply`, `heal`. Resistenzen-Hook
  vorhanden (derzeit Identitätsfunktion, einfach erweiterbar).
- `InitiativeService` – konfiguriert `CONFIG.Combat.initiative` mit
  `1d20 + @attributes.dex.modifier`.
- `combatHooks` –
  - `combatStart` / `combatRound` setzen Reaktionen aller Combatants zurück
  - `combatTurn` setzt Aktion + Bonus + Reaktion des aktiven Actors zurück

## Effekt-System

- `EffectFactory` – datengetriebene Definitionen (Stunned, Resonant Overload, …).
- `EffectManager` – kapselt `createEmbeddedDocuments("ActiveEffect", …)`,
  `delete`, `find`, `isActive`, `toggle`. Keine Sheet-/Item-Code dupliziert.

## Magie

- `ResonanceManager` – Schwellen 5/10/15/20 datengetrieben mit Damage-/AOE-Bonus
  und DC; kapselt Add / Clear / Release der RP.
- `StabilityCheckService` – DC-Wurf gegen das vom Actor konfigurierte
  Spellcasting-Attribut (`system.spellcasting.ability`).
- `RollManager.rollStabilityCheck` – klassifiziert das Outcome
  (`success` / `wild-magic` / `fizzle` / `implosion`).
- `WildMagicTable` (Daten) + `WildMagicTableInstaller` legen beim ersten
  GM-`ready` eine Foundry `RollTable` namens **„LoA Wild Magic Surge"** an.
- `WildMagicService` zieht aus der Welt-RollTable (vom GM editierbar) und
  fällt auf die statischen Daten zurück.

## Release-Workflow

Versionierung läuft über Git-Tags:

```bash
git add .
git commit -m "feature x"
git push

git tag v0.2.0
git push origin v0.2.0
```

Auf einen Tag-Push reagiert `.github/workflows/release.yml`:

1. `node scripts/update-version.mjs` zieht den Tag (ohne `v`) in `system.json.version`.
2. `npm run typecheck` und `npm run build` (webpack).
3. `loa-system.zip` mit `system.json template.json dist styles templates`.
4. Release auf GitHub mit `system.json` + `loa-system.zip` als Assets.

`system.json.manifest` zeigt auf
`releases/latest/download/system.json` — Foundry-Clients aktualisieren so
automatisch auf die neueste getaggte Version.

## Bewusst ausgeklammert (Folgearbeit)

- Damage-Resistenzen / Verwundbarkeiten (Hook-Punkt vorhanden)
- Compendium-Inhalt (Standard-Items, Standard-Effekte)
- ASCII-/Roll-Templates statt inline HTML in `ChatCardRenderer`
- Erweiterte Wild-Magic-Tabelle (aktuell 20 Einträge, frei erweiterbar)
