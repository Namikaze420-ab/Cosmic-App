(() => {
  const previousRenderInsights = renderInsights;
  const previousEnterApp = enterApp;
  const CONSENT_VERSION = 'palm-ai-consent-v1';

  state.palmConsentEvents = state.palmConsentEvents || [];

  function latestConsent(readingId) {
    return (state.palmConsentEvents || []).find((event) => event.reading_id === readingId) || null;
  }

  async function loadConsentEvents() {
    if (state.mode !== 'live' || !state.user || !sb) {
      state.palmConsentEvents = [];
      return [];
    }

    const { data, error } = await sb
      .from('palm_processing_consent_events')
      .select('id,reading_id,action,consent_version,retention_days,created_at')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Palm consent history unavailable', error?.message || error);
      state.palmConsentEvents = [];
      return [];
    }

    state.palmConsentEvents = data || [];
    if (state.page === 'insights') renderInsights();
    return state.palmConsentEvents;
  }

  async function recordConsent(readingId, action, retentionDays = null) {
    if (state.mode !== 'live' || !state.user || !sb) return false;
    const status = document.querySelector(`[data-palm-ai-status="${CSS.escape(readingId)}"]`);
    if (status) status.textContent = action === 'grant' ? 'Recording consent…' : 'Recording withdrawal…';

    const payload = {
      p_reading_id: readingId,
      p_action: action,
      p_retention_days: action === 'grant' ? Number(retentionDays) : null,
    };

    const { data, error } = await sb.rpc('record_palm_ai_consent', payload);
    if (error) {
      if (status) status.textContent = error.message || 'Consent could not be recorded.';
      return false;
    }

    const event = Array.isArray(data) ? data[0] : data;
    if (event) state.palmConsentEvents = [event, ...(state.palmConsentEvents || [])];
    renderInsights();
    const liveStatus = document.querySelector(`[data-palm-ai-status="${CSS.escape(readingId)}"]`);
    if (liveStatus) {
      liveStatus.textContent = action === 'grant'
        ? 'Consent recorded. AI processing is still disabled in Alpha 2.7.'
        : 'AI-processing consent withdrawn. No new processing may begin.';
    }
    return true;
  }

  function addConsentPanel(reading) {
    const row = document.querySelector(`[data-palm-id="${CSS.escape(reading.id)}"]`);
    if (!row || row.querySelector('[data-palm-ai-panel]')) return;

    const latest = latestConsent(reading.id);
    const granted = latest?.action === 'grant';
    const panel = document.createElement('div');
    panel.dataset.palmAiPanel = reading.id;
    panel.className = 'consent-panel';

    if (granted) {
      panel.innerHTML = `
        <div>
          <strong>AI consent recorded</strong>
          <p>Consent version ${esc(latest.consent_version || CONSENT_VERSION)} · retention window ${Number(latest.retention_days || 7)} day(s). Processing remains disabled until the model/privacy gate is activated.</p>
        </div>
        <button class="ghost-btn" type="button" data-revoke-palm-ai="${esc(reading.id)}">Withdraw consent</button>
        <div class="auth-msg" data-palm-ai-status="${esc(reading.id)}" aria-live="polite"></div>`;
      panel.querySelector('[data-revoke-palm-ai]').onclick = () => void recordConsent(reading.id, 'revoke');
    } else {
      const checkboxId = `palmAiConsent-${reading.id}`;
      const retentionId = `palmAiRetention-${reading.id}`;
      panel.innerHTML = `
        <div>
          <strong>Optional AI processing consent</strong>
          <p>Uploading an image does not grant AI permission. This control records explicit future-processing consent only; it does not start a model in Alpha 2.7.</p>
        </div>
        <label class="consent-check" for="${esc(checkboxId)}">
          <input id="${esc(checkboxId)}" type="checkbox">
          <span>I explicitly consent to AI processing of this private palm image when the feature is activated.</span>
        </label>
        <label class="field" for="${esc(retentionId)}"><span>Maximum processing retention</span>
          <select id="${esc(retentionId)}"><option value="1">1 day</option><option value="7" selected>7 days</option><option value="30">30 days</option></select>
        </label>
        <button class="ghost-btn" type="button" data-grant-palm-ai="${esc(reading.id)}" disabled>Record explicit consent</button>
        <div class="auth-msg" data-palm-ai-status="${esc(reading.id)}" aria-live="polite">${latest?.action === 'revoke' ? 'Consent is currently withdrawn.' : 'No AI-processing consent recorded.'}</div>`;

      const checkbox = panel.querySelector(`#${CSS.escape(checkboxId)}`);
      const button = panel.querySelector('[data-grant-palm-ai]');
      const retention = panel.querySelector(`#${CSS.escape(retentionId)}`);
      checkbox.addEventListener('change', () => { button.disabled = !checkbox.checked; });
      button.onclick = () => void recordConsent(reading.id, 'grant', retention.value);
    }

    row.insertAdjacentElement('afterend', panel);
  }

  function appendPalmAiControls() {
    const section = document.querySelector('#palmAlpha2Section');
    if (!section) return;

    const eyebrow = section.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'PALMISTRY · PRIVATE + EXPLICIT CONSENT';

    if (state.mode === 'demo') {
      const copy = section.querySelector('.module-copy');
      if (copy && !copy.textContent.includes('consent')) {
        copy.textContent += ' AI processing always requires a separate explicit consent action and remains disabled in this preview.';
      }
      return;
    }

    (state.palmReadings || []).forEach(addConsentPanel);
  }

  renderInsights = function alpha27PalmAiRenderInsights() {
    previousRenderInsights();
    appendPalmAiControls();
  };

  enterApp = function alpha27PalmAiEnterApp() {
    previousEnterApp();
    void loadConsentEvents();
  };

  window.CosmicPalmAI = Object.freeze({
    consentVersion: CONSENT_VERSION,
    load: loadConsentEvents,
    latest: latestConsent,
    grant: (readingId, retentionDays = 7) => recordConsent(readingId, 'grant', retentionDays),
    revoke: (readingId) => recordConsent(readingId, 'revoke'),
  });
})();
