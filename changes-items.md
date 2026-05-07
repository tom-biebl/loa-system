# Effekt-Arten ausbauen:
Wir haben bereits:
- Schaden
- Heilung
- Utility (Chat)
- Reaktion (Schadensreduktion)

Ich will aber das genauer ich folgende Effekt-Arten bei Spell, Weapon und Ability:
- Schaden
- Heilung
- Utility (Chat)
- Reaktion: Schadensreduktion
- Reaktion: Counter
- Reaktion: Dodge
- Reaktion: Custom

Die ersten drei passen. Aber die unteren muessen wir neu implementieren. 
- Regel: Wenn eine der Reaktion: ... - Effekt-Arten ausgewaehlt wurde, setzen wir Aktionskosten automatisch auf Reaktion.
- Regel: DC bei Reaktionen. Der DC um eine Reaktion erfolgreich gegen einen Angriff zu wirken ist immer Basis-DC von 8 + Modifier des Primaer Attributs des Angreifenden. Beispiel: Angriff mit Schwert (Hat im Item bei Attribut Dex; Dex Modifier: + 2) dann waere der DC 8 + 2 = 10.

### Reaktion: Schadensreduktion
Haben wir bereits eingebaut das passt. Wir reduzieren den Schaden um eine Dice-Formula oder Fixwert. Aber es muss eine Checkbox eingebaut welche sagt: rolled?. Wenn diese angehakt ist gibt es einen DC-Wurf.

### Reaktion: Counter
Ist ein Counterspell. Diese Option gibt es nur bei Spell-Reaktionen. Negiert den Zauber. (Kann nicht auf physikalische Angriffe gecastet werden). DC Regel wie oben. Aber es muss eine Checkbox eingebaut welche sagt: rolled?. Wenn diese angehakt ist gibt es einen DC-Wurf.

### Reaktion: Dodge
Ausweichen. Diese Effekt-Art existiert nur bei Abilities. Man weicht aus. Es muss eine Checkbox eingebaut welche sagt: rolled?. Wenn diese angehakt ist gibt es einen DC-Wurf. DC-Regel wie oben beschrieben.

### Reaktion: Custom
Man kann eine Chat-Nachricht eingeben welche dann beim nutzen in den Chat geposted wird.




