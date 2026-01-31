const API_URL = 'http://localhost:3000/api';
let appData = null;
let currentCourseId = null;

// Auth
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-auth-password': localStorage.getItem('ts_password')
    };
}

async function login() {
    const password = document.getElementById('password-input').value;
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    if (res.ok) {
        localStorage.setItem('ts_password', password);
        document.getElementById('password-input').value = '';
        initApp();
    } else {
        document.getElementById('login-error').innerText = 'Falsches Passwort';
    }
}

function stopProp(e) {
    if (e.key === 'Enter') login();
}
window.handleEnter = stopProp; // Global reference

function logout() {
    localStorage.removeItem('ts_password');
    showView('login-view');
}

async function initApp() {
    const res = await fetch(`${API_URL}/data`, { headers: getAuthHeaders() });
    if (res.status === 401) return showView('login-view');

    appData = await res.json();
    if (!appData.attendance) appData.attendance = {};

    renderCourseList();
    showView('dashboard-view');
}

// Navigation
function showView(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// Dashboard
function renderCourseList() {
    const container = document.getElementById('course-list');
    container.innerHTML = '';

    appData.courses.forEach(course => {
        const el = document.createElement('div');
        el.className = 'course-card glass';
        el.onclick = () => openCourse(course.id);

        const scheduleHtml = course.schedule.map(s => `<span class="schedules-tag">${s}</span>`).join('');

        el.innerHTML = `
            <h3>${course.name}</h3>
            <div class="course-meta">
                ${scheduleHtml} <br>
                ${course.participants.length} Teilnehmer
            </div>
        `;
        container.appendChild(el);
    });
}

// Date Slider Logic
function generateDateRange(scheduleStrings, weeksPast = 4, weeksFuture = 0) {
    const dayMap = {
        "Sonntag": 0, "Montag": 1, "Dienstag": 2, "Mittwoch": 3,
        "Donnerstag": 4, "Freitag": 5, "Samstag": 6
    };

    const validDays = scheduleStrings.map(s => dayMap[s.split(' ')[0]]);
    const dates = [];

    // Start from monday of weeksPast weeks ago
    const start = new Date();
    start.setDate(start.getDate() - (weeksPast * 7));

    // End at Today (future is 0)
    const end = new Date();
    end.setDate(end.getDate() + (weeksFuture * 7));

    // Strip time from end date to ensure we don't accidentally include tomorrow if logic changes
    end.setHours(23, 59, 59, 999);

    while (start <= end) {
        if (validDays.includes(start.getDay())) {
            dates.push(new Date(start));
        }
        start.setDate(start.getDate() + 1);
    }
    return dates;
}

let selectedDateStr = null;

function renderDateSlider(dates, defaultDate) {
    const slider = document.getElementById('date-slider');
    slider.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0];

    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const el = document.createElement('div');
        el.className = 'date-card glass';
        if (dateStr === selectedDateStr) el.classList.add('active');

        // Format: "Mo 12.05."
        const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        const dayName = weekdays[date.getDay()];
        const dayDate = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        el.innerHTML = `
            <span class="weekday">${dayName}</span>
            <span class="date">${dayDate}.${month}.</span>
        `;

        el.onclick = () => {
            selectDate(dateStr);
        };

        // Mark today visually if needed, or just rely on date

        slider.appendChild(el);
    });



    // Scroll to selection
    setTimeout(() => {
        const active = slider.querySelector('.active');
        if (active) {
            active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

function selectDate(dateStr) {
    selectedDateStr = dateStr;
    const slider = document.getElementById('date-slider');
    Array.from(slider.children).forEach(child => {
        if (child.dataset.date === dateStr) child.classList.add('active');
        else child.classList.remove('active');
    });
    loadAttendance();
}


// Course View
function openCourse(id) {
    currentCourseId = id;
    const course = appData.courses.find(c => c.id === id);
    document.getElementById('course-title').innerText = course.name;

    const dates = generateDateRange(course.schedule);

    // Logic for default date:
    // 1. Today if in list
    // 2. Closest PAST date (most recent event)
    // 3. First future date if no past dates

    const today = new Date();

    let defaultDate = dates[0]; // fallback

    // Filter past or today
    const pastOrToday = dates.filter(d => d <= today);
    if (pastOrToday.length > 0) {
        defaultDate = pastOrToday[pastOrToday.length - 1]; // Last one is most recent
    } else {
        defaultDate = dates[0]; // All future
    }

    selectedDateStr = defaultDate.toISOString().split('T')[0];

    renderDateSlider(dates);
    loadAttendance();
    showView('course-view');
}

function renderDateSlider(dates) {
    const slider = document.getElementById('date-slider');
    slider.innerHTML = '';

    dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const el = document.createElement('div');
        el.className = 'date-card glass';
        el.dataset.date = dateStr; // Store for selection

        if (dateStr === selectedDateStr) el.classList.add('active');

        const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        const dayName = weekdays[date.getDay()];
        const dayDate = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        el.innerHTML = `
            <span class="weekday">${dayName}</span>
            <span class="date">${dayDate}.${month}.</span>
        `;

        el.onclick = () => selectDate(dateStr);
        slider.appendChild(el);
    });

    setTimeout(() => {
        const active = slider.querySelector('.active');
        if (active) {
            active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

function loadAttendance() {
    // Uses global selectedDateStr
    if (!selectedDateStr) return;

    const dateStr = selectedDateStr;
    const course = appData.courses.find(c => c.id === currentCourseId);
    const container = document.getElementById('participants-list');
    container.innerHTML = '';

    const attendanceKey = `${currentCourseId}_${dateStr}`;
    const presentIds = appData.attendance[attendanceKey] || [];

    // Group by participants
    const processedIds = new Set();

    course.participants.forEach(p => {
        if (processedIds.has(p.id)) return;

        const isPresent = presentIds.includes(p.id);

        if (p.isPartnerOf) {
            const partner = course.participants.find(cp => cp.id === p.isPartnerOf);
            if (partner) {
                processedIds.add(p.id);
                processedIds.add(partner.id);
                const partnerPresent = presentIds.includes(partner.id);
                container.appendChild(createCoupleRow(p, isPresent, partner, partnerPresent));
            } else {
                processedIds.add(p.id);
                container.appendChild(createSingleRow(p, isPresent));
            }
        } else {
            processedIds.add(p.id);
            container.appendChild(createSingleRow(p, isPresent));
        }
    });
}

function createCoupleRow(p1, isPresent1, p2, isPresent2) {
    const row = document.createElement('div');
    row.className = 'couple-row';
    row.appendChild(createParticipantCard(p1, isPresent1));
    row.appendChild(createParticipantCard(p2, isPresent2));
    return row;
}

function createSingleRow(p, isPresent) {
    const row = document.createElement('div');
    row.className = 'couple-row';
    row.appendChild(createParticipantCard(p, isPresent));
    return row;
}

function createParticipantCard(p, isPresent) {
    const card = document.createElement('div');
    card.className = 'participant-card glass';
    card.onclick = () => toggleAttendance(p.id);

    const checkClass = isPresent ? 'check-btn checked' : 'check-btn';

    card.innerHTML = `
        <div class="p-info">
            <span class="p-name">${p.firstName} ${p.lastName}</span>
            <span class="p-details">${p.gender}, ${p.age} Jahre</span>
        </div>
        <button class="${checkClass}">
            ${isPresent ? '✓' : ''}
        </button>
    `;
    return card;
}

async function toggleAttendance(participantId) {
    const date = selectedDateStr;
    if (!date) return alert("Bitte erst ein Datum wählen");

    const attendanceKey = `${currentCourseId}_${date}`;
    if (!appData.attendance[attendanceKey]) appData.attendance[attendanceKey] = [];

    const list = appData.attendance[attendanceKey];
    const idx = list.indexOf(participantId);
    const isPresent = idx === -1; // If not in list, we are adding it (setting to present)

    if (idx > -1) {
        list.splice(idx, 1);
    } else {
        list.push(participantId);
    }

    // Optimistic UI
    loadAttendance();

    // Save to server
    await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            courseId: currentCourseId,
            studentId: participantId,
            date: date,
            present: isPresent
        })
    });
}



// Add Modal
function openAddModal() {
    document.getElementById('add-modal').style.display = 'block';
}

function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
}

async function addParticipant() {
    // Participant 1 (Mandatory)
    const p1First = document.getElementById('p1-firstname').value;
    const p1Last = document.getElementById('p1-lastname').value;
    const p1Gender = document.getElementById('p1-gender').value;

    if (!p1First || !p1Last) return alert("Bitte Namen für Teilnehmer 1 eingeben");

    // Participant 2 (Optional)
    const p2First = document.getElementById('p2-firstname').value;
    const p2Last = document.getElementById('p2-lastname').value;
    const p2Gender = document.getElementById('p2-gender').value;

    const newParticipants = [];

    const p1 = {
        id: crypto.randomUUID(),
        firstName: p1First,
        lastName: p1Last,
        gender: p1Gender,
        age: 30,
        phone: "-",
        isPartnerOf: null
    };
    newParticipants.push(p1);

    if (p2First && p2Last) {
        const p2 = {
            id: crypto.randomUUID(),
            firstName: p2First,
            lastName: p2Last,
            gender: p2Gender,
            age: 30,
            phone: "-",
            isPartnerOf: p1.id
        };
        p1.isPartnerOf = p2.id; // Link mutual
        newParticipants.push(p2);
    }

    // Optimistic Update
    const currentCourse = appData.courses.find(c => c.id === currentCourseId);
    newParticipants.forEach(p => currentCourse.participants.push(p));

    // Save to server
    await fetch(`${API_URL}/participant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            courseId: currentCourseId,
            participants: newParticipants
        })
    });

    // Auto-Attendance: Mark as present for selected Date
    // We can just call toggleAttendance for each new ID.
    // Since they are new, they are not in the list, so toggle will set entries to TRUE.
    if (selectedDateStr) {
        for (const p of newParticipants) {
            await toggleAttendance(p.id);
        }
    }

    closeAddModal();
    // clear inputs
    document.getElementById('p1-firstname').value = '';
    document.getElementById('p1-lastname').value = '';
    document.getElementById('p2-firstname').value = '';
    document.getElementById('p2-lastname').value = '';

    // Refresh view
    loadAttendance();
}

// Auto-login check
if (localStorage.getItem('ts_password')) {
    initApp();
} else {
    showView('login-view');
}
