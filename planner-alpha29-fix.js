(() => {
  const alpha28 = window.CosmicPlanner28;
  const alpha29 = window.CosmicPlanner29;
  if (!alpha28 || !alpha29) return;

  const openModal29 = openModal;
  const addTask29 = addTask;
  const renderHome29 = renderHome;
  const renderCalendar29 = renderCalendar;
  const allDayHandler29 = $('#taskAllDay')?.onchange;

  state.modalDurationMinutes = Number(state.modalDurationMinutes) || 60;
  state.modalEndDirty = false;

  function clockMinutes(value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }

  function clockValue(total) {
    const normalized = ((Math.round(total) % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
  }

  function durationFromControls() {
    const start = clockMinutes($('#taskTime')?.value);
    const end = clockMinutes($('#taskEndTime')?.value);
    if (start === null || end === null) return null;
    let minutes = end - start;
    if (minutes <= 0) minutes += 1440;
    return minutes;
  }

  function paintDuration() {
    const readout = $('#taskDurationReadout');
    if (!readout) return;
    if ($('#taskAllDay')?.checked) {
      readout.textContent = 'All-day plan';
      return;
    }
    const start = clockMinutes($('#taskTime')?.value);
    const end = clockMinutes($('#taskEndTime')?.value);
    if (start === null || end === null) {
      readout.textContent = 'Choose start and end time';
      return;
    }
    const minutes = durationFromControls();
    const overnight = end <= start;
    readout.textContent = `Duration · ${alpha29.formatDuration(minutes)}${overnight ? ' · overnight' : ''}`;
  }

  function shiftEndWithStart() {
    const start = clockMinutes($('#taskTime')?.value);
    if (start === null || state.modalEndDirty) return paintDuration();
    $('#taskEndTime').value = clockValue(start + Math.max(1, state.modalDurationMinutes || 60));
    paintDuration();
  }

  function initializeDurationTracker() {
    const task = state.editingTaskId ? state.tasks.find(item => item.id === state.editingTaskId) : null;
    state.modalDurationMinutes = task && !task.all_day
      ? Math.max(1, alpha28.durationMinutes(task) || 60)
      : 60;
    state.modalEndDirty = false;
    if ($('#taskRepeatUntil') && $('#taskDate')) $('#taskRepeatUntil').min = $('#taskDate').value || '';
    paintDuration();
    const modal = document.querySelector('.modal');
    if (modal) modal.scrollTop = 0;
  }

  openModal = function alpha29FixedOpenModal(date = new Date(), taskId = null) {
    const result = openModal29(date, taskId);
    if (!$('#modalBackdrop')?.hidden) initializeDurationTracker();
    return result;
  };

  if ($('#taskTime')) {
    $('#taskTime').oninput = () => shiftEndWithStart();
  }
  if ($('#taskEndTime')) {
    $('#taskEndTime').oninput = () => {
      state.modalEndDirty = true;
      const duration = durationFromControls();
      if (duration) state.modalDurationMinutes = duration;
      paintDuration();
    };
  }
  if ($('#taskAllDay')) {
    $('#taskAllDay').onchange = event => {
      if (typeof allDayHandler29 === 'function') allDayHandler29.call($('#taskAllDay'), event);
      if (!$('#taskAllDay').checked && !state.modalEndDirty) shiftEndWithStart();
      else paintDuration();
    };
  }

  function parsePlannerForm() {
    const date = $('#taskDate')?.value;
    const title = $('#taskTitle')?.value.trim();
    const allDay = Boolean($('#taskAllDay')?.checked);
    const rule = $('#taskRepeat')?.value || 'none';
    const until = rule === 'none' ? null : $('#taskRepeatUntil')?.value;
    if (!date || !title) return { error: 'Complete the required planner fields.' };
    if (rule !== 'none' && !until) return { error: 'Choose when the recurring series ends.' };
    if (until && parseDate(until) < parseDate(date)) return { error: 'Repeat end date cannot be before the first occurrence.' };

    let start;
    let end;
    if (allDay) {
      start = new Date(`${date}T00:00:00`);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else {
      const startTime = $('#taskTime')?.value;
      const endTime = $('#taskEndTime')?.value;
      if (!startTime || !endTime) return { error: 'Choose a valid start and end time.' };
      start = new Date(`${date}T${startTime}:00`);
      end = new Date(`${date}T${endTime}:00`);
      if (end <= start) end.setDate(end.getDate() + 1);
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: 'Choose a valid date and time.' };

    const reminders = $$('[name="taskReminder"]:checked')
      .map(input => Number(input.value))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    return {
      date,
      start,
      end,
      rule,
      until,
      fields: {
        title,
        category: String($('#taskCategory')?.value || 'Work').toLowerCase(),
        priority: String(state.priority || 'Medium').toLowerCase(),
        all_day: allDay,
        reminder_minutes: reminders,
      },
    };
  }

  function occurrenceRows(parsed, groupId, existingStatus = 'planned') {
    const dates = alpha29.buildOccurrenceDates(parsed.start, parsed.rule, parsed.until);
    const durationMs = parsed.end.getTime() - parsed.start.getTime();
    return dates.map((date, index) => ({
      id: crypto.randomUUID(),
      ...parsed.fields,
      starts_at: date.toISOString(),
      ends_at: new Date(date.getTime() + durationMs).toISOString(),
      recurrence_rule: parsed.rule,
      recurrence_group_id: groupId,
      recurrence_until: parsed.until,
      status: index === 0 ? existingStatus : 'planned',
      source: 'cosmic_planner',
    }));
  }

  function persistDemo() {
    localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
  }

  function sortTasks() {
    state.tasks.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  function rerenderPlanner() {
    syncChrome();
    if (state.page === 'calendar') renderCalendar();
    else if (state.page === 'home') renderHome();
  }

  async function convertOneOffToSeries(existing, parsed) {
    const groupId = crypto.randomUUID();
    const rows = occurrenceRows(parsed, groupId, existing.status || 'planned');
    if (!rows.length) return toast('No occurrences fall inside that recurrence range.');

    if (state.mode === 'demo') {
      state.tasks = state.tasks.filter(item => item.id !== existing.id);
      state.tasks.push(...rows);
      sortTasks();
      persistDemo();
    } else {
      const insertRows = rows.map(row => ({ ...row, user_id: state.user.id }));
      const { data, error: insertError } = await sb.from('planner_items').insert(insertRows).select();
      if (insertError) throw insertError;
      const { error: deleteError } = await sb.from('planner_items')
        .delete()
        .eq('user_id', state.user.id)
        .eq('id', existing.id);
      if (deleteError) {
        const ids = (data || []).map(row => row.id);
        if (ids.length) await sb.from('planner_items').delete().in('id', ids);
        throw deleteError;
      }
      state.tasks = state.tasks.filter(item => item.id !== existing.id);
      state.tasks.push(...(data || []));
      sortTasks();
    }

    state.selectedDate = parseDate(parsed.date);
    closeModal();
    rerenderPlanner();
    toast(`Plan converted to recurring series · ${rows.length} occurrences`);
  }

  addTask = async function alpha29FixedAddTask(event) {
    const existing = state.editingTaskId ? state.tasks.find(item => item.id === state.editingTaskId) : null;
    const requestedRule = $('#taskRepeat')?.value || 'none';
    if (!existing || existing.recurrence_group_id || requestedRule === 'none') return addTask29(event);

    event?.preventDefault?.();
    const parsed = parsePlannerForm();
    if (parsed.error) return toast(parsed.error);
    try {
      await convertOneOffToSeries(existing, parsed);
    } catch (error) {
      toast(error?.message || 'Recurring series conversion failed');
    }
  };
  if ($('#taskForm')) $('#taskForm').onsubmit = addTask;

  function workloadForDate(date) {
    const tasks = alpha28.tasksForDate(date);
    const timed = tasks.reduce((sum, task) => sum + (task.all_day ? 0 : alpha28.durationMinutes(task)), 0);
    const allDay = tasks.filter(task => task.all_day).length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    let level = 'balanced';
    let label = 'Balanced';
    if (timed > 480) { level = 'overloaded'; label = 'Overloaded'; }
    else if (timed >= 360) { level = 'heavy'; label = 'Heavy'; }
    else if (timed === 0 && allDay === 0) { level = 'open'; label = 'Open'; }
    return { tasks, timed, allDay, completed, level, label };
  }

  function workloadText(load) {
    return `${alpha29.formatDuration(load.timed)} timed${load.allDay ? ` · ${load.allDay} all-day` : ''}`;
  }

  function patchBadge(element, date) {
    if (!element) return;
    const load = workloadForDate(date);
    element.classList.remove('open', 'balanced', 'heavy', 'overloaded');
    element.classList.add(load.level);
    const label = element.querySelector('span');
    const detail = element.querySelector('strong');
    if (label) label.textContent = load.label;
    if (detail) detail.textContent = workloadText(load);
  }

  function patchHomeWorkload() {
    if (state.plannerView === 'today') {
      patchBadge($('#page-home .day-workload-strip .workload-badge'), new Date());
      return;
    }
    let totalMinutes = 0;
    let totalPlans = 0;
    let heavyDays = 0;
    $$('#page-home .week-agenda-day').forEach(card => {
      const dateValue = card.querySelector('[data-week-add]')?.dataset.weekAdd;
      if (!dateValue) return;
      const date = parseDate(dateValue);
      const load = workloadForDate(date);
      totalMinutes += load.timed;
      totalPlans += load.tasks.length;
      if (load.level === 'heavy' || load.level === 'overloaded') heavyDays += 1;
      patchBadge(card.querySelector('.workload-badge'), date);
    });
    const summary = $$('#page-home .week-summary > div strong');
    if (summary[0]) summary[0].textContent = String(totalPlans);
    if (summary[1]) summary[1].textContent = alpha29.formatDuration(totalMinutes);
    if (summary[2]) summary[2].textContent = String(heavyDays);
  }

  function patchCalendarWorkload() {
    patchBadge($('#page-calendar .selected-load .workload-badge'), state.selectedDate);
    let weekMinutes = 0;
    let weekPlans = 0;
    let heavyDays = 0;
    $$('#page-calendar [data-week-date]').forEach(button => {
      const date = parseDate(button.dataset.weekDate);
      const load = workloadForDate(date);
      weekMinutes += load.timed;
      weekPlans += load.tasks.length;
      if (load.level === 'heavy' || load.level === 'overloaded') heavyDays += 1;
      button.classList.remove('load-open', 'load-balanced', 'load-heavy', 'load-overloaded');
      button.classList.add(`load-${load.level}`);
      const small = button.querySelector('small');
      const label = button.querySelector('em');
      if (small) small.textContent = load.tasks.length
        ? `${load.tasks.length} plan${load.tasks.length === 1 ? '' : 's'} · ${alpha29.formatDuration(load.timed)}${load.allDay ? ` + ${load.allDay} all-day` : ''}`
        : 'Free';
      if (label) label.textContent = load.label;
    });
    const total = $('#page-calendar .week-total');
    if (total) total.textContent = `${weekPlans} plans · ${alpha29.formatDuration(weekMinutes)}${heavyDays ? ` · ${heavyDays} heavy day${heavyDays === 1 ? '' : 's'}` : ''}`;
  }

  renderHome = function alpha29FixedRenderHome() {
    const result = renderHome29();
    patchHomeWorkload();
    return result;
  };

  renderCalendar = function alpha29FixedRenderCalendar() {
    const result = renderCalendar29();
    patchCalendarWorkload();
    return result;
  };

  window.CosmicPlanner29 = Object.freeze({
    ...alpha29,
    workloadForDate,
  });
})();