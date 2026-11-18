(() => {
  const plannerOpenModal = openModal;
  const plannerAddTask = addTask;

  openModal = function alpha28CompatibleOpenModal(date, taskId = null) {
    const eventLike = date && typeof date === 'object' && typeof date.preventDefault === 'function' && 'target' in date;
    return plannerOpenModal(eventLike ? undefined : date, taskId);
  };

  addTask = async function alpha28CompatibleAddTask(event) {
    const result = await plannerAddTask(event);
    if ($('#modalBackdrop')?.hidden && state.page === 'calendar' && state.selectedDate) {
      state.calendarCursor = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
      renderCalendar();
    }
    return result;
  };

  $('#quickAdd').onclick = () => openModal();
  $('#taskForm').onsubmit = addTask;
})();
