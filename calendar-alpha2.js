(() => {
  const previousRenderProfile = renderProfile;
  const previousEnterApp = enterApp;
  const previousSetPage = setPage;

  state.calendarConnection = state.calendarConnection || null;
  state.calendarLoading = false;

  function fmtSyncTime(value) {
    if (!value) return 'Never';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return 'Unknown';
    }
  }

  async function loadConnection() {
    if (state.mode !== 'live' || !state.user || !sb) {
      state.calendarConnection = null;
      return null;
    }
    const { data, error } = await sb
      .from('calendar_connections')
      .select('id,provider,provider_account_id,sync_enabled,sync_status,last_synced_at')
      .eq('user_id', state.user.id)
      .eq('provider', 'google')
      .maybeSingle();
    if (error) {
      console.warn('Calendar connection load failed', error.message);
      return null;
    }
    state.calendarConnection = data || null;
    return state.calendarConnection;
  }

  async function refreshPlannerAfterSync() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fallbackStart = new Date(today);
    fallbackStart.setDate(fallbackStart.getDate() - 31);
    const fallbackEnd = new Date(today);
    fallbackEnd.setDate(fallbackEnd.getDate() + 365);
    fallbackEnd.setHours(23, 59, 59, 999);
    const start = state.plannerLoadedStart ? new Date(state.plannerLoadedStart) : fallbackStart;
    const end = state.plannerLoadedEnd ? new Date(state.plannerLoadedEnd) : fallbackEnd;
    const { data, error } = await sb
      .from('planner_items')
      .select('*')
      .eq('user_id', state.user.id)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString())
      .order('starts_at');
    if (!error) state.tasks = data || [];
  }

  async function connectGoogleCalendar() {
    if (state.mode !== 'live' || !state.user || !sb) {
      toast('Sign in to connect Google Calendar');
      return;
    }
    if (state.calendarLoading) return;
    state.calendarLoading = true;
    if (state.page === 'profile') renderProfile();
    try {
      const { data, error } = await sb.functions.invoke('google-calendar-oauth-start', { body: {} });
      const message = data?.error || error?.message || '';
      if (data?.configuration_required || /not configured/i.test(message)) {
        toast('Google OAuth setup is required before Calendar can connect');
        return;
      }
      if (error) throw error;
      if (!data?.authorization_url) throw new Error('Authorization URL was not returned');
      window.location.assign(data.authorization_url);
    } catch (error) {
      console.error('Google Calendar connect failed', error?.message || error);
      toast('Google Calendar connection could not start');
    } finally {
      state.calendarLoading = false;
      if (state.page === 'profile') renderProfile();
    }
  }

  async function syncGoogleCalendar() {
    if (state.mode !== 'live' || !state.user || !sb) return;
    if (state.calendarLoading) return;
    state.calendarLoading = true;
    if (state.page === 'profile') renderProfile();
    try {
      const { data, error } = await sb.functions.invoke('google-calendar-sync', { body: { days: 30 } });
      const message = data?.error || error?.message || '';
      if (data?.configuration_required || /not configured/i.test(message)) {
        toast('Google OAuth setup is required before Calendar can sync');
        return;
      }
      if (error) throw error;
      await Promise.all([loadConnection(), refreshPlannerAfterSync()]);
      toast(`Google Calendar synced${Number.isFinite(Number(data?.synced)) ? ` · ${data.synced} events` : ''}`);
      if (state.page === 'profile') renderProfile();
      if (state.page === 'home') renderHome();
      if (state.page === 'calendar') renderCalendar();
    } catch (error) {
      console.error('Google Calendar sync failed', error?.message || error);
      toast('Google Calendar sync failed');
    } finally {
      state.calendarLoading = false;
      if (state.page === 'profile') renderProfile();
    }
  }

  function sectionMarkup() {
    const connection = state.calendarConnection;
    if (state.mode === 'demo') {
      return `
        <h3>Google Calendar · Alpha 2</h3>
        <div class="settings-row">
          <span><strong>Read-only calendar import</strong><small>Sign in to connect. Demo mode never requests access to your Google account.</small></span>
          <b>Demo only</b>
        </div>
      `;
    }

    const status = connection?.sync_status || 'not_connected';
    const account = connection?.provider_account_id || 'Not connected';
    const button = connection
      ? `<button class="ghost-btn" id="googleCalendarSync" ${state.calendarLoading ? 'disabled' : ''}>${state.calendarLoading ? 'Working…' : 'Sync now'}</button>`
      : `<button class="ghost-btn" id="googleCalendarConnect" ${state.calendarLoading ? 'disabled' : ''}>${state.calendarLoading ? 'Working…' : 'Connect Google Calendar'}</button>`;

    return `
      <h3>Google Calendar · Alpha 2</h3>
      <div class="settings-row">
        <span><strong>Account</strong><small>${esc(account)}</small></span>
        <b>${esc(status.replaceAll('_', ' '))}</b>
      </div>
      <div class="settings-row">
        <span><strong>Access model</strong><small>Read-only import into Cosmic Planner. Cosmic Planner does not write back to Google Calendar in this stage.</small></span>
        <b>Read only</b>
      </div>
      <div class="settings-row">
        <span><strong>Last sync</strong><small>${esc(fmtSyncTime(connection?.last_synced_at))}</small></span>
        ${button}
      </div>
    `;
  }

  renderProfile = function alpha2CalendarProfile() {
    previousRenderProfile();
    const card = document.querySelector('#page-profile .settings-card');
    if (!card || document.querySelector('#googleCalendarAlpha2')) return;
    const section = document.createElement('div');
    section.id = 'googleCalendarAlpha2';
    section.className = 'settings-section';
    section.innerHTML = sectionMarkup();
    card.appendChild(section);
    document.querySelector('#googleCalendarConnect')?.addEventListener('click', () => void connectGoogleCalendar());
    document.querySelector('#googleCalendarSync')?.addEventListener('click', () => void syncGoogleCalendar());
  };

  setPage = function alpha2CalendarSetPage(page) {
    previousSetPage(page);
    if (page === 'profile' && state.mode === 'live') {
      void loadConnection().then(() => {
        if (state.page === 'profile') renderProfile();
      });
    }
  };

  enterApp = function alpha2CalendarEnterApp() {
    previousEnterApp();
    if (state.mode === 'live') void loadConnection();
  };

  function consumeOAuthResult() {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get('calendar');
    const error = url.searchParams.get('calendar_error');
    if (!connected && !error) return;
    url.searchParams.delete('calendar');
    url.searchParams.delete('calendar_error');
    history.replaceState({}, '', url.pathname + url.search + url.hash);

    if (connected === 'connected') {
      toast('Google Calendar connected. Running first read-only sync…');
      setTimeout(() => void syncGoogleCalendar(), 250);
    } else if (error) {
      const message = error === 'configuration_required'
        ? 'Google OAuth setup is still required'
        : 'Google Calendar connection was not completed';
      toast(message);
    }
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector('#authGate')?.hidden) return;
    consumeOAuthResult();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  setTimeout(consumeOAuthResult, 500);

  window.CosmicCalendar = Object.freeze({
    loadConnection,
    connect: connectGoogleCalendar,
    sync: syncGoogleCalendar,
  });
})();
