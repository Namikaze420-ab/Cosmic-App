(() => {
  const originalRenderProfile = renderProfile;

  function downloadJson(data) {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cosmic-planner-export-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportAccount() {
    if (state.mode !== 'live' || !sb || !state.user) return;
    const button = document.querySelector('#exportAccountBtn');
    const status = document.querySelector('#privacyStatus');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Preparing your export…';

    try {
      const { data, error } = await sb.functions.invoke('account-export', { body: {} });
      if (error) throw error;
      downloadJson(data);
      if (status) status.textContent = 'Export downloaded. It contains your structured Cosmic Planner data.';
    } catch (error) {
      if (status) status.textContent = error?.message || 'Export could not be created.';
    } finally {
      if (button) button.disabled = false;
    }
  }

  function clearLocalAccountData() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('cosmic.') || key.startsWith('sb-')) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  }

  function showDeleteDialog() {
    if (state.mode !== 'live' || !state.user || !sb) return;
    document.querySelector('#accountDeleteDialog')?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'accountDeleteDialog';
    wrap.className = 'onboard-wrap';
    wrap.innerHTML = `
      <section class="auth-box" role="dialog" aria-modal="true" aria-labelledby="deleteAccountTitle">
        <span class="eyebrow">PERMANENT ACCOUNT DELETION</span>
        <h1 id="deleteAccountTitle">Delete Cosmic Planner account?</h1>
        <p>This permanently deletes your account and user-scoped planner, diary, profile, insights, calendar connection records and private palm uploads. This cannot be undone.</p>
        <form id="deleteAccountForm" class="auth-form">
          <label>Type DELETE to confirm<input id="deleteAccountPhrase" autocomplete="off" required></label>
          <button id="confirmDeleteAccount" class="primary-btn" type="submit" disabled>Delete permanently</button>
          <button id="cancelDeleteAccount" class="ghost-btn" type="button">Cancel</button>
        </form>
        <div id="deleteAccountStatus" class="auth-msg"></div>
      </section>`;
    document.body.appendChild(wrap);

    const phrase = document.querySelector('#deleteAccountPhrase');
    const confirm = document.querySelector('#confirmDeleteAccount');
    phrase.addEventListener('input', () => { confirm.disabled = phrase.value !== 'DELETE'; });
    document.querySelector('#cancelDeleteAccount').onclick = () => wrap.remove();

    document.querySelector('#deleteAccountForm').onsubmit = async (event) => {
      event.preventDefault();
      if (phrase.value !== 'DELETE') return;
      confirm.disabled = true;
      phrase.disabled = true;
      document.querySelector('#cancelDeleteAccount').disabled = true;
      const status = document.querySelector('#deleteAccountStatus');
      status.textContent = 'Deleting private data and account…';

      try {
        const { data, error } = await sb.functions.invoke('account-delete', {
          body: { confirmation: 'DELETE' },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'Account deletion failed.');

        try { await sb.auth.signOut({ scope: 'local' }); } catch {}
        clearLocalAccountData();
        status.textContent = 'Account deleted. Returning to sign in…';
        setTimeout(() => window.location.replace(window.location.pathname), 700);
      } catch (error) {
        status.textContent = error?.message || 'Account deletion failed. Nothing else will be attempted.';
        confirm.disabled = false;
        phrase.disabled = false;
        document.querySelector('#cancelDeleteAccount').disabled = false;
      }
    };
  }

  function appendPrivacyControls() {
    const card = document.querySelector('#page-profile .settings-card');
    if (!card || document.querySelector('#privacyDataSection')) return;

    const section = document.createElement('div');
    section.id = 'privacyDataSection';
    section.className = 'settings-section';

    if (state.mode === 'demo') {
      section.innerHTML = `
        <h3>Privacy & data</h3>
        <p class="module-copy">Export and account deletion are available only for signed-in accounts. Demo mode stores only local preview data in this browser.</p>
        <div class="status-list"><div class="status-row"><span>Account export</span><b>Sign in required</b></div><div class="status-row"><span>Permanent deletion</span><b>Sign in required</b></div></div>`;
    } else {
      section.innerHTML = `
        <h3>Privacy & data</h3>
        <p class="module-copy">Download your structured Cosmic Planner data or permanently delete your account. Google provider secrets are never included in exports.</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">
          <button class="ghost-btn" id="exportAccountBtn" type="button">Download my data</button>
          <button class="ghost-btn" id="deleteAccountBtn" type="button">Delete account</button>
        </div>
        <div id="privacyStatus" class="auth-msg" aria-live="polite"></div>`;
      section.querySelector('#exportAccountBtn').onclick = exportAccount;
      section.querySelector('#deleteAccountBtn').onclick = showDeleteDialog;
    }

    card.appendChild(section);
  }

  renderProfile = function alpha2PrivacyRenderProfile() {
    originalRenderProfile();
    appendPrivacyControls();
  };

  window.CosmicPrivacy = Object.freeze({
    exportAccount,
    showDeleteDialog,
  });
})();
