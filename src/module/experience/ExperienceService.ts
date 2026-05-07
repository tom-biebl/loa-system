import {
  EXPERIENCE_AREAS,
  EXPERIENCE_RANKS,
  type ExperienceArea,
  type ExperienceRank,
  type RankInfo,
} from "../constants/experience.constants.js";

export interface ExperienceEntry {
  key: string;
  /** Optionaler Anzeige-Override; sonst aus EXPERIENCE_AREAS resolved. */
  label?: string;
  xp: number;
}

export interface ExperienceComputed extends ExperienceEntry {
  area: ExperienceArea | undefined;
  resolvedLabel: string;
  rank: ExperienceRank;
  rankInfo: RankInfo;
  bonus: number;
  bonusLabel: string;
}

/**
 * Reine Berechnungen für das Erfahrungssystem.
 * - Rang folgt dem höchsten Rank, dessen `xpRequired` erreicht ist
 * - Bonus kommt aus dem Rang, NICHT aus EP direkt
 */
export class ExperienceService {
  /** Höchster Rang, dessen XP-Schwelle erreicht ist. */
  static rankFromXp(xp: number): ExperienceRank {
    let current: ExperienceRank = "none";
    for (const rank of EXPERIENCE_RANKS) {
      if (xp >= rank.xpRequired) current = rank.key;
    }
    return current;
  }

  static rankInfo(key: ExperienceRank): RankInfo {
    return (
      EXPERIENCE_RANKS.find((r) => r.key === key) ?? EXPERIENCE_RANKS[0]!
    );
  }

  static bonusFromXp(xp: number): number {
    return ExperienceService.rankInfo(ExperienceService.rankFromXp(xp)).bonus;
  }

  static getArea(key: string): ExperienceArea | undefined {
    return EXPERIENCE_AREAS.find((a) => a.key === key);
  }

  /** Liefert alle vom Actor noch NICHT erfassten Bereiche, gruppiert nach Kategorie. */
  static getAvailableByCategory(
    ownedKeys: Iterable<string>,
  ): Array<{ category: string; areas: ExperienceArea[] }> {
    const owned = new Set<string>();
    for (const k of ownedKeys) owned.add(k);
    const grouped = new Map<string, ExperienceArea[]>();
    for (const area of EXPERIENCE_AREAS) {
      if (owned.has(area.key)) continue;
      const list = grouped.get(area.category) ?? [];
      list.push(area);
      grouped.set(area.category, list);
    }
    return Array.from(grouped.entries()).map(([category, areas]) => ({ category, areas }));
  }

  /** Wandelt eine Roh-Liste in das Sheet-VM (mit Rang/Bonus). */
  static computeAll(entries: ExperienceEntry[] | undefined): ExperienceComputed[] {
    const list = Array.isArray(entries) ? entries : [];
    return list.map((entry) => {
      const xp = Math.max(0, Number(entry.xp ?? 0));
      const area = ExperienceService.getArea(entry.key);
      const rank = ExperienceService.rankFromXp(xp);
      const rankInfo = ExperienceService.rankInfo(rank);
      return {
        key: entry.key,
        label: entry.label,
        xp,
        area,
        resolvedLabel: entry.label ?? area?.label ?? entry.key,
        rank,
        rankInfo,
        bonus: rankInfo.bonus,
        bonusLabel: rankInfo.bonus >= 0 ? `+${rankInfo.bonus}` : `${rankInfo.bonus}`,
      };
    });
  }
}
