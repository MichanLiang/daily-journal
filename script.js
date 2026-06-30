const HOURS = Array.from({length: 18}, (_, i) => i + 6);
const CATEGORIES = ['', '例行事項', '學業', '工作', '社交', '自我提升', '睡眠'];
const CAT_COLORS = {
  '例行事項': '#B8ADEB',
  '學業':    '#E8C76B',
  '工作':    '#7BBCF0',
  '社交':    '#F0A0CC',
  '自我提升':'#6B8F71',
  '睡眠':    '#ABABBE',
};
const CAT_CLASS = {
  '例行事項': 'cat-routine',
  '學業':    'cat-study',
  '工作':    'cat-work',
  '社交':    'cat-social',
  '自我提升':'cat-growth',
  '睡眠':    'cat-sleep',
};
const ENG_CLASSES = ['', 'high', 'mid', 'low'];

let tableData = {};
let diaryText = '';
let tasks = [];
let charts = {};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let currentDate = todayStr();

function getKey(type) {
  return `ddxj_${type}_${currentDate}`;
}

function goalKey(type) {
  const [y, m] = currentDate.split('-');
  if (type === 'year') return `ddxj_goals_year_${y}`;
  if (type === 'month') return `ddxj_goals_month_${y}-${m}`;
  if (type === 'day') return `ddxj_goals_day_${currentDate}`;
}

function init() {
  loadDate();
}

async function loadDate() {
  document.getElementById('dateDisplay').textContent = formatDate(currentDate);
  document.getElementById('datePicker').value = currentDate;

  const isToday = currentDate === todayStr();
  document.getElementById('dateToday').classList.toggle('hidden', isToday);

  if (currentUser) {
    const data = await loadDayFromFirestore(currentDate);
    if (data) {
      tableData = data.table || {};
      diaryText = data.diary || '';
      document.getElementById('goalDay').value = data.dayGoal || '';
      localStorage.setItem(getKey('table'), JSON.stringify(tableData));
      localStorage.setItem(getKey('diary'), diaryText);
      localStorage.setItem(goalKey('day'), data.dayGoal || '');
    } else {
      tableData = JSON.parse(localStorage.getItem(getKey('table')) || '{}');
      diaryText = localStorage.getItem(getKey('diary')) || '';
      document.getElementById('goalYear').value = localStorage.getItem(goalKey('year')) || '';
      document.getElementById('goalMonth').value = localStorage.getItem(goalKey('month')) || '';
      document.getElementById('goalDay').value = localStorage.getItem(goalKey('day')) || '';
    }

    const goalsData = await loadGoalsFromFirestore();
    if (goalsData) {
      document.getElementById('goalYear').value = goalsData.yearGoal || '';
      document.getElementById('goalMonth').value = goalsData.monthGoal || '';
      localStorage.setItem(goalKey('year'), goalsData.yearGoal || '');
      localStorage.setItem(goalKey('month'), goalsData.monthGoal || '');
    }

    const tasksData = await loadTasksFromFirestore();
    if (tasksData) {
      tasks = tasksData;
      localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
    } else {
      tasks = JSON.parse(localStorage.getItem('ddxj_tasks') || '[]');
    }
  } else {
    tableData = JSON.parse(localStorage.getItem(getKey('table')) || '{}');
    diaryText = localStorage.getItem(getKey('diary')) || '';
    tasks = JSON.parse(localStorage.getItem('ddxj_tasks') || '[]');
    document.getElementById('goalYear').value = localStorage.getItem(goalKey('year')) || '';
    document.getElementById('goalMonth').value = localStorage.getItem(goalKey('month')) || '';
    document.getElementById('goalDay').value = localStorage.getItem(goalKey('day')) || '';
  }

  buildTable();
  document.getElementById('diaryInput').value = diaryText;

  if (tasks.length === 0) tasks = [{ theme: '', goal: '', progress: 0, done: '' }];
  renderTasks();
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${y} / ${m} / ${d}`;
}

function changeDate(delta) {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  currentDate = `${y}-${m}-${day}`;
  loadDate();
}

function goToday() {
  currentDate = todayStr();
  loadDate();
}

function pickDate(val) {
  if (val) {
    currentDate = val;
    loadDate();
  }
}

function buildTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  HOURS.forEach((h, ri) => {
    const key = `h${h}`;
    if (!tableData[key]) tableData[key] = { todo: '', actual: '', cat: '', eng: [0,0,0,0,0,0], feedback: '' };
    const row = tableData[key];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-time">${String(h).padStart(2,'0')}:00</td>
      <td><textarea class="cell-box" rows="1" data-r="${ri}" data-c="0" oninput="updateCell('${key}','todo',this.value)">${row.todo}</textarea></td>
      <td><textarea class="cell-box" rows="1" data-r="${ri}" data-c="1" oninput="updateCell('${key}','actual',this.value)">${row.actual}</textarea></td>
      <td>
        <select class="category-select ${CAT_CLASS[row.cat]||''}" data-r="${ri}" data-c="2" onchange="updateCat('${key}',this)">
          ${CATEGORIES.map(c => `<option value="${c}" ${c===row.cat?'selected':''}>${c||'—'}</option>`).join('')}
        </select>
      </td>
      <td>
        <div class="engagement-grid" id="eng-${key}">
          ${row.eng.map((v,i) => `<div class="eng-cell ${ENG_CLASSES[v]}" onclick="cycleEng('${key}',${i})" title="${i*10}~${(i+1)*10}分鐘"></div>`).join('')}
        </div>
      </td>
      <td class="td-feedback"><textarea class="cell-input" rows="1" data-r="${ri}" data-c="3" oninput="updateCell('${key}','feedback',this.value)">${row.feedback}</textarea></td>
    `;
    tbody.appendChild(tr);
  });
}

function navigateCell(ri, ci, dir) {
  const rows = HOURS.length;
  const cols = [0, 1, 2, 3];
  let nr = ri, nc = ci;
  if (dir === 'ArrowUp')    nr = Math.max(0, ri - 1);
  if (dir === 'ArrowDown')  nr = Math.min(rows - 1, ri + 1);
  if (dir === 'ArrowLeft')  nc = cols.indexOf(ci) > 0 ? cols[cols.indexOf(ci) - 1] : ci;
  if (dir === 'ArrowRight') nc = cols.indexOf(ci) < cols.length - 1 ? cols[cols.indexOf(ci) + 1] : ci;
  const el = document.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
  if (el) el.focus();
}

function updateCell(key, field, val) {
  tableData[key][field] = val;
  saveTable();
}

function updateCat(key, sel) {
  tableData[key].cat = sel.value;
  sel.className = `category-select ${CAT_CLASS[sel.value]||''}`;
  saveTable();
}

function cycleEng(key, idx) {
  const v = tableData[key].eng[idx];
  tableData[key].eng[idx] = (v + 1) % 4;
  const cell = document.querySelectorAll(`#eng-${key} .eng-cell`)[idx];
  cell.className = `eng-cell ${ENG_CLASSES[tableData[key].eng[idx]]}`;
  saveTable();
}

let saveTableTimer = null;
function saveTable() {
  localStorage.setItem(getKey('table'), JSON.stringify(tableData));
  if (currentUser) {
    clearTimeout(saveTableTimer);
    saveTableTimer = setTimeout(() => {
      saveDayToFirestore(currentDate, {
        table: tableData,
        diary: diaryText,
        dayGoal: document.getElementById('goalDay').value
      });
    }, 500);
  }
}

let saveDiaryTimer = null;
function saveDiary() {
  diaryText = document.getElementById('diaryInput').value;
  localStorage.setItem(getKey('diary'), diaryText);
  if (currentUser) {
    clearTimeout(saveDiaryTimer);
    saveDiaryTimer = setTimeout(() => {
      saveDayToFirestore(currentDate, {
        table: tableData,
        diary: diaryText,
        dayGoal: document.getElementById('goalDay').value
      });
    }, 500);
  }
}

let saveGoalsTimer = null;
function saveGoals() {
  const yearVal = document.getElementById('goalYear').value;
  const monthVal = document.getElementById('goalMonth').value;
  const dayVal = document.getElementById('goalDay').value;
  localStorage.setItem(goalKey('year'), yearVal);
  localStorage.setItem(goalKey('month'), monthVal);
  localStorage.setItem(goalKey('day'), dayVal);
  if (currentUser) {
    clearTimeout(saveGoalsTimer);
    saveGoalsTimer = setTimeout(() => {
      saveGoalsToFirestore({ yearGoal: yearVal, monthGoal: monthVal });
      saveDayToFirestore(currentDate, {
        table: tableData,
        diary: diaryText,
        dayGoal: dayVal
      });
    }, 500);
  }
}

function renderTasks() {
  const tbody = document.getElementById('tasksBody');
  tbody.innerHTML = '';
  tasks.forEach((t, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="task-input" value="${t.theme}" placeholder="樂器 / 學習…" oninput="updateTask(${i},'theme',this.value)"></td>
      <td><input class="task-input" value="${t.goal}" placeholder="目標描述" oninput="updateTask(${i},'goal',this.value)"></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="progress-bar"><div class="progress-fill" style="width:${t.progress||0}%" id="pf-${i}"></div></div>
          <input class="progress-input" type="number" min="0" max="100" value="${t.progress||0}" oninput="updateProgress(${i},this.value)">%
        </div>
      </td>
      <td><input class="task-input" value="${t.done}" placeholder="完成的事情…" oninput="updateTask(${i},'done',this.value)"></td>
    `;
    tbody.appendChild(tr);
  });
}

let saveTasksTimer = null;
function updateTask(i, field, val) {
  tasks[i][field] = val;
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  if (currentUser) {
    clearTimeout(saveTasksTimer);
    saveTasksTimer = setTimeout(() => saveTasksToFirestore(tasks), 500);
  }
}

function updateProgress(i, val) {
  tasks[i].progress = Math.min(100, Math.max(0, parseInt(val)||0));
  const pf = document.getElementById(`pf-${i}`);
  if (pf) pf.style.width = tasks[i].progress + '%';
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  if (currentUser) {
    clearTimeout(saveTasksTimer);
    saveTasksTimer = setTimeout(() => saveTasksToFirestore(tasks), 500);
  }
}

function addTask() {
  tasks.push({ theme: '', goal: '', progress: 0, done: '' });
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  renderTasks();
  if (currentUser) saveTasksToFirestore(tasks);
}

function switchTab(tab, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`page-${tab}`).classList.add('active');
  el.classList.add('active');
  if (tab === 'charts') renderCharts();
}

function getChartData() {
  const catMin = {};
  CATEGORIES.slice(1).forEach(c => catMin[c] = 0);
  const hourEng = {};
  HOURS.forEach(h => hourEng[h] = 0);

  HOURS.forEach(h => {
    const key = `h${h}`;
    const row = tableData[key];
    if (!row) return;
    if (row.cat && catMin[row.cat] !== undefined) catMin[row.cat] += 60;
    const engSum = row.eng.reduce((a, v) => a + v, 0);
    hourEng[h] = engSum / (row.eng.length * 3);
  });

  return { catMin, hourEng };
}

function renderCharts() {
  const { catMin, hourEng } = getChartData();

  const catLabels = Object.keys(catMin).filter(k => catMin[k] > 0);
  const catVals   = catLabels.map(k => catMin[k]);

  if (charts.categoryPie) charts.categoryPie.destroy();
  if (catVals.length === 0) {
    const ctx = document.getElementById('categoryPie').getContext('2d');
    ctx.clearRect(0,0,400,220);
    ctx.fillStyle = '#C8C4BC';
    ctx.font = '12px Noto Sans TC';
    ctx.textAlign = 'center';
    ctx.fillText('填入類別後，圖表將自動更新', 200, 110);
  } else {
    charts.categoryPie = new Chart(document.getElementById('categoryPie'), {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catVals,
          backgroundColor: catLabels.map(k => CAT_COLORS[k]),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { font: { family: 'Noto Sans TC', size: 11 }, padding: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}：${ctx.parsed}分鐘` } }
        }
      }
    });
  }

  const radarLabels = HOURS.map(h => `${h}時`);
  const radarVals   = HOURS.map(h => Math.round(hourEng[h] * 100));
  const pointColors = radarVals.map(v => v >= 67 ? '#6B8F71' : v >= 34 ? '#E8C76B' : v > 0 ? '#D97B6C' : '#E5E2DA');

  if (charts.engagementRadar) charts.engagementRadar.destroy();
  charts.engagementRadar = new Chart(document.getElementById('engagementRadar'), {
    type: 'radar',
    data: {
      labels: radarLabels,
      datasets: [{
        label: '投入度',
        data: radarVals,
        backgroundColor: 'rgba(107,143,113,0.12)',
        borderColor: '#6B8F71',
        borderWidth: 2,
        pointBackgroundColor: pointColors,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: '#E5E2DA' },
          pointLabels: { font: { family: 'Noto Sans TC', size: 10 }, color: '#8A8680' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` 投入度：${ctx.raw}%` } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tableBody').addEventListener('keydown', e => {
    const el = e.target;
    if (el.dataset.r == null) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      navigateCell(+el.dataset.r, +el.dataset.c, e.key);
    }
  });

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab, btn);
    });
  });

  document.getElementById('goalYear').addEventListener('input', saveGoals);
  document.getElementById('goalMonth').addEventListener('input', saveGoals);
  document.getElementById('goalDay').addEventListener('input', saveGoals);
  document.getElementById('diaryInput').addEventListener('input', saveDiary);
  document.getElementById('btnAddTask').addEventListener('click', addTask);

  document.getElementById('datePrev').addEventListener('click', () => changeDate(-1));
  document.getElementById('dateNext').addEventListener('click', () => changeDate(1));
  document.getElementById('dateToday').addEventListener('click', goToday);
  document.getElementById('datePicker').addEventListener('change', e => pickDate(e.target.value));

  document.getElementById('dateDisplay').addEventListener('click', () => {
    document.getElementById('datePicker').classList.toggle('show');
  });

  document.addEventListener('click', e => {
    const picker = document.getElementById('datePicker');
    const display = document.getElementById('dateDisplay');
    if (!picker.contains(e.target) && e.target !== display) {
      picker.classList.remove('show');
    }
  });

  document.getElementById('btnGoogleLogin').addEventListener('click', signInWithGoogle);
  document.getElementById('btnLogout').addEventListener('click', signOut);
});
