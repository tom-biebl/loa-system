class LoAActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["loa-system", "sheet", "actor"],
      template: "systems/loa-system/templates/actor-sheet.hbs",
      width: 500,
      height: 500
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.system = this.actor.system;
    return data;
  }
}

Hooks.once("init", () => {
  console.log("LoA System | Initializing");

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("loa-system", LoAActorSheet, {
    types: ["character", "npc"],
    makeDefault: true
  });
});