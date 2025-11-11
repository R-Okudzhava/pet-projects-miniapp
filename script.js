// --- Настройки API ---
const API_BASE_URL = "http://localhost:8000"; // ← замените на реальный адрес API вашего бэкенда

// --- Работа с Telegram WebApp SDK ---
let initData;
let teleUser;
if (window.Telegram && Telegram.WebApp) {
  Telegram.WebApp.expand();
  Telegram.WebApp.ready();
  initData = Telegram.WebApp.initData || '';
  try {
    teleUser = (Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) || null;
  } catch (e) { teleUser = null; }
}
if (!initData || !teleUser) {
  alert("Ошибка авторизации Telegram Mini App. Перезапустите через меню бота.");
}

// --- DOM хранилище элементов ---
const screens = {
  main: document.getElementById('main-screen'),
  detail: document.getElementById('project-detail-screen'),
  my: document.getElementById('my-projects-screen'),
  form: document.getElementById('project-form-screen')
};
function show(screen) {
  Object.values(screens).forEach(el => el.style.display = 'none');
  screens[screen].style.display = '';
}

const projectsContainer = document.getElementById('projects-container');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const createBtn = document.getElementById('create-project-btn');
const myBtn = document.getElementById('my-projects-btn');
const myList = document.getElementById('my-projects-list');
const backBtn = document.getElementById('back-btn');

let projects = [];
let currentIdx = 0;

// --- Загрузка проектов ---
async function fetchProjects() {
  projectsContainer.innerHTML = "Загрузка...";
  const resp = await fetch(API_BASE_URL + "/api/projects?approved=true");
  const data = await resp.json();
  projects = data.projects || [];
  currentIdx = 0;
  renderCurrentProject();
}
function renderCurrentProject() {
  projectsContainer.innerHTML = "";
  if (projects.length === 0) {
    projectsContainer.innerHTML = "<i>Пока нет проектов.</i>";
    return;
  }
  const p = projects[currentIdx];
  const card = document.createElement('div');
  card.className = 'project-card';
  card.innerHTML = `
    <b>${p.title}</b><br>
    <small>Сфера: ${p.sphere || '-'}</small><br>
    <div>Проблема: <i>${p.problem || '-'}</i></div>
    <button class="info-btn">Подробнее</button>
  `;
  card.querySelector('.info-btn').onclick = () => openProjectDetail(p);
  projectsContainer.appendChild(card);
}
nextBtn.onclick = () => {
  if (projects.length) {
    currentIdx = (currentIdx + 1) % projects.length;
    renderCurrentProject();
  }
};
prevBtn.onclick = () => {
  if (projects.length) {
    currentIdx = (currentIdx - 1 + projects.length) % projects.length;
    renderCurrentProject();
  }
};

// --- Деталка ---
function openProjectDetail(p) {
  show('detail');
  const el = document.getElementById('project-detail');
  el.innerHTML = `
    <h2>${p.title}</h2>
    <div><b>Сфера:</b> ${p.sphere || '-'}</div>
    <div><b>Проблема:</b> ${p.problem || '-'}</div>
    <div><b>Описание:</b> <br>${(p.description||'').replace(/\n/g,'<br>')}</div>
    <div><b>Кто нужен:</b> ${p.roles_needed || '-'}</div>
    <div><b>О команде:</b> ${p.team_info || '-'}</div>
    <div><b>Ссылка:</b> <a href="${p.link}" target="_blank">${p.link}</a></div>
    <div><b>Владелец:</b> <a href="https://t.me/${p.owner_username}" target="_blank">@${p.owner_username}</a></div>
    <br>
    <button id="contact-btn-detail">Связаться</button>
    ${p.owner_id === teleUser.id ? '<button id="edit-btn-detail">Редактировать</button><button id="delete-btn-detail">Удалить</button>' : ''}
  `;
  document.getElementById('back-to-list-btn').onclick = () => { show('main'); };
  document.getElementById('contact-btn-detail').onclick = () => { window.open('https://t.me/'+p.owner_username, '_blank'); };
  if (p.owner_id === teleUser.id) {
    document.getElementById('edit-btn-detail').onclick = () => openEditProjectForm(p);
    document.getElementById('delete-btn-detail').onclick = () => deleteProject(p.id);
  }
}

// --- Мои проекты ---
myBtn.onclick = async function() {
  show('my');
  myList.innerHTML = "Загрузка...";
  const resp = await fetch(API_BASE_URL + "/api/projects/owner", {
    headers: { 'X-Tg-InitData': initData }
  });
  const data = await resp.json();
  myList.innerHTML = "";
  if (!data.projects.length) { myList.innerHTML = "У вас нет проектов."; return; }
  data.projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <b>${p.title}</b> [${p.sphere}]<br>
      <span>${p.problem}</span><br>
      <button>Подробнее</button>
    `;
    card.querySelector('button').onclick = () => openProjectDetail(p);
    myList.appendChild(card);
  });
};
backBtn.onclick = () => show('main');

// --- Форма создания/редактирования ---
createBtn.onclick = () => openCreateProjectForm();
function openCreateProjectForm() {
  show('form');
  document.getElementById('form-title').textContent = "Новый проект";
  const form = document.getElementById('project-form');
  form.reset();
  form.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const resp = await fetch(API_BASE_URL + "/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tg-InitData": initData },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    if (result.success) {
      showAlert("Проект отправлен на модерацию!");
      await fetchProjects();
      show('main');
    } else {
      showAlert("Ошибка сохранения проекта!");
    }
  };
  document.getElementById('cancel-form-btn').onclick = () => show('main');
}
function openEditProjectForm(project) {
  show('form');
  document.getElementById('form-title').textContent = "Редактировать проект";
  const form = document.getElementById('project-form');
  form.title.value = project.title;
  form.problem.value = project.problem;
  form.description.value = project.description;
  form.sphere.value = project.sphere;
  form.roles_needed.value = project.roles_needed;
  form.team_info.value = project.team_info;
  form.link.value = project.link;
  form.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const resp = await fetch(API_BASE_URL + "/api/projects/" + project.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Tg-InitData": initData },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    if (result.success) {
      showAlert("Изменения сохранены!");
      await fetchProjects();
      show('main');
    } else {
      showAlert("Ошибка обновления проекта!");
    }
  };
  document.getElementById('cancel-form-btn').onclick = () => show('main');
}

// --- Удаление проекта с подтверждением ---
function deleteProject(id) {
  showAlert("Точно удалить проект?", [
    { text: "Нет", handler: closeAlert },
    { text: "Да, удалить", handler: async function() {
      const resp = await fetch(API_BASE_URL + "/api/projects/" + id, {
        method: "DELETE",
        headers: { 'X-Tg-InitData': initData }
      });
      const result = await resp.json();
      closeAlert();
      if (result.success) {
        showAlert("Удалено");
        await fetchProjects();
        show('main');
      } else {
        showAlert("Ошибка удаления!");
      }
    }, style: 'danger' }
  ]);
}

// --- Mock Свайпы (упростим: обработчик touchstart/move/stop) ---
let touchStartX = null;
projectsContainer.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
});
projectsContainer.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  let dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0) nextBtn.onclick();
    else prevBtn.onclick();
  }
  touchStartX = null;
});

// --- Окно алерта ---
function showAlert(text, buttons) {
  const overlay = document.getElementById('alert-overlay');
  const win = document.getElementById('alert-window');
  overlay.style.display = '';
  win.innerHTML = `<div style="margin-bottom:18px">${text}</div>`;
  if (buttons && buttons.length) {
    buttons.forEach(b => {
      let btn = document.createElement('button');
      btn.textContent = b.text;
      btn.onclick = b.handler || closeAlert;
      if (b.style === 'danger') btn.style.background = '#fcc';
      win.appendChild(btn);
    });
  } else {
    let btn = document.createElement('button');
    btn.textContent = "OK";
    btn.onclick = closeAlert;
    win.appendChild(btn);
  }
}
function closeAlert() {
  const overlay = document.getElementById('alert-overlay');
  overlay.style.display = 'none';
}

// --- Первичный запуск ---
fetchProjects();
