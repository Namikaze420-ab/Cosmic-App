(() => {
  const POLICY = Object.freeze({
    minLength: 16,
    requireLowercase: true,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: true,
  });

  const SYMBOL_RE = /[^A-Za-z0-9]/;

  function problem(password) {
    if (typeof password !== 'string') return 'Enter a password.';
    if (password.length < POLICY.minLength) {
      return `Use at least ${POLICY.minLength} characters.`;
    }

    const missing = [];
    if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
    if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
    if (!/[0-9]/.test(password)) missing.push('a number');
    if (!SYMBOL_RE.test(password)) missing.push('a symbol');

    if (missing.length) {
      return `Add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`;
    }
    return '';
  }

  function setMessage(selector, text) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = text;
    el.dataset.kind = 'error';
  }

  function showProblem(input, messageSelector) {
    const error = problem(input?.value || '');
    if (!error) return false;
    setMessage(messageSelector, `Password requirement: ${error}`);
    input?.focus();
    return true;
  }

  function ensureHint() {
    const input = document.querySelector('#authPassword');
    if (!input) return;
    input.minLength = POLICY.minLength;

    let hint = document.querySelector('#passwordPolicyHint');
    if (!hint) {
      hint = document.createElement('small');
      hint.id = 'passwordPolicyHint';
      hint.className = 'auth-note';
      hint.style.display = 'block';
      hint.style.marginTop = '6px';
      hint.textContent = 'New passwords: 16+ characters with lowercase, uppercase, a number and a symbol.';
      input.parentElement?.appendChild(hint);
    }
    input.setAttribute('aria-describedby', 'passwordPolicyHint');
  }

  function interceptSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'authForm') {
      const submit = document.querySelector('#authSubmit');
      if (submit?.dataset.mode !== 'signup') return;
      if (!showProblem(document.querySelector('#authPassword'), '#authMsg')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (form.id === 'recoveryForm') {
      if (!showProblem(document.querySelector('#recoveryPassword'), '#recoveryMsg')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  // Native constraint validation runs before a submit event. Intercept the submit
  // button click as well so users see the same clear policy message instead of a
  // browser-specific validation bubble. The submit handler remains for Enter-key
  // and programmatic submissions that do reach the submit event.
  function interceptSubmitClick(event) {
    const submit = event.target.closest?.('#authSubmit, #recoverySubmit');
    if (!submit) return;

    if (submit.id === 'authSubmit') {
      if (submit.dataset.mode !== 'signup') return;
      if (!showProblem(document.querySelector('#authPassword'), '#authMsg')) return;
    } else if (!showProblem(document.querySelector('#recoveryPassword'), '#recoveryMsg')) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function interceptInvalid(event) {
    const input = event.target;
    if (input?.id === 'authPassword' && document.querySelector('#authSubmit')?.dataset.mode === 'signup') {
      showProblem(input, '#authMsg');
    } else if (input?.id === 'recoveryPassword') {
      showProblem(input, '#recoveryMsg');
    }
  }

  document.addEventListener('submit', interceptSubmit, true);
  document.addEventListener('click', interceptSubmitClick, true);
  document.addEventListener('invalid', interceptInvalid, true);
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#authToggle')) setTimeout(ensureHint, 0);
  }, true);

  const observer = new MutationObserver(() => {
    ensureHint();
    const recovery = document.querySelector('#recoveryPassword');
    const recovery2 = document.querySelector('#recoveryPassword2');
    if (recovery) recovery.minLength = POLICY.minLength;
    if (recovery2) recovery2.minLength = POLICY.minLength;
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  ensureHint();
  window.CosmicPasswordPolicy = Object.freeze({
    policy: POLICY,
    validate(password) {
      return problem(password);
    },
  });
})();
