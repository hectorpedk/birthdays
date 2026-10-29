const STORAGE_KEY = 'birthdays.people.v1';
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function daysInMonth(month) {
  return new Date(2024, month, 0).getDate();
}

function isValidBirthday(person) {
  return Number.isInteger(person.month)
    && person.month >= 1
    && person.month <= 12
    && Number.isInteger(person.day)
    && person.day >= 1
    && person.day <= daysInMonth(person.month);
}

function createId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getNextBirthday(person, today = new Date()) {
  const next = new Date(today.getFullYear(), person.month - 1, person.day);
  next.setHours(0, 0, 0, 0);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next < todayDate) next.setFullYear(today.getFullYear() + 1);
  return next;
}

function daysUntil(date, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date - start) / 86400000);
}

function upcomingLabel(days) {
  if (days === 0) return '¡Hoy!';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

function readFormValues(form) {
  const data = new FormData(form);
  const birthYearValue = data.get('birthYear');
  return {
    name: String(data.get('name') ?? '').trim(),
    month: Number(data.get('month')),
    day: Number(data.get('day')),
    birthYear: birthYearValue ? Number(birthYearValue) : null,
  };
}

function validatePerson(person) {
  if (!person.name) return 'Escribe un nombre para continuar.';
  if (!isValidBirthday(person)) return 'Elige un día y un mes válidos.';
  if (
    person.birthYear !== null
    && (!Number.isInteger(person.birthYear) || person.birthYear < 1900 || person.birthYear > new Date().getFullYear())
  ) {
    return `El año debe estar entre 1900 y ${new Date().getFullYear()}.`;
  }
  return '';
}

function populateMonths(select, includePlaceholder) {
  select.replaceChildren();
  if (includePlaceholder) select.add(new Option('Elige un mes', ''));
  MONTHS.forEach((month, index) => select.add(new Option(month, String(index + 1))));
}

function updateDayOptions(monthSelect, daySelect, selectedDay) {
  const month = Number(monthSelect.value);
  daySelect.replaceChildren();
  daySelect.add(new Option(month ? 'Día' : 'Elige primero un mes', ''));
  daySelect.disabled = !month;
  if (!month) return;

  for (let day = 1; day <= daysInMonth(month); day += 1) {
    daySelect.add(new Option(String(day), String(day)));
  }
  if (selectedDay && selectedDay <= daysInMonth(month)) {
    daySelect.value = String(selectedDay);
  }
}

class BirthdayForm extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.form = this.querySelector('form');
    this.monthSelect = this.querySelector('[data-month]');
    this.daySelect = this.querySelector('[data-day]');
    this.message = this.querySelector('[data-form-message]');
    this.nameInput = this.querySelector('[name="name"]');

    populateMonths(this.monthSelect, true);
    updateDayOptions(this.monthSelect, this.daySelect);
    this.monthSelect.addEventListener('change', () => updateDayOptions(this.monthSelect, this.daySelect));
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const person = readFormValues(this.form);
      this.message.textContent = validatePerson(person);
      if (this.message.textContent) return;
      this.dispatchEvent(new CustomEvent('birthday-add', {
        bubbles: true,
        detail: person,
      }));
    });
  }

  reset() {
    this.form.reset();
    updateDayOptions(this.monthSelect, this.daySelect);
    this.message.textContent = '';
    this.nameInput.focus();
  }
}

class BirthdayItem extends HTMLElement {
  set person(value) {
    this._person = value;
    if (this.isConnected) this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const person = this._person;
    if (!person) return;

    const nextBirthday = getNextBirthday(person);
    const days = daysUntil(nextBirthday);
    const item = document.createElement('article');
    item.className = 'birthday-item';

    const dateBadge = document.createElement('div');
    dateBadge.className = 'date-badge';
    dateBadge.setAttribute('aria-label', nextBirthday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }));
    const badgeDay = document.createElement('span');
    badgeDay.className = 'date-badge-day';
    badgeDay.textContent = String(person.day).padStart(2, '0');
    const badgeMonth = document.createElement('span');
    badgeMonth.className = 'date-badge-month';
    badgeMonth.textContent = MONTHS[person.month - 1].slice(0, 3);
    dateBadge.append(badgeDay, badgeMonth);

    const details = document.createElement('div');
    const personName = document.createElement('p');
    personName.className = 'person-name';
    personName.textContent = person.name;
    const meta = document.createElement('p');
    meta.className = 'person-meta';
    meta.textContent = person.birthYear
      ? `${upcomingLabel(days)} · Cumple ${nextBirthday.getFullYear() - person.birthYear}`
      : upcomingLabel(days);
    details.append(personName, meta);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const editButton = document.createElement('button');
    editButton.className = 'icon-button';
    editButton.type = 'button';
    editButton.setAttribute('aria-label', `Editar a ${person.name}`);
    editButton.title = 'Editar';
    editButton.textContent = '↗';
    editButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('birthday-edit', {
        bubbles: true,
        detail: person,
      }));
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon-button delete-button';
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Borrar a ${person.name}`);
    deleteButton.title = 'Borrar';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('birthday-delete', {
        bubbles: true,
        detail: person,
      }));
    });
    actions.append(editButton, deleteButton);
    item.append(dateBadge, details, actions);
    this.replaceChildren(item);
  }
}

class BirthdayList extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.list = this.querySelector('[data-birthday-list]');
    this.emptyState = this.querySelector('[data-empty-state]');
    this.count = this.querySelector('[data-people-count]');
    this.message = this.querySelector('[data-storage-message]');
    this.importFile = this.querySelector('[data-import-file]');

    this.querySelector('[data-export]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('birthday-export', { bubbles: true }));
    });
    this.querySelector('[data-import]').addEventListener('click', () => this.importFile.click());
    this.importFile.addEventListener('change', () => {
      const [file] = this.importFile.files ?? [];
      if (file) {
        this.dispatchEvent(new CustomEvent('birthday-import', {
          bubbles: true,
          detail: file,
        }));
      }
    });
  }

  render(people) {
    this.list.replaceChildren();
    people.forEach((person) => {
      const item = document.createElement('birthday-item');
      item.person = person;
      this.list.append(item);
    });
    const count = people.length;
    this.count.textContent = `${count} ${count === 1 ? 'persona' : 'personas'}`;
    this.emptyState.hidden = count > 0;
    this.list.hidden = count === 0;
  }

  showMessage(message) {
    this.message.textContent = message;
    this.message.hidden = false;
  }

  clearMessage() {
    this.message.textContent = '';
    this.message.hidden = true;
  }
}

class BirthdayEditor extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.dialog = this.querySelector('dialog');
    this.form = this.querySelector('[data-edit-form]');
    this.idInput = this.querySelector('[data-id]');
    this.nameInput = this.querySelector('[data-name]');
    this.monthSelect = this.querySelector('[data-month]');
    this.daySelect = this.querySelector('[data-day]');
    this.message = this.querySelector('[data-edit-message]');
    this.yearInput = this.form.elements.birthYear;

    populateMonths(this.monthSelect, false);
    updateDayOptions(this.monthSelect, this.daySelect);
    this.monthSelect.addEventListener('change', () => updateDayOptions(this.monthSelect, this.daySelect));
    this.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => this.dialog.close());
    });
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const person = readFormValues(this.form);
      this.message.textContent = validatePerson(person);
      if (this.message.textContent) return;
      this.dispatchEvent(new CustomEvent('birthday-save', {
        bubbles: true,
        detail: { id: this.idInput.value, ...person },
      }));
    });
  }

  open(person) {
    this.idInput.value = person.id;
    this.nameInput.value = person.name;
    this.monthSelect.value = String(person.month);
    updateDayOptions(this.monthSelect, this.daySelect, person.day);
    this.yearInput.value = person.birthYear ?? '';
    this.message.textContent = '';
    this.dialog.showModal();
    this.nameInput.focus();
  }

  close() {
    this.dialog.close();
  }
}

customElements.define('birthday-form', BirthdayForm);
customElements.define('birthday-item', BirthdayItem);
customElements.define('birthday-list', BirthdayList);
customElements.define('birthday-editor', BirthdayEditor);

const birthdayList = document.querySelector('birthday-list');
const birthdayForm = document.querySelector('birthday-form');
const birthdayEditor = document.querySelector('birthday-editor');
let people = [];

function parseStoredPeople() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const data = JSON.parse(stored);
  if (!Array.isArray(data)) throw new Error('El formato guardado no es válido.');

  return data.map((person) => {
    if (
      !person
      || typeof person.id !== 'string'
      || typeof person.name !== 'string'
      || !Number.isInteger(person.month)
      || !Number.isInteger(person.day)
      || !isValidBirthday(person)
      || (person.birthYear !== null && person.birthYear !== undefined
        && (!Number.isInteger(person.birthYear) || person.birthYear < 1900 || person.birthYear > new Date().getFullYear()))
    ) {
      throw new Error('Hay datos de cumpleaños guardados que no se pueden leer.');
    }
    return {
      id: person.id,
      name: person.name.trim(),
      month: person.month,
      day: person.day,
      birthYear: person.birthYear ?? null,
    };
  });
}

function renderPeople() {
  const sorted = [...people].sort((a, b) => (
    getNextBirthday(a) - getNextBirthday(b) || a.name.localeCompare(b.name, 'es')
  ));
  birthdayList.render(sorted);
}

function persistPeople(nextPeople) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPeople));
    people = nextPeople;
    birthdayList.clearMessage();
    renderPeople();
    return true;
  } catch (error) {
    birthdayList.showMessage(`No se pudieron guardar los cambios en este navegador. ${error.message}`);
    return false;
  }
}

function validateImportedData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.people)) {
    throw new Error('El archivo no tiene el formato de una copia de cumpleaños válida.');
  }

  const usedIds = new Set();
  return data.people.map((person) => {
    if (
      !person
      || typeof person.name !== 'string'
      || !Number.isInteger(person.month)
      || !Number.isInteger(person.day)
    ) {
      throw new Error('La copia contiene una persona con datos incompletos.');
    }
    const id = typeof person.id === 'string' && person.id && !usedIds.has(person.id)
      ? person.id
      : createId();
    usedIds.add(id);
    const normalized = {
      id,
      name: person.name.trim(),
      month: person.month,
      day: person.day,
      birthYear: person.birthYear ?? null,
    };
    if (!normalized.name || !isValidBirthday(normalized)) {
      throw new Error('La copia contiene un nombre o una fecha no válidos.');
    }
    if (
      normalized.birthYear !== null
      && (!Number.isInteger(normalized.birthYear)
        || normalized.birthYear < 1900
        || normalized.birthYear > new Date().getFullYear())
    ) {
      throw new Error('La copia contiene un año de nacimiento no válido.');
    }
    return normalized;
  });
}

try {
  people = parseStoredPeople();
} catch (error) {
  birthdayList.showMessage(`No se pudieron leer los cumpleaños guardados. Puedes restaurar una copia JSON. ${error.message}`);
}
renderPeople();

birthdayForm.addEventListener('birthday-add', (event) => {
  if (persistPeople([...people, { ...event.detail, id: createId() }])) {
    birthdayForm.reset();
  }
});

birthdayList.addEventListener('birthday-delete', (event) => {
  const person = event.detail;
  if (!window.confirm(`¿Quieres borrar a ${person.name} de la lista?`)) return;
  persistPeople(people.filter((item) => item.id !== person.id));
});

birthdayList.addEventListener('birthday-edit', (event) => birthdayEditor.open(event.detail));

birthdayEditor.addEventListener('birthday-save', (event) => {
  const { id, ...updated } = event.detail;
  const nextPeople = people.map((person) => (person.id === id ? { ...person, ...updated } : person));
  if (persistPeople(nextPeople)) birthdayEditor.close();
});

birthdayList.addEventListener('birthday-export', () => {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    people,
  };
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `birthdays-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

birthdayList.addEventListener('birthday-import', async (event) => {
  try {
    const imported = validateImportedData(JSON.parse(await event.detail.text()));
    const countLabel = imported.length === 1 ? 'cumpleaños' : 'cumpleaños';
    if (!window.confirm(`Se reemplazará la lista actual por ${imported.length} ${countLabel} de la copia. ¿Continuar?`)) {
      return;
    }
    persistPeople(imported);
  } catch (error) {
    birthdayList.showMessage(`No se pudo restaurar la copia. ${error.message}`);
  } finally {
    birthdayList.querySelector('[data-import-file]').value = '';
  }
});
