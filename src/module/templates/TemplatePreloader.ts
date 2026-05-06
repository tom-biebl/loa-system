import { TEMPLATE_PATHS } from "../constants/paths.constants.js";

export class TemplatePreloader {
  static async preload(): Promise<void> {
    const paths = Object.values(TEMPLATE_PATHS);
    await loadTemplates(paths);
  }
}
