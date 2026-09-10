(() => {
  const STAGING_REDIRECT = 'https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app/';
  const $auth = (selector) => document.querySelector(selector);

  function redirectUrl() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return `${window.location.origin}/`;
    if (host.endsWith('.vercel.app')) return STAGING_REDIRECT;
    return `${window.location.origin}/`;
  }

  function setMessage(message, kind = 'info') {
    const el = $auth('#authMsg');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
  }

  function setMode(mode) {
    const submit = $auth('#authSubmit');
    const toggle = $auth('#authToggle');
    const title = $auth('#authTitle');
    const sub = $auth('#authSub');
    const password = $auth('#authPassword');
    if (!submit || !toggle || !title || !sub) return;

    const signup = mode === 'signup';
    submit.dataset.mode = signup ? 'signup' : 'signin';
    submit.textContent = signup ? 'Create account' : 'Sign in';
    toggle.textContent = signup ? 'Already have an account? Sign in' : 'New here? Create an account';
    title.textContent = signup ? 'Create your account' : 'Welcome back';
    sub.textContent = signup
      ? 'Create one private account for your planner, diary and insights.'
      : 'Sign in to your private planner and diary.';
    if (password) password.autocomplete = signup ? 'new-password' : 'current-password';
    setMessage('');
  }

  async function finishSession(session, user) {
    state.session = session;
    state.user = user;
    await loadData();
  }

  async function improvedAuthSubmit(event) {
    event.preventDefault();
    const submit = $auth('#authSubmit');
    const email = $auth('#authEmail')?.value.trim() || '';
    const password = $auth('#authPassword')?.value || '';
    const signup = submit?.dataset.mode === 'signup';

    if (!email || !password) {
      setMessage('Enter your email and password.', 'error');
      return;
    }
    if (!sb) {
      setMessage('Secure authentication is still loading. Try again in a moment.', 'error');
      return;
    }

    submit.disabled = true;
    setMessage(signup ? 'Creating account…' : 'Signing in…');

    try {
      if (signup) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: email.split('@')[0] },
            emailRedirectTo: redirectUrl(),
          },
        });
        if (error) throw error;

        if (data?.session && data?.user) {
          await finishSession(data.session, data.user);
          return;
        }

        // Supabase deliberately obscures repeated signups for confirmed addresses.
        // If the supplied credentials already belong to an existing account, sign in.
        const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({ email, password });
        if (!signInError && signInData?.session && signInData?.user) {
          await finishSession(signInData.session, signInData.user);
          return;
        }

        setMode('signin');
        $auth('#authEmail').value = email;
        setMessage(
          'Check your email if this is a new account. If you already registered this address, sign in with your existing password or use Forgot password.',
          'info'
        );
        return;
      }

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await finishSession(data.session, data.user);
    } catch (error) {
      const code = error?.code || '';
      if (code === 'invalid_credentials') {
        setMessage('Email/password not accepted. If you already created this account, use Forgot password.', 'error');
      } else if (code === 'email_not_confirmed') {
        setMessage('This account still needs email confirmation. Check your inbox, then sign in again.', 'error');
      } else {
        setMessage(error?.message || 'Authentication failed. Please try again.', 'error');
      }
    } finally {
      submit.disabled = false;
    }
  }

  async function forgotPassword() {
    const emailInput = $auth('#authEmail');
    const email = emailInput?.value.trim() || '';
    if (!email || !emailInput.checkValidity()) {
      setMode('signin');
      setMessage('Enter the email address for your account first.', 'error');
      emailInput?.focus();
      return;
    }
    if (!sb) {
      setMessage('Secure authentication is still loading. Try again in a moment.', 'error');
      return;
    }

    const button = $auth('#forgotPassword');
    if (button) button.disabled = true;
    setMessage('Requesting password reset…');
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
      if (error) throw error;
      setMessage('If an account exists for this address, a password-reset email has been sent. Check your inbox and spam folder.', 'info');
    } catch (error) {
      setMessage(error?.message || 'Password reset could not be requested. Please try again.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function showRecoveryForm() {
    if ($auth('#recoveryWrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'recoveryWrap';
    wrap.className = 'onboard-wrap';
    wrap.innerHTML = `
      <section class="auth-box" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
        <span class="eyebrow">ACCOUNT RECOVERY</span>
        <h1 id="recoveryTitle">Choose a new password</h1>
        <p>Your reset link is valid. Set a new password to continue.</p>
        <form id="recoveryForm" class="auth-form">
          <label>New password<input id="recoveryPassword" type="password" minlength="8" autocomplete="new-password" required></label>
          <label>Confirm password<input id="recoveryPassword2" type="password" minlength="8" autocomplete="new-password" required></label>
          <button id="recoverySubmit" class="primary-btn" type="submit">Update password</button>
        </form>
        <div id="recoveryMsg" class="auth-msg"></div>
      </section>`;
    document.body.appendChild(wrap);

    $auth('#recoveryForm').onsubmit = async (event) => {
      event.preventDefault();
      const first = $auth('#recoveryPassword').value;
      const second = $auth('#recoveryPassword2').value;
      const msg = $auth('#recoveryMsg');
      if (first !== second) {
        msg.textContent = 'Passwords do not match.';
        return;
      }
      const button = $auth('#recoverySubmit');
      button.disabled = true;
      msg.textContent = 'Updating password…';
      try {
        const { error } = await sb.auth.updateUser({ password: first });
        if (error) throw error;
        msg.textContent = 'Password updated. Loading your account…';
        const { data } = await sb.auth.getSession();
        if (data?.session) {
          state.session = data.session;
          state.user = data.session.user;
          wrap.remove();
          await loadData();
        } else {
          wrap.remove();
          setMode('signin');
          setMessage('Password updated. Sign in with your new password.');
        }
      } catch (error) {
        msg.textContent = error?.message || 'Password could not be updated.';
      } finally {
        button.disabled = false;
      }
    };
  }

  function patchAuthUi() {
    const actions = $auth('.auth-actions');
    if (!actions || $auth('#forgotPassword')) return;
    const forgot = document.createElement('button');
    forgot.id = 'forgotPassword';
    forgot.type = 'button';
    forgot.className = 'ghost-btn';
    forgot.textContent = 'Forgot password?';
    actions.insertBefore(forgot, $auth('#demoMode'));
    forgot.onclick = forgotPassword;

    $auth('#authForm').onsubmit = improvedAuthSubmit;
    $auth('#authToggle').onclick = () => {
      const current = $auth('#authSubmit').dataset.mode === 'signup' ? 'signup' : 'signin';
      setMode(current === 'signup' ? 'signin' : 'signup');
    };
  }

  function attachRecoveryListener() {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (!sb) {
        if (tries > 150) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      sb.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') showRecoveryForm();
      });

      const recoveryHint = /(?:[?#&])type=recovery(?:[&#]|$)/.test(window.location.href) || window.location.hash.includes('access_token=');
      if (recoveryHint) {
        const { data } = await sb.auth.getSession();
        if (data?.session) showRecoveryForm();
      }
    }, 100);
  }

  patchAuthUi();
  attachRecoveryListener();
})();
