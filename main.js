// State management
let tasks = [];
let deletedTasks = [];
let history = {};
let prevCompletedWeight = 0;
let sectionOrder = [];

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

// Bin Elements
const binModal = document.getElementById('bin-modal');
const binList = document.getElementById('bin-list');
const binOpenBtn = document.getElementById('bin-open-btn');
const binCloseBtn = document.getElementById('bin-close-btn');

urgencyInput.addEventListener('input', (e) => valUrgency.textContent = e.target.value);
moodInput.addEventListener('input', (e) => valMood.textContent = e.target.value);
timeInput.addEventListener('input', (e) => valTime.textContent = e.target.value);

// Initialize
async function init() {
    await loadInitialData();
    renderTasks();
    updateProgressBar();
    renderWeeklyCalendar();
    renderStats();
    initSectionDragging();

    prevWeekBtn.addEventListener('click', () => {
        weekOffset--;
        renderWeeklyCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        weekOffset++;
        renderWeeklyCalendar();
    });

    binOpenBtn.addEventListener('click', () => {
        binModal.classList.add('active');
        renderDeletedTasks();
    });

    binCloseBtn.addEventListener('click', () => {
        binModal.classList.remove('active');
    });

    // Close on outside click
    binModal.addEventListener('click', (e) => {
        if (e.target === binModal) {
            binModal.classList.remove('active');
        }
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

async function loadInitialData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            tasks = data.tasks.map(t => ({ ...t, completed: t.completed === 1 }));
            deletedTasks = data.deletedTasks.map(t => ({ ...t, completed: t.completed === 1 }));
            history = data.history;
            sectionOrder = JSON.parse(data.settings.sectionOrder || 'null');
            if (sectionOrder) {
                const main = document.querySelector('main');
                sectionOrder.forEach(id => {
                    const section = document.getElementById(id);
                    if (section) main.appendChild(section);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load local data, falling back to localStorage:', error);
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        deletedTasks = JSON.parse(localStorage.getItem('deletedTasks')) || [];
        history = JSON.parse(localStorage.getItem('dailyHistory')) || {};
        const savedOrder = JSON.parse(localStorage.getItem('sectionOrder'));
        if (savedOrder) {
            const main = document.querySelector('main');
            savedOrder.forEach(id => {
                const section = document.getElementById(id);
                if (section) main.appendChild(section);
            });
        }
    }
}

async function saveState() {
    // Keep localStorage as temporary backup
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));
    localStorage.setItem('dailyHistory', JSON.stringify(history));

    // Sync with SQLite
    try {
        await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tasks,
                deletedTasks,
                history,
                settings: { sectionOrder: JSON.parse(localStorage.getItem('sectionOrder')) }
            })
        });
    } catch (e) {
        console.warn('SQLite Sync failed, data saved only in localStorage');
    }
}

function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        const deleted = tasks.splice(index, 1)[0];
        deletedTasks.unshift(deleted); // Add to beginning of bin
        saveState();
        renderTasks();
        updateProgressBar();
    }
}

function undeleteTask(id) {
    const index = deletedTasks.findIndex(t => t.id === id);
    if (index !== -1) {
        const restored = deletedTasks.splice(index, 1)[0];
        tasks.push(restored);
        saveState();
        renderTasks();
        renderDeletedTasks();
        updateProgressBar();
    }
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

    // Trigger celebration if target is reached
    // We celebrate every time the threshold of 25 is reached (crosses from < 25 to >= 25)
    if (completedWeight >= 25 && prevCompletedWeight < 25) {
        celebrate();
    }
    prevCompletedWeight = completedWeight;

    history[todayStr] = completedWeight; // Save actual weight for stats, not capped

    saveState();
    renderWeeklyCalendar();
    renderStats();
}

function celebrate() {
    const festiveIcons = [
        '🥳', '🎉', '🎊', '🎈', '🎁', '🎇', '🎆', '✨', '🌟', '🥂',
        '⭐', '🌈', '🦄', '🦖', '🦁', '🦋', '🥇', '🏆', '💎', '🚀',
        '🔥', '⚡️', '🎸', '🎨', '🎬', '🍿', '🎰', '🎲', '💥', '🧡'
    ];

    // Pick ONE icon for this whole celebration to make it thematic
    const selectedIcon = festiveIcons[Math.floor(Math.random() * festiveIcons.length)];

    const container = document.createElement('div');
    container.className = 'celebration-container';
    document.body.appendChild(container);

    const count = 100;

    for (let i = 0; i < count; i++) {
        const iconEl = document.createElement('div');
        iconEl.className = 'celebration-icon';
        iconEl.textContent = selectedIcon;

        const startX = Math.random() * 100; // 0 to 100vw
        iconEl.style.left = startX + 'vw';
        iconEl.style.top = '-10vh';

        const fontSize = 1.5 + Math.random() * 2.5; // Random size
        const duration = 4 + Math.random() * 5; // Random fall speed
        const delay = Math.random() * 3; // Staggered start
        const drift = (Math.random() - 0.5) * 400; // Random horizontal drift in pixels

        iconEl.style.fontSize = `${fontSize}rem`;
        iconEl.style.setProperty('--drift', `${drift}px`);
        iconEl.style.animation = `celebrate-fall ${duration}s linear ${delay}s forwards`;

        container.appendChild(iconEl);
    }

    // Clean up
    setTimeout(() => {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }, 15000); // 15s to ensure all have fallen
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

function renderDeletedTasks() {
    binList.innerHTML = '';

    if (deletedTasks.length === 0) {
        binList.innerHTML = '<div class="empty-state">Your bin is empty.</div>';
        return;
    }

    deletedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-card';
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
                <button class="restore-btn" title="Undelete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                </button>
            </div>
        `;

        li.querySelector('.restore-btn').addEventListener('click', () => undeleteTask(task.id));
        binList.appendChild(li);
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

function initSectionDragging() {
    const main = document.querySelector('main');
    const sections = main.querySelectorAll('[draggable="true"]');

    sections.forEach(section => {
        section.addEventListener('dragstart', (e) => {
            section.classList.add('section-dragging');
            e.dataTransfer.setData('text/plain', section.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        section.addEventListener('dragend', () => {
            section.classList.remove('section-dragging');
        });

        section.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingSection = main.querySelector('.section-dragging');
            if (!draggingSection) return;

            const target = e.currentTarget;
            if (target === draggingSection) return;

            const rect = target.getBoundingClientRect();
            const next = (e.clientY - rect.top) > (rect.height / 2);

            main.insertBefore(draggingSection, next ? target.nextSibling : target);
        });

        section.addEventListener('drop', (e) => {
            e.preventDefault();
            saveSectionOrder();
        });
    });

    // Handle dropping on main container for edge cases
    main.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
}

function saveSectionOrder() {
    const main = document.querySelector('main');
    const sections = main.querySelectorAll('section');
    const order = Array.from(sections).map(s => s.id);
    localStorage.setItem('sectionOrder', JSON.stringify(order));
    saveState(); // Trigger full sync
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
