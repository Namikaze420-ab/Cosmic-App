(() => {
  const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const originalShowOnboarding = showOnboarding;
  const originalEnterApp = enterApp;
  const originalRenderInsights = renderInsights;
  const originalRenderProfile = renderProfile;

  function validTimeZone(zone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  function partsAt(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second'),
    };
  }

  function asEpoch(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  }

  function localBirthToUtc(dateString, timeString, timeZone) {
    if (!dateString || !timeString || !validTimeZone(timeZone)) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const [hour, minute, second = 0] = timeString.split(':').map(Number);
    if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null;

    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    let guess = target;

    // Iterate because the zone offset can depend on the instant (DST/historical rules).
    for (let i = 0; i < 4; i += 1) {
      const rendered = asEpoch(partsAt(new Date(guess), timeZone));
      const correction = target - rendered;
      guess += correction;
      if (Math.abs(correction) < 1000) break;
    }

    return new Date(guess).toISOString();
  }

  function patchLabels() {
    const authLabel = 'COSMIC PLANNER · ALPHA 2 FOUNDATION';
    const authEyebrow = document.querySelector('#authGate .eyebrow');
    if (authEyebrow && authEyebrow.textContent !== authLabel) authEyebrow.textContent = authLabel;
    const topEyebrow = document.querySelector('#pageEyebrow');
    if (topEyebrow?.textContent === 'ALPHA 1') topEyebrow.textContent = 'ALPHA 2 FOUNDATION';
  }

  function enhanceOnboarding() {
    const form = document.querySelector('#onboardForm');
    const birthTime = document.querySelector('#pTime');
    if (!form || !birthTime || document.querySelector('#pBirthTimezone')) return;

    const label = document.createElement('label');
    label.innerHTML = `Birth timezone<input id="pBirthTimezone" maxlength="80" autocomplete="off" placeholder="e.g. Indian/Mauritius">`;
    birthTime.closest('label')?.after(label);

    const input = document.querySelector('#pBirthTimezone');
    input.value = state.profile?.birth_timezone || state.profile?.timezone || browserZone();

    const note = document.createElement('p');
    note.className = 'auth-note wide';
    note.textContent = 'Birth timezone is required to convert your local birth time to UTC for astronomical calculations. Houses and Ascendant remain disabled until birth coordinates are implemented.';
    label.after(note);
  }

  showOnboarding = function alpha2ShowOnboarding() {
    originalShowOnboarding();
    enhanceOnboarding();
    patchLabels();
  };

  saveOnboarding = async function alpha2SaveOnboarding(event) {
    event.preventDefault();
    const birthTimezone = document.querySelector('#pBirthTimezone')?.value.trim() || browserZone();
    if (!validTimeZone(birthTimezone)) {
      document.querySelector('#onboardMsg').textContent = 'Enter a valid IANA timezone, for example Indian/Mauritius, Europe/London or Asia/Singapore.';
      return;
    }

    const row = {
      display_name: document.querySelector('#pName').value.trim(),
      birth_date: document.querySelector('#pDate').value,
      birth_time: document.querySelector('#pTime').value || null,
      birth_place: document.querySelector('#pPlace').value.trim() || null,
      birth_timezone: birthTimezone,
      timezone: browserZone(),
      onboarding_completed: true,
    };

    if (state.mode === 'demo') {
      state.profile = { ...state.profile, ...row };
      localStorage.setItem('cosmic.alpha.profile', JSON.stringify(state.profile));
      document.querySelector('#onboardWrap').hidden = true;
      syncChrome();
      renderPage(state.page);
      return;
    }

    document.querySelector('#onboardMsg').textContent = 'Saving…';
    const { data, error } = await sb.from('profiles').update(row).eq('id', state.user.id).select().single();
    if (error) {
      document.querySelector('#onboardMsg').textContent = error.message;
      return;
    }

    state.profile = data;
    document.querySelector('#onboardWrap').hidden = true;
    await persistInsight();
    originalEnterApp();
    patchLabels();
    void calculateNatalAstrology(true);
    toast('Profile saved');
  };

  async function calculateNatalAstrology(force = false) {
    if (state.mode !== 'live' || !state.user || !sb) {
      state.astrology = { status: 'auth_required' };
      return null;
    }

    if (!force && state.astrology?.status === 'ready') return state.astrology.data;

    const profile = state.profile;
    if (!profile?.birth_date || !profile?.birth_time) {
      state.astrology = { status: 'birth_time_required' };
      if (state.page === 'insights') renderInsights();
      return null;
    }

    const zone = profile.birth_timezone || profile.timezone;
    const timestamp = localBirthToUtc(profile.birth_date, profile.birth_time, zone);
    if (!timestamp) {
      state.astrology = { status: 'birth_timezone_required' };
      if (state.page === 'insights') renderInsights();
      return null;
    }

    state.astrology = { status: 'loading' };
    if (state.page === 'insights') renderInsights();

    try {
      const { data, error } = await sb.functions.invoke('astrology-calc', {
        body: { timestamp_utc: timestamp },
      });
      if (error) throw error;
      if (!data?.planets?.Sun || !data?.planets?.Moon) throw new Error('Incomplete astrology response');
      state.astrology = { status: 'ready', data };
      if (state.page === 'insights') renderInsights();
      return data;
    } catch (error) {
      console.error('Natal astrology preview failed', error?.message || error);
      state.astrology = { status: 'error', message: error?.message || 'Calculation unavailable' };
      if (state.page === 'insights') renderInsights();
      return null;
    }
  }

  function astrologyCard() {
    const astro = state.astrology;
    if (state.mode === 'demo') {
      return {
        value: '—',
        sub: 'Sign in required',
        copy: 'Real natal positions are calculated by an authenticated server-side astronomy function. Demo mode does not fabricate astrology results.',
      };
    }
    if (!state.profile?.birth_time) {
      return {
        value: '—',
        sub: 'Birth time required',
        copy: 'Add your birth time and birth timezone to calculate the planetary positions accurately enough for this Alpha stage.',
      };
    }
    if (astro?.status === 'loading') {
      return { value: '…', sub: 'Calculating', copy: 'Computing geocentric tropical planetary positions from your saved birth timestamp.' };
    }
    if (astro?.status === 'error') {
      return { value: '!', sub: 'Calculation unavailable', copy: 'The astrology service could not complete this request. Your Numerology and Chinese Zodiac scores are unaffected.' };
    }
    if (astro?.status === 'ready') {
      const planets = astro.data.planets;
      const compact = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
        .map((name) => `${name} ${planets[name]?.sign || '—'} ${planets[name]?.degree_in_sign?.toFixed?.(1) || '—'}°`)
        .join(' · ');
      return {
        value: `${planets.Sun.sign}`,
        sub: `Sun ${planets.Sun.degree_in_sign.toFixed(1)}° · Moon ${planets.Moon.sign} ${planets.Moon.degree_in_sign.toFixed(1)}°`,
        copy: `${compact}. Tropical geocentric positions calculated with Astronomy Engine 2.1.19. Houses and Ascendant are intentionally not calculated yet.`,
      };
    }
    return { value: '…', sub: 'Astrology Alpha 2', copy: 'Open this tab while signed in to calculate your natal planetary positions.' };
  }

  renderInsights = function alpha2RenderInsights() {
    originalRenderInsights();
    const modules = [...document.querySelectorAll('#page-insights .insight-module')];
    const card = modules.find((module) => module.querySelector('.eyebrow')?.textContent.trim() === 'Astrology');
    if (!card) return;
    const result = astrologyCard();
    card.innerHTML = `
      <div class="module-head">
        <div><span class="eyebrow">Astrology · Alpha 2</span><h3 style="margin:6px 0 0">Astronomical positions</h3></div>
        <span class="module-icon">☾</span>
      </div>
      <div class="module-value" style="font-size:${result.value.length > 8 ? '30px' : '42px'}">${esc(result.value)}</div>
      <div class="module-sub">${esc(result.sub)}</div>
      <p class="module-copy">${esc(result.copy)}</p>
      ${state.mode === 'live' && state.astrology?.status !== 'loading' ? '<button class="ghost-btn" id="refreshAstrology">Recalculate positions</button>' : ''}
    `;
    document.querySelector('#refreshAstrology')?.addEventListener('click', () => void calculateNatalAstrology(true));
  };

  renderProfile = function alpha2RenderProfile() {
    originalRenderProfile();
    const rows = document.querySelector('#page-profile .status-list');
    if (rows && !document.querySelector('#birthTimezoneStatus')) {
      const row = document.createElement('div');
      row.id = 'birthTimezoneStatus';
      row.className = 'status-row';
      row.innerHTML = `<span>Birth timezone</span><b>${esc(state.profile?.birth_timezone || state.profile?.timezone || 'Not set')}</b>`;
      rows.appendChild(row);
    }
  };

  enterApp = function alpha2EnterApp() {
    originalEnterApp();
    patchLabels();
    if (state.mode === 'demo') {
      state.astrology = { status: 'auth_required' };
    } else {
      void calculateNatalAstrology(false);
    }
  };

  // Patch an onboarding view that may have been rendered while the Supabase SDK was loading.
  const observer = new MutationObserver(() => {
    if (document.querySelector('#onboardForm')) enhanceOnboarding();
    patchLabels();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.CosmicAstrology = Object.freeze({
    localBirthToUtc,
    validTimeZone,
    calculate: (force = true) => calculateNatalAstrology(force),
  });
  patchLabels();
})();
