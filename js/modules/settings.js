// ============ Configurações ============

const SettingsModule = {
  async render(container) {
    await CategoriesModule.render(container);
  }
};

window.SettingsModule = SettingsModule;
