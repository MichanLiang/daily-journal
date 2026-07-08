const HOURS = Array.from({length: 18}, (_, i) => i + 6);
const CATEGORIES = ['', '例行事項', '學業', '工作', '社交', '自我提升', '睡眠'];
const CAT_COLORS = {
  '社交':    '#B5838D',
  '睡眠':    '#D4A5A0',
  '學業':    '#E5D5A0',
  '自我提升':'#A5B5A0',
  '工作':    '#A0B0C0',
  '例行事項':'#B0A5C0',
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
const ENG_VALUES = [0, 100, 70, 40];

let tableData = {};
let diaryText = '';
let tasks = [];
let charts = {};
let reviews = [];
let settings = { displayName: '' };

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let currentDate = todayStr();

let loadId = 0;

async function loadDate() {
  const loadAt = currentDate;
  const myLoadId = ++loadId;

  document.getElementById('dateDisplay').textContent = formatDate(loadAt);
  document.getElementById('datePicker').value = loadAt;

  const isToday = loadAt === todayStr();
  document.getElementById('dateToday').classList.toggle('hidden', isToday);

  const [y, m] = loadAt.split('-');
  const dayGoalKey = `ddxj_goals_day_${loadAt}`;
  const yearKey = `ddxj_goals_year_${y}`;
  const monthKey = `ddxj_goals_month_${y}-${m}`;
  const tableKey = `ddxj_table_${loadAt}`;
  const diaryKey = `ddxj_diary_${loadAt}`;

  tableData = JSON.parse(localStorage.getItem(tableKey) || '{}');
  diaryText = localStorage.getItem(diaryKey) || '';
  tasks = JSON.parse(localStorage.getItem('ddxj_tasks') || '[]');
  reviews = JSON.parse(localStorage.getItem('ddxj_reviews') || '[]');
  settings = JSON.parse(localStorage.getItem('ddxj_settings') || '{"displayName":""}');
  document.getElementById('goalYear').value = localStorage.getItem(yearKey) || '';
  document.getElementById('goalMonth').value = localStorage.getItem(monthKey) || '';
  document.getElementById('goalDay').value = localStorage.getItem(dayGoalKey) || '';

  applySettings();
  buildTable();
  document.getElementById('diaryInput').value = diaryText;
  if (tasks.length === 0) tasks = [{ theme: '', goal: '', total: 0, progress: 0, done: '' }];
  renderTasks();

  if (currentUser) {
    const [dayData, goalsData, tasksData, reviewsData, settingsData] = await Promise.all([
      loadDayFromFirestore(loadAt),
      loadGoalsFromFirestore(),
      loadTasksFromFirestore(),
      loadReviewsFromFirestore(),
      loadSettingsFromFirestore()
    ]);

    if (myLoadId !== loadId) return;

    if (dayData) {
      tableData = dayData.table || {};
      diaryText = dayData.diary || '';
      document.getElementById('goalDay').value = dayData.dayGoal || '';
      localStorage.setItem(tableKey, JSON.stringify(tableData));
      localStorage.setItem(diaryKey, diaryText);
      localStorage.setItem(dayGoalKey, dayData.dayGoal || '');
      buildTable();
      document.getElementById('diaryInput').value = diaryText;
    }

    if (goalsData) {
      document.getElementById('goalYear').value = goalsData.yearGoal || '';
      document.getElementById('goalMonth').value = goalsData.monthGoal || '';
      localStorage.setItem(yearKey, goalsData.yearGoal || '');
      localStorage.setItem(monthKey, goalsData.monthGoal || '');
    }

    if (tasksData) {
      tasks = tasksData;
      localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
      if (tasks.length === 0) tasks = [{ theme: '', goal: '', total: 0, progress: 0, done: '' }];
      renderTasks();
    }

    if (reviewsData) {
      reviews = reviewsData;
      localStorage.setItem('ddxj_reviews', JSON.stringify(reviews));
    }

    if (settingsData) {
      settings = settingsData;
      localStorage.setItem('ddxj_settings', JSON.stringify(settings));
      applySettings();
    }
  }

  if (document.getElementById('page-charts').classList.contains('active')) {
    renderCharts();
  }
}

function flushSave() {
  clearTimeout(saveTableTimer);
  clearTimeout(saveDiaryTimer);
  clearTimeout(saveGoalsTimer);
  clearTimeout(saveTasksTimer);

  diaryText = document.getElementById('diaryInput').value;
  const dayGoal = document.getElementById('goalDay').value;
  const yearGoal = document.getElementById('goalYear').value;
  const monthGoal = document.getElementById('goalMonth').value;
  const [y, m] = currentDate.split('-');
  const tableKey = `ddxj_table_${currentDate}`;
  const diaryKey = `ddxj_diary_${currentDate}`;
  const dayGoalKey = `ddxj_goals_day_${currentDate}`;
  const yearKey = `ddxj_goals_year_${y}`;
  const monthKey = `ddxj_goals_month_${y}-${m}`;

  localStorage.setItem(tableKey, JSON.stringify(tableData));
  localStorage.setItem(diaryKey, diaryText);
  localStorage.setItem(dayGoalKey, dayGoal);
  localStorage.setItem(yearKey, yearGoal);
  localStorage.setItem(monthKey, monthGoal);
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  localStorage.setItem('ddxj_reviews', JSON.stringify(reviews));
  localStorage.setItem('ddxj_settings', JSON.stringify(settings));

  if (currentUser) {
    saveDayToFirestore(currentDate, { table: tableData, diary: diaryText, dayGoal });
    saveGoalsToFirestore({ yearGoal, monthGoal });
    saveTasksToFirestore(tasks);
    saveReviewsToFirestore(reviews);
    saveSettingsToFirestore(settings);
  }
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  return `${y} / ${m} / ${d}`;
}

function changeDate(delta) {
  flushSave();
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  currentDate = `${y}-${m}-${day}`;
  loadDate();
}

function goToday() {
  flushSave();
  currentDate = todayStr();
  loadDate();
}

function pickDate(val) {
  if (val) {
    flushSave();
    currentDate = val;
    loadDate();
  }
}

function buildTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  HOURS.forEach((h, ri) => {
    const key = `h${h}`;
    if (!tableData[key]) tableData[key] = { todo: '', actual: '', cat: '', eng: [0,0,0,0,0,0], feedback: '', review: false };
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
      <td class="td-review"><input type="checkbox" class="review-check" ${row.review ? 'checked' : ''} onchange="toggleReview('${key}',this.checked)"></td>
    `;
    tbody.appendChild(tr);
  });
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

function toggleReview(key, checked) {
  tableData[key].review = checked;
  if (checked && tableData[key].feedback) {
    const existing = reviews.find(r => r.date === currentDate && r.hour === key);
    if (!existing) {
      reviews.push({
        date: currentDate,
        hour: key,
        text: tableData[key].feedback,
        cat: tableData[key].cat
      });
    }
  } else if (!checked) {
    reviews = reviews.filter(r => !(r.date === currentDate && r.hour === key));
  }
  localStorage.setItem('ddxj_reviews', JSON.stringify(reviews));
  if (currentUser) saveReviewsToFirestore(reviews);
  saveTable();
}

let saveTableTimer = null;
function saveTable() {
  const tableKey = `ddxj_table_${currentDate}`;
  localStorage.setItem(tableKey, JSON.stringify(tableData));
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
  const diaryKey = `ddxj_diary_${currentDate}`;
  localStorage.setItem(diaryKey, diaryText);
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
  const [y, m] = currentDate.split('-');
  localStorage.setItem(`ddxj_goals_year_${y}`, yearVal);
  localStorage.setItem(`ddxj_goals_month_${y}-${m}`, monthVal);
  localStorage.setItem(`ddxj_goals_day_${currentDate}`, dayVal);
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
    const doneCount = t.done ? t.done.split('\n').filter(l => l.trim()).length : 0;
    const total = t.total || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="task-input" value="${t.theme}" placeholder="樂器 / 學習…" oninput="updateTask(${i},'theme',this.value)"></td>
      <td><input class="task-input" value="${t.goal}" placeholder="目標描述" oninput="updateTask(${i},'goal',this.value)"></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="progress-input" id="done-count-${i}" style="color:var(--accent);font-weight:500;text-align:right;">${doneCount}</span>
          <span>/</span>
          <input class="progress-input" type="number" min="0" value="${total}" oninput="updateTask(${i},'total',this.value)">
        </div>
      </td>
      <td><textarea class="task-input" rows="1" style="resize:none;" oninput="updateDone(${i},this.value)">${t.done||''}</textarea></td>
    `;
    tbody.appendChild(tr);
  });
}

let saveTasksTimer = null;
function updateTask(i, field, val) {
  tasks[i][field] = field === 'total' ? (parseInt(val) || 0) : val;
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  if (currentUser) {
    clearTimeout(saveTasksTimer);
    saveTasksTimer = setTimeout(() => saveTasksToFirestore(tasks), 500);
  }
}

function updateDone(i, val) {
  tasks[i].done = val;
  const doneCount = val.split('\n').filter(l => l.trim()).length;
  const total = tasks[i].total || 0;
  tasks[i].progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const countEl = document.getElementById(`done-count-${i}`);
  if (countEl) countEl.textContent = doneCount;
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  if (currentUser) {
    clearTimeout(saveTasksTimer);
    saveTasksTimer = setTimeout(() => saveTasksToFirestore(tasks), 500);
  }
}

function addTask() {
  tasks.push({ theme: '', goal: '', total: 0, progress: 0, done: '' });
  localStorage.setItem('ddxj_tasks', JSON.stringify(tasks));
  renderTasks();
  if (currentUser) saveTasksToFirestore(tasks);
}

function switchTab(tab, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`page-${tab}`).classList.add('active');
  if (el) el.classList.add('active');
  const btn = document.getElementById('mobileTabBtn');
  if (btn) {
    const labels = { plan: '計劃表', charts: '圖表', review: '檢討簿', diary: '日記簿' };
    btn.textContent = labels[tab] + ' ▾';
  }
  const options = document.querySelectorAll('.mobile-tab-option');
  options.forEach(o => o.classList.toggle('active', o.dataset.tab === tab));
  if (tab === 'charts') renderCharts();
  if (tab === 'review') renderReview();
  if (tab === 'diary') renderDiary();
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
    const engSum = row.eng.reduce((a, v) => a + ENG_VALUES[v], 0);
    hourEng[h] = engSum / 6;
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
  const radarVals   = HOURS.map(h => Math.round(hourEng[h]));
  const pointColors = radarVals.map(v => v >= 75 ? '#6B8F71' : v >= 65 ? '#E8C76B' : '#D97B6C');

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

function applySettings() {
  const nameEl = document.getElementById('userName');
  if (settings.displayName) {
    nameEl.textContent = settings.displayName;
  } else if (currentUser) {
    nameEl.textContent = currentUser.displayName || currentUser.email || '';
  }
}

function openSettings() {
  document.getElementById('inputDisplayName').value = settings.displayName || '';
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('show');
}

function saveSettings() {
  settings.displayName = document.getElementById('inputDisplayName').value.trim();
  localStorage.setItem('ddxj_settings', JSON.stringify(settings));
  applySettings();
  closeSettings();
  if (currentUser) saveSettingsToFirestore(settings);
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function getYearKey(dateStr) {
  return dateStr.slice(0, 4);
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function renderReview() {
  const content = document.getElementById('reviewContent');
  const activeTab = document.querySelector('.review-tab.active');
  const period = activeTab ? activeTab.dataset.period : 'week';

  if (reviews.length === 0) {
    content.innerHTML = '<div class="review-empty">目前沒有檢討紀錄<br><span style="font-size:12px;color:#C8C4BC;">在計劃表勾選回饋欄的方框，即可加入檢討簿</span></div>';
    return;
  }

  let grouped = {};

  if (period === 'week') {
    reviews.forEach(r => {
      const { start, end } = getWeekRange(r.date);
      const key = `${start.toISOString().slice(0,10)}_${end.toISOString().slice(0,10)}`;
      const label = `${formatDateShort(start.toISOString().slice(0,10))} ~ ${formatDateShort(end.toISOString().slice(0,10))}`;
      if (!grouped[key]) grouped[key] = { label, items: [] };
      grouped[key].items.push(r);
    });
  } else if (period === 'month') {
    reviews.forEach(r => {
      const key = getMonthKey(r.date);
      const [y, m] = key.split('-');
      const label = `${y} 年 ${parseInt(m)} 月`;
      if (!grouped[key]) grouped[key] = { label, items: [] };
      grouped[key].items.push(r);
    });
  } else {
    reviews.forEach(r => {
      const key = getYearKey(r.date);
      const label = `${key} 年`;
      if (!grouped[key]) grouped[key] = { label, items: [] };
      grouped[key].items.push(r);
    });
  }

  const keys = Object.keys(grouped).sort().reverse();

  if (keys.length === 0) {
    content.innerHTML = '<div class="review-empty">目前沒有檢討紀錄</div>';
    return;
  }

  content.innerHTML = keys.map(k => {
    const g = grouped[k];
    return `
      <div class="review-group">
        <div class="review-group-title">${g.label}</div>
        ${g.items.map(r => `
          <div class="review-item">
            <div class="review-item-date">${formatDateShort(r.date)} ${r.hour.replace('h','')}:00${r.cat ? ' · ' + r.cat : ''}</div>
            <div class="review-item-text">${r.text}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderDiary() {
  const content = document.getElementById('diaryContent');
  const entries = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith('ddxj_diary_')) continue;
    const date = key.replace('ddxj_diary_', '');
    const text = localStorage.getItem(key);
    if (!text || !text.trim()) continue;
    entries.push({ date, text: text.trim() });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    content.innerHTML = '<div class="review-empty">目前沒有日記紀錄</div>';
    return;
  }

  const grouped = {};
  entries.forEach(e => {
    const [y, m] = e.date.split('-');
    const key = `${y}-${m}`;
    const label = `${y} 年 ${parseInt(m)} 月`;
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(e);
  });

  const keys = Object.keys(grouped).sort().reverse();
  const today = todayStr();

  content.innerHTML = keys.map(k => {
    const g = grouped[k];
    return `
      <div class="diary-month open">
        <div class="diary-month-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="diary-month-arrow">▶</span>
          <span class="diary-month-title">${g.label}</span>
          <span class="diary-month-count">${g.items.length} 則</span>
        </div>
        <div class="diary-month-body">
          ${g.items.map(e => `
            <div class="diary-entry">
              <div class="diary-entry-date">${formatDateShort(e.date)}${e.date === today ? '（今天）' : ''}</div>
              <div class="diary-entry-text">${e.text}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab, btn);
    });
  });

  document.getElementById('mobileTabBtn').addEventListener('click', () => {
    document.getElementById('mobileTabDropdown').classList.add('show');
  });

  document.getElementById('mobileTabDropdown').addEventListener('click', e => {
    const option = e.target.closest('.mobile-tab-option');
    if (!option) return;
    const tab = option.dataset.tab;
    document.querySelectorAll('.mobile-tab-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    document.getElementById('mobileTabDropdown').classList.remove('show');
    document.getElementById('mobileTabBtn').textContent = option.textContent + ' ▾';
    const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
    switchTab(tab, btn);
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

  document.getElementById('userMenu').addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
  document.getElementById('btnLogoutFull').addEventListener('click', signOut);

  document.getElementById('btnClearFirestore').addEventListener('click', async () => {
    if (!confirm('清除所有雲端資料（保留今天的）？此操作無法復原。')) return;
    await clearFirestoreExceptToday();
    alert('已清除');
    closeSettings();
    loadDate();
  });

  document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === document.getElementById('settingsModal')) closeSettings();
  });

  document.querySelectorAll('.review-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.review-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderReview();
    });
  });
});
