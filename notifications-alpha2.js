(() => {
  const previousRenderProfile = renderProfile;
  const previousEnterApp = enterApp;
  let timer = null;

  function supported() {
    return 'Notification' in window;
  }

  function permissionLabel() {
    if (!supported()) return 'Unsupported';
    if (Notification.permission === 'granted') return 'Allowed';
    if (Notification.permission === 'denied') return 'Blocked in browser';
    return 'Not requested';
  }

  async function persistPreference(enabled) {
    if (state.mode !== 'live' || !state.user || !sb) return;
    const { error } = await sb
      .from('user_preferences')
      .update({ notifications_enabled: enabled })
      .eq('user_id', state.user.id);
    if (!error) state.preferences = { ...(state.preferences || {}), notifications_enabled: enabled };
  }

  async function requestPermission() {
    if (state.mode === 'demo') {
      toast('Sign in to enable account notification preferences');
      return 'default';
    }
    if (!supported()) {
      toast('This browser does not support notifications');
      return 'unsupported';
    }
    if (Notification.permission === 'denied') {
      toast('Notifications are blocked in your browser settings');
      return 'denied';
    }

    const result = await Notification.requestPermission();
    await persistPreference(result === 'granted');
    if (result === 'granted') {
      toast('Foreground reminders enabled');
      startScheduler();
    }
    if (state.page === 'profile') renderProfile();
    return result;
  }

  function reminderKey(task, minutes) {
    return `cosmic.notify.${task.id}.${minutes}.${task.starts_at}`;
  }

  function alreadySent(key) {
    return localStorage.getItem(key) === '1';
  }

  function markSent(key) {
    localStorage.setItem(key, '1');
  }

  async function showReminder(task, minutes) {
    const title = minutes === 0 ? `Starting now: ${task.title}` : `${task.title} in ${minutes} min`;
    const options = {
      body: `${cap(task.category)} · ${cap(task.priority)} priority`,
      tag: `cosmic-${task.id}-${minutes}`,
      renotify: false,
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      console.warn('Notification display failed', error?.message || error);
    }
  }

  function scanReminders(now = Date.now()) {
    if (!supported() || Notification.permission !== 'granted') return [];
    if (state.preferences?.notifications_enabled === false) return [];

    const sent = [];
    for (const task of state.tasks || []) {
      if (!task?.starts_at || task.status === 'completed' || task.status === 'cancelled') continue;
      const start = new Date(task.starts_at).getTime();
      if (!Number.isFinite(start)) continue;
      const reminders = Array.isArray(task.reminder_minutes) && task.reminder_minutes.length
        ? task.reminder_minutes
        : [15];

      for (const rawMinutes of reminders) {
        const minutes = Number(rawMinutes);
        if (!Number.isFinite(minutes) || minutes < 0) continue;
        const due = start - minutes * 60_000;
        const delta = now - due;
        if (delta < 0 || delta > 60_000) continue;
        const key = reminderKey(task, minutes);
        if (alreadySent(key)) continue;
        markSent(key);
        void showReminder(task, minutes);
        sent.push({ task_id: task.id, minutes });
      }
    }
    return sent;
  }

  function startScheduler() {
    if (timer) clearInterval(timer);
    scanReminders();
    timer = setInterval(() => scanReminders(), 30_000);
  }

  function notificationSection() {
    const section = document.createElement('div');
    section.id = 'notificationSettingsAlpha2';
    section.className = 'settings-section';
    const enabled = state.preferences?.notifications_enabled !== false;
    const label = permissionLabel();
    section.innerHTML = `
      <h3>Browser reminders · Alpha 2</h3>
      <div class="settings-row">
        <span><strong>Foreground reminders</strong><small>Uses each plan's reminder minutes while Cosmic Planner is open. Closed-app push is not enabled yet.</small></span>
        <b>${esc(label)}</b>
      </div>
      <div class="settings-row">
        <span><strong>Account preference</strong><small>${enabled ? 'Enabled' : 'Disabled'} in your private settings.</small></span>
        <button class="ghost-btn" id="notificationPermission" ${state.mode === 'demo' ? 'disabled' : ''}>${label === 'Allowed' ? 'Permission granted' : 'Enable notifications'}</button>
      </div>
    `;
    return section;
  }

  renderProfile = function alpha2NotificationProfile() {
    previousRenderProfile();
    const card = document.querySelector('#page-profile .settings-card');
    if (!card || document.querySelector('#notificationSettingsAlpha2')) return;
    card.appendChild(notificationSection());
    document.querySelector('#notificationPermission')?.addEventListener('click', () => void requestPermission());
  };

  enterApp = function alpha2NotificationEnterApp() {
    previousEnterApp();
    startScheduler();
  };

  window.CosmicNotifications = Object.freeze({
    supported,
    permission: permissionLabel,
    scan: scanReminders,
    request: requestPermission,
  });
})();
