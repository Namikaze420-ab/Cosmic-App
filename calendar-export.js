// Export the selected day's own plans. Each recurrence already has a stable row ID.
(() => {
  const encoder = new TextEncoder();

  function escapeText(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/[,;]/g, match => '\\' + match);
  }

  function fold(line) {
    const parts = [];
    let part = '', bytes = 0;
    for (const char of line) {
      const length = encoder.encode(char).length;
      if (bytes + length > 75) {
        parts.push(part);
        part = ' ';
        bytes = 1;
      }
      part += char;
      bytes += length;
    }
    parts.push(part);
    return parts.join('\r\n');
  }

  function utc(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function makeCalendar(tasks, stamp) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cosmic Planner//Plans//EN', 'CALSCALE:GREGORIAN'];
    for (const plan of tasks) {
      const start = new Date(plan.starts_at);
      const end = new Date(plan.ends_at);
      lines.push('BEGIN:VEVENT', 'UID:' + escapeText(plan.id) + '@cosmic-planner',
        'DTSTAMP:' + utc(stamp), 'SUMMARY:' + escapeText(plan.title));
      if (plan.all_day) {
        // A planner all-day occurrence occupies one local calendar day, including on DST changes.
        const next = new Date(start);
        next.setDate(next.getDate() + 1);
        lines.push('DTSTART;VALUE=DATE:' + isoDate(start).replaceAll('-', ''),
          'DTEND;VALUE=DATE:' + isoDate(next).replaceAll('-', ''));
      } else {
        const finish = end > start ? end : new Date(start.getTime() + 3600000);
        lines.push('DTSTART:' + utc(start), 'DTEND:' + utc(finish));
      }
      for (const minutes of new Set(plan.reminder_minutes || [])) {
        if (!Number.isSafeInteger(minutes) || minutes < 0) continue;
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Plan reminder',
          'TRIGGER:' + (minutes === 0 ? 'PT0M' : '-PT' + minutes + 'M'), 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }
    return [...lines, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
  }

  const render = renderCalendar;
  renderCalendar = function renderCalendarWithExport() {
    render();
    const panel = document.querySelector('#page-calendar .side-panel');
    if (!panel) return;
    const date = isoDate(state.selectedDate);
    const tasks = window.CosmicPlanner28.tasksForDate(state.selectedDate)
      .filter(plan => !String(plan.source || '').toLowerCase().includes('google'));
    if (!tasks.length) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost-btn export-day';
    button.textContent = 'Export day (.ics)';
    button.onclick = () => {
      const file = new Blob([makeCalendar(tasks, new Date())], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cosmic-plans-' + date + '.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    panel.appendChild(button);
  };
})();
