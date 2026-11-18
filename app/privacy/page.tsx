import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and your data · Cosmic Planner",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <a href="/">← Cosmic Planner</a>
      <h1>Privacy and your data</h1>
      <p>
        Where your plans and journal entries are stored depends on how you use
        the planner.
      </p>
      <h2>Using the demo</h2>
      <p>
        Demo plans, journal entries and guidance preferences are saved in this
        browser. Anyone using the same browser profile can reopen them. Clear
        this site’s browser data to remove them.
      </p>
      <h2>Using an account</h2>
      <p>
        Supabase handles sign-in and stores your account’s profile, plans,
        journal, and saved insights. Your birth profile supplies the date, time,
        and location used by the reflection tools. In You, you can choose the
        priorities that shape your guidance.
      </p>
      <h2>Optional features</h2>
      <p>
        Palm images use private storage. You can delete an upload or manage
        consent for that image. AI processing is disabled in this preview.
        Google Calendar import requires a separate connection. Browser
        notifications require your browser’s permission.
      </p>
      <p>
        Diagnostics are off by default. If you enable them in You, the app
        submits an error fingerprint, category, app screen, and version. Journal
        text, images, and raw error messages are excluded.
      </p>
      <h2>Export or delete your account</h2>
      <p>
        Open <strong>You → Privacy &amp; data</strong> while signed in.
        “Download my data” exports structured records as a JSON file. “Delete
        account” asks you to type DELETE before removing your account and its
        user-scoped data, including private palm uploads. Copies you previously
        downloaded stay on your device.
      </p>
      <h2>Personal guidance</h2>
      <p>
        Scores and symbolic readings are for reflection. They do not predict
        outcomes or replace professional financial, medical, or legal advice.
      </p>
    </main>
  );
}
