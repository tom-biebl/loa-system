import {
  CLASS_DEFINITIONS,
  NO_CLASS_KEY,
  type ClassDefinition,
  type ClassResourceKey,
  type SubclassDefinition,
} from "../constants/class.constants.js";

/**
 * Lookup-Layer über die Klassen-Konfiguration. Andere Module greifen NICHT
 * direkt auf CLASS_DEFINITIONS zu, sondern über diesen Service.
 */
export class ClassManager {
  static all(): ClassDefinition[] {
    return CLASS_DEFINITIONS;
  }

  static getDefinition(key: string | null | undefined): ClassDefinition | undefined {
    if (!key || key === NO_CLASS_KEY) return undefined;
    return CLASS_DEFINITIONS.find((c) => c.key === key);
  }

  static getSubclasses(classKey: string | null | undefined): SubclassDefinition[] {
    return ClassManager.getDefinition(classKey)?.subclasses ?? [];
  }

  static getSubclass(
    classKey: string | null | undefined,
    subclassKey: string | null | undefined,
  ): SubclassDefinition | undefined {
    if (!subclassKey) return undefined;
    return ClassManager.getSubclasses(classKey).find((s) => s.key === subclassKey);
  }

  /** Liefert alle Ressourcen-Keys, die für diese Klasse + Subklasse aktiv sind. */
  static getEnabledResources(
    classKey: string | null | undefined,
    subclassKey: string | null | undefined,
  ): Set<ClassResourceKey> {
    const def = ClassManager.getDefinition(classKey);
    const set = new Set<ClassResourceKey>();
    if (!def) return set;
    for (const r of def.resources) set.add(r);
    const sub = ClassManager.getSubclass(classKey, subclassKey);
    if (sub) for (const r of sub.additionalResources) set.add(r);
    return set;
  }

  static isSubclassValid(
    classKey: string | null | undefined,
    subclassKey: string | null | undefined,
  ): boolean {
    if (!subclassKey) return true;
    return Boolean(ClassManager.getSubclass(classKey, subclassKey));
  }
}
