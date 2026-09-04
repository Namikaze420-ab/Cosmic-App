(() => {
  const originalRenderHome = renderHome;
  const originalRenderCalendar = renderCalendar;
  const originalRenderDiary = renderDiary;
  const originalRenderInsights = renderInsights;
  const originalRenderProfile = renderProfile;
  const originalSetPage = setPage;
  const originalSyncChrome = syncChrome;

  const DAY_GUIDANCE = Object.freeze({
    1:{title:'Initiate with intent',focus:'Choose one meaningful start and give it enough space to become real.',work:'Lead the first move. Start the proposal, draft, conversation or task you have been postponing.',relationships:'Be direct without becoming one-sided. Ask what the other person needs before deciding for both of you.',money:'Favor planning and decisive housekeeping over impulsive spending. Define the next practical money step.',wellbeing:'Use movement to create momentum, then protect a short period of quiet so drive does not become restlessness.',watch:'Trying to prove independence by doing everything alone.',prompt:'What is worth beginning now, even if I cannot finish it today?'},
    2:{title:'Work with the room',focus:'Progress comes through timing, listening and cooperation more than force.',work:'Prioritize coordination, review, follow-up and work that benefits from another person’s perspective.',relationships:'Slow the pace enough to notice tone, reciprocity and what is not being said.',money:'Compare options carefully and avoid making a choice just to end uncertainty.',wellbeing:'Choose gentler routines, hydration, sleep and lower-friction habits over intensity.',watch:'Absorbing everyone else’s mood and losing your own priorities.',prompt:'Where would patience or collaboration improve the outcome?'},
    3:{title:'Express what matters',focus:'Use communication, creativity and visible progress to move the day forward.',work:'Present, write, brainstorm, explain or share. Work improves when ideas leave your head and become tangible.',relationships:'Connection benefits from warmth, humor and honest expression rather than over-analysis.',money:'Keep purchases intentional; novelty can feel more persuasive than value today.',wellbeing:'Choose energizing social or creative activity, but leave an off-ramp before overstimulation sets in.',watch:'Scattering attention across too many exciting possibilities.',prompt:'What do I want to say, make or share more clearly?'},
    4:{title:'Build the foundation',focus:'Structure, consistency and practical completion matter more than speed.',work:'Finish the unglamorous but important work: systems, admin, documentation, maintenance and follow-through.',relationships:'Reliability speaks louder than dramatic gestures. Keep promises and clarify expectations.',money:'Good day for budgets, bills, subscriptions, savings rules and checking the numbers.',wellbeing:'Routines work in your favor. Keep food, movement and sleep simple and repeatable.',watch:'Turning useful structure into rigidity or perfectionism.',prompt:'What small system would make the next month easier?'},
    5:{title:'Create useful movement',focus:'Stay flexible enough to notice a better route without abandoning the objective.',work:'Experiment, test, make calls, explore alternatives and handle work that benefits from adaptability.',relationships:'Give people room. Curiosity will work better than assumptions or control.',money:'Watch impulse spending and “limited-time” pressure. Flexibility is useful; financial urgency is not.',wellbeing:'Movement, fresh air and a change of environment can reset attention.',watch:'Confusing stimulation with genuine progress.',prompt:'Where do I need more freedom, and where do I simply need more discipline?'},
    6:{title:'Care without over-carrying',focus:'Relationships, responsibility and the quality of your environment deserve attention.',work:'Support the team, improve the environment and close tasks that affect other people’s experience.',relationships:'Show care in a concrete way, while keeping boundaries around what belongs to you.',money:'Prioritize household, family and long-term quality-of-life decisions; avoid spending to relieve guilt.',wellbeing:'Home, nourishment and recovery matter. Make your environment easier to live in.',watch:'Taking responsibility for problems that other people need to own.',prompt:'What can I care for today without carrying more than is mine?'},
    7:{title:'Protect depth',focus:'Reflection, research and discernment are more useful than rushing toward visible output.',work:'Audit, investigate, learn, debug, review or solve the part that requires uninterrupted thinking.',relationships:'Choose quality over quantity. A thoughtful conversation is better than constant availability.',money:'Research before acting. Delay decisions that depend on facts you have not verified.',wellbeing:'Reduce noise, protect sleep and give your mind an intentional period without input.',watch:'Withdrawing so far that reflection turns into avoidance.',prompt:'What becomes clearer when I stop trying to answer it immediately?'},
    8:{title:'Direct your resources',focus:'Execution, priorities and measurable progress are emphasized today.',work:'Handle the high-leverage task, make the decision, negotiate clearly and track the result.',relationships:'Be mindful of power dynamics. Strength works best when it includes respect and listening.',money:'Review cash flow, commitments and priorities. Favor disciplined resource management over status spending.',wellbeing:'Ambition needs recovery to stay useful. Schedule the stop time as deliberately as the start time.',watch:'Equating productivity, money or control with personal worth.',prompt:'Where would stronger stewardship create a better result than simply pushing harder?'},
    9:{title:'Close the loop',focus:'Completion, release and perspective can create more value than adding something new.',work:'Finish, archive, hand off, clear backlog and decide what no longer deserves attention.',relationships:'Make room for forgiveness, perspective and clean endings where appropriate.',money:'Cancel waste, close unused commitments and simplify before taking on another obligation.',wellbeing:'Recovery improves when mental clutter is reduced. Clear one physical or digital space.',watch:'Holding onto a finished chapter because the next one is not fully visible yet.',prompt:'What am I ready to complete, release or forgive?'},
    11:{title:'Translate intuition into action',focus:'Pay attention to subtle signals, then ground them in evidence and one practical next step.',work:'Use vision for ideation, strategy and pattern recognition, but verify assumptions before committing resources.',relationships:'Sensitivity is high; ask rather than infer. Name what you feel without declaring it as fact.',money:'Do not treat a strong feeling as financial evidence. Write the idea down and validate it later.',wellbeing:'Reduce sensory overload and create quiet space for integration.',watch:'Mistaking intensity or intuition for certainty.',prompt:'What am I sensing, and what evidence would help me understand it better?'},
    22:{title:'Turn the big idea into a system',focus:'Long-range thinking works best when converted into concrete structure and ownership.',work:'Break the ambitious goal into milestones, dependencies, resources and the next executable block.',relationships:'Let people know where they fit in the larger plan instead of expecting them to infer it.',money:'Think in terms of sustainability, reserves and long-term tradeoffs rather than short-term appearance.',wellbeing:'A big vision still depends on ordinary routines. Protect the basics that keep execution sustainable.',watch:'Creating a plan so large that starting feels impossible.',prompt:'What is the smallest structure that would make the larger vision more achievable?'},
    33:{title:'Lead with care and boundaries',focus:'Service, teaching and emotional responsibility are highlighted, but self-erasure is not required.',work:'Mentor, clarify, improve the human side of a process and make your expertise useful to someone else.',relationships:'Offer warmth without rescuing. Care is strongest when both people retain agency.',money:'Generosity should fit inside real limits. Avoid using money to solve emotional discomfort.',wellbeing:'Choose restorative care that you can actually maintain, not an ideal routine you cannot sustain.',watch:'Giving until resentment becomes the only boundary left.',prompt:'How can I be useful today without abandoning my own limits?'}
  });

  const PAGE_META = Object.freeze({
    home:['YOUR DAY, YOUR RHYTHM','Today'],
    calendar:['PLAN WITH CONTEXT','Plan'],
    diary:['PRIVATE REFLECTION','Journal'],
    insights:['PERSONAL GUIDANCE','Insights'],
    profile:['YOUR SPACE','You']
  });

  const NAV_LABELS = Object.freeze({
    home:['Today','⌂'],
    calendar:['Plan','▦'],
    diary:['Journal','✎'],
    insights:['Insights','✦'],
    profile:['You','●']
  });

  const APPEARANCES = ['system','light','dark'];
  const PALETTES = ['cosmic','tide','solar'];

  function safeGet(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function guidanceFor(number) {
    return DAY_GUIDANCE[number] || DAY_GUIDANCE[4];
  }

  function scoreBand(score) {
    const helper = window.CosmicInsightMeanings?.scoreBand?.(score);
    if (helper) return helper;
    if (score >= 80) return { label:'Favorable' };
    if (score >= 60) return { label:'Supportive' };
    if (score >= 40) return { label:'Neutral / mixed' };
    if (score >= 20) return { label:'Caution' };
    return { label:'Rest / review' };
  }

  function firstName() {
    const name = String(state.profile?.display_name || 'You').trim();
    return name.split(/\s+/)[0] || 'You';
  }

  function resolvedTheme() {
    const choice = safeGet('cosmic.appearance', 'system');
    if (choice === 'light' || choice === 'dark') return choice;
    return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyAppearance() {
    const appearance = APPEARANCES.includes(safeGet('cosmic.appearance', 'system')) ? safeGet('cosmic.appearance', 'system') : 'system';
    const palette = PALETTES.includes(safeGet('cosmic.palette', 'cosmic')) ? safeGet('cosmic.palette', 'cosmic') : 'cosmic';
    const theme = appearance === 'system' ? resolvedTheme() : appearance;
    const root = document.documentElement;
    root.dataset.appearance = appearance;
    root.dataset.theme = theme;
    root.dataset.palette = palette;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0f1117' : '#f6f5f1';
  }

  function currentAstroSummary() {
    if (state.astrology?.status !== 'ready') return '';
    const { planets = {}, ascendant } = state.astrology.data || {};
    const pieces = [];
    if (planets.Sun?.sign) pieces.push(`Sun ${planets.Sun.sign}`);
    if (planets.Moon?.sign) pieces.push(`Moon ${planets.Moon.sign}`);
    if (ascendant?.sign) pieces.push(`Rising ${ascendant.sign}`);
    return pieces.join(' · ');
  }

  function personalRead(i) {
    const g = guidanceFor(i.personalDay);
    const band = scoreBand(i.score);
    const natal = i.zodiac?.natal;
    const current = i.zodiac?.current;
    const zodiacTone = i.zodiacScore >= 85
      ? 'Your Chinese Zodiac layer is strongly resonant this year.'
      : i.zodiacScore >= 70
        ? 'Your Chinese Zodiac layer is broadly supportive this year.'
        : i.zodiacScore >= 55
          ? 'Your Chinese Zodiac layer is mixed, so adaptability matters more than perfect timing.'
          : 'Your Chinese Zodiac layer is more contrasting, which favors patience and flexibility.';
    const tempo = i.score >= 80
      ? 'Use the momentum, but keep the day intentional rather than packed.'
      : i.score >= 60
        ? 'Move the essentials forward while leaving enough margin to adapt.'
        : i.score >= 40
          ? 'Keep the plan realistic and let clarity matter more than volume.'
          : 'Lower the pressure, protect margin and favor review over force.';
    const focus = (themes[i.personalDay] || ['Personal','Wellness']).slice(0,2);
    return {
      guidance:g,
      band,
      tempo,
      zodiacTone,
      focus,
      headline:`${firstName()}, today favors ${g.title.toLowerCase()}.`,
      natal:natal ? `${natal.element} ${natal.animal}` : '',
      current:current ? `${current.element} ${current.animal}` : '',
      astro:currentAstroSummary()
    };
  }

  function focusChip(label, value, icon='✦') {
    return `<span class="personal-chip"><i aria-hidden="true">${icon}</i><span><small>${esc(label)}</small><b>${esc(value)}</b></span></span>`;
  }

  function enhanceHome() {
    const i = insight();
    const page = document.querySelector('#page-home');
    if (!i || !page) return;
    page.classList.add('experience-modern');
    const read = personalRead(i);

    const hero = page.querySelector('.hero-card');
    if (hero) {
      hero.style.setProperty('--score', i.score);
      hero.innerHTML = `
        <div class="hero-copy">
          <span class="eyebrow">Personal Day ${i.personalDay} · ${esc(read.band.label)}</span>
          <h2>${esc(read.headline)}</h2>
          <p>${esc(read.guidance.focus)} ${esc(read.tempo)}</p>
          <div class="personal-chip-row">
            ${focusChip('Best window', i.windows?.[0] || 'Flexible', '◷')}
            ${focusChip('Focus', read.focus.join(' + '), '◎')}
            ${read.natal ? focusChip('Natal year', read.natal, '◇') : ''}
          </div>
        </div>
        <div class="score-cluster">
          <div class="score-ring"><div><strong>${i.score}</strong><span>alignment</span></div></div>
          <small>Reflective signal, not probability</small>
        </div>`;
    }

    const insightCard = page.querySelector('.insight-card');
    if (insightCard) {
      insightCard.classList.add('personal-focus-card');
      insightCard.innerHTML = `
        <span class="eyebrow">FOR YOU TODAY</span>
        <h3 style="margin-top:7px">${esc(read.guidance.title)}</h3>
        <p class="module-copy">${esc(read.guidance.work)}</p>
        <div class="micro-advice"><b>Watch for</b><span>${esc(read.guidance.watch)}</span></div>
        <button class="ghost-btn" data-page="insights" style="margin-top:15px">Open your full guidance →</button>`;
    }

    const reflection = page.querySelector('.reflection-card');
    if (reflection) {
      const completed = state.tasks.filter(task => {
        try { return isoDate(new Date(task.starts_at)) === isoDate() && task.status === 'completed'; } catch { return false; }
      }).length;
      const todayCount = state.tasks.filter(task => {
        try { return isoDate(new Date(task.starts_at)) === isoDate(); } catch { return false; }
      }).length;
      reflection.classList.add('personal-reflection-card');
      reflection.innerHTML = `
        <div class="card-head">
          <div><span class="eyebrow">EVENING CHECK-IN</span><h3>${completed}/${todayCount} plans complete</h3></div>
          <span class="cloud-state">${state.mode === 'demo' ? 'Local demo' : 'Cloud synced'}</span>
        </div>
        <p class="module-copy">${esc(read.guidance.prompt)}</p>
        <button class="ghost-btn" data-page="diary">Reflect in Journal →</button>`;
    }

    const toolbar = page.querySelector('.planner-home-toolbar .eyebrow');
    if (toolbar) toolbar.textContent = state.plannerView === 'week' ? 'WEEKLY RHYTHM' : 'TODAY · PLAN WITH INTENT';
  }

  function enhanceCalendar() {
    const page = document.querySelector('#page-calendar');
    if (!page) return;
    page.classList.add('experience-modern');
    const selected = state.selectedDate || new Date();
    const i = insight(selected);
    if (!i) return;
    const read = personalRead(i);
    const prompt = page.querySelector('.side-panel .journal-prompt');
    if (prompt) {
      prompt.innerHTML = `
        <span class="context-kicker">Personal Day ${i.personalDay} · ${esc(read.guidance.title)}</span>
        <strong>${esc(read.guidance.focus)}</strong>
        <small>${esc(read.tempo)}</small>
        <div class="context-window">◷ ${esc(i.windows?.join(' · ') || 'Flexible timing')}</div>`;
    }
    const side = page.querySelector('.side-panel');
    if (side && !side.querySelector('.selected-day-label')) {
      side.querySelector('.day-score')?.insertAdjacentHTML('beforebegin', `<span class="selected-day-label">${esc(scoreBand(i.score).label)}</span>`);
    }
  }

  function journalPrompts(i) {
    const g = guidanceFor(i.personalDay);
    return [
      g.prompt,
      `Where did ${g.title.toLowerCase()} show up in my choices today?`,
      'What would make tomorrow feel clearer, lighter or more intentional?'
    ];
  }

  function insertJournalPrompt(prompt) {
    const editor = document.querySelector('#diaryEditor');
    if (!editor) return;
    const current = editor.value.trimEnd();
    editor.value = `${current}${current ? '\n\n' : ''}${prompt}\n`;
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
  }

  function enhanceDiary() {
    const page = document.querySelector('#page-diary');
    const i = insight();
    if (!page || !i) return;
    page.classList.add('experience-modern');
    const read = personalRead(i);
    const editorCard = page.querySelector('.editor-card');
    const prompt = editorCard?.querySelector('.journal-prompt');
    if (prompt) {
      prompt.classList.add('personal-journal-lead');
      prompt.innerHTML = `<span>Personal Day ${i.personalDay}</span><strong>${esc(read.guidance.prompt)}</strong><small>${esc(read.guidance.title)} · use this only if it helps you reflect.</small>`;
      const row = document.createElement('div');
      row.className = 'guided-prompt-row';
      row.setAttribute('aria-label', 'Guided reflection prompts');
      row.innerHTML = journalPrompts(i).map((text, index) => `<button type="button" class="prompt-chip" data-journal-prompt="${index}">${index === 0 ? 'Today’s prompt' : index === 1 ? 'Pattern check' : 'Tomorrow'}</button>`).join('');
      prompt.after(row);
      row.querySelectorAll('[data-journal-prompt]').forEach(button => {
        button.addEventListener('click', () => insertJournalPrompt(journalPrompts(i)[Number(button.dataset.journalPrompt)]));
      });
    }
  }

  function lensCard(kind, icon, copy, tone='') {
    return `<article class="personal-lens ${tone}"><div class="lens-icon" aria-hidden="true">${icon}</div><span>${esc(kind)}</span><p>${esc(copy)}</p></article>`;
  }

  function enhanceInsights() {
    const page = document.querySelector('#page-insights');
    const i = insight();
    if (!page || !i) return;
    page.classList.add('experience-modern');
    const read = personalRead(i);
    const foundations = page.querySelector('.insights-grid');

    const hero = document.createElement('section');
    hero.className = 'card personal-insight-hero';
    hero.style.setProperty('--score', i.score);
    hero.innerHTML = `
      <div>
        <span class="eyebrow">YOUR DAILY READ · ${esc(scoreBand(i.score).label.toUpperCase())}</span>
        <h2>${esc(read.headline)}</h2>
        <p>${esc(read.guidance.focus)} ${esc(read.zodiacTone)}</p>
        <div class="personal-chip-row">
          ${focusChip('Best window', i.windows?.[0] || 'Flexible', '◷')}
          ${focusChip('Focus', read.focus.join(' + '), '◎')}
          ${read.astro ? focusChip('Natal layer', read.astro, '☾') : focusChip('Personal year', String(i.personalYear), '◌')}
        </div>
      </div>
      <div class="insight-score">
        <strong>${i.score}</strong><span>/100</span><small>${esc(read.band.label)}</small>
      </div>`;
    page.prepend(hero);

    const lenses = document.createElement('section');
    lenses.className = 'personal-lens-grid';
    lenses.setAttribute('aria-label', 'Personal guidance for today');
    lenses.innerHTML = [
      lensCard('Work','↗',read.guidance.work,'work'),
      lensCard('Relationships','♡',read.guidance.relationships,'relationships'),
      lensCard('Money','◈',read.guidance.money,'money'),
      lensCard('Wellbeing','◌',read.guidance.wellbeing,'wellbeing'),
      lensCard('Watch for','!',read.guidance.watch,'watch'),
      lensCard('Reflection','✎',read.guidance.prompt,'reflection')
    ].join('');
    hero.after(lenses);

    if (foundations) {
      const header = document.createElement('div');
      header.className = 'insights-section-header';
      header.innerHTML = `<div><span class="eyebrow">YOUR FOUNDATIONS</span><h2>Understand the layers behind your guidance.</h2><p>Explore the meaning of your Numerology, Chinese Zodiac and natal placements when you want more context.</p></div>`;
      foundations.before(header);
    }

    const meaningGuide = page.querySelector('#insightMeaningGuide');
    if (meaningGuide) {
      const heading = meaningGuide.querySelector('h2');
      if (heading) heading.textContent = 'Use the score as a pacing signal.';
    }
  }

  function choiceButton(group, value, label, active) {
    return `<button type="button" class="theme-choice ${active ? 'selected' : ''}" data-${group}-choice="${value}" aria-pressed="${active ? 'true' : 'false'}">${label}</button>`;
  }

  function paletteButton(value, label, active) {
    return `<button type="button" class="palette-choice ${active ? 'selected' : ''}" data-palette-choice="${value}" aria-pressed="${active ? 'true' : 'false'}"><i class="palette-dot ${value}" aria-hidden="true"></i><span>${label}</span></button>`;
  }

  function enhanceProfile() {
    const page = document.querySelector('#page-profile');
    if (!page) return;
    page.classList.add('experience-modern');
    const card = page.querySelector('.settings-card');
    if (!card || card.querySelector('#experienceAppearance')) return;

    const appearance = safeGet('cosmic.appearance', 'system');
    const palette = safeGet('cosmic.palette', 'cosmic');
    const section = document.createElement('div');
    section.className = 'settings-section experience-settings';
    section.id = 'experienceAppearance';
    section.innerHTML = `
      <div class="settings-heading"><div><span class="eyebrow">APPEARANCE</span><h3>Make Cosmic feel like yours.</h3></div><span class="settings-badge">This device</span></div>
      <p class="settings-copy">System mode follows your device automatically. Accent themes change emphasis without turning the interface into a wall of color.</p>
      <div class="theme-control">
        <span>Appearance</span>
        <div class="theme-choice-row" role="group" aria-label="Appearance">
          ${choiceButton('appearance','system','System',appearance === 'system')}
          ${choiceButton('appearance','light','Light',appearance === 'light')}
          ${choiceButton('appearance','dark','Dark',appearance === 'dark')}
        </div>
      </div>
      <div class="theme-control">
        <span>Accent</span>
        <div class="palette-choice-row" role="group" aria-label="Accent theme">
          ${paletteButton('cosmic','Cosmic',palette === 'cosmic')}
          ${paletteButton('tide','Tide',palette === 'tide')}
          ${paletteButton('solar','Solar',palette === 'solar')}
        </div>
      </div>`;

    const firstRoadmap = [...card.querySelectorAll('.settings-section')].find(node => node.textContent.includes('Roadmap preferences'));
    if (firstRoadmap) card.insertBefore(section, firstRoadmap);
    else card.appendChild(section);

    section.querySelectorAll('[data-appearance-choice]').forEach(button => {
      button.addEventListener('click', () => {
        safeSet('cosmic.appearance', button.dataset.appearanceChoice);
        applyAppearance();
        renderProfile();
      });
    });
    section.querySelectorAll('[data-palette-choice]').forEach(button => {
      button.addEventListener('click', () => {
        safeSet('cosmic.palette', button.dataset.paletteChoice);
        applyAppearance();
        renderProfile();
      });
    });
  }

  function applyPageMeta(page) {
    const meta = PAGE_META[page] || PAGE_META.home;
    const eyebrow = document.querySelector('#pageEyebrow');
    const title = document.querySelector('#pageTitle');
    if (eyebrow) eyebrow.textContent = meta[0];
    if (title) title.textContent = meta[1];
  }

  function applyNavLabels() {
    navItems.forEach(item => {
      const replacement = NAV_LABELS[item[0]];
      if (!replacement) return;
      item[1] = replacement[0];
      item[2] = replacement[1];
    });
    document.querySelectorAll('[data-page]').forEach(button => {
      const replacement = NAV_LABELS[button.dataset.page];
      const icon = button.querySelector('.nav-icon');
      const label = icon?.nextElementSibling;
      if (replacement && icon && label) {
        icon.textContent = replacement[1];
        label.textContent = replacement[0];
      }
    });
  }

  function ensureCommandPalette() {
    if (document.querySelector('#commandPalette')) return;
    const overlay = document.createElement('div');
    overlay.id = 'commandPalette';
    overlay.className = 'command-backdrop';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="command-palette" role="dialog" aria-modal="true" aria-labelledby="commandTitle">
        <div class="command-search">
          <span aria-hidden="true">⌕</span>
          <label class="sr-only" for="commandInput" id="commandTitle">Quick actions</label>
          <input id="commandInput" autocomplete="off" placeholder="Search actions…" aria-label="Search quick actions">
          <kbd>Esc</kbd>
        </div>
        <div class="command-list" id="commandList"></div>
        <div class="command-footer"><span>Quick navigation</span><span><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd></span></div>
      </section>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeCommandPalette();
    });
    document.querySelector('#commandInput')?.addEventListener('input', renderCommands);
  }

  const COMMANDS = [
    { label:'Add a plan', hint:'Create a task or event', icon:'＋', action:() => { closeCommandPalette(); openModal(); } },
    { label:'Go to Today', hint:'Daily timeline and focus', icon:'⌂', action:() => { closeCommandPalette(); setPage('home'); } },
    { label:'Open Plan', hint:'Calendar and workload', icon:'▦', action:() => { closeCommandPalette(); setPage('calendar'); } },
    { label:'Open Journal', hint:'Private daily reflection', icon:'✎', action:() => { closeCommandPalette(); setPage('diary'); } },
    { label:'Open Insights', hint:'Personal guidance and meanings', icon:'✦', action:() => { closeCommandPalette(); setPage('insights'); } },
    { label:'Open You', hint:'Profile, privacy and appearance', icon:'●', action:() => { closeCommandPalette(); setPage('profile'); } },
    { label:'Switch appearance', hint:'Cycle system, light and dark', icon:'◐', action:() => {
      const current = safeGet('cosmic.appearance', 'system');
      const next = APPEARANCES[(APPEARANCES.indexOf(current) + 1) % APPEARANCES.length];
      safeSet('cosmic.appearance', next);
      applyAppearance();
      closeCommandPalette();
      toast(`Appearance: ${cap(next)}`);
      if (state.page === 'profile') renderProfile();
    } }
  ];

  function renderCommands() {
    const input = document.querySelector('#commandInput');
    const list = document.querySelector('#commandList');
    if (!input || !list) return;
    const query = input.value.trim().toLowerCase();
    const matches = COMMANDS.filter(command => `${command.label} ${command.hint}`.toLowerCase().includes(query));
    list.innerHTML = matches.length ? matches.map((command, index) => `
      <button type="button" class="command-item" data-command-index="${COMMANDS.indexOf(command)}">
        <span class="command-icon" aria-hidden="true">${command.icon}</span>
        <span><strong>${esc(command.label)}</strong><small>${esc(command.hint)}</small></span>
        <kbd>${index === 0 && !query ? '↵' : ''}</kbd>
      </button>`).join('') : '<div class="command-empty">No matching actions.</div>';
    list.querySelectorAll('[data-command-index]').forEach(button => {
      button.addEventListener('click', () => COMMANDS[Number(button.dataset.commandIndex)]?.action());
    });
  }

  function openCommandPalette() {
    ensureCommandPalette();
    const overlay = document.querySelector('#commandPalette');
    if (!overlay) return;
    overlay.hidden = false;
    const input = document.querySelector('#commandInput');
    input.value = '';
    renderCommands();
    requestAnimationFrame(() => input.focus());
  }

  function closeCommandPalette() {
    const overlay = document.querySelector('#commandPalette');
    if (overlay) overlay.hidden = true;
  }

  function bindModernCommands() {
    const search = document.querySelector('#searchBtn');
    if (search) {
      search.setAttribute('aria-label', 'Open quick actions');
      search.title = 'Quick actions (Ctrl/⌘ K)';
      search.onclick = openCommandPalette;
    }
    document.addEventListener('keydown', event => {
      const commandKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (commandKey) {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (event.key === 'Escape' && !document.querySelector('#commandPalette')?.hidden) {
        event.preventDefault();
        closeCommandPalette();
      }
      if (event.key === 'Enter' && !document.querySelector('#commandPalette')?.hidden && document.activeElement?.id === 'commandInput') {
        const first = document.querySelector('#commandList [data-command-index]');
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
    });
  }

  renderHome = function alpha31Home() {
    originalRenderHome();
    enhanceHome();
  };

  renderCalendar = function alpha31Calendar() {
    originalRenderCalendar();
    enhanceCalendar();
  };

  renderDiary = function alpha31Diary() {
    originalRenderDiary();
    enhanceDiary();
  };

  renderInsights = function alpha31Insights() {
    originalRenderInsights();
    enhanceInsights();
  };

  renderProfile = function alpha31Profile() {
    originalRenderProfile();
    enhanceProfile();
  };

  setPage = function alpha31SetPage(page) {
    originalSetPage(page);
    applyPageMeta(page);
  };

  syncChrome = function alpha31SyncChrome() {
    originalSyncChrome();
    const i = insight();
    const card = document.querySelector('.sidebar-card');
    if (i && card) {
      const read = personalRead(i);
      const eyebrow = card.querySelector('.eyebrow');
      const copy = card.querySelector('p');
      if (eyebrow) eyebrow.textContent = `${read.band.label} today`;
      if (copy) copy.textContent = `${read.guidance.title}. Best window: ${i.windows?.[0] || 'flexible'}.`;
    }
  };

  applyNavLabels();
  applyAppearance();
  ensureCommandPalette();
  bindModernCommands();

  const media = matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', () => {
    if (safeGet('cosmic.appearance', 'system') === 'system') {
      applyAppearance();
      if (state.page === 'profile' && document.querySelector('.app-shell') && !document.querySelector('.app-shell').hidden) renderProfile();
    }
  });

  window.CosmicExperience31 = Object.freeze({
    guidanceFor,
    personalRead,
    applyAppearance,
    openCommandPalette
  });
})();