export function PlanDialog() {
  return (
    <div className="modal-backdrop" id="modalBackdrop" hidden>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">Planner</span>
            <h2 id="modalTitle">Add to your planner</h2>
          </div>
          <button className="icon-btn" id="closeModal" aria-label="Close">
            ×
          </button>
        </div>
        <form id="taskForm" className="form-grid">
          <label className="field full">
            <span>Title</span>
            <input
              id="taskTitle"
              required
              maxLength={180}
              placeholder="What do you want to plan?"
            />
          </label>
          <label className="field">
            <span>Date</span>
            <input id="taskDate" type="date" required />
          </label>
          <label className="field">
            <span>Schedule</span>
            <span className="schedule-toggle">
              <input id="taskAllDay" type="checkbox" /> All day
            </span>
          </label>
          <label className="field timed-field">
            <span>Start time</span>
            <input id="taskTime" type="time" defaultValue="14:30" required />
          </label>
          <label className="field timed-field">
            <span>End time</span>
            <input id="taskEndTime" type="time" defaultValue="15:30" required />
            <small className="duration-readout" id="taskDurationReadout">
              Duration · 1h
            </small>
          </label>
          <label className="field full">
            <span>Category</span>
            <select id="taskCategory">
              <option>Work</option>
              <option>Personal</option>
              <option>Finance</option>
              <option>Love</option>
              <option>Wellness</option>
              <option>Social</option>
              <option>Other</option>
            </select>
          </label>
          <fieldset className="field full">
            <legend>Priority</legend>
            <div className="segmented">
              <button type="button" data-priority="Low" aria-pressed={false}>
                Low
              </button>
              <button type="button" data-priority="Medium" aria-pressed={true} className="selected">
                Medium
              </button>
              <button type="button" data-priority="High" aria-pressed={false}>
                High
              </button>
            </div>
          </fieldset>
          <label className="field full">
            <span>Repeat</span>
            <select id="taskRepeat">
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="field full" id="taskRepeatUntilField" hidden>
            <span>Repeat until</span>
            <input id="taskRepeatUntil" type="date" />
            <small className="subtle-help">
              Choose an end date for up to 180 occurrences.
            </small>
          </label>
          <label className="field full" id="taskSeriesScopeField" hidden>
            <span>Editing scope</span>
            <select id="taskSeriesScope">
              <option value="single">This occurrence only</option>
              <option value="future">This and future occurrences</option>
            </select>
            <small className="series-scope-note">
              Changing the recurrence pattern requires “This and future
              occurrences”. Past completed occurrences are preserved.
            </small>
          </label>
          <fieldset className="field full">
            <legend>Reminders</legend>
            <div className="reminder-grid" id="taskReminderGroup">
              <label className="reminder-option">
                <input type="checkbox" name="taskReminder" value="0" />
                At time
              </label>
              <label className="reminder-option">
                <input type="checkbox" name="taskReminder" value="5" />5 min
                before
              </label>
              <label className="reminder-option">
                <input
                  type="checkbox"
                  name="taskReminder"
                  value="15"
                  defaultChecked
                />
                15 min before
              </label>
              <label className="reminder-option">
                <input type="checkbox" name="taskReminder" value="30" />
                30 min before
              </label>
              <label className="reminder-option">
                <input type="checkbox" name="taskReminder" value="60" />1 hour
                before
              </label>
              <label className="reminder-option">
                <input type="checkbox" name="taskReminder" value="1440" />1 day
                before
              </label>
            </div>
          </fieldset>
          <div className="modal-actions full">
            <button type="button" className="secondary-btn" id="cancelTask">
              Cancel
            </button>
            <button className="primary-btn" id="taskSubmit" type="submit">
              Add to planner
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
