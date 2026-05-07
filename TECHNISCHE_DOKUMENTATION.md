# LoA System - Technische Projektdokumentation

Stand: 2026-05-07

Dieses Dokument beschreibt den aktuellen technischen Aufbau des Projekts
`loa-system`. Es ist eine zusammenhaengende Entwicklerdokumentation fuer das
Foundry-VTT-System "Legends of Arxanum" und fasst Manifest, Datenmodell,
Runtime-Flows, Services, Sheets, Templates, Build und Release zusammen.

## 1. Projektzweck

`loa-system` ist ein eigenstaendiges Foundry-VTT-System fuer "Legends of
Arxanum". Das System implementiert eigene Actor- und Item-Dokumentklassen,
eigene Actor- und Item-Sheets, ein modulares Service-Layer fuer Spielmechanik
und eine integrierte Kampf-, Magie-, Resonanz-, Reaktions-, Inventar-,
Klassen- und Erfahrungslogik.

Die technische Richtung ist klar serviceorientiert:

- Foundry-Dokumentklassen (`LoAActor`, `LoAItem`) halten Komfortmethoden und
  delegieren Regellogik an Services.
- Sheets koordinieren UI-Eingaben und Drag-and-Drop, berechnen aber moeglichst
  wenig selbst.
- Berechnungen und Spiellogik liegen in spezialisierten Services unter
  `src/module`.
- Templates konsumieren vorbereitete ViewModels, vor allem aus
  `ActorDataBuilder`.
- Foundry-Hooks werden zentral ueber `registerHooks` gebunden.

## 2. Technologiestack

### Runtime

- Foundry VTT System Package
- Foundry-Kompatibilitaet laut `system.json`: Minimum 13, verified 13
- ES-Module-Bundle: `dist/loa-system.js`
- Stylesheet: `styles/loa-system.css`
- Handlebars-Templates unter `templates/`

### Entwicklung

- TypeScript 5.6
- Webpack 5
- `ts-loader`
- Node-basierte Release-Skripte
- Strikte TypeScript-Konfiguration mit lokalen Foundry-Typ-Schatten in
  `src/module/types/foundry-extensions.d.ts`

### Package-Skripte

`package.json` definiert:

```bash
npm run build
npm run build:dev
npm run watch
npm run typecheck
npm run version:set
npm run package
```

Die Build-Pipeline nutzt Webpack. TypeScript wird beim Bundling ueber
`ts-loader` mit `transpileOnly: true` verarbeitet. Der eigentliche Typcheck
laeuft separat ueber `tsc --noEmit`.

## 3. Manifest und Paketstruktur

### `system.json`

Das Foundry-Manifest enthaelt:

- System-ID: `loa-system`
- Titel: `LoA System`
- Version: `0.9.0`
- Autor: Tom Biebl
- Repository: `https://github.com/tom-biebl/loa-system`
- Manifest-URL:
  `https://github.com/tom-biebl/loa-system/releases/latest/download/system.json`
- Download-URL:
  `https://github.com/tom-biebl/loa-system/releases/latest/download/loa-system.zip`
- ES-Modul: `dist/loa-system.js`
- Stylesheet: `styles/loa-system.css`
- Actor-Typen: `character`, `npc`
- Item-Typen: `weapon`, `armor`, `spell`, `ability`, `consumable`,
  `equipment`

### `template.json`

`template.json` ist das zentrale Foundry-Datenmodell fuer Actor- und Item-
Systemdaten. Wichtige Actor-Felder:

- `level`
- `biography`
- `attributes.str|dex|con|int|wis|cha`
- `resources.hp`
- `resources.resonance`
- `resources.superiorityDice`
- `resources.ammo`
- `resources.specialAmmo`
- `classResources.potions`
- `class.key`
- `class.subclass`
- `experience`
- `ac.bonus`
- `ac.value`
- `inventory.capacity`
- `combat.actions.action`
- `combat.actions.bonusAction`
- `combat.actions.reaction`
- `spellcasting.ability`
- `pointBuy`

Wichtige Item-Daten:

- Gemeinsames Template `describable`: `description`, `slots`
- `weapon`: Schaden, Schadensart, Angriffsbonus, Attribut, Reichweite,
  Eigenschaften, Aktionskosten
- `armor`: AC-Bonus, Ruestungstyp, `equipped`, Slotkosten
- `spell`: Resonanzkosten, Effektart, Schaden, Heilung, Angriffsdaten,
  Aktionskosten, Reaktionsfelder
- `ability`: Effektart, Schaden, Heilung, Cooldown, Reaktionsfelder
- `consumable`: Uses, Effekt, Quantity, Slotkosten
- `equipment`: Slot, Equipped, Slotkosten

## 4. Build- und Release-Architektur

### TypeScript

`tsconfig.json` verwendet:

- `target: ES2022`
- `module: ESNext`
- `moduleResolution: Bundler`
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `isolatedModules: true`
- `rootDir: ./src`
- `outDir: ./dist`
- `sourceMap: true`

Da keine externen Foundry-Typen installiert sind, stellt
`foundry-extensions.d.ts` minimale globale Typdefinitionen fuer Foundry-Klassen
bereit: `Actor`, `Item`, `ActorSheet`, `ItemSheet`, `Roll`, `Combat`,
`Combatant`, `ActiveEffect`, `RollTable`, `Dialog`, `game`, `ui`, `Hooks`,
`CONFIG`, `Actors`, `Items`, `ChatMessage`, `TextEditor`, `loadTemplates` und
`renderTemplate`.

### Webpack

`webpack.config.cjs` definiert:

- Entry: `./src/loa-system.ts`
- Target: `web`
- Output: `dist/loa-system.js`
- Output als ES-Modul via `experiments.outputModule`
- Clean des `dist`-Ordners bei Build
- TypeScript-Aufloesung mit `extensionAlias`, damit `.js`-Imports auf `.ts`
  Quellen zeigen koennen
- Production-Source-Maps

### Release

Die GitHub Action `.github/workflows/release.yml` laeuft bei Tags im Format
`v*.*.*`:

1. Checkout
2. Node 20 Setup mit npm Cache
3. `npm ci`
4. Version aus Tag nach `system.json` schreiben
5. `npm run typecheck`
6. `npm run build`
7. `loa-system.zip` erzeugen
8. GitHub Release mit `loa-system.zip` und `system.json` erzeugen

Lokal existiert zusaetzlich:

- `scripts/update-version.mjs`: setzt `system.json.version` aus CLI-Argument,
  `RELEASE_TAG`, `GITHUB_REF_NAME` oder letztem Git-Tag
- `scripts/package-release.mjs`: baut lokal ein `loa-system.zip` mit
  `system.json`, `template.json`, `dist`, `styles`, `templates`

## 5. Quellstruktur

```text
src/
  loa-system.ts
  module/
    abilities/
    actors/
    attributes/
    chat/
    classes/
    combat/
    constants/
    effects/
    experience/
    hooks/
    inventory/
    items/
    magic/
    resources/
    rolls/
    templates/
    types/
    utils/
```

### Zentrale Einstiegspunkte

- `src/loa-system.ts`
  - registriert alle Hooks
  - exportiert Services unter `globalThis.loaSystem`

- `src/module/hooks/registerHooks.ts`
  - bindet `init` und `ready`
  - registriert Actor-/Item-Dokumentklassen
  - registriert Actor-/Item-Sheets
  - konfiguriert Initiative
  - laedt Templates vor
  - installiert die Wild-Magic-RollTable beim GM-ready

## 6. Runtime-Lifecycle

### Initialisierung

Beim Laden des Systems wird `registerHooks()` ausgefuehrt.

`Hooks.once("init", onInit)`:

- setzt `CONFIG.Actor.documentClass = LoAActor`
- setzt `CONFIG.Item.documentClass = LoAItem`
- ruft `InitiativeService.configure()`
- ersetzt das Core ActorSheet durch `LoAActorSheet`
- ersetzt das Core ItemSheet durch `LoAItemSheet`
- laedt alle in `TEMPLATE_PATHS` bekannten Templates vor

`Hooks.once("ready", onReady)`:

- ruft `WildMagicTableInstaller.ensure()`
- erzeugt als GM bei Bedarf die Welt-RollTable `LoA Wild Magic Surge`

Weitere Hooks:

- `combatStart`: setzt die Aktionsslots des aktiven Combatants zurueck
- `combatTurn`: setzt die Aktionsslots des aktiven Combatants zurueck
- `renderChatMessage`: bindet Buttons auf Pending-Damage-Karten

### Globale Makro-/Debug-API

`src/loa-system.ts` macht Services unter `globalThis.loaSystem` verfuegbar,
u.a.:

- `AttributeService`
- `PointBuyService`
- `ResourceManager`
- `ResonanceManager`
- `StabilityCheckService`
- `WildMagicService`
- `SpellCastService`
- `RollManager`
- `ActionEconomyService`
- `DamageService`
- `InitiativeService`
- `AttackService`
- `TargetService`
- `ReactionService`
- `ReactionOfferService`
- `AbilityUseService`
- `ClassManager`
- `ExperienceService`
- `EffectManager`
- `EffectFactory`
- `InventoryService`
- `ChatCardRenderer`
- `Logger`

## 7. Actor-System

### `LoAActor`

`LoAActor` erweitert Foundry `Actor` und haelt nur kleine Komfortmethoden.
Die zentrale Ableitung passiert in `prepareDerivedData()`:

- Attributmodifikatoren werden aus Attributwerten berechnet.
- Kampfaktionsdaten werden zur Laufzeit sichergestellt.
- HP-Maximum wird aus Konstitution abgeleitet.
- AC wird aus Dexterity-Modifikator, getragener Ruestung und manuellem Bonus
  abgeleitet.

Wichtige Regeln:

- HP: `system.resources.hp.max = con * 10`
- HP-Value wird auf `0..max` geclamped
- AC: `dex.modifier + Summe(equipped armor.acBonus) + system.ac.bonus`
- Es gibt aktuell keine Basis-AC.

`ensureCombatActions()` migriert alte Actor-Daten mit
`system.actionEconomy.{actions,bonusActions,reactions}` zur Laufzeit auf
`system.combat.actions.{action,bonusAction,reaction}`. Diese Migration schreibt
nicht automatisch in die Datenbank, sondern stellt die Daten im Runtime-System
bereit.

Komfortmethoden:

- `getResource(key)`
- `spendResource(key, amount)`
- `rollAttribute(key, bonus)`

### Actor-Datenmodell

`LoAActorSystemData` beschreibt:

- Attribute
- Ressourcen
- Klassenressourcen
- Kampfaktionsdaten
- alte Action-Economy-Daten als deprecated Fallback
- Spellcasting
- Point Buy
- Armor Class
- Inventory
- Class Ref
- Experience
- Biography
- Level

Ressourcen:

- `hp`: Standard-Resource
- `resonance`: Standard-Resource
- `superiorityDice`: `{ dice, current, max }`
- `ammo`: `{ arrows, bolts }`
- `specialAmmo`: Array mit `{ type, label, amount }`
- `classResources.potions`: Potion-Inventory mit Slots und Items

## 8. Actor-Sheet und ViewModel

### `LoAActorSheet`

`LoAActorSheet` erweitert `ActorSheet`.

Default-Optionen:

- Klassen: `loa-system sheet actor`
- Standardtemplate: Character-Sheet
- Groesse: 960 x 760
- Tabs: `main`, `inventory`, `combat`, `magic`, `experience`, `story`
- Drag-and-Drop: `.loa-draggable` auf `.loa-dropzone`

Die Template-Auswahl erfolgt dynamisch:

- Actor-Type `npc` -> `templates/actor/npc-sheet.hbs`
- sonst -> `templates/actor/character-sheet.hbs`

`getData()` setzt:

- `data.system`
- `data.viewModel = ActorDataBuilder.build(actor)`
- `data.items`

### Listener

`activateListeners()` bindet:

- Attributwuerfe
- Item-Aktionen
- Rucksacksuche
- Klassenwechsel
- Erfahrungssystem
- Spezialmunition
- Aktionsoekonomie

Wichtige UI-Aktionen:

- `roll-attribute`
- `open-item`
- `delete-item`
- `cast-spell`
- `attack-weapon`
- `use-ability`
- `use-consumable`
- `equip-armor`
- `unequip-armor`
- `reset-action-economy`
- `spend-action`
- `set-action-current`
- `set-action-max`
- `add-experience`
- `remove-experience`
- `add-special-ammo`
- `remove-special-ammo`

### Drag-and-Drop

Drop-Zonen:

- `backpack`
- `armor`
- `spellbook`

Regeln:

- In den Armor-Slot passen nur Items vom Typ `armor`.
- Ins Spellbook passen nur Items vom Typ `spell`.
- Spells duerfen nicht in den Backpack gelegt werden.
- Backpack-Drops pruefen Slotkapazitaet ueber `InventoryService`.
- Consumables werden bei gleichem Namen bis zum Stack-Limit gestapelt.
- Beim Armor-Drop werden andere getragene Ruestungen abgelegt.

### `ActorDataBuilder`

`ActorDataBuilder` baut das komplette Sheet-ViewModel. Dadurch bleiben die
Templates weitgehend frei von Berechnungslogik.

Das ViewModel enthaelt:

- `attributes`
- `resources`
- `pointBuy`
- `resonance`
- `ac`
- `combat`
- `inventory`
- `equippedArmor`
- `spellbook`
- `weapons`
- `abilities`
- `class`
- `classResources`
- `experience`

Wichtige Mapping-Regeln:

- Attribute enthalten Label, Wert, Modifier, Anzeigeformat und Point-Buy-Kosten.
- Ressourcen werden nur angezeigt, wenn sie fuer die Klasse aktiv sind.
- Inventory wird als Slotliste aufgebaut.
- Equipped Armor wird separat fuer den Ruestungsslot ermittelt.
- Spells, Weapons und Abilities werden als eigene Listen fuer Tabs gebaut.
- Reaction-Abilities werden erkannt und nicht als normale Use-Buttons gezeigt.
- Klasse und Subklasse werden aus `CLASS_DEFINITIONS` abgeleitet.
- Erfahrung wird aus `ExperienceService.computeAll()` gruppiert.

## 9. Item-System

### `LoAItem`

`LoAItem` erweitert Foundry `Item`. Es typisiert Item-Typen und delegiert die
eigentliche Ausfuehrung an Services.

Wichtige Methoden:

- `isSpell()`
- `isWeapon()`
- `isAbility()`
- `getActionCost()`
- `getEffectKind()`
- `castSpell()`
- `attack()`
- `useAbility()`

Vor jeder aktiven Nutzung wird die Aktionsoekonomie geprueft:

- Item liest `system.actionCost`
- `normalizeActionType()` normalisiert alte Kurzformen
- `ActionEconomyService.spendAction()` verbraucht den Slot
- erst danach wird der eigentliche Service aufgerufen

Sonderregel fuer Reaktionen:

- Items mit `effectKind === "reaction"` werden nicht direkt verwendet.
- Sie erscheinen im Pending-Damage-Workflow des Ziel-Actors.

### `LoAItemSheet`

`LoAItemSheet` waehlt je Item-Typ ein Template:

- `weapon` -> `weapon-sheet.hbs`
- `spell` -> `spell-sheet.hbs`
- `armor` -> `armor-sheet.hbs`
- `ability` -> `ability-sheet.hbs`
- `consumable` -> `consumable-sheet.hbs`
- sonst -> `item-sheet.hbs`

Aktuell bindet das ItemSheet nur direkt den `cast-spell` Button fuer
Spell-Sheets. Viele praktische Item-Nutzungen laufen ueber das Actor-Sheet.

## 10. Aktionsoekonomie

### Datenmodell

Kanonischer Pfad:

```text
system.combat.actions.{action,bonusAction,reaction}.{current,max}
```

Action-Typen:

- `action`
- `bonusAction`
- `reaction`
- `freeAction`

Nur Slot-Typen verbrauchen Ressourcen:

- `action`
- `bonusAction`
- `reaction`

`freeAction` erzeugt optional Chat-Ausgabe, reduziert aber keinen Slot.

### `ActionEconomyService`

Verantwortlichkeiten:

- Slots lesen
- Snapshot aller Slots liefern
- Aktion verbrauchen
- Turn-Reset ausfuehren
- manuelle Sheet-Setter fuer `current` und `max`
- alte API-Aufrufe kompatibel halten
- pruefen, ob Actor in aktivem Combat ist
- Chat-Ausgabe fuer Action Spend posten

Wichtige Regeln:

- Ausserhalb eines aktiven Combats werden Aktionen nicht verbraucht, aber der
  Ablauf gilt als erfolgreich.
- Innerhalb eines aktiven Combats wird `current` reduziert.
- `current` wird immer auf `0..max` geclamped.
- Wenn kein Slot mehr verfuegbar ist, erscheint eine Notification.
- Turn-Reset setzt alle drei Slots auf `max`.

### Combat-Hooks

`combatHooks.ts` setzt die Slots nur fuer den aktiven Combatant zurueck:

- bei Combat-Start fuer den ersten aktiven Combatant
- bei jedem Combat-Turn-Wechsel fuer den jeweils aktiven Combatant

Es gibt keinen pauschalen Rundenreset fuer alle Combatants.

## 11. Angriff, Schaden und Reaktionen

### `TargetService`

Kapselt `game.user.targets`.

Methoden:

- `getTokens()`
- `getActors()`
- `hasTargets()`

Andere Services greifen nicht direkt auf `game.user.targets` zu.

### `AttackService`

Waffenangriffe laufen ueber `rollWeaponAttack(actor, weapon)`.

Flow:

1. Targets ueber `TargetService.getActors()`
2. Angriffsformel: `1d20 + Attributsmodifikator + attackBonus`
3. Treffervergleich gegen `target.system.ac.value`
4. Bei Treffer: Schadensformel wuerfeln
5. Statt direkter HP-Aenderung: `ReactionService.createPending()`
6. Zusammenfassung ueber `ChatCardRenderer.renderAttack()`

Wenn kein Target gesetzt ist, wird ein ungezielter Angriff gewuerfelt und als
Chat-Ergebnis angezeigt. Dabei wird kein Pending-Damage erzeugt.

### `DamageService`

Zentrale HP-Aenderung.

Methoden:

- `applyDamage(actor, amount, options)`
- `rollAndApply(actor, formula, type, flavor)`
- `heal(actor, amount, resourceKey)`

Regeln:

- Standard-Resource ist `hp`.
- Schaden reduziert `system.resources.hp.value`, mindestens auf 0.
- Heilung erhoeht HP bis maximal `hp.max`.
- `applyResistances()` ist als zentraler Hook-Punkt vorbereitet, aktuell aber
  eine Identitaetsfunktion.

### `ReactionService`

Der Reaktionsworkflow basiert auf Pending-Damage-Chatkarten.

Pending-Damage-Flags:

- `kind: "pending-damage"`
- `attackerName`
- `targetActorId`
- `targetName`
- `source`
- `damage`
- `damageType`
- `reactionUsed`
- `resolved`
- `dc`

Flow:

1. Angriff, Zauber oder Ability erzeugt Pending-Damage.
2. ChatMessage bekommt Flags im Scope `loa-system`.
3. Message wird optional an Besitzer des Ziel-Actors gewhispert.
4. `chatHooks` bindet Buttons:
   - `Reagieren`
   - `Schaden anwenden`
5. Zielbesitzer oder GM kann reagieren.
6. Reaktionsitems des Ziel-Actors werden gesammelt.
7. Nach Reaktion wird die Chatkarte mit reduziertem Schaden aktualisiert.
8. Beim Anwenden wird `DamageService.applyDamage()` aufgerufen.
9. Message wird als `resolved` markiert.

Reaktionsmodi:

- `flat`: Reduktion ist `reactionFormula`, entweder Zahl oder Rollformel.
- `rolled`: Wurf `1d20 + reactionAttribute` gegen DC; bei Erfolg Reduktion
  per Formel.
- `counter`: Wurf gegen DC; bei Erfolg wird der gesamte Schaden negiert.

Reaktionsitems:

- bevorzugt `effectKind === "reaction"`
- Legacy-Fallback fuer Items mit `damageReduction > 0` und
  `actionCost === "reaction"`

Interaktionsrechte:

- GM darf immer.
- Actor-Owner duerfen fuer ihren Actor reagieren und Schaden anwenden.

### `ReactionOfferService`

`ReactionOfferService` ist ein Architektur-Skeleton fuer kuenftige
triggerbasierte Reaktionsangebote.

Aktuell:

- `offer(context)` loggt nur Debug-Ausgabe.
- `collectFor(actor, trigger)` findet Reaktionsitems nach
  `reactionTrigger`.

Der produktive Workflow fuer `before_damage_applied` liegt derzeit direkt in
`ReactionService`.

## 12. Magiesystem

### `SpellCastService`

`SpellCastService.cast(actor, spell, options)` orchestriert das Wirken eines
Zaubers.

Allgemeiner Flow:

1. Effektart bestimmen (`damage`, `heal`, `utility`, `reaction`)
2. Resonanz erzeugen, wenn:
   - kein Cantrip
   - `generatesResonance` true
3. Resonanzschwelle auswerten
4. ggf. Stabilitaetswurf ausfuehren
5. ggf. Wild-Magic-Konsequenz bestimmen
6. je Effektart verzweigen:
   - Damage: Angriff/Schaden gegen Targets und Pending-Damage
   - Heal: Heilungswurf auf Target oder Self
   - Utility: nur Chatkarte
7. Spell-Cast-Chatkarte rendern

Damage-Spells:

- nutzen `spell.system.attribute`
- addieren `spell.system.attackBonus`
- vergleichen gegen Target-AC
- wuerfeln `spell.system.damage`
- addieren Resonanzbonus
- erzeugen Pending-Damage mit optionaler DC

Heal-Spells:

- nutzen `spell.system.healFormula`
- heilen das erste Target oder den Wirkenden
- posten Roll und Heilungs-Chatkarte

Utility-Spells:

- posten die Beschreibung in die Spell-Cast-Karte

Reaction-Spells:

- werden nicht direkt ueber `castSpell()` gewirkt
- erscheinen im Pending-Damage-Dialog

### Resonanz

`ResonanceManager` definiert datengetriebene Schwellen:

| RP | Damage-Bonus | Range-Bonus | Stability-DC |
| --- | --- | --- | --- |
| 5 | `1d4` | 5 | keiner |
| 10 | `1d6` | 10 | 10 |
| 15 | `+10` | 15 | 15 |
| 20 | `+15` | 20 | 20 |

Methoden:

- `activeThreshold(rp)`
- `evaluate(rp)`
- `addResonance(actor, amount)`
- `clearResonance(actor)`
- `releaseResonance(actor, formula)`

### Stabilitaetswurf

`StabilityCheckService.perform(actor, check, speaker)`:

- laeuft nur, wenn die Resonanzschwelle einen Check verlangt
- liest das Zauberattribut aus `system.spellcasting.ability`
- nutzt den passenden Attributmodifikator
- delegiert an `RollManager.rollStabilityCheck()`

Outcome-Regeln in `RollManager`:

- Natural 1 -> `implosion`
- Erfolg -> `success`
- Fehlschlag mehr als 5 unter DC -> `fizzle`
- sonstiger Fehlschlag -> `wild-magic`

### Wild Magic

`WildMagicTableInstaller` legt als GM beim Ready-Hook die RollTable
`LoA Wild Magic Surge` an, falls sie nicht existiert.

`WildMagicService`:

- beschreibt Konsequenzen aus dem Stabilitaetswurf
- zieht bevorzugt aus der Foundry-RollTable
- faellt bei Fehlern oder fehlender Tabelle auf `WILD_MAGIC_ENTRIES` zurueck

Die statische Tabelle nutzt `1d20`.

## 13. Ability-System

`AbilityUseService` fuehrt Abilities vom Actor-Sheet aus.

Effektarten:

- `damage`: Schadenswurf, danach Pending-Damage fuer jedes Target
- `heal`: Heilungswurf, Heilung auf erstes Target oder Self
- `utility`: Chatkarte mit Beschreibung
- `reaction`: kein direkter Use-Pfad

Bei Damage-Abilities wird keine eigene Trefferprobe durchgefuehrt. Die Ability
wuerfelt Schaden und erzeugt Pending-Damage fuer Targets. Die Reaktions-DC wird
vorher ueber `LoAItem.useAbility()` abgefragt, wenn Effektart `damage` ist.

## 14. Ressourcen- und Inventarsystem

### `ResourceManager`

Generischer Zugriff auf `actor.system.resources`.

Methoden:

- `get(actor, key)`
- `setValue(actor, key, value)`
- `modify(actor, key, delta)`
- `spend(actor, key, amount)`
- `restore(actor, key)`
- `ratio(resource)`

Alle Schreibzugriffe laufen ueber `actor.update()` mit Foundry-Pfaden wie:

```text
system.resources.${key}.value
```

### `InventoryService`

Verantwortlich fuer Rucksack-Slots, Equipment-Filterung und Consumable-Stacks.

Konstanten:

- `DEFAULT_CAPACITY = 16`
- `CONSUMABLE_MAX_STACK = 10`

Regeln:

- Spells zaehlen nicht zum Backpack.
- Equipped Armor zaehlt nicht zum Backpack.
- Items mit `slots <= 0` zaehlen nicht.
- Consumables mit gleichem Namen koennen bis 10 pro Stack gestapelt werden.
- Ein Consumable-Stack belegt einen Slot.

Methoden:

- `capacity(actor)`
- `backpackItems(actor)`
- `countsTowardsBackpack(item)`
- `slotCost(item)`
- `usedSlots(actor)`
- `freeSlots(actor)`
- `canAccept(actor, item)`
- `equippedArmor(actor)`
- `stackConsumable(actor, incoming)`
- `consumeOne(actor, item)`

`consumeOne()` postet eine Utility-Chatkarte, reduziert `quantity` um 1 und
loescht das Item, wenn die Menge auf 0 faellt.

## 15. Klassen-System

### Datenquelle

`constants/class.constants.ts` ist die zentrale Konfigurationsquelle.

Klassen:

- `warrior` -> Superiority Dice
- `warlock` -> Potions
- `dark_ranger` -> Ammo
- `mage` -> Resonance
- `experimental_weaver` -> Resonance
- `monk` -> Resonance
- `demon_hunter` -> Resonance

Subklasse:

- `dark_ranger.soul_hunter` -> zusaetzlich Special Ammo

Ressourcen-Keys:

- `resonance`
- `superiorityDice`
- `potions`
- `ammo`
- `specialAmmo`

### `ClassManager`

Lookup-Layer ueber `CLASS_DEFINITIONS`.

Methoden:

- `all()`
- `getDefinition(key)`
- `getSubclasses(classKey)`
- `getSubclass(classKey, subclassKey)`
- `getEnabledResources(classKey, subclassKey)`
- `isSubclassValid(classKey, subclassKey)`

Das Actor-Sheet nutzt diese Logik, um Klassenoptionen, Subklassenoptionen und
dynamische Ressourcenbereiche aufzubauen.

## 16. Erfahrungssystem

### Datenquelle

`constants/experience.constants.ts` definiert:

- Ranks
- XP-Schwellen
- Bonuswerte
- Erfahrungsbereiche
- Kategorien

Ranks:

| Rank | Label | XP | Bonus |
| --- | --- | --- | --- |
| `none` | Keine Erfahrung | 0 | 0 |
| `novice` | Novize | 5 | 1 |
| `scholar` | Gelehrter | 15 | 2 |
| `expert` | Experte | 30 | 3 |
| `master` | Meister | 50 | 4 |

Kategorien:

- Kampf
- Magie
- Wissen
- Ueberleben & Exploration
- Soziales
- Heimlichkeit & Kriminalitaet
- Handwerk

### `ExperienceService`

Reine Berechnungslogik:

- `rankFromXp(xp)`
- `rankInfo(key)`
- `bonusFromXp(xp)`
- `getArea(key)`
- `getAvailableByCategory(ownedKeys)`
- `computeAll(entries)`

Das Actor-Sheet kann Erfahrungsbereiche hinzufuegen, entfernen und XP pro
Bereich editieren. Die Anzeige gruppiert Eintraege nach Kategorie.

## 17. Attribute und Point Buy

### `AttributeService`

Regeln:

- Modifier: `floor((value - 10) / 2)`
- Attributwerte werden auf `ATTRIBUTE_MIN..ATTRIBUTE_MAX` geclamped
- Min: 8
- Max: 20

`deriveModifiers()` schreibt Modifier direkt in die Actor-Systemdaten, wenn
Foundry `prepareDerivedData()` laeuft.

### `PointBuyService`

Nutzt `ATTRIBUTE_COST_TABLE`.

Kosten:

| Wert | Kosten |
| --- | --- |
| 8 | 0 |
| 9 | 1 |
| 10 | 2 |
| 11 | 3 |
| 12 | 4 |
| 13 | 5 |
| 14 | 7 |
| 15 | 9 |
| 16 | 12 |
| 17 | 15 |
| 18 | 19 |
| 19 | 24 |
| 20 | 30 |

Standardbudget: 27.

Methoden:

- `costForValue(value)`
- `totalSpent(attributes)`
- `remainingBudget(attributes, budget)`
- `stepUpCost(currentValue)`

## 18. Roll-System

### `RollFormulaBuilder`

Reine String-Logik:

- `d20WithModifier(modifier, bonus)`
- `damage(base, modifier)`
- `signed(base, value)`

Beispiele:

- `d20WithModifier(2)` -> `1d20 + 2`
- `d20WithModifier(-1, 3)` -> `1d20 + 2`
- `damage("1d8", -1)` -> `1d8 - 1`

### `RollManager`

Zentrale Roll-Anlaufstelle.

Methoden:

- `roll(options)`: evaluiert und postet direkt nach Chat
- `evaluate(formula)`: evaluiert ohne Chat
- `postRoll(roll, options)`: postet bereits evaluierten Roll
- `rollAttribute(options)`
- `rollStabilityCheck(modifier, dc, flavor, speaker)`

Alle oeffentlichen Wurfpfade posten ueber `Roll.toMessage()`, damit Foundry-
Module wie Dice So Nice Wuerfe erkennen koennen.

## 19. Chat-System

### `ChatCardRenderer`

Zentrale HTML-Erzeugung fuer Chatkarten.

Render-Methoden:

- `renderSpellCast(payload)`
- `renderAttack(payload)`
- `renderActionSpend(payload)`
- `renderUtility(payload)`
- `renderDamage(payload)`
- `renderHeal(payload)`

Statische Builder:

- `buildPendingDamage(flags)`

Aktuell baut `ChatCardRenderer` HTML-Strings direkt im TypeScript. Die
Templates `templates/chat/attack-result.hbs` und `templates/chat/roll-result.hbs`
existieren, werden vom aktuellen Servicepfad aber nicht zentral genutzt.

## 20. Active Effects

### `EffectFactory`

Datengetriebene Effektdefinitionen.

Vorhandene Factory-Methoden:

- `resonantOverload()`
- `stunned(rounds)`
- `blessed(rounds)`
- `toFoundryData(def)`

Hinweis: `stunned()` schreibt aktuell noch auf deprecated Pfade unter
`system.actionEconomy.*`. Die aktuelle Aktionsoekonomie verwendet
`system.combat.actions.*`.

### `EffectManager`

Kapselt Foundry-ActiveEffect-Operationen:

- `apply(actor, definition)`
- `remove(actor, effectId)`
- `find(actor, statusId)`
- `isActive(actor, statusId)`
- `toggle(actor, definition)`

Sheets und Items sollten ActiveEffects nicht direkt ueber
`createEmbeddedDocuments()` manipulieren, sondern ueber diesen Service.

## 21. Templates und UI

### Actor-Templates

`templates/actor/character-sheet.hbs`:

- Sidebar mit Portrait, Name, Klasse, Level, AC/Ressourcen und Tabs
- Tab `main`: Attribute, Aktionsoekonomie, AC, Klassenressourcen
- Tab `inventory`: Ruestungsslot, Rucksack, Suche, Item-Aktionen
- Tab `combat`: Waffen, Aktionsstatus, Abilities
- Tab `magic`: Resonanzstatus, Spellcasting-Attribut, Spellbook
- Tab `experience`: Erfahrungsbereiche und XP
- Tab `story`: Biography

`templates/actor/npc-sheet.hbs`:

- reduzierte NPC-Ansicht mit Ressourcen, Attributen und Action Economy
- nutzt dasselbe ActorSheet und ViewModel

### Item-Templates

- `item-sheet.hbs`: generisches Item
- `weapon-sheet.hbs`: Schaden, Schadensart, Angriffsbonus, Attribut,
  Reichweite, Eigenschaften, Slot-Belegung, Aktionskosten
- `armor-sheet.hbs`: AC-Bonus, Ruestungstyp, Slot-Belegung, Equipped
- `spell-sheet.hbs`: Effektart, Aktionskosten, Stufe, Resonanz, Cantrip,
  Reichweite, Attribut, Damage/Heal/Utility/Reaction-Felder
- `ability-sheet.hbs`: Effektart, Aktionskosten, Cooldown,
  Damage/Heal/Utility/Reaction-Felder
- `consumable-sheet.hbs`: Quantity, Slot-Belegung, Effekt, Beschreibung

### Styles

`styles/loa-system.css` implementiert ein "cozy fantasy character sheet" mit:

- Parchment-/Leather-/Gold-Farbvariablen
- linker Sidebar
- responsive Layouts via CSS Container Queries
- Grid-basierte Cards
- Rucksack-Slot-Gitter
- Spellbook-Kacheln
- Action-Economy-Steuerelemente
- Chatkarten-Styling
- Pending-Damage-Buttons

## 22. Konstanten

### `system.constants.ts`

Zentrale IDs und Typen:

- `SYSTEM_ID = "loa-system"`
- `SYSTEM_LABEL = "LoA System"`
- Attribute: `str`, `dex`, `con`, `int`, `wis`, `cha`
- Spellcasting-Attribute: `int`, `wis`, `cha`
- Item-Typen
- Actor-Typen
- Resonanzschwellen

### `paths.constants.ts`

Einzige Quelle fuer Template-Pfade. Root:

```text
systems/loa-system
```

### `action.constants.ts`

Definiert:

- Action-Typen
- Slot-Action-Typen
- Labels
- Plural-Labels
- `normalizeActionType()`
- Reaktionsarten
- Reaktionstrigger

## 23. Wichtige technische Flows

### Waffenangriff mit Reaktion

```text
Actor-Sheet Button
  -> LoAItem.attack()
  -> ActionEconomyService.spendAction()
  -> AttackService.rollWeaponAttack()
  -> TargetService.getActors()
  -> RollManager.evaluate/postRoll()
  -> ReactionService.createPending()
  -> ChatCardRenderer.buildPendingDamage()
  -> chatHooks bindet Buttons
  -> ReactionService.openReactionDialog()
  -> ReactionService.useReaction()
  -> ReactionService.applyPending()
  -> DamageService.applyDamage()
```

### Damage-Spell

```text
Actor-Sheet oder Spell-Sheet
  -> LoAItem.castSpell()
  -> ReactionService.promptDC()
  -> ActionEconomyService.spendAction()
  -> SpellCastService.cast()
  -> ResonanceManager.addResonance()
  -> ResonanceManager.evaluate()
  -> StabilityCheckService.perform()
  -> WildMagicService.describe()
  -> SpellCastService.rollAttacks()
  -> ReactionService.createPending()
  -> ChatCardRenderer.renderSpellCast()
```

### Heal-Ability

```text
Actor-Sheet Button
  -> LoAItem.useAbility()
  -> ActionEconomyService.spendAction()
  -> AbilityUseService.use()
  -> RollManager.evaluate/postRoll()
  -> DamageService.heal()
  -> ChatCardRenderer.renderUtility()
```

### Consumable verwenden

```text
Actor-Sheet Button
  -> InventoryService.consumeOne()
  -> ChatCardRenderer.renderUtility()
  -> item.update(system.quantity - 1)
  -> bei 0: item.delete()
```

### Actor-Sheet Datenaufbereitung

```text
LoAActorSheet.getData()
  -> ActorDataBuilder.build(actor)
  -> AttributeService / PointBuyService
  -> ClassManager
  -> ResourceManager
  -> ResonanceManager
  -> InventoryService
  -> ExperienceService
  -> character-sheet.hbs
```

## 24. Erweiterungspunkte

### Neue Item-Typen

Notwendige Stellen:

1. `system.json` documentTypes
2. `template.json`
3. `ITEM_TYPES` in `system.constants.ts`
4. `LoAItemSheet.template`
5. neues Template unter `templates/item`
6. ggf. ViewModel-Mapping in `ActorDataBuilder`
7. ggf. Nutzungspfad in `LoAItem` und Service-Layer

### Neue Klassen

Primaer in `CLASS_DEFINITIONS` ergaenzen. Wenn neue Ressourcenarten benoetigt
werden:

1. `ClassResourceKey` erweitern
2. `template.json` Actor-Resource ergaenzen
3. `ActorDataBuilder.buildClassResources()` erweitern
4. `character-sheet.hbs` Anzeige/Inputs ergaenzen
5. ggf. Service fuer die neue Ressource bauen

### Neue Reaktionsarten

1. `REACTION_TYPES` erweitern
2. ggf. `REACTION_TRIGGERS` erweitern
3. Item-Templates um Felder erweitern
4. `ReactionService.collectReactions()` / `useReaction()` erweitern
5. perspektivisch `ReactionOfferService.offer()` produktiv nutzen

### Neue Resonanzschwellen

`THRESHOLD_RULES` in `ResonanceManager.ts` erweitern. Die Anzeige verwendet
`ResonanceManager.evaluate()` und profitiert automatisch.

### Neue Wild-Magic-Eintraege

`WILD_MAGIC_ENTRIES` und ggf. `WILD_MAGIC_FORMULA` anpassen. Bestehende Welten
haben danach moeglicherweise bereits eine alte Foundry-RollTable; diese wird
nicht automatisch ueberschrieben, damit GM-Aenderungen nicht verloren gehen.

## 25. Bekannte technische Auffaelligkeiten

Diese Punkte sind keine zwingenden Fehler fuer jeden Spielablauf, aber sie sind
beim weiteren Ausbau relevant:

- `EffectFactory.stunned()` verwendet noch deprecated Pfade
  `system.actionEconomy.*`. Das aktuelle Modell ist
  `system.combat.actions.*`.
- `templates/actor/npc-sheet.hbs` referenziert `viewModel.actionEconomy.*`.
  `ActorDataBuilder` liefert aktuell `viewModel.combat.*`. Die NPC-Action-
  Anzeige kann dadurch leer oder fehlerhaft sein.
- Chat-Templates existieren, der produktive `ChatCardRenderer` baut HTML aber
  direkt als Strings. Eine spaetere Vereinheitlichung ueber Handlebars-Templates
  wuerde Markup und Logik klarer trennen.
- `ReactionOfferService` ist noch ein Stub. Der aktuelle Reaktionsworkflow ist
  auf Pending-Damage zentriert.
- `DamageService.applyResistances()` ist vorbereitet, aber noch ohne
  Resistenz-/Verwundbarkeitslogik.
- `LoAActor.ensureCombatActions()` migriert alte Action-Economy-Daten nur zur
  Laufzeit. Eine persistente Migration fuer existierende Welten existiert noch
  nicht.
- Foundry-Typen sind lokale Minimaldefinitionen. Fuer groessere API-Arbeit kann
  ein offizieller/Community-Typensatz sinnvoll sein.
- Build und Release enthalten keine automatisierten Unit- oder Browser-Tests.

## 26. Entwicklungsregeln aus dem Projekt

Aus Code und vorhandener Projektdokumentation ergibt sich folgende Architektur:

- Keine direkte Spielmechanik in Templates.
- Keine verstreuten `game.user.targets`-Zugriffe; `TargetService` nutzen.
- Keine direkten Ressourcen-Updates ausserhalb zentraler Services.
- Rolls ueber `RollManager`, damit Foundry-Chat und Dice-Module beteiligt sind.
- Actor-/Item-Klassen bleiben schlank.
- Datenquellen fuer Klassen, Erfahrung, Actions und Pfade sind Konstantenmodule.
- Hooks nur zentral registrieren.
- Neue UI-Daten ueber ViewModels vorbereiten.
- Services moeglichst Foundry-arm halten, wo das sinnvoll ist.

## 27. Praktische Entwicklerbefehle

Typcheck:

```bash
npm run typecheck
```

Development-Build:

```bash
npm run build:dev
```

Production-Build:

```bash
npm run build
```

Watch-Modus:

```bash
npm run watch
```

Version lokal setzen:

```bash
npm run version:set 0.9.1
```

Release-ZIP lokal bauen:

```bash
npm run package
```

## 28. Kurzfazit

Das Projekt ist technisch bereits in klare Verantwortungsbereiche geschnitten:
Foundry-Integration, Sheet-Controller, ViewModel-Aufbereitung und Regelservices
sind weitgehend getrennt. Die wichtigsten Runtime-Flows laufen ueber zentrale
Services statt ueber Templates oder lose Hook-Logik. Besonders stark ausgepraegt
sind aktuell die Aktionsoekonomie, der Pending-Damage-Reaktionsworkflow, das
Resonanz-/Wild-Magic-System, das klassenabhaengige Ressourcenmodell, das
Slot-Inventar und die dynamische Erfahrungssystem-Anzeige.

Die groessten naechsten technischen Schritte waeren eine kleine Datenmigration
fuer alte Action-Economy-Pfade, eine Aktualisierung des NPC-Templates auf das
aktuelle ViewModel, ein produktiver Ausbau von `ReactionOfferService`, eine
Template-basierte Chatkarten-Renderstrecke und erste automatisierte Tests fuer
die reinen Services.
