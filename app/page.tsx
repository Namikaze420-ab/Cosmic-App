import { AuthEntry } from "./auth-entry";
import { PlanDialog } from "./plan-dialog";
import { PlannerRuntime } from "./planner-runtime";

export default function PlannerPage() {
  return (
    <>
      <AuthEntry />
      <div className="app-shell" hidden>
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="brand">
            <span className="brand-mark">✦</span>
            <div>
              <strong>Cosmic</strong>
              <span>Planner</span>
            </div>
          </div>
          <nav id="desktopNav" className="nav-stack"></nav>
          <div className="sidebar-card">
            <span className="eyebrow">Today’s alignment</span>
            <div className="mini-score">
              <strong>--</strong>
              <span>/100</span>
            </div>
            <p>Complete your birth profile to activate scoring.</p>
          </div>
          <button className="profile-chip" data-page="profile">
            <span className="avatar">CP</span>
            <span>
              <strong>Cosmic User</strong>
              <small>Profile</small>
            </span>
            <span>›</span>
          </button>
        </aside>

        <main className="main" id="mainContent" tabIndex={-1}>
          <header className="topbar">
            <div>
              <span className="eyebrow" id="pageEyebrow">
                Daily planner
              </span>
              <h1 id="pageTitle">Today</h1>
            </div>
            <div className="top-actions">
              <button
                className="icon-btn"
                id="searchBtn"
                aria-label="Quick actions"
              >
                ⌕
              </button>
              <button className="primary-btn" id="quickAdd">
                ＋ Add plan
              </button>
            </div>
          </header>

          <section id="page-home" className="page active"></section>
          <section id="page-calendar" className="page"></section>
          <section id="page-diary" className="page"></section>
          <section id="page-insights" className="page"></section>
          <section id="page-profile" className="page"></section>
        </main>

        <nav
          id="mobileNav"
          className="mobile-nav"
          aria-label="Mobile navigation"
        ></nav>
      </div>

      <PlanDialog />
      <div className="toast" id="toast" role="status" aria-live="polite" />
      <PlannerRuntime />
    </>
  );
}
