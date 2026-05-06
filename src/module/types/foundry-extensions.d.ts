// Minimaler Foundry-Typ-Schatten, damit strict TS arbeitet ohne externes Typ-Paket.
// Bei Bedarf später durch @league-of-foundry-developers/foundry-vtt-types ersetzen.

type AnyObject = Record<string, unknown>;
type JQuery = any;

declare class Actor {
  id: string | null;
  name?: string;
  type: string;
  img?: string;
  uuid: string;
  system: any;
  items: any;
  effects?: any;
  prepareDerivedData(): void;
  update(diff: AnyObject): Promise<unknown>;
  createEmbeddedDocuments(type: string, data: unknown[]): Promise<unknown[]>;
  deleteEmbeddedDocuments(type: string, ids: string[]): Promise<unknown[]>;
}

declare class Item {
  id: string | null;
  name?: string;
  type: string;
  img?: string;
  system: any;
  actor: any;
  parent?: any;
  uuid?: string;
  update(diff: AnyObject): Promise<unknown>;
  delete(): Promise<unknown>;
  toObject(): AnyObject;
  static implementation: {
    fromDropData(data: AnyObject): Promise<any>;
  };
}

declare class ActorSheet {
  actor: any;
  isEditable: boolean;
  static get defaultOptions(): AnyObject;
  get template(): string;
  getData(options?: unknown): AnyObject | Promise<AnyObject>;
  activateListeners(html: JQuery | HTMLElement): void;
  _onDrop(event: DragEvent): Promise<unknown>;
  _onDropItem(event: DragEvent, data: AnyObject): Promise<unknown>;
}

declare class ItemSheet {
  item: any;
  isEditable: boolean;
  static get defaultOptions(): AnyObject;
  get template(): string;
  getData(options?: unknown): AnyObject | Promise<AnyObject>;
  activateListeners(html: JQuery | HTMLElement): void;
}

declare class Roll {
  total: number;
  dice: Array<{ results: Array<{ result: number }> }>;
  constructor(formula: string, data?: AnyObject);
  evaluate(options?: { async?: boolean }): Promise<this>;
  toMessage(options?: AnyObject): Promise<unknown>;
}

declare class Combat {
  combatants: { get(id: string): any; values(): IterableIterator<any>; contents: any[] };
  current: { combatantId?: string | null } | undefined;
  round: number;
  turn: number;
  started: boolean;
  update(diff: AnyObject): Promise<unknown>;
}

declare class Combatant {
  id: string;
  actor: any;
  initiative: number | null;
}

declare class ActiveEffect {
  id: string;
  name?: string;
  label?: string;
  statuses?: Set<string>;
  changes: Array<{ key: string; mode: number; value: string | number; priority?: number }>;
  duration: AnyObject;
  disabled: boolean;
  delete(): Promise<unknown>;
  update(diff: AnyObject): Promise<unknown>;
}

declare class RollTable {
  id: string;
  name: string;
  formula: string;
  results: any;
  draw(options?: AnyObject): Promise<{ results: Array<{ text?: string; getChatText?: () => string }> }>;
  static create(data: AnyObject): Promise<RollTable>;
}

declare const game: any;
declare const ui: any;
declare const Hooks: any;
declare const CONFIG: any;
declare const foundry: any;
declare const Actors: any;
declare const Items: any;
declare const ChatMessage: any;
declare const CONST: any;
declare const TextEditor: {
  getDragEventData(event: DragEvent): AnyObject;
};
declare const loadTemplates: (paths: string[]) => Promise<unknown>;
declare const renderTemplate: (path: string, data: unknown) => Promise<string>;
declare const mergeObject: any;
declare const duplicate: any;
