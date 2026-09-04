(() => {
  const DAY_MS = 86400000;
  state.editingTaskId = null;
  state.plannerLoadedStart = null;
  state.plannerLoadedEnd = null;

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
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

  function timeInputValue(value) {
    const d = new Date(value);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function durationMinutes(task) {
    const start = new Date(task.starts_at).getTime();
    const end = new Date(task.ends_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
    return Math.max(1, Math.round((end - start) / 60000));
  }

  function tasksForDate(date) {
    const key = isoDate(date);
    return state.tasks
      .filter(task => isoDate(new Date(task.starts_at)) === key)
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  function mergeTasks(rows) {
    const map = new Map(state.tasks.map(task => [task.id, task]));
    for (const row of rows || []) map.set(row.id, row);
    state.tasks = [...map.values()].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  async function fetchPlannerRange(start, end) {
    if (state.mode !== 'live' || !state.user || !sb) return;
    const { data, error } = await sb
      .from('planner_items')
      .select('*')
      .eq('user_id', state.user.id)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString())
      .order('starts_at');
    if (error) throw error;
    mergeTasks(data || []);
    if (!state.plannerLoadedStart || start < state.plannerLoadedStart) state.plannerLoadedStart = new Date(start);
    if (!state.plannerLoadedEnd || end > state.plannerLoadedEnd) state.plannerLoadedEnd = new Date(end);
  }

  async function ensurePlannerMonth(date) {
    if (state.mode !== 'live') return;
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 7));
    if (state.plannerLoadedStart && state.plannerLoadedEnd && monthStart >= state.plannerLoadedStart && monthEnd <= state.plannerLoadedEnd) return;
    await fetchPlannerRange(monthStart, monthEnd);
  }

  loadData = async function alpha28LoadData() {
    const uid = state.user.id;
    const today = startOfDay(new Date());
    const plannerStart = addDays(today, -31);
    const plannerEnd = endOfDay(addDays(today, 365));
    const [p, pr, t, d] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('user_preferences').select('*').eq('user_id', uid).maybeSingle(),
      sb.from('planner_items').select('*').eq('user_id', uid).gte('starts_at', plannerStart.toISOString()).lte('starts_at', plannerEnd.toISOString()).order('starts_at'),
      sb.from('diary_entries').select('*').eq('user_id', uid).eq('entry_date', isoDate()).maybeSingle(),
    ]);
    state.profile = p.data;
    state.preferences = pr.data;
    state.tasks = t.data || [];
    state.diary = d.data;
    state.plannerLoadedStart = plannerStart;
    state.plannerLoadedEnd = plannerEnd;
    if (!state.profile?.birth_date || !state.profile?.onboarding_completed) showOnboarding();
    else {
      await persistInsight();
      enterApp();
    }
  };

  taskHTML = function alpha28TaskHTML(task) {
    const done = task.status === 'completed';
    const score = taskScore(task);
    const imported = String(task.source || '').toLowerCase().includes('google');
    const source = imported ? 'Google Calendar · read only' : `${cap(task.category)} · ${cap(task.priority)}`;
    const controls = imported
      ? '<div class="task-readonly">Imported event · manage changes in Google Calendar</div>'
      : `<div class="task-controls"><button class="task-mini" data-task-action="edit" data-id="${task.id}">Edit</button><button class="task-mini" data-task-action="toggle" data-id="${task.id}">${done ? 'Reopen' : 'Complete'}</button><button class="task-mini" data-task-action="delete" data-id="${task.id}">Delete</button></div>`;
    return `<div class="timeline-item ${done ? 'completed' : ''}" data-task-id="${task.id}"><div class="time">${fmtTime(task.starts_at)}</div><div class="rail"><span class="dot"></span></div><div class="task-body"><strong>${esc(task.title)}</strong><small>${done ? 'Completed' : 'Planned'} · ${source}</small><div class="task-meta"><span class="tag ${score >= 85 ? 'good' : 'accent'}">${score}% reflection</span><span class="tag">${Math.round(durationMinutes(task) / 15) * 15} min</span></div>${controls}</div></div>`;
  };

  function defaultModalDate() {
    if (state.page === 'calendar' && state.selectedDate) return state.selectedDate;
    return new Date();
  }

  openModal = function alpha28OpenModal(date = defaultModalDate(), taskId = null) {
    const task = taskId ? state.tasks.find(item => item.id === taskId) : null;
    if (task && String(task.source || '').toLowerCase().includes('google')) {
      toast('Google Calendar events are read only in Cosmic Planner');
      return;
    }
    state.editingTaskId = task?.id || null;
    const targetDate = task ? new Date(task.starts_at) : new Date(date);
    $('#taskDate').value = isoDate(targetDate);
    $('#taskTime').value = task ? timeInputValue(task.starts_at) : '14:30';
    $('#taskTitle').value = task?.title || '';
    $('#taskCategory').value = cap(task?.category || 'Work');
    state.priority = cap(task?.priority || 'Medium');
    $$('[data-priority]').forEach(button => button.classList.toggle('selected', button.dataset.priority === state.priority));
    $('#modalTitle').textContent = task ? 'Edit plan' : 'Add to your planner';
    $('#taskSubmit').textContent = task ? 'Save changes' : 'Add to planner';
    $('#modalBackdrop').hidden = false;
    setTimeout(() => $('#taskTitle').focus(), 20);
  };

  closeModal = function alpha28CloseModal() {
    $('#modalBackdrop').hidden = true;
    $('#taskForm').reset();
    $('#taskDate').value = isoDate(new Date());
    $('#taskTime').value = '14:30';
    $('#modalTitle').textContent = 'Add to your planner';
    $('#taskSubmit').textContent = 'Add to planner';
    state.editingTaskId = null;
    state.priority = 'Medium';
    $$('[data-priority]').forEach(button => button.classList.toggle('selected', button.dataset.priority === 'Medium'));
  };

  function renderPlannerSurface() {
    syncChrome();
    if (state.page === 'calendar') renderCalendar();
    else if (state.page === 'home') renderHome();
  }

  addTask = async function alpha28AddTask(event) {
    event.preventDefault();
    const date = $('#taskDate').value;
    const time = $('#taskTime').value;
    const title = $('#taskTitle').value.trim();
    if (!date || !time || !title) return;
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) return toast('Choose a valid date and time');
    const existing = state.editingTaskId ? state.tasks.find(item => item.id === state.editingTaskId) : null;
    const existingDuration = existing ? durationMinutes(existing) : 60;
    const end = new Date(start.getTime() + existingDuration * 60000);
    const fields = {
      title,
      category: $('#taskCategory').value.toLowerCase(),
      priority: String(state.priority).toLowerCase(),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    };

    if (existing) {
      if (state.mode === 'demo') {
        Object.assign(existing, fields);
        localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
      } else {
        const { data, error } = await sb.from('planner_items').update(fields).eq('id', existing.id).select().single();
        if (error) return toast(error.message || 'Update failed');
        Object.assign(existing, data);
      }
      state.selectedDate = parseDate(date);
      closeModal();
      renderPlannerSurface();
      toast('Plan updated');
      return;
    }

    const payload = {
      id: crypto.randomUUID(),
      ...fields,
      status: 'planned',
      source: 'cosmic_planner',
      reminder_minutes: [15],
    };
    if (state.mode === 'demo') {
      state.tasks.push(payload);
      localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
    } else {
      const { data, error } = await sb.from('planner_items').insert({ ...payload, user_id: state.user.id }).select().single();
      if (error) return toast(error.message);
      state.tasks.push(data);
    }
    state.selectedDate = parseDate(date);
    closeModal();
    renderPlannerSurface();
    toast(state.mode === 'demo' ? 'Plan saved locally' : 'Plan saved to cloud');
  };

  taskAction = async function alpha28TaskAction(action, id) {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    if (String(task.source || '').toLowerCase().includes('google')) {
      toast('Google Calendar events are read only in Cosmic Planner');
      return;
    }
    if (action === 'edit') {
      openModal(new Date(task.starts_at), task.id);
      return;
    }
    if (action === 'toggle') {
      const status = task.status === 'completed' ? 'planned' : 'completed';
      if (state.mode === 'demo') {
        task.status = status;
        localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
      } else {
        const { error } = await sb.from('planner_items').update({ status }).eq('id', id);
        if (error) return toast('Update failed');
        task.status = status;
      }
    } else if (action === 'delete') {
      if (state.mode === 'demo') {
        state.tasks = state.tasks.filter(item => item.id !== id);
        localStorage.setItem('cosmic.alpha.tasks', JSON.stringify(state.tasks));
      } else {
        const { error } = await sb.from('planner_items').delete().eq('id', id);
        if (error) return toast('Delete failed');
        state.tasks = state.tasks.filter(item => item.id !== id);
      }
    }
    renderPlannerSurface();
  };

  function weekMarkup(selectedDate) {
    const start = mondayOf(selectedDate);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const totalMinutes = days.reduce((sum, day) => sum + tasksForDate(day).reduce((inner, task) => inner + durationMinutes(task), 0), 0);
    const totalTasks = days.reduce((sum, day) => sum + tasksForDate(day).length, 0);
    return `<section class="card week-card"><div class="card-head"><div><span class="eyebrow">Weekly workload</span><h3>${fmtDate(start, { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(start, 6), { day: 'numeric', month: 'short' })}</h3></div><span class="week-total">${totalTasks} plans · ${(totalMinutes / 60).toFixed(totalMinutes % 60 ? 1 : 0)}h</span></div><div class="week-grid">${days.map(day => {
      const tasks = tasksForDate(day);
      const minutes = tasks.reduce((sum, task) => sum + durationMinutes(task), 0);
      const complete = tasks.filter(task => task.status === 'completed').length;
      return `<button class="week-day ${isoDate(day) === isoDate(selectedDate) ? 'selected' : ''} ${isoDate(day) === isoDate(new Date()) ? 'today' : ''}" data-week-date="${isoDate(day)}"><span>${fmtDate(day, { weekday: 'short' })}</span><strong>${day.getDate()}</strong><small>${tasks.length ? `${tasks.length} plan${tasks.length === 1 ? '' : 's'} · ${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)}h` : 'Free'}</small>${tasks.length ? `<i style="width:${Math.round((complete / tasks.length) * 100)}%"></i>` : '<i style="width:0"></i>'}</button>`;
    }).join('')}</div></section>`;
  }

  renderCalendar = function alpha28RenderCalendar() {
    const cursor = state.calendarCursor;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    let cells = '';
    for (let index = 0; index < 42; index++) {
      const number = index - offset + 1;
      const day = new Date(year, month, number);
      const inMonth = number >= 1 && number <= days;
      const dayInsight = insight(day);
      const count = inMonth ? tasksForDate(day).length : 0;
      const cls = dayInsight?.score >= 82 ? 'high' : dayInsight?.score >= 70 ? 'mid' : 'low';
      const selected = isoDate(day) === isoDate(state.selectedDate);
      cells += `<button class="day-cell ${!inMonth ? 'muted' : ''} ${isoDate(day) === isoDate(new Date()) ? 'today' : ''} ${selected ? 'selected' : ''}" data-date="${inMonth ? isoDate(day) : ''}"><span class="day-number">${day.getDate()}</span>${inMonth && dayInsight ? `<span class="luck-dot ${cls}"></span>` : ''}${count ? `<span class="plan-count" aria-label="${count} plans">${count}</span>` : ''}</button>`;
    }

    const selectedInsight = insight(state.selectedDate);
    const selectedTasks = tasksForDate(state.selectedDate);
    $('#page-calendar').innerHTML = `<div class="planner-calendar-stack"><div class="calendar-layout"><section class="card calendar-card"><div class="calendar-toolbar"><div><span class="eyebrow">Month view · Alpha 2.8</span><h2 style="margin:5px 0 0">${fmtDate(first, { month: 'long', year: 'numeric' })}</h2></div><div class="month-nav"><button class="icon-btn" id="prevMonth" aria-label="Previous month">‹</button><button class="ghost-btn" id="todayMonth">Today</button><button class="icon-btn" id="nextMonth" aria-label="Next month">›</button></div></div><div class="weekday-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => `<div>${label}</div>`).join('')}</div><div class="month-grid">${cells}</div></section><aside class="card side-panel selected-day-panel"><span class="eyebrow">Selected date</span><h3 style="margin:6px 0 0">${fmtDate(state.selectedDate)}</h3><div class="day-score">${selectedInsight?.score ?? '--'}</div><span class="module-sub">Reflective alignment</span>${selectedInsight ? `<div class="breakdown"><div class="bar-row"><span>Numerology</span><div class="bar"><i style="width:${selectedInsight.numerologyScore}%"></i></div><b>${selectedInsight.numerologyScore}</b></div><div class="bar-row"><span>Chinese zodiac</span><div class="bar"><i style="width:${selectedInsight.zodiacScore}%"></i></div><b>${selectedInsight.zodiacScore}</b></div></div><div class="journal-prompt" style="margin-top:18px">Personal Day ${selectedInsight.personalDay}. ${esc(selectedInsight.tip)} Suggested windows: ${selectedInsight.windows.join(' · ')}</div>` : ''}<div class="selected-plans-head"><div><span class="eyebrow">Plans</span><strong>${selectedTasks.length}</strong></div><button class="primary-btn" id="addSelectedPlan">＋ Add</button></div><div class="selected-plan-list">${selectedTasks.length ? selectedTasks.map(taskHTML).join('') : '<div class="journal-prompt">Nothing scheduled. Keep the day open or add a plan.</div>'}</div></aside></div>${weekMarkup(state.selectedDate)}</div>`;

    $('#prevMonth').onclick = async () => {
      state.calendarCursor = new Date(year, month - 1, 1);
      try { await ensurePlannerMonth(state.calendarCursor); } catch { toast('Could not load that month'); }
      renderCalendar();
    };
    $('#nextMonth').onclick = async () => {
      state.calendarCursor = new Date(year, month + 1, 1);
      try { await ensurePlannerMonth(state.calendarCursor); } catch { toast('Could not load that month'); }
      renderCalendar();
    };
    $('#todayMonth').onclick = () => {
      state.calendarCursor = new Date();
      state.selectedDate = new Date();
      renderCalendar();
    };
    $('#addSelectedPlan').onclick = () => openModal(state.selectedDate);
    $$('[data-date]').forEach(button => button.onclick = async () => {
      if (!button.dataset.date) return;
      state.selectedDate = parseDate(button.dataset.date);
      try { await ensurePlannerMonth(state.selectedDate); } catch { toast('Could not load plans'); }
      renderCalendar();
    });
    $$('[data-week-date]').forEach(button => button.onclick = async () => {
      state.selectedDate = parseDate(button.dataset.weekDate);
      state.calendarCursor = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
      try { await ensurePlannerMonth(state.selectedDate); } catch { toast('Could not load plans'); }
      renderCalendar();
    });
    $$('[data-task-action]').forEach(button => button.onclick = () => taskAction(button.dataset.taskAction, button.dataset.id));
  };

  // bindApp ran synchronously inside app.js before this enhancement script loaded,
  // so replace the captured Alpha 1 handlers with the Alpha 2.8 planner handlers.
  $('#quickAdd').onclick = () => openModal(defaultModalDate());
  $('#closeModal').onclick = closeModal;
  $('#cancelTask').onclick = closeModal;
  $('#taskForm').onsubmit = addTask;
  $('#modalBackdrop').onclick = event => { if (event.target === $('#modalBackdrop')) closeModal(); };

  window.CosmicPlanner28 = Object.freeze({
    tasksForDate,
    ensurePlannerMonth,
    durationMinutes,
  });
})();
