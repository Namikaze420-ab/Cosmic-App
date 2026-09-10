(() => {
  const previousRenderProfile = renderProfile;
  const previousEnterApp = enterApp;
  const VAPID_PUBLIC_KEY = window.COSMIC_VAPID_PUBLIC_KEY || '';

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function configured() {
    return Boolean(VAPID_PUBLIC_KEY);
  }

  function base64UrlToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
  }

  async function existingSubscription() {
    if (!supported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function persistSubscription(subscription) {
    if (state.mode !== 'live' || !state.user || !sb || !subscription) return false;
    const json = subscription.toJSON();
    const endpoint = json.endpoint || subscription.endpoint;
    const p256dh = json.keys?.p256dh;
    const authKey = json.keys?.auth;
    if (!endpoint || !p256dh || !authKey) return false;

    const { error } = await sb.from('push_subscriptions').upsert({
      user_id: state.user.id,
      endpoint,
      p256dh,
      auth_key: authKey,
      expiration_time: json.expirationTime ?? null,
      user_agent: navigator.userAgent.slice(0, 500),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;
    return true;
  }

  async function syncExistingSubscription() {
    if (state.mode !== 'live' || !state.user || !sb || !supported()) return null;
    try {
      const subscription = await existingSubscription();
      if (subscription) await persistSubscription(subscription);
      return subscription;
    } catch (error) {
      console.warn('Push subscription sync failed', error?.message || error);
      return null;
    }
  }

  async function enableBackgroundPush() {
    const status = document.querySelector('#backgroundPushStatus');
    if (state.mode !== 'live') return;
    if (!supported()) {
      if (status) status.textContent = 'Background push is not supported by this browser.';
      return;
    }
    if (!configured()) {
      if (status) status.textContent = 'Subscription receiver is ready, but VAPID signing keys are not configured yet.';
      return;
    }

    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        if (status) status.textContent = 'Notification permission was not granted.';
        return;
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await persistSubscription(subscription);
      if (status) status.textContent = 'This browser is registered for encrypted background push.';
      if (state.page === 'profile') renderProfile();
    } catch (error) {
      if (status) status.textContent = error?.message || 'Background push registration failed.';
    }
  }

  async function disableBackgroundPush() {
    if (state.mode !== 'live' || !state.user || !sb || !supported()) return;
    const status = document.querySelector('#backgroundPushStatus');
    try {
      const subscription = await existingSubscription();
      if (subscription) {
        await sb.from('push_subscriptions').delete().eq('user_id', state.user.id).eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
      if (status) status.textContent = 'Background push disabled for this browser.';
      if (state.page === 'profile') renderProfile();
    } catch (error) {
      if (status) status.textContent = error?.message || 'Could not disable background push.';
    }
  }

  async function appendPushSection() {
    const card = document.querySelector('#page-profile .settings-card');
    if (!card || document.querySelector('#backgroundPushAlpha2')) return;

    const section = document.createElement('div');
    section.id = 'backgroundPushAlpha2';
    section.className = 'settings-section';

    if (state.mode === 'demo') {
      section.innerHTML = `
        <h3>Background reminders · foundation</h3>
        <div class="settings-row"><span><strong>Web Push</strong><small>Requires a signed-in account, browser permission and a private server signing key.</small></span><b>Sign in required</b></div>`;
      card.appendChild(section);
      return;
    }

    let subscription = null;
    try { subscription = await existingSubscription(); } catch {}
    const stateLabel = !supported() ? 'Unsupported' : subscription ? 'Registered' : configured() ? 'Available' : 'Signing setup pending';

    section.innerHTML = `
      <h3>Background reminders · foundation</h3>
      <div class="settings-row">
        <span><strong>Encrypted Web Push</strong><small>The service worker and private subscription store are ready. Actual closed-app sending remains disabled until VAPID server signing is securely configured.</small></span>
        <b>${esc(stateLabel)}</b>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:10px">
        <button id="enableBackgroundPush" class="ghost-btn" type="button" ${!supported() || !configured() ? 'disabled' : ''}>Enable background push</button>
        ${subscription ? '<button id="disableBackgroundPush" class="ghost-btn" type="button">Disable on this browser</button>' : ''}
      </div>
      <div id="backgroundPushStatus" class="auth-msg" aria-live="polite">${configured() ? '' : 'No VAPID key is embedded in the client; no background subscription will be created yet.'}</div>`;

    section.querySelector('#enableBackgroundPush')?.addEventListener('click', () => void enableBackgroundPush());
    section.querySelector('#disableBackgroundPush')?.addEventListener('click', () => void disableBackgroundPush());
    card.appendChild(section);
  }

  renderProfile = function alpha2PushRenderProfile() {
    previousRenderProfile();
    void appendPushSection();
  };

  enterApp = function alpha2PushEnterApp() {
    previousEnterApp();
    void syncExistingSubscription();
  };

  window.CosmicPush = Object.freeze({
    supported,
    configured,
    syncExisting: syncExistingSubscription,
    enable: enableBackgroundPush,
    disable: disableBackgroundPush,
  });
})();
