// --- Глобальные переменные и константы ---
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let applications = JSON.parse(localStorage.getItem('applications')) || [];

function saveToLocalStorage() {
  localStorage.setItem('projects', JSON.stringify(projects));
  localStorage.setItem('applications', JSON.stringify(applications));
}

// ------------ Управление экранами ---------------
function showScreen(screenId) {
  [
    'main-screen','catalog-screen','project-detail','apply-screen',
    'create-project-screen','admin-panel-screen'
  ].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(screenId).style.display = 'block';
  // Скрываем кнопку админ-панели, если решили её убрать тоже
  // document.getElementById('admin-panel-btn').style.display = 'none';
}

document.getElementById('find-projects-btn').onclick = () => {
  showScreen('catalog-screen');
  renderProjectList();
};
document.getElementById('my-project-btn').onclick = () => {
  // Убрали проверку: теперь любой может создать проект
  showScreen('create-project-screen');
};
document.getElementById('catalog-back-btn').onclick = () => {
  showScreen('main-screen');
};
// Убираем кнопку админ-панели из DOM или скрываем её
// document.getElementById('admin-panel-btn').onclick = () => {
//   showScreen('admin-panel-screen');
//   renderAdminPanel();
// };
// document.getElementById('admin-back-btn').onclick = () => {
//   showScreen('main-screen');
// };
document.getElementById('create-back-btn').onclick = () => {
  showScreen('main-screen');
};

// ---------- Каталог проектов ----------
function renderProjectList() {
  const list = document.getElementById('project-list');
  list.innerHTML = '';
  projects.filter(p=>p.is_approved).forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-title">${project.title}</div>
      <div class="project-sphere"><b>Сфера:</b> ${project.sphere}</div>
      <div class="project-roles"><b>Ищем:</b> ${project.roles_needed.join(', ')}</div>
      <button class="details-btn" data-id="${project.id}">Подробнее</button>
    `;
    list.appendChild(card);
  });
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.onclick = function() { showProjectDetail(this.dataset.id); };
  });
}

// ---------- Деталка проекта ----------
function showProjectDetail(id) {
  const project = projects.find(p => p.id == id);
  if (!project) return;
  const detail = document.getElementById('project-detail');
  detail.innerHTML = `
    <h2>${project.title}</h2>
    <div><b>Проблема:</b> ${project.problem}</div>
    <div><b>Описание:</b> ${project.description}</div>
    <div><b>Сфера:</b> ${project.sphere}</div>
    <div><b>Ищем:</b> ${project.roles_needed.join(', ')}</div>
    <div><b>Команда:</b> ${project.team_info}</div>
    <div><b>Контакт:</b> <a href="https://t.me/${project.owner_username.replace('@','')}" target="_blank">${project.owner_username}</a></div>
    <button id="apply-btn">Присоединиться</button>
    <button id="detail-back-btn">Назад</button>
  `;
  showScreen('project-detail');
  document.getElementById('detail-back-btn').onclick = () => {
    showScreen('catalog-screen');
  };
  document.getElementById('apply-btn').onclick = () => {
    openApplyScreen(project);
  };
}

// ---------- Apply (Заявка) ----------
function openApplyScreen(project) {
  showScreen('apply-screen');
  // Получаем имя пользователя через TWA SDK, если он есть
  let username = '';
  try {
    username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || '';
  } catch(e) {}
  document.getElementById('apply-username').value = username;
  document.getElementById('apply-name').value = '';
  document.getElementById('apply-form').onsubmit = function(e) {
    e.preventDefault();
    // Сохраняем заявку
    const application = {
      project_id: project.id,
      name: document.getElementById('apply-name').value,
      username: document.getElementById('apply-username').value,
      user_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null,
      date: new Date().toISOString()
    };
    applications.push(application);
    saveToLocalStorage();
    alert('Заявка отправлена!');
    showScreen('catalog-screen');
  };
  document.getElementById('apply-back-btn').onclick = function() {
    showProjectDetail(project.id);
  };
}

// ---------- Создать проект (теперь для всех) ----------
document.getElementById('create-project-form').onsubmit = function(e) {
  e.preventDefault();
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!user) {
    alert('Ошибка авторизации!');
    return;
  }
  const newProject = {
    id: 'id_' + Date.now(),
    title: document.getElementById('project-title').value,
    problem: document.getElementById('project-problem').value,
    description: document.getElementById('project-description').value,
    sphere: document.getElementById('project-sphere').value,
    roles_needed: document.getElementById('project-roles').value.split(',').map(r=>r.trim()).filter(Boolean),
    team_info: document.getElementById('project-team').value,
    owner_username: '@'+(user.username||'user'),
    owner_id: user.id,
    is_approved: true // Проекты теперь публикуются сразу
  };
  projects.push(newProject);
  saveToLocalStorage();
  alert('Проект успешно добавлен!');
  showScreen('main-screen');
  document.getElementById('create-project-form').reset();
};

// ---------- Админ-панель (теперь не нужна, можно удалить весь блок) ----------
// renderAdminPanel и approveProject больше не используются

// --------- Кнопка admin-panel в main-screen ---------
window.addEventListener('DOMContentLoaded', () => {
  showScreen('main-screen');
});