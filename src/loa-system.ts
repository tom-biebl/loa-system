import { registerHooks } from "./module/hooks/registerHooks.js";
import { Logger } from "./module/utils/Logger.js";

import { AttributeService } from "./module/attributes/AttributeService.js";
import { PointBuyService } from "./module/attributes/PointBuyService.js";
import { ResourceManager } from "./module/resources/ResourceManager.js";
import { ResonanceManager } from "./module/magic/ResonanceManager.js";
import { StabilityCheckService } from "./module/magic/StabilityCheckService.js";
import { WildMagicService } from "./module/magic/WildMagicService.js";
import { WildMagicTableInstaller } from "./module/magic/WildMagicTableInstaller.js";
import { SpellCastService } from "./module/magic/SpellCastService.js";
import { RollManager } from "./module/rolls/RollManager.js";
import { ActionEconomyService } from "./module/combat/ActionEconomy.js";
import { DamageService } from "./module/combat/DamageService.js";
import { InitiativeService } from "./module/combat/InitiativeService.js";
import { AttackService } from "./module/combat/AttackService.js";
import { TargetService } from "./module/combat/TargetService.js";
import { ReactionService } from "./module/combat/ReactionService.js";
import { AbilityUseService } from "./module/abilities/AbilityUseService.js";
import { EffectManager } from "./module/effects/EffectManager.js";
import { EffectFactory } from "./module/effects/EffectFactory.js";
import { InventoryService } from "./module/inventory/InventoryService.js";
import { ChatCardRenderer } from "./module/chat/ChatCardRenderer.js";

/**
 * Einstiegspunkt für das gebundelte System. Macht Services für Makros / Konsole
 * unter `globalThis.loaSystem` verfügbar — ohne dass Sheets das Globalobjekt nutzen.
 */
registerHooks();

(globalThis as { loaSystem?: unknown }).loaSystem = {
  AttributeService,
  PointBuyService,
  ResourceManager,
  ResonanceManager,
  StabilityCheckService,
  WildMagicService,
  WildMagicTableInstaller,
  SpellCastService,
  RollManager,
  ActionEconomyService,
  DamageService,
  InitiativeService,
  AttackService,
  TargetService,
  ReactionService,
  AbilityUseService,
  EffectManager,
  EffectFactory,
  InventoryService,
  ChatCardRenderer,
  Logger,
};
