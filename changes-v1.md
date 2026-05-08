# Noch zu implementieren

## AoE-System

Das System muss AoE-Zauber und AoE-Items unterstützen.

Verwendet werden Foundry Measured Templates.

Unterstützte Template-Typen:
- Circle
- Cone

Konfigurierbare Werte:
- Radius
- Winkel / Grad
- Reichweite

AoE-Effekte müssen alle betroffenen Targets automatisch erfassen und den Effekt auf jedes Target anwenden.

---

# Compendium erweitern

Alle folgenden Items und Spells sollen in die passenden Compendiums integriert werden.

Wichtig:
- Bilder/Icon-Pfade müssen später leicht austauschbar bleiben
- Keine hardcodierten Asset-Pfade
- Alle Inhalte müssen direkt testbar sein

---

# Consumables

## Kleiner Heiltrank
- Heal: `4d4 + 5`

## Mittlerer Heiltrank
- Heal: `4d8 + 5`

## Großer Heiltrank
- Heal: `4d10 + 5`

## Rauchbombe
- AoE: Circle 5 ft
- Effekt:
  - Erzeugt Rauchwolke
  - Alle betroffenen Targets erhalten `Invisible`

## Explosivgebräu
- Usage Type: throwable
- Reichweite: 30 ft
- AoE: Circle 5 ft
- Schaden: `3d6` Feuerschaden
- Effekt:
  - Targets werden 10 ft zurückgestoßen
  - Dex Saving Throw gegen Knockback

---

# Waffen

## Einfaches Stahlschwert
- Schaden: `1d8 + 2`

## Einfache Axt
- Schaden: `1d10 + 1`

## Speer
- Schaden: `1d6 + 2`

## Hellebarde
- Schaden: `1d10 + 3`

## Degen
- Schaden: `1d8 + 3`
- Eigenschaft:
  - finesse