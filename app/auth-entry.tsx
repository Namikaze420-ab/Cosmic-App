export function AuthEntry() {
  return (
    <div id="authGate" className="auth-gate" hidden>
      <section className="auth-box" aria-labelledby="authTitle">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>{" "}
          Cosmic Planner
        </div>
        <h1 id="authTitle">Welcome back</h1>
        <p id="authSub">Sign in to your private planner and journal.</p>
        <form id="authForm" className="auth-form">
          <label>
            Email
            <input id="authEmail" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              id="authPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button id="authSubmit" className="primary-btn" type="submit">
            Sign in
          </button>
        </form>
        <div id="authMsg" className="auth-msg" role="status" />
        <div className="auth-actions">
          <button id="authToggle" className="ghost-btn" type="button">
            Create an account
          </button>
          <button id="demoMode" className="ghost-btn" type="button">
            Explore the demo
          </button>
        </div>
        <footer className="auth-footer">
          <a href="/privacy/">Privacy and your data</a>
        </footer>
      </section>
    </div>
  );
}
