// State management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let history = JSON.parse(localStorage.getItem('dailyHistory')) || {}; // { 'YYYY-MM-DD': number }

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = getLocalDateString(today);

let weekOffset = 0; // Navigation offset in weeks

// DOM Elements
const todoForm = document.getElementById('todo-form');
const taskList = document.getElementById('todo-list');
const taskNameInput = document.getElementById('task-name');
const urgencyInput = document.getElementById('urgency');
const moodInput = document.getElementById('mood');
const timeInput = document.getElementById('time');

const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');

const calendarGrid = document.getElementById('calendar-days');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

// Stats Elements
const statWeek = document.getElementById('stat-week');
const statMonth = document.getElementById('stat-month');
const statYear = document.getElementById('stat-year');
const statAvg = document.getElementById('stat-avg');
const statTotal = document.getElementById('stat-total');
const statStreak = document.getElementById('stat-streak');

// Value display updates
const valUrgency = document.getElementById('val-urgency');
const valMood = document.getElementById('val-mood');
const valTime = document.getElementById('val-time');

urgencyInput.addEventListener('input', (e) => valUrgency.textContent = e.target.value);
moodInput.addEventListener('input', (e) => valMood.textContent = e.target.value);
timeInput.addEventListener('input', (e) => valTime.textContent = e.target.value);

// Initialize
function init() {
    renderTasks();
    updateProgressBar();
    renderWeeklyCalendar();
    renderStats();

    prevWeekBtn.addEventListener('click', () => {
        weekOffset--;
        renderWeeklyCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        weekOffset++;
        renderWeeklyCalendar();
    });
}

todoForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTask = {
        id: Date.now().toString(),
        name: taskNameInput.value,
        urgency: parseInt(urgencyInput.value),
        mood: parseInt(moodInput.value),
        time: parseInt(timeInput.value),
        completed: false,
        date: todayStr,
        createdAt: new Date().toISOString()
    };

    newTask.sum = newTask.urgency + newTask.mood + newTask.time;

    tasks.push(newTask);
    saveState();
    renderTasks();
    todoForm.reset();

    // Reset range displays
    valUrgency.textContent = '3';
    valMood.textContent = '3';
    valTime.textContent = '3';
});

function saveState() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('dailyHistory', JSON.stringify(history));
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    updateProgressBar();
}

function finishTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveState();
        renderTasks();
        updateProgressBar();
    }
}

function updateProgressBar() {
    const todayTasks = tasks.filter(t => t.date === todayStr);
    const completedWeight = todayTasks
        .filter(t => t.completed)
        .reduce((sum, t) => sum + t.sum, 0);

    const displayWeight = Math.min(25, completedWeight);
    const percentage = (displayWeight / 25) * 100;

    progressBarFill.style.width = `${percentage}%`;
    progressText.textContent = `${displayWeight} / 25`;

    const color = getProgressColor(displayWeight);
    progressBarFill.style.backgroundColor = color;

    history[todayStr] = completedWeight; // Save actual weight for stats, not capped

    saveState();
    renderWeeklyCalendar();
    renderStats();
}

function getProgressColor(weight) {
    if (weight <= 0) return 'transparent';
    if (weight < 12) return '#fb923c';
    if (weight < 25) return '#facc15';
    return '#4ade80';
}

function renderTasks() {
    const todayTasks = tasks.filter(t => t.date === todayStr);

    const sortedTasks = todayTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return b.sum - a.sum;
    });

    taskList.innerHTML = '';

    if (sortedTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks for today. Start fresh!</div>';
        return;
    }

    sortedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="task-info">
                <span class="task-name-text">${escapeHtml(task.name)}</span>
                <div class="task-stats">
                    <span class="stat-pill">U: ${task.urgency}</span>
                    <span class="stat-pill">M: ${task.mood}</span>
                    <span class="stat-pill">T: ${task.time}</span>
                </div>
            </div>
            <div class="weight-sum">${task.sum}</div>
            <div class="actions-group">
                <button class="finish-btn ${task.completed ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <button class="delete-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;

        li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        li.querySelector('.finish-btn').addEventListener('click', () => finishTask(task.id));
        taskList.appendChild(li);
    });
}

function renderWeeklyCalendar() {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Format Month/Year based on start of week
    calendarMonthYear.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(startOfWeek);
    calendarGrid.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = getLocalDateString(date);
        const score = history[dateStr] || 0;

        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${dateStr === todayStr ? 'today' : ''}`;

        dayDiv.innerHTML = `
            <span class="day-name">${dayNames[i]}</span>
            <span class="day-num">${date.getDate()}</span>
        `;

        if (score > 0) {
            const dot = document.createElement('div');
            dot.className = 'success-dot';
            dot.style.backgroundColor = getProgressColor(Math.min(25, score));
            dayDiv.appendChild(dot);
        }

        calendarGrid.appendChild(dayDiv);
    }
}

function renderStats() {
    const dates = Object.keys(history).sort();

    // Total points
    const totalPoints = Object.values(history).reduce((a, b) => a + b, 0);
    statTotal.textContent = totalPoints;

    // Avg points (calculated only from days we have data)
    const avgPoints = dates.length > 0 ? (totalPoints / dates.length).toFixed(1) : 0;
    statAvg.textContent = avgPoints;

    // Streak
    let streak = 0;
    let tempDate = new Date(today);
    while (true) {
        const dStr = getLocalDateString(tempDate);
        if ((history[dStr] || 0) >= 25) {
            streak++;
            tempDate.setDate(tempDate.getDate() - 1);
        } else {
            break;
        }
    }
    statStreak.textContent = streak;

    // Period Calculations
    const year = today.getFullYear();
    const month = today.getMonth();

    // 1. Weekly % (Always out of 7 days)
    const sun = new Date(today);
    sun.setDate(today.getDate() - today.getDay());

    let weeklySuccess = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(sun);
        d.setDate(sun.getDate() + i);
        if ((history[getLocalDateString(d)] || 0) >= 25) weeklySuccess++;
    }
    statWeek.textContent = Math.round((weeklySuccess / 7) * 100) + '%';

    // 2. Monthly % (Days in current month)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let monthlySuccess = 0;
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const dStr = getLocalDateString(d);
        if ((history[dStr] || 0) >= 25) monthlySuccess++;
    }
    statMonth.textContent = Math.round((monthlySuccess / daysInMonth) * 100) + '%';

    // 3. Yearly % (365 or 366 days)
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    const yearlySuccess = dates.filter(d => {
        return d.startsWith(year.toString()) && (history[d] || 0) >= 25;
    }).length;

    statYear.textContent = Math.round((yearlySuccess / daysInYear) * 100) + '%';
}

function getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

init();
