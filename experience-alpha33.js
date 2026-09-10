(() => {
  const originalRenderHome = renderHome;
  const originalRenderInsights = renderInsights;
  const originalRenderProfile = renderProfile;

  const FOCUS = Object.freeze([
    { id:'work', label:'Work', icon:'↗', copy:'Execution, career and important projects' },
    { id:'relationships', label:'Relationships', icon:'♡', copy:'Connection, communication and boundaries' },
    { id:'money', label:'Money', icon:'◈', copy:'Financial habits, planning and stewardship' },
    { id:'wellbeing', label:'Wellbeing', icon:'◌', copy:'Energy, routines, rest and sustainability' },
    { id:'growth', label:'Personal growth', icon:'✦', copy:'Reflection, learning and intentional change' }
  ]);
  const FOCUS_IDS = new Set(FOCUS.map(item => item.id));
  const STYLES = Object.freeze([
    { id:'practical', label:'Practical', copy:'Short, action-first prompts' },
    { id:'balanced', label:'Balanced', copy:'Action plus reflection' },
    { id:'reflective', label:'Reflective', copy:'More space for questions and meaning' }
  ]);
  const STYLE_IDS = new Set(STYLES.map(item => item.id));
  const DEMO_KEY = 'cosmic.guidance.preferences.alpha33';

  function cleanFocus(value) {
    return domainCall('guidance','cleanFocus',()=>{
      const items = Array.isArray(value) ? value : [];
      return [...new Set(items.map(String).filter(id => FOCUS_IDS.has(id)))].slice(0, 3);
    },[value]);
  }

  function cleanStyle(value) {
    return domainCall('guidance','cleanStyle',()=>{
      return STYLE_IDS.has(value) ? value : 'balanced';
    },[value]);
  }

  function demoPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
      return {
        focus_areas: cleanFocus(parsed?.focus_areas),
        guidance_style: cleanStyle(parsed?.guidance_style)
      };
    } catch {
      return { focus_areas:[], guidance_style:'balanced' };
    }
  }

  function currentPreferences() {
    if (state.mode === 'live') {
      return {
        focus_areas: cleanFocus(state.preferences?.focus_areas),
        guidance_style: cleanStyle(state.preferences?.guidance_style)
      };
    }
    return demoPreferences();
  }

  function focusMeta(id) {
    return FOCUS.find(item => item.id === id) || null;
  }

  function focusLabel(id) {
    return focusMeta(id)?.label || cap(id);
  }

  function stylePrompt(style, primary) {
    const label = focusLabel(primary).toLowerCase();
    if (style === 'practical') return `Turn today's context into one concrete ${label} action you can finish or schedule.`;
    if (style === 'reflective') return `Notice what ${label} is asking for before deciding what, if anything, needs to change.`;
    return `Give ${label} deliberate attention today without letting it crowd out everything else.`;
  }

  async function persistPreferences(next) {
    const payload = {
      focus_areas: cleanFocus(next.focus_areas),
      guidance_style: cleanStyle(next.guidance_style)
    };

    if (state.mode !== 'live') {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(payload)); } catch {}
      state.preferences = { ...(state.preferences || {}), ...payload };
      return { ok:true, data:payload };
    }

    if (!state.user || !sb) return { ok:false, error:new Error('Sign in to save personal guidance preferences') };
    const { data, error } = await sb
      .from('user_preferences')
      .upsert({ user_id:state.user.id, ...payload }, { onConflict:'user_id' })
      .select()
      .single();
    if (error) return { ok:false, error };
    state.preferences = { ...(state.preferences || {}), ...(data || payload) };
    return { ok:true, data:data || payload };
  }

  async function setFocus(id) {
    if (!FOCUS_IDS.has(id)) return;
    const current = currentPreferences();
    const selected = new Set(current.focus_areas);
    if (selected.has(id)) selected.delete(id);
    else {
      if (selected.size >= 3) return toast('Choose up to three priorities');
      selected.add(id);
    }
    const result = await persistPreferences({ ...current, focus_areas:[...selected] });
    if (!result.ok) return toast(result.error?.message || 'Could not save priorities');
    toast('Personal priorities updated');
    refreshCurrentSurface();
  }

  async function setGuidanceStyle(style) {
    if (!STYLE_IDS.has(style)) return;
    const current = currentPreferences();
    const result = await persistPreferences({ ...current, guidance_style:style });
    if (!result.ok) return toast(result.error?.message || 'Could not save guidance style');
    toast(`${cap(style)} guidance selected`);
    refreshCurrentSurface();
  }

  function refreshCurrentSurface() {
    if (state.page === 'home') renderHome();
    else if (state.page === 'insights') renderInsights();
    else if (state.page === 'profile') renderProfile();
  }

  function priorityMarkup(preferences) {
    const focus = preferences.focus_areas;
    if (!focus.length) return '';
    return focus.map(id => {
      const meta = focusMeta(id);
      return `<span class="alpha33-priority-chip"><i aria-hidden="true">${meta?.icon || '✦'}</i>${esc(meta?.label || id)}</span>`;
    }).join('');
  }

  function enhanceHome() {
    const page = document.querySelector('#page-home');
    if (!page || page.querySelector('#alpha33PriorityStrip')) return;
    const prefs = currentPreferences();
    const activationVisible = Boolean(page.querySelector('#alpha32Activation'));

    if (!prefs.focus_areas.length) {
      if (activationVisible) return;
      const card = document.createElement('section');
      card.id = 'alpha33PriorityStrip';
      card.className = 'card alpha33-priority-strip alpha33-priority-empty';
      card.innerHTML = `
        <div><span class="eyebrow">MAKE IT YOURS</span><strong>What should Cosmic help you pay attention to?</strong><small>Choose up to three priorities. Cosmic will reorder and frame guidance around them without reading your Journal.</small></div>
        <button type="button" class="ghost-btn" data-alpha33-open-profile>Choose priorities</button>`;
      const rhythm = page.querySelector('#dailyRhythmCard');
      (rhythm || page.querySelector('.hero-card'))?.after(card);
      card.querySelector('[data-alpha33-open-profile]')?.addEventListener('click', () => {
        setPage('profile');
        setTimeout(() => document.querySelector('#alpha33GuidanceSettings')?.scrollIntoView({ block:'center', behavior:'smooth' }), 40);
      });
      return;
    }

    const primary = prefs.focus_areas[0];
    const card = document.createElement('section');
    card.id = 'alpha33PriorityStrip';
    card.className = 'card alpha33-priority-strip';
    card.innerHTML = `
      <div class="alpha33-priority-copy">
        <span class="eyebrow">TUNED TO WHAT MATTERS</span>
        <div class="alpha33-priority-chips">${priorityMarkup(prefs)}</div>
        <p>${esc(stylePrompt(prefs.guidance_style, primary))}</p>
      </div>
      <button type="button" class="ghost-btn" data-alpha33-open-profile>Adjust</button>`;
    const rhythm = page.querySelector('#dailyRhythmCard');
    (rhythm || page.querySelector('.hero-card'))?.after(card);
    card.querySelector('[data-alpha33-open-profile]')?.addEventListener('click', () => setPage('profile'));
  }

  function lensKey(article) {
    if (article.classList.contains('work')) return 'work';
    if (article.classList.contains('relationships')) return 'relationships';
    if (article.classList.contains('money')) return 'money';
    if (article.classList.contains('wellbeing')) return 'wellbeing';
    if (article.classList.contains('reflection')) return 'growth';
    return 'other';
  }

  function enhanceInsights() {
    const page = document.querySelector('#page-insights');
    const grid = page?.querySelector('.personal-lens-grid');
    if (!page || !grid || page.querySelector('#alpha33InsightTuning')) return;
    const prefs = currentPreferences();

    if (prefs.focus_areas.length) {
      const order = new Map(prefs.focus_areas.map((id, index) => [id, index]));
      [...grid.querySelectorAll('.personal-lens')]
        .sort((a, b) => (order.get(lensKey(a)) ?? 50) - (order.get(lensKey(b)) ?? 50))
        .forEach(article => {
          const key = lensKey(article);
          const index = prefs.focus_areas.indexOf(key);
          article.classList.toggle('alpha33-priority-lens', index >= 0);
          if (index >= 0) article.dataset.priority = String(index + 1);
          grid.appendChild(article);
        });
    }

    const tuning = document.createElement('section');
    tuning.id = 'alpha33InsightTuning';
    tuning.className = 'alpha33-insight-tuning';
    tuning.innerHTML = prefs.focus_areas.length
      ? `<span class="eyebrow">YOUR GUIDANCE SETTINGS</span><div class="alpha33-priority-chips">${priorityMarkup(prefs)}</div><p>${esc(stylePrompt(prefs.guidance_style, prefs.focus_areas[0]))}</p><button type="button" class="ghost-btn" data-alpha33-open-profile>Adjust priorities</button>`
      : `<span class="eyebrow">YOUR GUIDANCE SETTINGS</span><p>Choose what matters most and Cosmic can prioritize the relevant lenses without inferring anything from your private writing.</p><button type="button" class="ghost-btn" data-alpha33-open-profile>Choose priorities</button>`;
    grid.before(tuning);
    tuning.querySelector('[data-alpha33-open-profile]')?.addEventListener('click', () => setPage('profile'));
  }

  function guidanceSettingsSection() {
    const prefs = currentPreferences();
    const section = document.createElement('div');
    section.id = 'alpha33GuidanceSettings';
    section.className = 'settings-section alpha33-guidance-settings';
    section.innerHTML = `
      <div class="settings-heading">
        <div><span class="eyebrow">PERSONAL GUIDANCE</span><h3>Tell Cosmic what deserves more attention.</h3></div>
        <span class="settings-badge">${state.mode === 'live' ? 'Private account setting' : 'This device'}</span>
      </div>
      <p class="settings-copy">Choose up to three priorities. Cosmic uses only these explicit settings to reorder and frame guidance; it does not inspect Journal text to infer them.</p>
      <fieldset class="alpha33-fieldset">
        <legend>What matters most right now?</legend>
        <div class="alpha33-focus-grid">
          ${FOCUS.map(item => `
            <button type="button" class="alpha33-focus-option ${prefs.focus_areas.includes(item.id) ? 'selected' : ''}" data-alpha33-focus="${item.id}" aria-pressed="${prefs.focus_areas.includes(item.id)}">
              <span class="alpha33-focus-icon" aria-hidden="true">${item.icon}</span>
              <span><strong>${esc(item.label)}</strong><small>${esc(item.copy)}</small></span>
              <i>${prefs.focus_areas.includes(item.id) ? '✓' : ''}</i>
            </button>`).join('')}
        </div>
        <small class="subtle-help">${prefs.focus_areas.length}/3 selected · leave all unselected for neutral guidance.</small>
      </fieldset>
      <fieldset class="alpha33-fieldset">
        <legend>How should guidance feel?</legend>
        <div class="alpha33-style-grid">
          ${STYLES.map(item => `
            <button type="button" class="alpha33-style-option ${prefs.guidance_style === item.id ? 'selected' : ''}" data-alpha33-style="${item.id}" aria-pressed="${prefs.guidance_style === item.id}">
              <strong>${esc(item.label)}</strong><small>${esc(item.copy)}</small>
            </button>`).join('')}
        </div>
      </fieldset>`;
    return section;
  }

  function enhanceProfile() {
    const page = document.querySelector('#page-profile');
    const card = page?.querySelector('.settings-card');
    if (!page || !card || page.querySelector('#alpha33GuidanceSettings')) return;
    const section = guidanceSettingsSection();
    const rhythm = card.querySelector('#alpha32RhythmSettings');
    if (rhythm) rhythm.after(section);
    else card.appendChild(section);

    section.querySelectorAll('[data-alpha33-focus]').forEach(button => {
      button.addEventListener('click', () => void setFocus(button.dataset.alpha33Focus));
    });
    section.querySelectorAll('[data-alpha33-style]').forEach(button => {
      button.addEventListener('click', () => void setGuidanceStyle(button.dataset.alpha33Style));
    });
  }

  renderHome = function alpha33Home() {
    originalRenderHome();
    enhanceHome();
  };

  renderInsights = function alpha33Insights() {
    originalRenderInsights();
    enhanceInsights();
  };

  renderProfile = function alpha33Profile() {
    originalRenderProfile();
    enhanceProfile();
  };

  window.CosmicExperience33 = Object.freeze({
    currentPreferences,
    cleanFocus,
    cleanStyle,
    stylePrompt,
    setFocus,
    setGuidanceStyle
  });
})();