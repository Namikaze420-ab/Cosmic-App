(() => {
  const previousRenderProfile = renderProfile;
  const previousEnterApp = enterApp;
  const APP_VERSION = 'alpha2.7';
  let listenersInstalled = false;

  state.diagnosticsOptIn = false;

  function normalizeForFingerprint(value) {
    return String(value ?? '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/https?:\/\/[^\s]+/gi, '[url]')
      .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[token]')
      .replace(/[a-f0-9]{32,}/gi, '[opaque]')
      .slice(0, 1200);
  }

  async function hashFingerprint(value) {
    const normalized = normalizeForFingerprint(value);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return Array.from(new Uint8Array(digest)).slice(0, 20).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function loadDiagnosticsPreference() {
    if (state.mode !== 'live' || !state.user || !sb) {
      state.diagnosticsOptIn = false;
      return false;
    }

    const { data, error } = await sb
      .from('user_preferences')
      .select('diagnostics_opt_in')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) {
      console.warn('Diagnostics preference unavailable');
      state.diagnosticsOptIn = false;
      return false;
    }

    state.diagnosticsOptIn = Boolean(data?.diagnostics_opt_in);
    if (state.page === 'profile') renderProfile();
    return state.diagnosticsOptIn;
  }

  async function setDiagnosticsPreference(enabled) {
    if (state.mode !== 'live' || !state.user || !sb) return false;
    const status = document.querySelector('#diagnosticsStatus');
    if (status) status.textContent = 'Saving diagnostics preference…';

    const { error } = await sb
      .from('user_preferences')
      .update({ diagnostics_opt_in: Boolean(enabled), updated_at: new Date().toISOString() })
      .eq('user_id', state.user.id);

    if (error) {
      if (status) status.textContent = 'Diagnostics preference could not be saved.';
      return false;
    }

    state.diagnosticsOptIn = Boolean(enabled);
    if (status) status.textContent = enabled
      ? 'Privacy-safe diagnostics enabled. Raw messages, stack traces, diary content, palm images and URLs are not uploaded.'
      : 'Diagnostics disabled. No client error report will be uploaded.';
    return true;
  }

  async function report(category, rawFingerprintMaterial) {
    if (state.mode !== 'live' || !state.user || !sb || !state.diagnosticsOptIn) return false;
    try {
      const fingerprint = await hashFingerprint(rawFingerprintMaterial);
      const route = String(state.page || 'unknown').slice(0, 100);
      const { data, error } = await sb.rpc('report_client_error', {
        p_category: category,
        p_fingerprint: fingerprint,
        p_route: route,
        p_app_version: APP_VERSION,
      });
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
  }

  function installListeners() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    window.addEventListener('error', (event) => {
      const material = `${event.message || 'error'}|${event.filename || ''}|${event.lineno || 0}|${event.colno || 0}`;
      void report('js_error', material);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const material = reason instanceof Error ? `${reason.name}|${reason.message}|${reason.stack || ''}` : String(reason || 'promise_rejection');
      void report('promise_rejection', material);
    });
  }

  function appendDiagnosticsControls() {
    const card = document.querySelector('#page-profile .settings-card');
    if (!card || document.querySelector('#diagnosticsAlpha27')) return;

    const section = document.createElement('div');
    section.id = 'diagnosticsAlpha27';
    section.className = 'settings-section';

    if (state.mode === 'demo') {
      section.innerHTML = `
        <h3>Privacy-safe diagnostics</h3>
        <p class="module-copy">Signed-in users can explicitly opt in to minimal first-party error fingerprints. Demo mode never uploads diagnostics.</p>
        <div class="status-row"><span>Diagnostics collection</span><b>Off</b></div>`;
      card.appendChild(section);
      return;
    }

    section.innerHTML = `
      <h3>Privacy-safe diagnostics</h3>
      <p class="module-copy">Off by default. When enabled, Cosmic Planner sends only a one-way error fingerprint, broad error category, current app section and app version. It does not send raw messages, stack traces, diary text, palm images, task titles, account email or page URLs.</p>
      <label class="settings-row consent-check" for="diagnosticsOptIn">
        <span><strong>Help improve reliability</strong><small>Optional and reversible at any time.</small></span>
        <input id="diagnosticsOptIn" type="checkbox" ${state.diagnosticsOptIn ? 'checked' : ''}>
      </label>
      <div id="diagnosticsStatus" class="auth-msg" aria-live="polite">${state.diagnosticsOptIn ? 'Diagnostics currently enabled.' : 'Diagnostics currently disabled.'}</div>`;

    section.querySelector('#diagnosticsOptIn').addEventListener('change', async (event) => {
      const input = event.currentTarget;
      input.disabled = true;
      const saved = await setDiagnosticsPreference(input.checked);
      if (!saved) input.checked = !input.checked;
      input.disabled = false;
    });
    card.appendChild(section);
  }

  renderProfile = function alpha27DiagnosticsRenderProfile() {
    previousRenderProfile();
    appendDiagnosticsControls();
  };

  enterApp = function alpha27DiagnosticsEnterApp() {
    previousEnterApp();
    installListeners();
    void loadDiagnosticsPreference();
  };

  installListeners();

  window.CosmicDiagnostics = Object.freeze({
    appVersion: APP_VERSION,
    load: loadDiagnosticsPreference,
    setEnabled: setDiagnosticsPreference,
    report,
    isEnabled: () => Boolean(state.diagnosticsOptIn),
  });
})();
