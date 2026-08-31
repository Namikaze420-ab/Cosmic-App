(() => {
  const alpha28 = window.CosmicPlanner28;
  if (!alpha28) return;

  const renderHomeBase = renderHome;
  const renderCalendarBase = renderCalendar;
  const DAY_MS = 86400000;
  const MAX_SERIES_OCCURRENCES = 180;
  state.plannerView = state.plannerView || 'today';
  state.homeWeekCursor = state.homeWeekCursor || new Date();
  state.editSeriesScope = 'single';

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function mondayOf(date) {
    const d = startOfDay(date);
    const offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return d;
  }

  function dateInputValue(value) {
    return isoDate(new Date(value));
  }

  function timeInputValue(value) {
    const d = new Date(value);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function nextMonthClamped(date) {
    const source = new Date(date);
    const day = source.getDate();
    const target = new Date(source.getFullYear(), source.getMonth() + 1, 1, source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, last));
    return target;
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (!hours) return `${mins} min`;
    if (!mins) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function timedMinutes(task) {
    if (task.all_day) return 0;
    return alpha28.durationMinutes(task);
  }

  function workloadForDate(date) {
    const tasks = alpha28.tasksForDate(date).filter(task => String(task.source || '').toLowerCase() !== 'google_calendar');
    const timed = tasks.reduce((sum, task) => sum + timedMinutes(task), 0);
    const allDay = tasks.filter(task => task.all_day).length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    let level = 'balanced';
    let label = 'Balanced';
    if (timed > 480) { level = 'overloaded'; label = 'Overloaded'; }
    else if (timed >= 360) { level = 'heavy'; label = 'Heavy'; }
    else if (timed === 0 && allDay === 0) { level = 'open'; label = 'Open'; }
    return { tasks, timed, allDay, completed, level, label };
  }

  function recurrenceLabel(rule) {
    return ({ daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly' })[rule] || '';
  }

  function reminderLabel(values) {
    const map = { 0: 'At time', 5: '5m', 15: '15m', 30: '30m', 60: '1h', 1440: '1d' };
    const vals = Array.isArray(values) ? values : [];
    return vals.length ? vals.map(value => map[value] || `${value}m`).join(' · ') : 'No reminder';
  }

  function isImported(task) {
    return String(task.source || '').toLowerCase().includes('google');
  }

  function persistDemo() {
    localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
  }

  function sortTasks() {
    state.tasks.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  function reminderValuesFromForm() {
    return $$('[name="taskReminder"]:checked').map(input => Number(input.value)).filter(Number.isFinite).sort((a, b) => a - b);
  }

  function setReminderValues(values) {
    const set = new Set((Array.isArray(values) ? values : [15]).map(Number));
    $$('[name="taskReminder"]').forEach(input => { input.checked = set.has(Number(input.value)); });
  }

  function toggleTimedFields() {
    const allDay = $('#taskAllDay')?.checked;
    $$('.timed-field').forEach(field => field.classList.toggle('field-disabled', Boolean(allDay)));
    if ($('#taskTime')) $('#taskTime').disabled = Boolean(allDay);
    if ($('#taskEndTime')) $('#taskEndTime').disabled = Boolean(allDay);
    updateDurationReadout();
  }

  function toggleRepeatFields() {
    const repeat = $('#taskRepeat')?.value || 'none';
    const recurring = repeat !== 'none';
    if ($('#taskRepeatUntilField')) $('#taskRepeatUntilField').hidden = !recurring;
    const scope = $('#taskSeriesScope')?.value || 'single';
    const editingRecurring = Boolean(state.editingTaskId && state.tasks.find(item => item.id === state.editingTaskId)?.recurrence_group_id);
    if ($('#taskRepeat')) $('#taskRepeat').disabled = editingRecurring && scope === 'single';
    if ($('#taskRepeatUntil')) $('#taskRepeatUntil').disabled = !recurring || (editingRecurring && scope === 'single');
  }

  function updateDurationReadout() {
    const readout = $('#taskDurationReadout');
    if (!readout) return;
    if ($('#taskAllDay')?.checked) {
      readout.textContent = 'All-day plan';
      return;
    }
    const start = $('#taskTime')?.value;
    const end = $('#taskEndTime')?.value;
    if (!start || !end) {
      readout.textContent = 'Choose start and end time';
      return;
    }
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes <= 0) minutes += 1440;
    readout.textContent = `Duration · ${formatDuration(minutes)}${minutes > 720 ? ' · overnight' : ''}`;
  }

  function defaultRepeatUntil(date) {
    const d = new Date(date);
    d.setDate(d.getDate() + 90);
    return isoDate(d);
  }

  function buildOccurrenceDates(start, rule, until) {
    if (rule === 'none') return [new Date(start)];
    const limit = startOfDay(parseDate(until));
    const results = [];
    let cursor = new Date(start);
    for (let index = 0; index < MAX_SERIES_OCCURRENCES && startOfDay(cursor) <= limit; index++) {
      if (rule !== 'weekdays' || (cursor.getDay() !== 0 && cursor.getDay() !== 6)) results.push(new Date(cursor));
      if (rule === 'daily' || rule === 'weekdays') cursor = addDays(cursor, 1);
      else if (rule === 'weekly') cursor = addDays(cursor, 7);
      else if (rule === 'monthly') cursor = nextMonthClamped(cursor);
      else break;
    }
    return results;
  }

  function buildDateTimes(dateString, startTime, endTime, allDay) {
    if (allDay) {
      const start = new Date(`${dateString}T00:00:00`);
      const end = addDays(start, 1);
      return { start, end };
    }
    const start = new Date(`${dateString}T${startTime}:00`);
    let end = new Date(`${dateString}T${endTime}:00`);
    if (end <= start) end = addDays(end, 1);
    return { start, end };
  }

  function occurrencePayloads(fields, start, end, rule, until, groupId) {
    const dates = buildOccurrenceDates(start, rule, until);
    const duration = end.getTime() - start.getTime();
    return dates.map((date, index) => ({
      id: crypto.randomUUID(),
      ...fields,
      starts_at: date.toISOString(),
      ends_at: new Date(date.getTime() + duration).toISOString(),
      recurrence_rule: rule,
      recurrence_group_id: rule === 'none' ? null : groupId,
      recurrence_until: rule === 'none' ? null : until,
      status: 'planned',
      source: 'cosmic_planner',
      _seriesIndex: index,
    }));
  }

  function formFields() {
    const date = $('#taskDate').value;
    const title = $('#taskTitle').value.trim();
    const allDay = Boolean($('#taskAllDay')?.checked);
    const startTime = allDay ? '00:00' : $('#taskTime').value;
    const endTime = allDay ? '00:00' : $('#taskEndTime').value;
    const repeat = $('#taskRepeat')?.value || 'none';
    const until = repeat === 'none' ? null : $('#taskRepeatUntil').value;
    if (!date || !title || (!allDay && (!startTime || !endTime))) return { error: 'Complete the required planner fields.' };
    if (repeat !== 'none' && !until) return { error: 'Choose when the recurring series ends.' };
    if (until && parseDate(until) < parseDate(date)) return { error: 'Repeat end date cannot be before the first occurrence.' };
    const { start, end } = buildDateTimes(date, startTime, endTime, allDay);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: 'Choose a valid date and time.' };
    const reminders = reminderValuesFromForm();
    return {
      date,
      start,
      end,
      repeat,
      until,
      fields: {
        title,
        category: $('#taskCategory').value.toLowerCase(),
        priority: String(state.priority).toLowerCase(),
        all_day: allDay,
        reminder_minutes: reminders,
      },
    };
  }

  taskHTML = function alpha29TaskHTML(task) {
    const done = task.status === 'completed';
    const score = taskScore(task);
    const imported = isImported(task);
    const source = imported ? 'Google Calendar · read only' : `${cap(task.category)} · ${cap(task.priority)}`;
    const recurrence = recurrenceLabel(task.recurrence_rule);
    const duration = task.all_day ? 'All day' : formatDuration(alpha28.durationMinutes(task));
    const controls = imported
      ? '<div class="task-readonly">Imported event · manage changes in Google Calendar</div>'
      : `<div class="task-controls"><button class="task-mini" data-task-action="edit" data-id="${task.id}">Edit</button><button class="task-mini" data-task-action="toggle" data-id="${task.id}">${done ? 'Reopen' : 'Complete'}</button><button class="task-mini" data-task-action="delete" data-id="${task.id}">Delete</button>${task.recurrence_group_id ? `<button class="task-mini" data-task-action="delete-future" data-id="${task.id}">Delete future</button>` : ''}</div>`;
    return `<div class="timeline-item ${done ? 'completed' : ''}" data-task-id="${task.id}"><div class="time">${task.all_day ? 'ALL DAY' : fmtTime(task.starts_at)}</div><div class="rail"><span class="dot"></span></div><div class="task-body"><strong>${esc(task.title)}</strong><small>${done ? 'Completed' : 'Planned'} · ${source}</small><div class="task-meta"><span class="tag ${score >= 85 ? 'good' : 'accent'}">${score}% reflection</span><span class="tag">${duration}</span>${recurrence ? `<span class="tag">↻ ${recurrence}</span>` : ''}<span class="tag">⏰ ${esc(reminderLabel(task.reminder_minutes))}</span></div>${controls}</div></div>`;
  };

  function resetModalState() {
    $('#taskForm').reset();
    $('#taskDate').value = isoDate(new Date());
    $('#taskTime').value = '14:30';
    $('#taskEndTime').value = '15:30';
    $('#taskAllDay').checked = false;
    $('#taskRepeat').value = 'none';
    $('#taskRepeatUntil').value = defaultRepeatUntil(new Date());
    $('#taskSeriesScopeField').hidden = true;
    $('#taskSeriesScope').value = 'single';
    $('#taskRepeatUntilField').hidden = true;
    setReminderValues([15]);
    state.editingTaskId = null;
    state.editSeriesScope = 'single';
    state.priority = 'Medium';
    $$('[data-priority]').forEach(button => button.classList.toggle('selected', button.dataset.priority === 'Medium'));
    $('#modalTitle').textContent = 'Add to your planner';
    $('#taskSubmit').textContent = 'Add to planner';
    toggleTimedFields();
    toggleRepeatFields();
  }

  openModal = function alpha29OpenModal(date = new Date(), taskId = null) {
    const eventLike = date && typeof date === 'object' && typeof date.preventDefault === 'function' && 'target' in date;
    if (eventLike) date = new Date();
    const task = taskId ? state.tasks.find(item => item.id === taskId) : null;
    if (task && isImported(task)) return toast('Google Calendar events are read only in Cosmic Planner');

    const targetDate = task ? new Date(task.starts_at) : new Date(date || new Date());
    state.editingTaskId = task?.id || null;
    $('#taskDate').value = dateInputValue(targetDate);
    $('#taskTitle').value = task?.title || '';
    $('#taskCategory').value = cap(task?.category || 'Work');
    $('#taskAllDay').checked = Boolean(task?.all_day);
    $('#taskTime').value = task?.all_day ? '14:30' : (task ? timeInputValue(task.starts_at) : '14:30');
    $('#taskEndTime').value = task?.all_day ? '15:30' : (task?.ends_at ? timeInputValue(task.ends_at) : '15:30');
    $('#taskRepeat').value = task?.recurrence_rule || 'none';
    $('#taskRepeatUntil').value = task?.recurrence_until || defaultRepeatUntil(targetDate);
    setReminderValues(task?.reminder_minutes || [15]);
    state.priority = cap(task?.priority || 'Medium');
    $$('[data-priority]').forEach(button => button.classList.toggle('selected', button.dataset.priority === state.priority));

    const recurring = Boolean(task?.recurrence_group_id);
    $('#taskSeriesScopeField').hidden = !recurring;
    $('#taskSeriesScope').value = 'single';
    state.editSeriesScope = 'single';
    $('#modalTitle').textContent = task ? 'Edit plan' : 'Add to your planner';
    $('#taskSubmit').textContent = task ? 'Save changes' : 'Add to planner';
    $('#modalBackdrop').hidden = false;
    toggleTimedFields();
    toggleRepeatFields();
    setTimeout(() => $('#taskTitle').focus(), 20);
  };

  closeModal = function alpha29CloseModal() {
    $('#modalBackdrop').hidden = true;
    resetModalState();
  };

  async function insertRows(payloads) {
    const rows = payloads.map(({ _seriesIndex, ...row }) => row);
    if (state.mode === 'demo') {
      state.tasks.push(...rows);
      sortTasks();
      persistDemo();
      return rows;
    }
    const withUser = rows.map(row => ({ ...row, user_id: state.user.id }));
    const { data, error } = await sb.from('planner_items').insert(withUser).select();
    if (error) throw error;
    state.tasks.push(...(data || []));
    sortTasks();
    return data || [];
  }

  async function updateSingle(existing, parsed) {
    const fields = {
      ...parsed.fields,
      starts_at: parsed.start.toISOString(),
      ends_at: parsed.end.toISOString(),
    };
    if (state.mode === 'demo') {
      Object.assign(existing, fields);
      sortTasks();
      persistDemo();
      return existing;
    }
    const { data, error } = await sb.from('planner_items').update(fields).eq('id', existing.id).select().single();
    if (error) throw error;
    Object.assign(existing, data);
    sortTasks();
    return existing;
  }

  async function replaceFutureSeries(existing, parsed) {
    const oldGroup = existing.recurrence_group_id;
    const oldStart = existing.starts_at;
    const newGroup = parsed.repeat === 'none' ? null : crypto.randomUUID();
    const baseFields = { ...parsed.fields };
    const payloads = occurrencePayloads(baseFields, parsed.start, parsed.end, parsed.repeat, parsed.until, newGroup);

    if (state.mode === 'demo') {
      state.tasks = state.tasks.filter(item => !(item.recurrence_group_id === oldGroup && new Date(item.starts_at) >= new Date(oldStart)));
      state.tasks.push(...payloads.map(({ _seriesIndex, ...row }) => row));
      sortTasks();
      persistDemo();
      return;
    }

    const rows = payloads.map(({ _seriesIndex, ...row }) => ({ ...row, user_id: state.user.id }));
    const { data, error: insertError } = await sb.from('planner_items').insert(rows).select();
    if (insertError) throw insertError;
    const { error: deleteError } = await sb.from('planner_items')
      .delete()
      .eq('user_id', state.user.id)
      .eq('recurrence_group_id', oldGroup)
      .gte('starts_at', oldStart);
    if (deleteError) {
      const insertedIds = (data || []).map(row => row.id);
      if (insertedIds.length) await sb.from('planner_items').delete().in('id', insertedIds);
      throw deleteError;
    }
    state.tasks = state.tasks.filter(item => !(item.recurrence_group_id === oldGroup && new Date(item.starts_at) >= new Date(oldStart)));
    state.tasks.push(...(data || []));
    sortTasks();
  }

  function rerenderPlannerSurface() {
    syncChrome();
    if (state.page === 'calendar') renderCalendar();
    else if (state.page === 'home') renderHome();
  }

  addTask = async function alpha29AddTask(event) {
    event?.preventDefault?.();
    const parsed = formFields();
    if (parsed.error) return toast(parsed.error);
    const existing = state.editingTaskId ? state.tasks.find(item => item.id === state.editingTaskId) : null;

    try {
      if (existing) {
        const recurring = Boolean(existing.recurrence_group_id);
        const scope = recurring ? ($('#taskSeriesScope').value || 'single') : 'single';
        if (recurring && scope === 'future') await replaceFutureSeries(existing, parsed);
        else await updateSingle(existing, parsed);
        state.selectedDate = parseDate(parsed.date);
        closeModal();
        rerenderPlannerSurface();
        toast(recurring && scope === 'future' ? 'This and future plans updated' : 'Plan updated');
        return;
      }

      const groupId = parsed.repeat === 'none' ? null : crypto.randomUUID();
      const payloads = occurrencePayloads(parsed.fields, parsed.start, parsed.end, parsed.repeat, parsed.until, groupId);
      if (!payloads.length) return toast('No occurrences fall inside that recurrence range.');
      await insertRows(payloads);
      state.selectedDate = parseDate(parsed.date);
      closeModal();
      rerenderPlannerSurface();
      const suffix = payloads.length > 1 ? ` · ${payloads.length} occurrences` : '';
      toast(state.mode === 'demo' ? `Plan saved locally${suffix}` : `Plan saved to cloud${suffix}`);
    } catch (error) {
      toast(error?.message || 'Planner save failed');
    }
  };

  async function deleteFuture(task) {
    const group = task.recurrence_group_id;
    if (!group) return;
    const start = task.starts_at;
    if (state.mode === 'demo') {
      state.tasks = state.tasks.filter(item => !(item.recurrence_group_id === group && new Date(item.starts_at) >= new Date(start)));
      persistDemo();
      return;
    }
    const { error } = await sb.from('planner_items')
      .delete()
      .eq('user_id', state.user.id)
      .eq('recurrence_group_id', group)
      .gte('starts_at', start);
    if (error) throw error;
    state.tasks = state.tasks.filter(item => !(item.recurrence_group_id === group && new Date(item.starts_at) >= new Date(start)));
  }

  taskAction = async function alpha29TaskAction(action, id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    if (isImported(task)) return toast('Google Calendar events are read only in Cosmic Planner');
    if (action === 'edit') return openModal(new Date(task.starts_at), task.id);

    try {
      if (action === 'toggle') {
        const status = task.status === 'completed' ? 'planned' : 'completed';
        if (state.mode === 'demo') {
          task.status = status;
          persistDemo();
        } else {
          const { error } = await sb.from('planner_items').update({ status }).eq('id', id);
          if (error) throw error;
          task.status = status;
        }
      } else if (action === 'delete') {
        if (state.mode === 'demo') {
          state.tasks = state.tasks.filter(item => item.id !== id);
          persistDemo();
        } else {
          const { error } = await sb.from('planner_items').delete().eq('id', id);
          if (error) throw error;
          state.tasks = state.tasks.filter(item => item.id !== id);
        }
      } else if (action === 'delete-future') {
        await deleteFuture(task);
        toast('This and future occurrences deleted');
      }
      rerenderPlannerSurface();
    } catch (error) {
      toast(error?.message || 'Planner update failed');
    }
  };

  function workloadBadge(date, compact = false) {
    const load = workloadForDate(date);
    const details = `${formatDuration(load.timed)} timed${load.allDay ? ` · ${load.allDay} all-day` : ''}`;
    return `<div class="workload-badge ${load.level} ${compact ? 'compact' : ''}"><span>${load.label}</span><strong>${details}</strong></div>`;
  }

  function plannerViewSwitch() {
    return `<div class="planner-view-switch" role="group" aria-label="Planner view"><button data-planner-view="today" class="${state.plannerView === 'today' ? 'selected' : ''}">Today</button><button data-planner-view="week" class="${state.plannerView === 'week' ? 'selected' : ''}">Week</button></div>`;
  }

  function bindPlannerViewSwitch() {
    $$('[data-planner-view]').forEach(button => button.onclick = () => {
      state.plannerView = button.dataset.plannerView;
      if (state.plannerView === 'week') state.homeWeekCursor = new Date();
      renderHome();
    });
  }

  function bindTaskButtons(root = document) {
    root.querySelectorAll('[data-task-action]').forEach(button => {
      button.onclick = () => taskAction(button.dataset.taskAction, button.dataset.id);
    });
  }

  function enhanceTodayHome() {
    const page = $('#page-home');
    const grid = page.querySelector('.home-grid');
    if (!grid) return;
    grid.insertAdjacentHTML('beforebegin', `<div class="planner-home-toolbar"><div><span class="eyebrow">Planning mode · Alpha 2.9</span><h2>Today</h2></div>${plannerViewSwitch()}</div>`);
    const card = page.querySelector('.planner-card');
    if (card) {
      const head = card.querySelector('.card-head');
      head?.insertAdjacentHTML('afterend', `<div class="day-workload-strip">${workloadBadge(new Date())}</div>`);
    }
    bindPlannerViewSwitch();
    bindTaskButtons(page);
  }

  async function moveHomeWeek(days) {
    state.homeWeekCursor = addDays(state.homeWeekCursor, days);
    try {
      await alpha28.ensurePlannerMonth(state.homeWeekCursor);
      await alpha28.ensurePlannerMonth(addDays(state.homeWeekCursor, 6));
    } catch {
      toast('Could not load that week');
    }
    renderHome();
  }

  function renderWeekHome() {
    syncChrome();
    const start = mondayOf(state.homeWeekCursor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const totalTimed = days.reduce((sum, day) => sum + workloadForDate(day).timed, 0);
    const totalPlans = days.reduce((sum, day) => sum + alpha28.tasksForDate(day).length, 0);
    const heavyDays = days.filter(day => ['heavy', 'overloaded'].includes(workloadForDate(day).level)).length;
    $('#page-home').innerHTML = `<div class="planner-home-toolbar"><div><span class="eyebrow">Planning mode · Alpha 2.9</span><h2>Week of ${fmtDate(start, { day: 'numeric', month: 'short' })}</h2></div>${plannerViewSwitch()}</div><section class="card week-command-card"><div class="week-command-head"><div><span class="eyebrow">Weekly command view</span><h2>${fmtDate(start, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(start, 6), { day: 'numeric', month: 'short', year: 'numeric' })}</h2></div><div class="week-command-actions"><button class="icon-btn" id="homePrevWeek" aria-label="Previous week">‹</button><button class="ghost-btn" id="homeThisWeek">This week</button><button class="icon-btn" id="homeNextWeek" aria-label="Next week">›</button></div></div><div class="week-summary"><div><span>Plans</span><strong>${totalPlans}</strong></div><div><span>Timed load</span><strong>${formatDuration(totalTimed)}</strong></div><div><span>Heavy days</span><strong>${heavyDays}</strong></div></div></section><div class="week-agenda">${days.map(day => {
      const load = workloadForDate(day);
      const tasks = alpha28.tasksForDate(day);
      return `<section class="card week-agenda-day ${isoDate(day) === isoDate(new Date()) ? 'today' : ''}"><div class="week-agenda-head"><div><span>${fmtDate(day, { weekday: 'short' })}</span><strong>${fmtDate(day, { day: 'numeric', month: 'short' })}</strong></div>${workloadBadge(day, true)}</div><div class="week-agenda-tasks">${tasks.length ? tasks.map(taskHTML).join('') : '<div class="journal-prompt">Open day.</div>'}</div><button class="ghost-btn week-add" data-week-add="${isoDate(day)}">＋ Add plan</button></section>`;
    }).join('')}</div>`;
    bindPlannerViewSwitch();
    $('#homePrevWeek').onclick = () => moveHomeWeek(-7);
    $('#homeNextWeek').onclick = () => moveHomeWeek(7);
    $('#homeThisWeek').onclick = () => { state.homeWeekCursor = new Date(); renderHome(); };
    $$('[data-week-add]').forEach(button => button.onclick = () => openModal(parseDate(button.dataset.weekAdd)));
    bindTaskButtons($('#page-home'));
  }

  renderHome = function alpha29RenderHome() {
    if (state.plannerView === 'week') return renderWeekHome();
    renderHomeBase();
    enhanceTodayHome();
  };

  function weekMarkup29(selectedDate) {
    const start = mondayOf(selectedDate);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const totalMinutes = days.reduce((sum, day) => sum + workloadForDate(day).timed, 0);
    const totalTasks = days.reduce((sum, day) => sum + alpha28.tasksForDate(day).length, 0);
    const heavy = days.filter(day => ['heavy', 'overloaded'].includes(workloadForDate(day).level)).length;
    return `<section class="card week-card"><div class="card-head"><div><span class="eyebrow">Weekly workload · Alpha 2.9</span><h3>${fmtDate(start, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(start, 6), { day: 'numeric', month: 'short' })}</h3></div><span class="week-total">${totalTasks} plans · ${formatDuration(totalMinutes)}${heavy ? ` · ${heavy} heavy day${heavy === 1 ? '' : 's'}` : ''}</span></div><div class="week-grid">${days.map(day => {
      const tasks = alpha28.tasksForDate(day);
      const load = workloadForDate(day);
      const complete = tasks.filter(task => task.status === 'completed').length;
      return `<button class="week-day ${isoDate(day) === isoDate(selectedDate) ? 'selected' : ''} ${isoDate(day) === isoDate(new Date()) ? 'today' : ''} load-${load.level}" data-week-date="${isoDate(day)}"><span>${fmtDate(day, { weekday: 'short' })}</span><strong>${day.getDate()}</strong><small>${tasks.length ? `${tasks.length} plan${tasks.length === 1 ? '' : 's'} · ${formatDuration(load.timed)}${load.allDay ? ` + ${load.allDay} all-day` : ''}` : 'Free'}</small><em>${load.label}</em>${tasks.length ? `<i style="width:${Math.round((complete / tasks.length) * 100)}%"></i>` : '<i style="width:0"></i>'}</button>`;
    }).join('')}</div></section>`;
  }

  function patchCalendar29() {
    const page = $('#page-calendar');
    const eyebrow = page.querySelector('.calendar-toolbar .eyebrow');
    if (eyebrow) eyebrow.textContent = 'Month view · Alpha 2.9';
    const selected = page.querySelector('.selected-day-panel');
    if (selected && !selected.querySelector('.selected-load')) {
      const plansHead = selected.querySelector('.selected-plans-head');
      plansHead?.insertAdjacentHTML('beforebegin', `<div class="selected-load">${workloadBadge(state.selectedDate)}</div>`);
    }
    const oldWeek = page.querySelector('.week-card');
    if (oldWeek) oldWeek.outerHTML = weekMarkup29(state.selectedDate);
    $$('[data-week-date]').forEach(button => button.onclick = async () => {
      state.selectedDate = parseDate(button.dataset.weekDate);
      state.calendarCursor = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
      try { await alpha28.ensurePlannerMonth(state.selectedDate); } catch { toast('Could not load plans'); }
      renderCalendar();
    });
    bindTaskButtons(page);
  }

  renderCalendar = function alpha29RenderCalendar() {
    renderCalendarBase();
    patchCalendar29();
  };

  function bindModal29() {
    $('#taskAllDay').onchange = toggleTimedFields;
    $('#taskTime').oninput = updateDurationReadout;
    $('#taskEndTime').oninput = updateDurationReadout;
    $('#taskRepeat').onchange = () => {
      if ($('#taskRepeat').value !== 'none' && !$('#taskRepeatUntil').value) $('#taskRepeatUntil').value = defaultRepeatUntil(parseDate($('#taskDate').value || isoDate()));
      toggleRepeatFields();
    };
    $('#taskDate').onchange = () => {
      if ($('#taskRepeat').value !== 'none') $('#taskRepeatUntil').min = $('#taskDate').value;
    };
    $('#taskSeriesScope').onchange = () => {
      state.editSeriesScope = $('#taskSeriesScope').value;
      toggleRepeatFields();
    };
    $('#quickAdd').onclick = () => openModal(state.page === 'calendar' ? state.selectedDate : new Date());
    $('#closeModal').onclick = closeModal;
    $('#cancelTask').onclick = closeModal;
    $('#taskForm').onsubmit = addTask;
    $('#modalBackdrop').onclick = event => { if (event.target === $('#modalBackdrop')) closeModal(); };
    resetModalState();
  }

  bindModal29();

  window.CosmicPlanner29 = Object.freeze({
    workloadForDate,
    buildOccurrenceDates,
    formatDuration,
    timedMinutes,
  });
})();