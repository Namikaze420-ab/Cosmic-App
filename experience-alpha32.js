(() => {
  const originalRenderHome = renderHome;
  const originalRenderProfile = renderProfile;
  const VERSION = 'alpha32';
  const STEP_NAMES = ['guidance', 'plan', 'journal'];

  function activationKey() {
    const identity = state.user?.id || (state.mode === 'demo' ? 'demo' : 'browser');
    return `cosmic.activation.${VERSION}:${identity}`;
  }

  function readActivation() {
    const fallback = { steps:{ guidance:false, plan:false, journal:false }, complete:false, dismissed:false };
    try {
      const parsed = JSON.parse(localStorage.getItem(activationKey()) || 'null');
      if (!parsed || typeof parsed !== 'object') return fallback;
      const steps = Object.fromEntries(STEP_NAMES.map(name => [name, Boolean(parsed.steps?.[name])]));
      return {
        steps,
        complete: STEP_NAMES.every(name => steps[name]),
        dismissed: Boolean(parsed.dismissed)
      };
    } catch {
      return fallback;
    }
  }

  function saveActivation(next) {
    try { localStorage.setItem(activationKey(), JSON.stringify(next)); } catch {}
    return next;
  }

  function markActivationStep(step) {
    const current = readActivation();
    if (!STEP_NAMES.includes(step)) return current;
    current.steps[step] = true;
    current.complete = STEP_NAMES.every(name => current.steps[name]);
    current.dismissed = false;
    saveActivation(current);
    return current;
  }

  function dismissActivation() {
    const current = readActivation();
    current.dismissed = true;
    saveActivation(current);
    renderHome();
  }

  function resetActivation() {
    try { localStorage.removeItem(activationKey()); } catch {}
    if (state.page === 'profile') renderProfile();
    toast('First-session guide reset on this device');
  }

  function todayTasks() {
    const today = isoDate();
    return (state.tasks || [])
      .filter(task => {
        try { return isoDate(new Date(task.starts_at)) === today; } catch { return false; }
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  function rhythmPhase(now = new Date()) {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'midday';
    if (hour >= 18) return 'evening';
    return 'late';
  }

  function planState(tasks, now = new Date()) {
    const completed = tasks.filter(task => task.status === 'completed');
    const planned = tasks.filter(task => task.status !== 'completed');
    const upcoming = planned.find(task => new Date(task.starts_at) >= now);
    const open = planned.find(task => new Date(task.starts_at) < now) || planned[0];
    return { completed, planned, upcoming, open };
  }

  function rhythmCopy(phase, i, tasks) {
    const g = window.CosmicExperience31?.guidanceFor?.(i.personalDay) || {};
    const plan = planState(tasks);
    const nextLine = tasks.length === 0
      ? 'No plans yet — one anchor is enough.'
      : plan.upcoming
        ? `Next · ${fmtTime(plan.upcoming.starts_at)} · ${plan.upcoming.title}`
        : plan.open
          ? `Open loop · ${plan.open.title}`
          : `${plan.completed.length}/${tasks.length} plans complete · your planned work is clear.`;

    if (phase === 'morning') return {
      label:'MORNING SETUP',
      title:'Choose one anchor before the day fills up.',
      copy:`${g.focus || i.tip} ${nextLine}`,
      primary:['plan','Plan one anchor'],
      secondary:['guidance','Open guidance']
    };
    if (phase === 'midday') return {
      label:'MIDDAY RESET',
      title:'Keep what matters. Re-plan the rest without guilt.',
      copy:`${nextLine} ${g.watch ? `Watch for ${g.watch.toLowerCase()}.` : ''}`,
      primary:['today','Review today'],
      secondary:['guidance','Check guidance']
    };
    if (phase === 'evening') return {
      label:'EVENING REFLECTION',
      title:'Close the day deliberately instead of carrying it forward.',
      copy:`${plan.completed.length}/${tasks.length} planned items complete. ${g.prompt || 'What deserves your attention tomorrow?'}`,
      primary:['journal','Reflect in Journal'],
      secondary:['tomorrow','Plan tomorrow']
    };
    return {
      label:'LATE-DAY RESET',
      title:'Protect tomorrow by lowering the pressure now.',
      copy:`${g.wellbeing || 'Choose rest and a lighter pace.'} ${nextLine}`,
      primary:['journal','Clear your mind'],
      secondary:['tomorrow','Set tomorrow up']
    };
  }

  function activationCard(i) {
    const progress = readActivation();
    if (progress.complete || progress.dismissed) return null;
    const done = STEP_NAMES.filter(name => progress.steps[name]).length;
    const card = document.createElement('section');
    card.id = 'alpha32Activation';
    card.className = 'card alpha32-activation';
    card.setAttribute('aria-labelledby', 'alpha32ActivationTitle');
    card.innerHTML = `
      <div class="alpha32-activation-head">
        <div>
          <span class="eyebrow">FIRST 5 MINUTES · ${done}/3</span>
          <h2 id="alpha32ActivationTitle">Make Cosmic useful today, not someday.</h2>
          <p>Start with one read, one plan and one reflection. You can explore everything else later.</p>
        </div>
        <button type="button" class="alpha32-dismiss" data-alpha32-dismiss aria-label="Dismiss first-session guide">×</button>
      </div>
      <div class="alpha32-progress" aria-label="First-session progress"><i style="width:${(done / 3) * 100}%"></i></div>
      <div class="alpha32-steps">
        ${[
          ['guidance','✦','Read your daily guidance','See what Personal Day '+i.personalDay+' suggests for pace and focus.'],
          ['plan','＋','Plan one anchor','Give one important outcome a real place in your day.'],
          ['journal','✎','Choose a reflection prompt','Use the Journal only when reflection would genuinely help.']
        ].map(([step, icon, title, copy]) => `
          <button type="button" class="alpha32-step ${progress.steps[step] ? 'done' : ''}" data-alpha32-activation="${step}">
            <span class="alpha32-step-icon" aria-hidden="true">${progress.steps[step] ? '✓' : icon}</span>
            <span><strong>${esc(title)}</strong><small>${esc(copy)}</small></span>
            <span class="alpha32-step-state">${progress.steps[step] ? 'Done' : 'Start'} →</span>
          </button>`).join('')}
      </div>`;
    return card;
  }

  function dailyRhythmCard(i) {
    const tasks = todayTasks();
    const phase = rhythmPhase();
    const copy = rhythmCopy(phase, i, tasks);
    const card = document.createElement('section');
    card.id = 'dailyRhythmCard';
    card.className = `card daily-rhythm-card phase-${phase}`;
    card.dataset.rhythmPhase = phase;
    card.innerHTML = `
      <div class="daily-rhythm-copy">
        <span class="eyebrow">${copy.label}</span>
        <h3>${esc(copy.title)}</h3>
        <p>${esc(copy.copy)}</p>
      </div>
      <div class="daily-rhythm-actions">
        <button type="button" class="primary-btn" data-alpha32-rhythm="${copy.primary[0]}">${esc(copy.primary[1])}</button>
        <button type="button" class="ghost-btn" data-alpha32-rhythm="${copy.secondary[0]}">${esc(copy.secondary[1])}</button>
      </div>`;
    return card;
  }

  function handleRhythmAction(action) {
    if (action === 'plan') {
      openModal();
      return;
    }
    if (action === 'guidance') {
      setPage('insights');
      return;
    }
    if (action === 'journal') {
      setPage('diary');
      return;
    }
    if (action === 'today') {
      state.selectedDate = new Date();
      setPage('calendar');
      return;
    }
    if (action === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      state.selectedDate = tomorrow;
      state.calendarCursor = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
      setPage('calendar');
    }
  }

  function bindHomeExperience(page) {
    page.querySelector('[data-alpha32-dismiss]')?.addEventListener('click', dismissActivation);
    page.querySelectorAll('[data-alpha32-activation]').forEach(button => {
      button.addEventListener('click', () => {
        const step = button.dataset.alpha32Activation;
        markActivationStep(step);
        if (step === 'guidance') setPage('insights');
        if (step === 'journal') setPage('diary');
        if (step === 'plan') {
          renderHome();
          openModal();
        }
      });
    });
    page.querySelectorAll('[data-alpha32-rhythm]').forEach(button => {
      button.addEventListener('click', () => handleRhythmAction(button.dataset.alpha32Rhythm));
    });
  }

  function enhanceHome() {
    const page = document.querySelector('#page-home');
    const i = insight();
    if (!page || !i) return;
    const grid = page.querySelector('.home-grid');
    if (!grid) return;

    const activation = activationCard(i);
    if (activation) grid.prepend(activation);

    const rhythm = dailyRhythmCard(i);
    const hero = page.querySelector('.hero-card');
    if (hero) hero.after(rhythm);
    else grid.prepend(rhythm);

    bindHomeExperience(page);
  }

  function enhanceProfile() {
    const page = document.querySelector('#page-profile');
    if (!page || page.querySelector('#alpha32RhythmSettings')) return;
    const card = page.querySelector('.settings-card');
    if (!card) return;

    const progress = readActivation();
    const done = STEP_NAMES.filter(name => progress.steps[name]).length;
    const section = document.createElement('div');
    section.className = 'settings-section alpha32-rhythm-settings';
    section.id = 'alpha32RhythmSettings';
    section.innerHTML = `
      <div class="settings-heading">
        <div><span class="eyebrow">DAILY RHYTHM</span><h3>Keep the experience intentional.</h3></div>
        <span class="settings-badge">This device</span>
      </div>
      <p class="settings-copy">Cosmic changes its Today prompt across morning, midday and evening. The first-session guide is optional and stored only on this device.</p>
      <div class="status-row alpha32-status-row"><span>First-session guide</span><b>${progress.complete ? 'Completed' : progress.dismissed ? 'Dismissed' : `${done}/3 explored`}</b></div>
      <button type="button" class="ghost-btn" id="alpha32ResetGuide">Show first-session guide again</button>`;

    const appearance = card.querySelector('#experienceAppearance');
    if (appearance) appearance.after(section);
    else card.appendChild(section);
    section.querySelector('#alpha32ResetGuide')?.addEventListener('click', resetActivation);
  }

  renderHome = function alpha32Home() {
    originalRenderHome();
    enhanceHome();
  };

  renderProfile = function alpha32Profile() {
    originalRenderProfile();
    enhanceProfile();
  };

  window.CosmicExperience32 = Object.freeze({
    readActivation,
    markActivationStep,
    resetActivation,
    rhythmPhase,
    rhythmCopy
  });
})();
