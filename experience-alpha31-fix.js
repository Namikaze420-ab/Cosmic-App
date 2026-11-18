(() => {
  const originalRenderInsights = renderInsights;

  function shellIsOpen() {
    const shell = document.querySelector('.app-shell');
    return Boolean(shell && !shell.hidden);
  }

  function closeCommandWhenLocked() {
    if (shellIsOpen()) return;
    const palette = document.querySelector('#commandPalette');
    if (palette) palette.hidden = true;
  }

  // Capture the shortcut before the Alpha 3.1 bubble listener so auth/onboarding
  // cannot expose app-only commands behind a locked shell.
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !shellIsOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new MutationObserver(closeCommandWhenLocked);
  const shell = document.querySelector('.app-shell');
  if (shell) observer.observe(shell, { attributes:true, attributeFilter:['hidden'] });

  renderInsights = function alpha31SafetyFramedInsights() {
    originalRenderInsights();
    const page = document.querySelector('#page-insights');
    const lenses = page?.querySelector('.personal-lens-grid');
    if (lenses && !page.querySelector('#personalGuidanceDisclaimer')) {
      const note = document.createElement('p');
      note.id = 'personalGuidanceDisclaimer';
      note.className = 'personal-guidance-disclaimer';
      note.textContent = 'Personal guidance is for reflection and planning context only. Money and wellbeing prompts are not financial, medical or other professional advice.';
      lenses.after(note);
    }
  };

  window.CosmicExperience31Safety = Object.freeze({ shellIsOpen });
})();