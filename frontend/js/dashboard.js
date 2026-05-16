let statusChart = null;
let priorityChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  initPageChrome();
  requireAuth();
  const user = getCurrentUser();
  if (!user) { logout(); return; }

  document.getElementById('user-name').textContent  = user.name;
  document.getElementById('user-email').textContent = user.email;
  setUserAvatar(document.getElementById('user-avatar'), user.name);
  document.getElementById('logout-btn').addEventListener('click', logout);

  const globalRoleEl = document.getElementById('user-global-role');
  const sidebarRoleEl = document.getElementById('user-role-summary');
  if (globalRoleEl) {
    globalRoleEl.innerHTML = roleBadge(user.role);
  }
  if (sidebarRoleEl) {
    sidebarRoleEl.textContent = roleLabel(user.role);
  }

  if (user.role !== 'ADMIN') {
    document.getElementById('create-project-btn')?.classList.add('hidden');
    document.getElementById('fab-new-project')?.classList.add('hidden');
  }

  const hubIcon = document.getElementById('hub-llm-icon');
  const projIcon = document.getElementById('proj-llm-icon');
  const fabIcon = document.getElementById('fab-icon-plus');
  if (hubIcon && typeof Icons !== 'undefined') hubIcon.innerHTML = Icons.sparkles;
  if (projIcon && typeof Icons !== 'undefined') projIcon.innerHTML = Icons.sparkles;
  if (fabIcon && typeof Icons !== 'undefined') fabIcon.innerHTML = Icons.plus;

  const createBtn     = document.getElementById('create-project-btn');
  const fabBtn        = document.getElementById('fab-new-project');
  const modal         = document.getElementById('create-project-modal');
  const closeModal    = document.getElementById('close-modal');
  const cancelCreate  = document.getElementById('cancel-create');
  const createForm    = document.getElementById('create-project-form');

  const openModal = () => modal.classList.add('open');
  createBtn.addEventListener('click', openModal);
  fabBtn.addEventListener('click', openModal);
  
  closeModal.addEventListener('click', () => modal.classList.remove('open'));
  cancelCreate.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

  document.getElementById('ai-project-desc-btn')?.addEventListener('click', generateProjectDescription);
  document.getElementById('hub-llm-refresh')?.addEventListener('click', runHubLlmInsight);

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = createForm.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await API.post('/projects/', {
        name:        createForm.proj_name.value.trim(),
        description: createForm.proj_desc.value.trim() || null,
      });
      modal.classList.remove('open');
      createForm.reset();
      document.getElementById('proj-llm-status')?.classList.add('hidden');
      showToast('Project created successfully', 'success');
      loadWorkHub();
    } catch (ex) {
      showToast(ex.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  window.refreshPageData = loadWorkHub;
  loadWorkHub();
});

async function loadWorkHub() {
  try {
    const [stats, projects] = await Promise.all([
      API.get('/tasks/dashboard'),
      API.get('/projects/'),
    ]);
    renderStats(stats);
    renderMyTasks(stats.my_tasks);
    renderProjects(projects);
    renderRoleSummary(projects);
    updateCharts(stats.my_tasks);
  } catch (ex) {
    showToast('Failed to load work hub: ' + ex.message, 'error');
  }
}

function updateCharts(tasks) {
  const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  tasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });

  const isDark = getTheme() === 'dark';
  const textColor = isDark ? '#a1a1aa' : '#71717a';

  // Status Chart (Pie)
  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(statusCtx, {
    type: 'pie',
    data: {
      labels: ['To Do', 'In Progress', 'Done'],
      datasets: [{
        data: [statusCounts.TODO, statusCounts.IN_PROGRESS, statusCounts.DONE],
        backgroundColor: ['#52525b', '#eab308', '#22c55e'],
        borderWidth: 0,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, padding: 20, font: { size: 12 } } }
      }
    }
  });

  // Priority Chart (Bar)
  const priorityCtx = document.getElementById('priorityChart').getContext('2d');
  if (priorityChart) priorityChart.destroy();
  priorityChart = new Chart(priorityCtx, {
    type: 'bar',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        label: 'Tasks',
        data: [priorityCounts.LOW, priorityCounts.MEDIUM, priorityCounts.HIGH],
        backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
        borderRadius: 8,
        barThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: isDark ? '#27272a' : '#f1f5f9' }, ticks: { color: textColor, stepSize: 1 } },
        x: { grid: { display: false }, ticks: { color: textColor } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderRoleSummary(projects) {
  const el = document.getElementById('user-role-summary');
  if (!el) return;
  if (!projects.length) {
    el.textContent = 'No project roles yet';
    return;
  }
  const leads = projects.filter(p => p.my_role === 'ADMIN').length;
  const tasker = projects.filter(p => p.my_role === 'MEMBER').length;
  const parts = [];
  if (leads) parts.push(`Lead on ${leads}`);
  if (tasker) parts.push(`Tasker on ${tasker}`);
  el.textContent = parts.join(' · ') || 'Member';
}

function renderStats(stats) {
  document.getElementById('stat-total').textContent    = stats.total_tasks;
  document.getElementById('stat-progress').textContent = stats.in_progress;
  document.getElementById('stat-done').textContent     = stats.done;
  document.getElementById('stat-overdue').textContent  = stats.overdue;
}

function renderMyTasks(tasks) {
  const el = document.getElementById('my-tasks-list');
  const badge = document.getElementById('my-tasks-badge');
  badge.textContent = tasks.length;

  if (!tasks.length) {
    el.innerHTML = emptyState('No deliverables assigned to you yet.');
    return;
  }

  el.innerHTML = tasks.slice(0, 8).map(t => {
    const overdue = isOverdue(t.due_date, t.status);
    return `
      <div class="task-item ${overdue ? 'overdue' : ''}" onclick="window.location.href='/project?id=${t.project_id}'">
        <div class="task-info">
          <div class="task-title">${escHtml(t.title)}</div>
          <div class="task-meta">
            ${statusBadge(t.status)}
            ${priorityBadge(t.priority)}
            ${t.due_date ? `<span class="task-due${overdue ? ' overdue' : ''}">${Icons.calendar} ${formatDate(t.due_date)}${overdue ? ' · Overdue' : ''}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderProjects(projects) {
  const el = document.getElementById('projects-grid');
  const badge = document.getElementById('projects-badge');
  badge.textContent = projects.length;

  if (!projects.length) {
    el.innerHTML = emptyState('No initiatives yet. Create your first project to get started.');
    return;
  }

  el.innerHTML = projects.map(p => {
    const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
    return `
      <div class="project-card" onclick="window.location.href='/project?id=${p.id}'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
          <h3>${escHtml(p.name)}</h3>
          ${roleBadge(p.my_role)}
        </div>
        <p>${escHtml(p.description || 'No description')}</p>
        <div class="project-meta">
          <span>${p.member_count} member${p.member_count !== 1 ? 's' : ''}</span>
          <span>${p.done_count} / ${p.task_count} completed</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

async function generateProjectDescription() {
  const name = document.getElementById('proj_name')?.value.trim();
  const statusEl = document.getElementById('proj-llm-status');
  const descEl = document.getElementById('proj_desc');
  if (!name) {
    showToast('Enter a project name first', 'error');
    return;
  }
  const btn = document.getElementById('ai-project-desc-btn');
  btn.disabled = true;
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'LLM generating…';
  try {
    const res = await API.post('/ai/project-description', {
      name,
      context: document.getElementById('proj_ai_context')?.value.trim() || null,
    });
    descEl.value = res.description;
    statusEl.innerHTML = escHtml(res.description) + `<div class="llm-source">${res.source === 'llm' ? 'OpenAI' : 'Built-in assistant'}</div>`;
    showToast('Description generated', 'success');
  } catch (ex) {
    statusEl.textContent = ex.message;
    showToast(ex.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function runHubLlmInsight() {
  const out = document.getElementById('hub-llm-output');
  const btn = document.getElementById('hub-llm-refresh');
  btn.disabled = true;
  out.classList.remove('hidden');
  out.textContent = 'Analyzing…';
  try {
    const stats = await API.get('/tasks/dashboard');
    const projects = await API.get('/projects/');
    const leadN = projects.filter(p => p.my_role === 'ADMIN').length;
    const lines = [
      `You have ${stats.total_tasks} assigned deliverable(s): ${stats.in_progress} in progress, ${stats.done} done, ${stats.overdue} overdue.`,
      `Across ${projects.length} initiative(s) — Project Lead on ${leadN}, Tasker on ${projects.length - leadN}.`,
    ];
    if (stats.overdue > 0) lines.push('Priority: clear overdue items or ask your Project Lead for an extension.');
    if (stats.total_tasks === 0) lines.push('No assignments yet — check Active initiatives or ask your lead to assign work.');
    if (projects.length && stats.in_progress === 0 && stats.total_tasks > 0) {
      lines.push('LLM tip: move one task to In progress to signal active work to stakeholders.');
    }
    out.innerHTML = lines.map(l => `<p style="margin-bottom:8px">${escHtml(l)}</p>`).join('')
      + '<div class="llm-source">Built-in assistant</div>';
  } catch (ex) {
    out.textContent = ex.message;
  } finally {
    btn.disabled = false;
  }
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
