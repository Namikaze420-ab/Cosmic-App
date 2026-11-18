# Cosmic Planner element review

This review follows a person from sign-in through planning a day, reflecting on it, and managing their account. The most important change protects a journal entry when someone types and immediately changes screens. The original build lost the text at each of the three widths tested.

## What changed

| Area | Finding | Rework and verification |
| --- | --- | --- |
| Journal | Returning to Journal before the autosave timer expired replaced the draft with the previous entry. | Text, title and mood are captured on input. Demo storage is updated immediately. Signed-in writes run in order. The latest write controls the save indicator. Browser tests exercise immediate navigation, demo reload and a delayed first cloud write. |
| Journal controls | Five emoji buttons only communicated mood visually. The current entry looked clickable but had no action. | Each mood has a name and a selected state. The entry date is static text. The editor and title have labels, and save feedback is announced. |
| Day and week selection | Adjacent-month cells accepted keyboard focus without selecting a day. Rerendering the month could drop focus. | Adjacent-month cells are disabled. Month dates announce their full date, plan count and selection. Choosing a day retains focus. The week strip and Today/Week switch expose selection. |
| Add and edit plan | A single label incorrectly covered three priority buttons. Focus could escape the form. | Priority is a named group. Low, Medium and High announce selection. The dialog keeps keyboard focus, closes with Escape and returns focus. |
| Quick actions | Search could compete with an open form. A search with no matches left touch users without a visible close control. | Other dialogs block the shortcut. Search has a close button and suggests two valid queries after a miss. |
| Birth profile | An existing user could open the editor and then had to save or reload to leave. | Cancel and Escape discard the edit and return to the opener. First-time onboarding still requires a completed profile. Invalid timezones keep entered values available for correction. |
| Readability | Subtle text, status colors and selected accents were difficult to read on several backgrounds. | Revised light and dark colors for captions, scores, status and accent controls. Retested the alternate Tide and Solar palettes on the settings screen. |
| Layout | On wide screens the daily rhythm card forced an empty column beside the daily guidance. On narrow screens journal metadata and its privacy note were squeezed side by side. | The daily rhythm sits beside the guidance when there is room. Journal metadata stacks on narrow screens. |

## Verification scope

The browser review covered 21 interface states at widths of 1280, 390 and 320 CSS pixels, in the Indian/Mauritius timezone. All 63 combinations fit the viewport without horizontal page overflow. Automated accessibility scans ran on the 1280-pixel light and 390-pixel dark combinations. Across those 42 scans, axe reported zero violations under its WCAG 2 A, 2 AA and 2.1 AA rules. These checks do not measure real screen-reader usability or physical-device notification delivery.

## Walk through the interface

The table distinguishes actions exercised in the browser from content inspected on screen. Controls that repeat for each day or plan are listed once. The inventory below lists individual controls by screen.

| Screen | What to check | Evidence |
| --- | --- | --- |
| Sign in and sign up | Email, password, mode switch, submit, demo access and privacy link. Choose Forgot password with no email. | Both form modes and the missing-email recovery message were opened and scanned. Weak-password validation has its own browser test. |
| Today | Five destinations, active page, quick actions, add, Today/Week, first-session guide, dismiss, rhythm actions, daily focus and evening check-in. | Viewport inspection plus tests for guide progress, time-of-day actions and destination changes. |
| Week | Previous, next, This week, per-day add, totals, workload, completed and open tasks. | Week view opened at three widths. Planner regression tests cover duration, workload and week navigation. |
| Calendar | Month arrows, Today, current selection, adjacent dates, counts, score and date context, selected-day plans, empty day, weekly strip and calendar export. | Populated and empty dates were opened. Keyboard selection was exercised. Export tests cover reminders, local all-day dates and Unicode titles. |
| Plan form | Title, date, all-day, start/end, duration, category, priority, repeat, repeat-until, edit scope, reminder choices, close, Cancel, add and save. | New, existing, repeating and all-day forms inspected. Planner tests cover recurrence, editing, completing, reopening, deletion and duration handling. |
| Journal | Current entry, storage note, title, five moods, three reflection prompts, editor, save state. | Tested immediate navigation and demo reload. Prompt insertion uses the editor’s normal saving path. |
| Insights | Daily score, interpretation, work, relationships, money, wellbeing, reflection, cycle and meaning panels, priorities link. | Reviewed content and contrast. Existing tests cover guidance selection and score interpretation. |
| You | Account summary, profile edit, appearance, accent, first-session guide reset, five priorities, three guidance styles, integration states, permissions, privacy and exit. | Reviewed six theme/palette combinations on the settings screen. Preference persistence and the three-priority cap have browser coverage. |
| Birth profile | Name, date, time, timezone, coordinates, place, consent, Save and Cancel. | A deliberately invalid timezone kept the form open. The cancellation regression verifies that abandoning an edit preserves the previous name. |
| Quick actions | Search, close, seven commands, Enter, Escape and empty results. | Opened and filtered. Verified a zero-match exit restores keyboard focus and that a plan dialog blocks the shortcut. |
| Privacy | Link from the authentication screen, link from settings, notice headings and return link. Signed-in controls for data export and permanent deletion. | Notice inspected in light and dark. The signed-in suite exercises export and deletion using disposable accounts. |
| Connected features | Password reset link, Google Calendar consent, device notifications, private image consent, diagnostics and installed offline use. | Demo restrictions and automated tests cover portions of these flows. Real inbox delivery, a Google account granting access, OS push delivery and physical-device installation require separate checks. |

## Next product decision

On a first visit, the setup guide, header and timeline can each offer to add a plan. Before removing an entry point, watch a first-time user schedule tomorrow’s first task on a phone. Record which control they choose and whether they can get back to the plan afterward. A similar observation with VoiceOver or TalkBack would test how the date grid and long settings screen feel in actual use.

## Individual control inventory

The following controls were visible in the reviewed states. Repeated task actions, dates and shell navigation are consolidated. A listed control was inspected for presence and accessibility in its rendered screen. The table above identifies which behaviors were also exercised.

### Account entry

| Control | Element |
| --- | --- |
| Email | Input |
| Password | Input |
| Sign in | Button |
| Create an account | Button |
| Forgot password? | Button |
| Continue in demo | Button |
| Privacy and your data | Link |
| Create account | Button |
| Already have an account? Sign in | Button |
| New here? Create an account | Button |

### Today and week

| Control | Element |
| --- | --- |
| ⌂ Today | Button |
| ▦ Plan | Button |
| ✎ Journal | Button |
| ✦ Insights | Button |
| ● You | Button |
| Account shortcut | Button |
| Open quick actions | Button |
| Add plan (header) | Button |
| Today | Button |
| Week | Button |
| Dismiss first-session guide | Button |
| First-session guide · Guidance | Button |
| First-session guide · Plan | Button |
| First-session guide · Journal | Button |
| Daily rhythm · Journal | Button |
| Daily rhythm · Tomorrow | Button |
| Add plan (timeline) | Button |
| Edit | Button |
| Reopen | Button |
| Delete | Button |
| Complete | Button |
| Open your full guidance → | Button |
| Reflect in Journal → | Button |
| Previous week | Button |
| This week | Button |
| Next week | Button |
| ＋ Add plan | Button |

### Calendar and selected day

| Control | Element |
| --- | --- |
| Previous month | Button |
| Today (return to current month) | Button |
| Next month | Button |
| Adjacent-month date (disabled) | Button |
| Month date with date, plan count and selection | Button |
| ＋ Add | Button |
| Export day (.ics) | Button |
| Week-strip date with workload and selection | Button |

### Plan form

| Control | Element |
| --- | --- |
| Close | Button |
| Title | Input |
| Date | Input |
| All day | Input |
| Start time | Input |
| End time and duration | Input |
| Category | Select |
| Low | Button |
| Medium | Button |
| High | Button |
| Repeat pattern | Select |
| At time | Input |
| 5 min before | Input |
| 15 min before | Input |
| 30 min before | Input |
| 1 hour before | Input |
| 1 day before | Input |
| Cancel | Button |
| Add to planner | Button |
| Save changes | Button |
| Repeat until | Input |

### Journal

| Control | Element |
| --- | --- |
| Today’s prompt | Button |
| Pattern check | Button |
| Tomorrow | Button |
| Entry title | Input |
| Very low | Button |
| Neutral | Button |
| Good | Button |
| Great | Button |
| Journal entry | Text area |

### Insights

| Control | Element |
| --- | --- |
| Choose priorities | Button |

### You and preferences

| Control | Element |
| --- | --- |
| Edit birth profile | Button |
| System | Button |
| Light | Button |
| Dark | Button |
| Cosmic | Button |
| Tide | Button |
| Solar | Button |
| Show first-session guide again | Button |
| Focus area · Work | Button |
| Focus area · Relationships | Button |
| Focus area · Money | Button |
| Focus area · Wellbeing | Button |
| Focus area · Growth | Button |
| Guidance style · Practical | Button |
| Guidance style · Balanced | Button |
| Guidance style · Reflective | Button |
| Toggle Morning briefing | Button |
| Toggle Calendar sync | Button |
| Toggle Palm image processing | Button |
| Enable notifications | Button |
| Exit demo | Button |

### Birth profile

| Control | Element |
| --- | --- |
| Display name | Input |
| Birth date | Input |
| Birth time | Input |
| Birth timezone | Input |
| Birth latitude | Input |
| Birth longitude | Input |
| Birth place | Input |
| Consent to reflective guidance | Input |
| Save profile | Button |
| Cancel profile edits | Button |

### Quick actions

| Control | Element |
| --- | --- |
| Search actions | Input |
| Close quick actions | Button |
| Quick action · Add a plan | Button |
| Quick action · Go to Today | Button |
| Quick action · Open Plan | Button |
| Quick action · Open Journal | Button |
| Quick action · Open Insights | Button |
| Quick action · Open You | Button |
| Quick action · Switch appearance | Button |

### Privacy notice

| Control | Element |
| --- | --- |
| ← Cosmic Planner | Link |
