/**
 * ScholarSwift Main Application Logic
 * Smart Queue Management System
 */

// ==================== CONFIG & STATE ====================
const defaultConfig = {
    app_title: 'ScholarSwift',
    tagline: 'Smart Queue Management System'
};

let config = { ...defaultConfig };
let currentUser = null;
let userType = 'student';
let authMode = 'login';
let isPaused = false;
let allBookings = [];

// Department to day mapping
const deptToDay = {
    'DS': { day: 1, name: 'Monday', fullName: 'Data Science' },
    'AIML': { day: 2, name: 'Tuesday', fullName: 'AI & Machine Learning' },
    'COMP': { day: 3, name: 'Wednesday', fullName: 'Computer Engineering' },
    'IT': { day: 4, name: 'Thursday', fullName: 'Information Technology' },
    'MECH': { day: 5, name: 'Friday', fullName: 'Mechanical Engineering' }
};

// Fake data for demo
const fakeStudents = [
    { name: 'Aarav Sharma', email: 'aarav@email.com', dept: 'DS', token: 1, time: '9:30 AM', status: 'verified', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Priya Patel', email: 'priya@email.com', dept: 'DS', token: 2, time: '9:37 AM', status: 'verified', doc1: 'Approved', doc2: 'Pending' },
    { name: 'Rohan Mehta', email: 'rohan@email.com', dept: 'AIML', token: 3, time: '9:44 AM', status: 'verified', doc1: 'Pending', doc2: 'Approved' },
    { name: 'Sneha Desai', email: 'sneha@email.com', dept: 'DS', token: 4, time: '9:51 AM', status: 'rejected', doc1: 'Rejected', doc2: 'Pending' },
    { name: 'Arjun Kumar', email: 'arjun@email.com', dept: 'IT', token: 5, time: '9:58 AM', status: 'verified', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Kavya Nair', email: 'kavya@email.com', dept: 'COMP', token: 6, time: '10:05 AM', status: 'verified', doc1: 'Approved', doc2: 'Approved' },
    { name: 'Vikram Singh', email: 'vikram@email.com', dept: 'DS', token: 7, time: '10:12 AM', status: 'current', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Ananya Iyer', email: 'ananya@email.com', dept: 'AIML', token: 8, time: '10:19 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Rahul Verma', email: 'rahul@email.com', dept: 'MECH', token: 9, time: '10:26 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Diya Gupta', email: 'diya@email.com', dept: 'DS', token: 10, time: '10:33 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Aditya Joshi', email: 'aditya@email.com', dept: 'IT', token: 11, time: '10:40 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Ishaan Reddy', email: 'ishaan@email.com', dept: 'MECH', token: 12, time: '10:47 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Zara Khan', email: 'zara@email.com', dept: 'COMP', token: 13, time: '10:54 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Nikhil Sharma', email: 'nikhil@email.com', dept: 'IT', token: 14, time: '11:01 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Pooja Singh', email: 'pooja@email.com', dept: 'AIML', token: 15, time: '11:08 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' },
    { name: 'Manish Gupta', email: 'manish@email.com', dept: 'DS', token: 16, time: '11:15 AM', status: 'pending', doc1: 'Pending', doc2: 'Pending' }
];

// ==================== SDK INITIALIZATION ====================
const dataHandler = {
    onDataChanged(data) {
        allBookings = data;
        if (currentUser && currentUser.type === 'admin') {
            renderAdminTable();
        }
        updateQueueStats();
    }
};

async function initApp() {
    // Initialize Element SDK
    if (window.elementSdk) {
        window.elementSdk.init({
            defaultConfig,
            onConfigChange: async (newConfig) => {
                config = { ...defaultConfig, ...newConfig };
                applyConfig();
            },
            mapToCapabilities: (cfg) => ({
                recolorables: [],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            }),
            mapToEditPanelValues: (cfg) => new Map([
                ['app_title', cfg.app_title || defaultConfig.app_title],
                ['tagline', cfg.tagline || defaultConfig.tagline]
            ])
        });
    }
    
    // Initialize Data SDK
    if (window.dataSdk) {
        const result = await window.dataSdk.init(dataHandler);
        if (!result.isOk) {
            console.error('Data SDK init failed');
        }
    }
    
    generateTimeSlots();
    setMinDate();
    applyConfig();
    
    console.log('🚀 ScholarSwift initialized');
}

function applyConfig() {
    const title = config.app_title || defaultConfig.app_title;
    const tagline = config.tagline || defaultConfig.tagline;
    
    const titleEl = document.getElementById('appTitle');
    const taglineEl = document.getElementById('appTagline');
    
    if (titleEl) titleEl.textContent = title;
    if (taglineEl) taglineEl.textContent = tagline;
}

// ==================== AUTH FUNCTIONS ====================
function setUserType(type) {
    userType = type;
    const studentBtn = document.getElementById('studentToggle');
    const adminBtn = document.getElementById('adminToggle');
    
    if (type === 'student') {
        studentBtn.className = 'flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-emerald-500 text-white';
        adminBtn.className = 'flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-slate-400 hover:text-white';
    } else {
        adminBtn.className = 'flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-violet-500 text-white';
        studentBtn.className = 'flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-slate-400 hover:text-white';
    }
    updateFormFields();
}

function setAuthMode(mode) {
    authMode = mode;
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const submitBtn = document.getElementById('authSubmit');
    
    if (mode === 'login') {
        loginTab.className = 'flex-1 py-2.5 rounded-md font-medium transition-all bg-white shadow text-slate-800';
        signupTab.className = 'flex-1 py-2.5 rounded-md font-medium transition-all text-slate-500';
        submitBtn.textContent = 'Sign In';
    } else {
        signupTab.className = 'flex-1 py-2.5 rounded-md font-medium transition-all bg-white shadow text-slate-800';
        loginTab.className = 'flex-1 py-2.5 rounded-md font-medium transition-all text-slate-500';
        submitBtn.textContent = 'Create Account';
    }
    updateFormFields();
}

function updateFormFields() {
    const deptField = document.getElementById('deptField');
    const nameField = document.getElementById('nameField');
    
    if (authMode === 'signup') {
        nameField.classList.remove('hidden');
        if (userType === 'student') {
            deptField.classList.remove('hidden');
        } else {
            deptField.classList.add('hidden');
        }
    } else {
        nameField.classList.add('hidden');
        deptField.classList.add('hidden');
    }
}

function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const name = document.getElementById('nameInput').value;
    const dept = document.getElementById('deptSelect').value;
    const errorDiv = document.getElementById('authError');
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        errorDiv.textContent = 'Please enter a valid email address';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (authMode === 'signup' && userType === 'student' && !dept) {
        errorDiv.textContent = 'Please select your department';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    errorDiv.classList.add('hidden');
    
    let userDept = dept ? dept.split('(')[1].replace(')', '') : '';
    
    let uniqueKey;
    if (userType === 'student') {
        const tokenNum = Math.floor(Math.random() * 100) + 1;
        uniqueKey = `${userDept}-${String(tokenNum).padStart(3, '0')}`;
    } else {
        const adminNum = Math.floor(Math.random() * 100) + 1;
        uniqueKey = `ADMIN-${String(adminNum).padStart(3, '0')}`;
    }
    
    currentUser = {
        type: userType,
        email,
        name: name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        department: userDept,
        uniqueKey
    };
    
    showToast(`Welcome, ${currentUser.name}!`);
    
    if (userType === 'student') {
        showStudentDashboard();
    } else {
        showAdminDashboard();
    }
}

function logout() {
    currentUser = null;
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('studentDashboard').classList.add('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('nameInput').value = '';
    showToast('Logged out successfully');
}

// ==================== STUDENT FUNCTIONS ====================
function showStudentDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('studentDashboard').classList.remove('hidden');
    document.getElementById('studentName').textContent = currentUser.name;
    document.getElementById('studentKey').textContent = `KEY: ${currentUser.uniqueKey}`;
    
    const deptInfo = deptToDay[currentUser.department];
    document.getElementById('bookingDayDisplay').textContent = `${deptInfo.name} (${deptInfo.fullName})`;
    
    restrictDateToDepartmentDay();
    updateLiveQueue();
}

function restrictDateToDepartmentDay() {
    const dateInput = document.getElementById('slotDate');
    const today = new Date();
    const deptInfo = deptToDay[currentUser.department];
    
    let targetDate = new Date(today);
    const dayOfWeek = targetDate.getDay();
    const daysUntilTarget = (deptInfo.day - dayOfWeek + 7) % 7;
    
    if (daysUntilTarget === 0 && today.getHours() >= 17) {
        targetDate.setDate(targetDate.getDate() + 7);
    } else if (daysUntilTarget === 0) {
        // Today is the booking day
    } else {
        targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    }
    
    dateInput.value = targetDate.toISOString().split('T')[0];
    dateInput.min = targetDate.toISOString().split('T')[0];
    
    let maxDate = new Date(targetDate);
    maxDate.setDate(maxDate.getDate() + 28);
    dateInput.max = maxDate.toISOString().split('T')[0];
}

function updateLiveQueue() {
    const currentStudent = fakeStudents.find(s => s.status === 'current');
    if (currentStudent) {
        document.getElementById('currentToken').textContent = `${currentStudent.dept}-${String(currentStudent.token).padStart(3, '0')}`;
    }
}

function generateTimeSlots() {
    const select = document.getElementById('slotTime');
    select.innerHTML = '<option value="">Select a time slot</option>';
    
    let time = new Date();
    time.setHours(9, 30, 0, 0);
    const breakStart = new Date();
    breakStart.setHours(13, 0, 0, 0);
    const breakEnd = new Date();
    breakEnd.setHours(14, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(17, 0, 0, 0);
    
    while (time < endTime) {
        if (time >= breakStart && time < breakEnd) {
            time.setHours(14, 0, 0, 0);
            continue;
        }
        
        const hours = time.getHours();
        const mins = time.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours;
        const timeStr = `${displayHours}:${String(mins).padStart(2, '0')} ${ampm}`;
        
        const isBooked = Math.random() > 0.6;
        
        const option = document.createElement('option');
        option.value = timeStr;
        option.textContent = isBooked ? `${timeStr} - Booked` : timeStr;
        option.disabled = isBooked;
        select.appendChild(option);
        
        time.setMinutes(time.getMinutes() + 7);
    }
}

function setMinDate() {
    const dateInput = document.getElementById('slotDate');
    const today = new Date();
    dateInput.min = today.toISOString().split('T')[0];
}

async function bookSlot() {
    const date = document.getElementById('slotDate').value;
    const time = document.getElementById('slotTime').value;
    
    if (!date || !time) {
        showToast('Please select both date and time');
        return;
    }
    
    const btn = document.getElementById('bookSlotBtn');
    btn.disabled = true;
    btn.innerHTML = 'Booking...';
    
    const tokenNum = allBookings.filter(b => b.department === currentUser.department).length + 1;
    
    const booking = {
        type: 'booking',
        email: currentUser.email,
        name: currentUser.name,
        department: currentUser.department,
        uniqueKey: currentUser.uniqueKey,
        slotTime: time,
        slotDate: date,
        status: 'pending',
        tokenNumber: tokenNum,
        createdAt: new Date().toISOString()
    };
    
    if (window.dataSdk) {
        if (allBookings.length >= 999) {
            showToast('Maximum booking limit reached');
            btn.disabled = false;
            btn.innerHTML = 'Book Slot';
            return;
        }
        
        const result = await window.dataSdk.create(booking);
        if (!result.isOk) {
            showToast('Failed to book slot');
            btn.disabled = false;
            btn.innerHTML = 'Book Slot';
            return;
        }
    }
    
    btn.disabled = false;
    btn.innerHTML = 'Book Slot';
    
    document.getElementById('yourToken').textContent = `${currentUser.department}-${String(tokenNum).padStart(3, '0')}`;
    document.getElementById('waitTime').textContent = `${tokenNum * 7} min`;
    
    const successDiv = document.getElementById('bookingSuccess');
    successDiv.innerHTML = `Slot Booked Successfully! Token: ${currentUser.department}-${String(tokenNum).padStart(3, '0')} | ${time} on ${new Date(date).toLocaleDateString()}`;
    successDiv.classList.remove('hidden');
    
    if (tokenNum <= 9) {
        document.getElementById('reminderBanner').classList.remove('hidden');
    }
    
    showToast('Slot booked successfully!');
}

// ==================== ADMIN FUNCTIONS ====================
function getDeptForDay(dayOfWeek) {
    const dayToDept = {
        1: 'DS',
        2: 'AIML',
        3: 'COMP',
        4: 'IT',
        5: 'MECH'
    };
    return dayToDept[dayOfWeek] || null;
}

function showAdminDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    
    const today = new Date();
    const deptForToday = getDeptForDay(today.getDay());
    const deptName = Object.keys(deptToDay).find(key => deptToDay[key].day === today.getDay());
    document.getElementById('todaysDept').textContent = `Today: ${deptName || 'Off'}`;
    
    renderAdminTable();
    updateQueueStats();
}

function renderAdminTable() {
    const tbody = document.getElementById('queueTableBody');
    tbody.innerHTML = '';
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const deptForToday = getDeptForDay(dayOfWeek);
    
    const allData = deptForToday 
        ? fakeStudents.filter(student => student.dept === deptForToday)
        : [];
    
    if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-8 text-center text-slate-500">No students for today. Check back on the scheduled department day.</td></tr>';
        updateQueueStats();
        return;
    }
    
    allData.forEach((student, index) => {
        const row = document.createElement('tr');
        row.className = student.status === 'current' ? 'bg-emerald-50' : 'hover:bg-slate-50';
        row.dataset.id = index;
        
        const tokenDisplay = `${student.dept}-${String(student.token).padStart(3, '0')}`;
        
        let statusBadge;
        switch (student.status) {
            case 'verified':
                statusBadge = '<span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Verified</span>';
                break;
            case 'rejected':
                statusBadge = '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejected</span>';
                break;
            case 'current':
                statusBadge = '<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium animate-pulse">In Progress</span>';
                break;
            default:
                statusBadge = '<span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Pending</span>';
        }
        
        let actionBtns = '';
        if (student.status === 'current') {
            const studentIdx = fakeStudents.indexOf(student);
            actionBtns = `
                <div class="flex gap-2">
                    <button onclick="verifyStudent(${studentIdx})" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-all">Accept</button>
                    <button onclick="rejectStudent(${studentIdx})" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-all">Reject</button>
                </div>
            `;
        } else if (student.status === 'pending') {
            actionBtns = '<span class="text-xs text-slate-400">Waiting</span>';
        } else {
            actionBtns = '<span class="text-xs text-slate-400">Completed</span>';
        }
        
        row.innerHTML = `
            <td class="px-6 py-4">
                <span class="font-mono font-bold ${student.status === 'current' ? 'text-emerald-600' : 'text-slate-800'}">${tokenDisplay}</span>
            </td>
            <td class="px-6 py-4">
                <div class="font-medium text-slate-800">${student.name}</div>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-600">${student.email}</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">${student.dept}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded ${student.doc1 === 'Approved' ? 'bg-emerald-100 text-emerald-700' : student.doc1 === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}">${student.doc1}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded ${student.doc2 === 'Approved' ? 'bg-emerald-100 text-emerald-700' : student.doc2 === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}">${student.doc2}</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm text-slate-600">${student.time}</span>
            </td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4">${actionBtns}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateQueueStats() {
    const today = new Date();
    const deptForToday = getDeptForDay(today.getDay());
    
    const todayStudents = deptForToday 
        ? fakeStudents.filter(s => s.dept === deptForToday)
        : [];
    
    const verified = todayStudents.filter(s => s.status === 'verified').length;
    const rejected = todayStudents.filter(s => s.status === 'rejected').length;
    
    const totalEl = document.getElementById('totalToday');
    const verifiedEl = document.getElementById('verifiedCount');
    const rejectedEl = document.getElementById('rejectedCount');
    const currentTokenEl = document.getElementById('adminCurrentToken');
    
    if (totalEl) totalEl.textContent = todayStudents.length;
    if (verifiedEl) verifiedEl.textContent = verified;
    if (rejectedEl) rejectedEl.textContent = rejected;
    
    const current = todayStudents.find(s => s.status === 'current');
    if (current && currentTokenEl) {
        currentTokenEl.textContent = `${current.dept}-${String(current.token).padStart(3, '0')}`;
    }
}

function verifyStudent(index) {
    fakeStudents[index].status = 'verified';
    renderAdminTable();
    updateQueueStats();
    showToast(`${fakeStudents[index].name} verified successfully`);
}

function rejectStudent(index) {
    fakeStudents[index].status = 'rejected';
    renderAdminTable();
    updateQueueStats();
    showToast(`${fakeStudents[index].name} rejected`);
}

function nextToken() {
    const today = new Date();
    const deptForToday = getDeptForDay(today.getDay());
    
    if (!deptForToday) {
        showToast('No department scheduled for today');
        return;
    }
    
    const todayStudents = fakeStudents.filter(s => s.dept === deptForToday);
    const currentIdx = todayStudents.findIndex(s => s.status === 'current');
    
    if (currentIdx !== -1) {
        const currentStudent = todayStudents[currentIdx];
        const mainIdx = fakeStudents.indexOf(currentStudent);
        fakeStudents[mainIdx].status = 'verified';
    }
    
    const nextIdx = todayStudents.findIndex(s => s.status === 'pending');
    if (nextIdx !== -1) {
        const nextStudent = todayStudents[nextIdx];
        const mainIdx = fakeStudents.indexOf(nextStudent);
        fakeStudents[mainIdx].status = 'current';
        showToast(`Now serving: ${fakeStudents[mainIdx].name}`);
    } else {
        showToast('All students have been processed!');
    }
    
    renderAdminTable();
    updateQueueStats();
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseBtn');
    const statusDot = document.getElementById('queueStatusDot');
    const statusText = document.getElementById('queueStatusText');
    
    if (isPaused) {
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Resume Queue
        `;
        btn.className = 'px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2';
        statusDot.className = 'w-3 h-3 rounded-full bg-amber-500';
        statusText.textContent = 'Paused';
        statusText.className = 'text-sm text-amber-600 font-medium';
        showToast('Queue paused');
    } else {
        btn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Pause Queue
        `;
        btn.className = 'px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2';
        statusDot.className = 'pulse-dot w-3 h-3 rounded-full bg-emerald-500';
        statusText.textContent = 'Active';
        statusText.className = 'text-sm text-emerald-600 font-medium';
        showToast('Queue resumed');
    }
}

function addExtraTime() {
    showToast('Added 5 minutes extra time for current token');
}

// ==================== UTILITY FUNCTIONS ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    
    if (toastMsg) {
        toastMsg.textContent = message;
    }
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// Export functions to global scope for onclick handlers
window.setUserType = setUserType;
window.setAuthMode = setAuthMode;
window.handleAuth = handleAuth;
window.logout = logout;
window.bookSlot = bookSlot;
window.nextToken = nextToken;
window.togglePause = togglePause;
window.addExtraTime = addExtraTime;
window.verifyStudent = verifyStudent;
window.rejectStudent = rejectStudent;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);