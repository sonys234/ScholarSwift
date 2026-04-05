/**
 * ScholarSwift Main Application Logic
 * Smart Queue Management System
 */

// ==================== CONFIG & STATE ====================
let isTimerRunning = false;
let isQueuePaused = false;
let currentUser = null;
let currentUserType = 'student';
let authMode = 'login';
let sessionCountdown = null;
let remainingSeconds = 420;
let globalDelayMinutes = 0;

window.rawMasterData = [];
window.rawUsersData = [];
window.rawAppsData = [];
window.allStudentsData = [];
window.unifiedCollegeData = [];
let activeModalStudentUid = null;

// Notification & Sync State
window.inAppNotifs = [];
window.notifState = {};
window.currentStudentActiveApp = null;
window.currentActiveTokenData = null;
window.systemAcademicYear = "2025-2026";
window.isMahadbtWindowOpen = false;

const scholarshipDocs = {
    'SC': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'Caste Certificate', 'Caste Validity Certificate',
        'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Hostel Certificate',
        'Ration Card', 'Parent Death Certificate', 'Family Declaration'
    ],
    'ST': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'Caste Certificate', 'Caste Validity Certificate',
        'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Hostel Certificate',
        'Ration Card', 'Family Declaration'
    ],
    'OBC': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'Caste Certificate', 'Non-Creamy Layer',
        'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Ration Card', 'Parent Death Certificate'
    ],
    'VJNT': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'Caste Certificate', 'Caste Validity Certificate',
        'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Ration Card', 'Family Declaration'
    ],
    'EWS': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Ration Card', 'Self Declaration'
    ],
    'EBC': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'SSC Marksheet', 'HSC Marksheet', 'Previous Year Marksheet',
        'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Ration Card', 'Self Declaration'
    ],
    'Minority': [
        'Aadhaar Card', 'Bank Passbook', 'Photo', 'Signature', 'Domicile Certificate',
        'Income Certificate', 'Minority Declaration', 'SSC Marksheet', 'HSC Marksheet',
        'Previous Year Marksheet', 'Leaving Certificate', 'Bonafide Certificate', 'Fee Receipt',
        'CAP Allotment Letter', 'Gap Certificate', 'Ration Card', 'PAN Card', 'Parent Declaration'
    ]
};

const yearLabels = {
    '1': 'First Year (FE)', '2': 'Second Year (SE)', '3': 'Third Year (TE)', '4': 'Fourth Year (BE)'
};

const deptToDay = {
    'DS': { day: 1, name: 'Monday' },
    'AIML': { day: 2, name: 'Tuesday' },
    'COMP': { day: 3, name: 'Wednesday' },
    'IT': { day: 4, name: 'Thursday' },
    'MECH': { day: 5, name: 'Friday' },
    'CIVIL': { day: 5, name: 'Friday' },
    'AUTOMOBILE': { day: 5, name: 'Friday' }
};

// ==================== HELPER FUNCTIONS ====================
function showToast(m) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toastMessage').textContent = m;
    t.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 3000);
}

function safeAddMinutes(timeStr, minsToAdd) {
    if (!timeStr || timeStr === "--:--") return "--:--";
    try {
        const parts = String(timeStr).trim().split(/\s+/);
        if (parts.length < 2) return timeStr;
        let [hours, minutes] = parts[0].split(':').map(Number);
        let modifier = parts[1].toUpperCase();

        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        let dateObj = new Date();
        dateObj.setHours(hours, minutes + minsToAdd, 0, 0);

        return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    } catch (e) {
        return timeStr;
    }
}

function getSlotTokenNumber(selectedTimeStr) {
    let time = new Date();
    time.setHours(9, 30, 0, 0);
    const bookingEnd = 23;
    let tokenIndex = 1;
    let safetyCounter = 0;

    while (time.getHours() < bookingEnd && safetyCounter < 200) {
        safetyCounter++;
        if (time.getHours() === 13) { time.setHours(14, 0, 0, 0); continue; }
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (timeStr === selectedTimeStr) return tokenIndex;

        tokenIndex++;
        let endTime = new Date(time);
        endTime.setMinutes(endTime.getMinutes() + 7);
        if (endTime.getHours() >= bookingEnd && endTime.getMinutes() > 0) break;
        time.setMinutes(time.getMinutes() + 7);
    }
    return tokenIndex;
}

function parseTime(timeStr) {
    if (!timeStr || timeStr === "--:--") return 0;
    try {
        const parts = String(timeStr).trim().split(/\s+/);
        if (parts.length < 2) return 0;
        let [hours, minutes] = parts[0].split(':').map(Number);
        let modifier = parts[1].toUpperCase();
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    } catch (err) { return 0; }
}

function getMasterDelay() {
    const now = new Date();
    let masterDelay = globalDelayMinutes;

    if (window.globalQueueHead && window.globalQueueHead.time) {
        const headMins = parseTime(window.globalQueueHead.time);
        if (headMins > 0) {
            const headDate = new Date();
            headDate.setHours(Math.floor(headMins / 60), (headMins % 60) + globalDelayMinutes, 0, 0);

            const driftMins = Math.floor((now - headDate) / 60000);
            if (driftMins > 0) {
                masterDelay += driftMins;
            }
        }
    }
    return masterDelay;
}

// ==================== INITIALIZATION ====================
function initApp() {
    startLiveClock();
    setMinDate();
    listenToQueueSettings();
    console.log('🚀 ScholarSwift initialized');
}

function startLiveClock() {
    const updateTime = () => {
        try {
            const now = new Date();
            const clockEl = document.getElementById('liveClock');
            if (clockEl) {
                const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
                clockEl.textContent = now.toLocaleString('en-US', options).replace(/,/g, ' |');
            }

            let masterDelay = getMasterDelay();

            if (currentUserType === 'student' && window.currentStudentActiveApp) {
                const activeApp = window.currentStudentActiveApp;
                checkScheduledNotifications(activeApp, masterDelay);

                const waitEl = document.getElementById('waitTime');
                const waitLabel = document.getElementById('waitLabel');
                const slotEl = document.getElementById('yourSlotTime');

                if (waitEl && waitLabel && slotEl && activeApp.time) {
                    const originalStart = activeApp.time ? String(activeApp.time).toLowerCase() : "--:--";
                    const originalEnd = originalStart !== "--:--" ? safeAddMinutes(originalStart, 7) : "--:--";

                    if (activeApp.status === 'current' && activeApp.isProcessing) {
                        waitEl.textContent = "In Progress";
                        waitLabel.textContent = "Queue Status";
                        waitEl.className = "text-2xl md:text-3xl lg:text-4xl font-bold text-blue-600";
                    } else if (isQueuePaused) {
                        waitEl.textContent = "Paused";
                        waitLabel.textContent = "Queue Status";
                        waitEl.className = "text-2xl md:text-3xl lg:text-4xl font-bold text-amber-500";
                    } else if (masterDelay > 0) {
                        waitEl.textContent = `+${masterDelay} mins`;
                        waitLabel.textContent = "Running Late";
                        waitEl.className = "text-2xl md:text-3xl lg:text-4xl font-bold text-red-500";
                    } else {
                        waitEl.textContent = "On Time";
                        waitLabel.textContent = "Queue Status";
                        waitEl.className = "text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-500";
                    }

                    if (masterDelay > 0 && originalStart !== "--:--") {
                        const delayedEnd = safeAddMinutes(originalEnd, masterDelay);
                        let delayedStart = safeAddMinutes(originalStart, masterDelay);
                        if (activeApp.status === 'current') delayedStart = originalStart;

                        slotEl.innerHTML = `
                            <div class="text-[11px] text-slate-500 font-bold mb-2 tracking-wide uppercase">
                                SCH: <span class="text-slate-700">${originalStart} - ${originalEnd}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="block text-[10px] uppercase font-bold text-red-400">Expected</span>
                                    <span class="text-xl font-bold text-red-500 tracking-tight leading-none block mt-1">${delayedStart} - ${delayedEnd}</span>
                                </div>
                                <div class="bg-red-50 border border-red-100 rounded-lg px-2 py-1 text-center shadow-sm">
                                    <span class="block text-[8px] uppercase font-black tracking-widest text-red-400 leading-none mb-0.5">Delayed</span>
                                    <span class="text-sm font-black text-red-600">+${masterDelay}m</span>
                                </div>
                            </div>
                        `;
                    } else {
                        slotEl.innerHTML = `
                            <div class="text-[11px] text-slate-500 font-bold mb-2 tracking-wide uppercase">
                                SCH: <span class="text-slate-700">${originalStart} - ${originalEnd}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="block text-[10px] uppercase font-bold text-emerald-500">Expected</span>
                                    <span class="text-xl font-bold text-emerald-600 tracking-tight leading-none block mt-1">${originalStart} - ${originalEnd}</span>
                                </div>
                                <div class="bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 text-center shadow-sm">
                                    <span class="block text-[8px] uppercase font-black tracking-widest text-emerald-500 leading-none mb-0.5">Status</span>
                                    <span class="text-sm font-black text-emerald-600">On Time</span>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            const tokenEl = document.getElementById('currentToken');
            if (tokenEl && window.currentActiveTokenData) {
                const data = window.currentActiveTokenData;
                const headMins = parseTime(data.time);
                if (headMins > 0) {
                    const scheduledDate = new Date();
                    scheduledDate.setHours(Math.floor(headMins / 60), (headMins % 60) + globalDelayMinutes, 0, 0);

                    if (data.isProcessing || now >= scheduledDate) {
                        tokenEl.textContent = data.token;
                    } else {
                        tokenEl.textContent = "--";
                    }
                }
            } else if (tokenEl) {
                tokenEl.textContent = "--";
            }
        } catch (err) {
            console.error("Clock update error:", err);
        }
    };

    updateTime();
    setInterval(updateTime, 1000);
}

function listenToQueueSettings() {
    db.collection('settings').doc('queueStatus').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            isQueuePaused = data.isPaused || false;
            globalDelayMinutes = data.delayMinutes || 0;

            if (currentUserType === 'admin' && document.getElementById('queueTableBody')) {
                showAdminDashboard();
            } else if (currentUserType === 'student' && currentUser) {
                showStudentDashboard();
            }
        }
    });

    db.collection('settings').doc('lifecycle').onSnapshot(doc => {
        let data = { academicYear: "2025-2026", mahadbtWindowOpen: false };
        if (doc.exists) {
            data = doc.data();
        }

        window.systemAcademicYear = data.academicYear || "2025-2026";
        window.isMahadbtWindowOpen = data.mahadbtWindowOpen || false;

        const yearDisplay = document.getElementById('adminSystemYearDisplay');
        if (yearDisplay) yearDisplay.textContent = window.systemAcademicYear;

        const windowStatus = document.getElementById('adminMahadbtWindowStatus');
        const windowBtn = document.getElementById('adminMahadbtWindowBtn');
        if (windowStatus && windowBtn) {
            if (window.isMahadbtWindowOpen) {
                windowStatus.innerHTML = `<span class="text-emerald-600 bg-emerald-100 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Open</span>`;
                windowBtn.textContent = "Close Update Window";
                windowBtn.className = "px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition-all shadow-sm";
            } else {
                windowStatus.innerHTML = `<span class="text-slate-500 bg-slate-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Closed</span>`;
                windowBtn.textContent = "Open Update Window";
                windowBtn.className = "px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all shadow-sm";
            }
        }

        const updateModal = document.getElementById('updateProfileModal');
        if (updateModal && !updateModal.classList.contains('hidden') && typeof window.toggleEditProfile === 'function') {
            window.toggleEditProfile();
        }
    }, err => console.error("Lifecycle Snapshot Error: ", err));

    db.collection('appointments').where('status', '==', 'current').limit(1).onSnapshot(snap => {
        if (!snap.empty) {
            window.currentActiveTokenData = snap.docs[0].data();
            window.currentActiveTokenData.id = snap.docs[0].id;
        } else {
            window.currentActiveTokenData = null;
        }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    db.collection('appointments')
        .where('date', '==', todayStr)
        .where('status', 'in', ['current', 'waiting'])
        .onSnapshot(snap => {
            let list = [];
            snap.forEach(doc => list.push(doc.data()));
            list.sort((a, b) => parseTime(a.time) - parseTime(b.time));
            window.globalQueueHead = list.length > 0 ? list[0] : null;
        });
}

function setMinDate() {
    const el = document.getElementById('slotDate');
    if (el) el.min = new Date().toISOString().split('T')[0];
}

// ==================== NOTIFICATION ENGINE ====================
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showToast("Browser does not support desktop notifications.");
        return;
    }
    if (Notification.permission === "granted") {
        showToast("Notifications are already enabled.");
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            showToast("Push Notifications Enabled!");
        }
    }
}

function sendPushNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}

function addInAppNotification(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    window.inAppNotifs.unshift({ text, time });
    renderInAppNotifs();
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.remove('hidden');
}

function renderInAppNotifs() {
    const list = document.getElementById('notifList');
    if (!list) return;
    if (window.inAppNotifs.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs italic">No new alerts.</div>`;
        return;
    }
    list.innerHTML = window.inAppNotifs.map(n => `
        <div class="p-4 border-b border-slate-50 hover:bg-slate-50">
            <p class="text-sm text-slate-800 font-medium">${n.text}</p>
            <p class="text-[10px] text-slate-400 mt-1">${n.time}</p>
        </div>
    `).join('');
}

function toggleNotifications() {
    const drop = document.getElementById('notifDropdown');
    const badge = document.getElementById('notifBadge');
    if (drop) drop.classList.toggle('hidden');
    if (badge) badge.classList.add('hidden');
}

function checkScheduledNotifications(activeApp, currentDelay = globalDelayMinutes) {
    if (!activeApp || !activeApp.time) return;

    const now = new Date();
    const [timeStr, modifier] = activeApp.time.split(' ');
    if (!modifier) return;

    let [hours, minutes] = timeStr.split(':').map(Number);
    if (modifier.toLowerCase() === 'pm' && hours !== 12) hours += 12;
    if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes + currentDelay, 0, 0);

    const diffMins = Math.ceil((scheduledDate - now) / 60000);

    if (diffMins > 0 && diffMins <= 15) {
        if (!window.notifState[activeApp.token + '_heads_up']) {
            const msg = `Heads up! Your turn is in approx ${diffMins} mins. Please head to the Verification Cell and wait outside.`;
            sendPushNotification("Verification Approaching", msg);
            addInAppNotification(msg);
            window.notifState[activeApp.token + '_heads_up'] = true;
        }
    }

    if (activeApp.status === 'current') {
        if ((diffMins <= 0 || activeApp.isProcessing) && !window.notifState[activeApp.token + '_now']) {
            const msg = `It's your turn! Token ${activeApp.token} is being called to the desk right now!`;
            sendPushNotification("Token Called!", msg);
            addInAppNotification(msg);
            window.notifState[activeApp.token + '_now'] = true;
        }
    }
}

// ==================== AUTH FUNCTIONS ====================
function setUserType(type) {
    currentUserType = type;

    const studentToggle = document.getElementById('studentToggle');
    const adminToggle = document.getElementById('adminToggle');
    const signupTab = document.getElementById('signupTab');
    const authTabs = document.getElementById('authTabs');
    const authTitle = document.getElementById('authTitle');

    const loginIdLabel = document.getElementById('loginIdLabel');
    const prnInput = document.getElementById('prnInput');

    if (type === 'student') {
        studentToggle.classList.add('bg-emerald-500', 'text-white');
        studentToggle.classList.remove('text-slate-400');
        authTabs.classList.remove('hidden');
        authTitle.textContent = "Student Login";
        adminToggle.classList.remove('bg-violet-500', 'text-white');
        adminToggle.classList.add('text-slate-400', 'hover:text-white');
        if (signupTab) signupTab.classList.remove('hidden');

        if (loginIdLabel) loginIdLabel.textContent = "PRN Number";
        if (prnInput) {
            prnInput.placeholder = "16-digit PRN";
            prnInput.type = "text";
        }
    } else {
        adminToggle.classList.add('bg-violet-500', 'text-white');
        adminToggle.classList.remove('text-slate-400');
        authTabs.classList.add('hidden');
        authTitle.textContent = "Admin Login";
        studentToggle.classList.remove('bg-emerald-500', 'text-white');
        studentToggle.classList.add('text-slate-400', 'hover:text-white');
        if (signupTab) signupTab.classList.add('hidden');
        setAuthMode('login');

        if (loginIdLabel) loginIdLabel.textContent = "Admin Email";
        if (prnInput) {
            prnInput.placeholder = "admin@scholarswift.com";
            prnInput.type = "email";
        }
    }
}

function setAuthMode(mode) {
    if (currentUserType === 'admin' && mode === 'signup') return;
    authMode = mode;
    window.currentSignupStep = 1;

    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const signupExtraFields = document.getElementById('signupExtraFields');
    const authSubmit = document.getElementById('authSubmit');
    const passwordBlock = document.getElementById('passwordBlock');
    const passwordInput = document.getElementById('passwordInput');
    const fetchedDetailsBlock = document.getElementById('fetchedDetailsBlock');

    const prnInput = document.getElementById('prnInput');

    if (prnInput) {
        prnInput.readOnly = false;
        prnInput.classList.remove('opacity-70', 'bg-slate-50');
    }

    if (mode === 'login') {
        if (loginTab) loginTab.classList.add('bg-white', 'shadow', 'text-slate-800');
        if (signupTab) signupTab.classList.remove('bg-white', 'shadow', 'text-slate-800');
        if (signupExtraFields) signupExtraFields.classList.add('hidden');
        if (fetchedDetailsBlock) fetchedDetailsBlock.classList.add('hidden');

        if (passwordBlock) passwordBlock.classList.remove('hidden');
        if (passwordInput) passwordInput.required = true;

        if (authSubmit) authSubmit.textContent = 'Sign In';
    } else {
        if (signupTab) signupTab.classList.add('bg-white', 'shadow', 'text-slate-800');
        if (loginTab) loginTab.classList.remove('bg-white', 'shadow', 'text-slate-800');
        if (signupExtraFields) signupExtraFields.classList.remove('hidden');
        if (fetchedDetailsBlock) fetchedDetailsBlock.classList.add('hidden');

        if (passwordBlock) passwordBlock.classList.add('hidden');
        if (passwordInput) passwordInput.required = false;

        if (authSubmit) authSubmit.textContent = 'Verify Details';
    }
}

async function handleAuth(event) {
    event.preventDefault();

    const prnInput = document.getElementById('prnInput') || document.getElementById('emailInput');
    const prn = prnInput.value.toUpperCase().trim();

    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value;
    const errorDiv = document.getElementById('authError');
    errorDiv.classList.add('hidden');

    const dummyAuthEmail = `${prn}@scholarswift.local`;

    try {
        if (currentUserType === 'student') {
            if (authMode === 'signup') {
                const contactNo = document.getElementById('contactInput') ? document.getElementById('contactInput').value.trim() : "";
                const mahadbtId = document.getElementById('mahadbtIdInput') ? document.getElementById('mahadbtIdInput').value.trim() : "";

                if (window.currentSignupStep === 1 || !window.currentSignupStep) {
                    if (!prn) throw new Error("16-digit PRN is required to verify!");

                    const masterDoc = await db.collection('master_students').doc(prn).get();
                    if (!masterDoc.exists) {
                        throw new Error("PRN not found in official roster. Please contact the Verification Cell.");
                    }

                    const masterData = masterDoc.data();
                    if (masterData.isRegistered) {
                        throw new Error("An account with this PRN already exists. Please Sign In.");
                    }

                    document.getElementById('fetchedName').textContent = masterData.name;
                    document.getElementById('fetchedDept').textContent = masterData.department;
                    document.getElementById('fetchedYear').textContent = yearLabels[masterData.currentYear] || `Year ${masterData.currentYear}`;
                    document.getElementById('fetchedCategory').textContent = masterData.scholarshipType;

                    document.getElementById('fetchedDetailsBlock').classList.remove('hidden');
                    document.getElementById('passwordBlock').classList.remove('hidden');
                    passwordInput.required = true;

                    prnInput.readOnly = true;
                    prnInput.classList.add('opacity-70', 'bg-slate-50');

                    document.getElementById('authSubmit').textContent = 'Confirm & Create Account';
                    window.currentSignupStep = 2;
                    window.verifiedMasterData = masterData;

                    return;
                }
                else if (window.currentSignupStep === 2) {
                    if (!mahadbtId || !password || !contactNo) throw new Error("Password, Contact Number, and MahaDBT ID are required!");

                    const masterData = window.verifiedMasterData;

                    const userCredential = await auth.createUserWithEmailAndPassword(dummyAuthEmail, password);

                    const studentData = {
                        uid: userCredential.user.uid,
                        prn: prn,
                        contactNo: contactNo,
                        mahadbtId: mahadbtId,
                        firstName: masterData.firstName,
                        lastName: masterData.lastName,
                        name: masterData.name,
                        department: masterData.department,
                        joiningYear: masterData.joiningYear,
                        currentYear: masterData.currentYear,
                        scholarshipType: masterData.scholarshipType,
                        role: 'student',
                        extraAttempts: 0,
                        adminRemark: masterData.adminRemark || "",
                        scholarId: `${masterData.department}${Math.floor(100 + Math.random() * 900)}`
                    };

                    await db.collection('users').doc(userCredential.user.uid).set(studentData);
                    await db.collection('master_students').doc(prn).update({ isRegistered: true, uid: userCredential.user.uid });

                    currentUser = { ...studentData, type: 'student' };
                    window.currentSignupStep = 1;
                    showToast(`Success! Account created for ${masterData.name}`);
                    showStudentDashboard();
                }
            } else {
                const userCredential = await auth.signInWithEmailAndPassword(dummyAuthEmail, password);
                const doc = await db.collection('users').doc(userCredential.user.uid).get();
                if (doc.exists) {
                    currentUser = { ...doc.data(), uid: userCredential.user.uid, type: 'student' };
                    showStudentDashboard();
                } else throw new Error("Profile not found!");
            }
        } else {
            const adminInput = prn.toLowerCase();
            const ADMIN_EMAIL = "admin@scholarswift.com";
            const ADMIN_PASS = "admin123";

            if (adminInput === ADMIN_EMAIL && password === ADMIN_PASS) {
                currentUser = { name: 'System Admin', role: 'Head', dept: 'Verification Cell', type: 'admin', uid: 'admin_fixed_id' };
                showAdminDashboard();
                showToast("Welcome Admin");
            } else {
                throw new Error("Invalid Admin credentials!");
            }
        }
    } catch (e) {
        errorDiv.textContent = e.message;
        errorDiv.classList.remove('hidden');
    }
}

// ==================== STUDENT DASHBOARD & UI UPDATES ====================
function showStudentDashboard() {
    if (!currentUser) return;
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('studentDashboard').classList.remove('hidden');

    const displayYear = currentUser.mahadbtYear || window.systemAcademicYear || "2025-2026";

    const fields = {
        'studentName': currentUser.name, 'studentKey': currentUser.scholarId,
        'profileName': currentUser.name, 'profileGrNumber': currentUser.prn,
        'profileDept': currentUser.department, 'profileYear': yearLabels[currentUser.currentYear] || "Year " + currentUser.currentYear,
        'profileMahaDBT': currentUser.mahadbtId ? `${currentUser.mahadbtId} (${displayYear})` : "--",
        'profileSchType': currentUser.scholarshipType
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "--";
    }

    function refreshRemarkBanner() {
        const remarksBlock = document.getElementById('studentRemarksBlock');
        const remarkTextEl = document.getElementById('studentRemarkText');
        const relevantApp = window.currentStudentActiveApp || (window.allStudentApps && window.allStudentApps[0]);
        const displayRemark = currentUser.adminRemark || (relevantApp ? relevantApp.remarks : '');
        const displayDate = currentUser.adminRemarkTimestamp || '';

        if (displayRemark && displayRemark.trim() !== '') {
            if (remarksBlock) remarksBlock.classList.remove('hidden');
            let timeHtml = displayDate ? `<span class="block text-[10px] font-bold text-violet-400 mt-1.5">${displayDate}</span>` : '';
            if (remarkTextEl) remarkTextEl.innerHTML = `"${displayRemark}" ${timeHtml}`;
        } else {
            if (remarksBlock) remarksBlock.classList.add('hidden');
        }
    }

    if (!window.userProfileListener) {
        window.userProfileListener = db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                currentUser = { ...currentUser, ...doc.data() };
                refreshRemarkBanner();
                if (window.allStudentApps) {
                    const attemptsEl = document.getElementById('profileAttempts');
                    if (attemptsEl) {
                        const usedAttempts = window.allStudentApps.length;
                        const extraAttempts = currentUser.extraAttempts || 0;
                        const attemptsLeft = Math.max(0, (3 + extraAttempts) - usedAttempts);
                        attemptsEl.textContent = `${attemptsLeft}/${3 + extraAttempts}`;
                        attemptsEl.className = attemptsLeft === 0 ? "font-bold text-red-500 text-lg" : "font-bold text-emerald-600 text-lg";
                    }
                }
            }
        });
    }

    db.collection('appointments').where('uid', '==', currentUser.uid)
        .onSnapshot(snap => {
            const bookingContainer = document.getElementById('bookingContainer');
            const liveQueue = document.getElementById('liveQueueSection');
            const fineMessage = document.getElementById('fineLockedMessage');

            let allApps = [];
            snap.forEach(doc => allApps.push({ id: doc.id, ...doc.data() }));

            allApps.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return parseTime(b.time) - parseTime(a.time);
            });

            window.allStudentApps = allApps;

            const usedAttempts = allApps.length;
            const extraAttempts = currentUser.extraAttempts || 0;
            const attemptsLeft = Math.max(0, (3 + extraAttempts) - usedAttempts);

            const attemptsEl = document.getElementById('profileAttempts');
            if (attemptsEl) {
                attemptsEl.textContent = `${attemptsLeft}/${3 + extraAttempts}`;
                attemptsEl.className = attemptsLeft === 0 ? "font-bold text-red-500 text-lg" : "font-bold text-emerald-600 text-lg";
            }

            const isVerified = allApps.some(a => String(a.status).includes('verified'));
            const activeApp = allApps.find(a => ['waiting', 'current'].includes(a.status));
            const lastProcessedApp = allApps.find(a => ['pending', 'pending_closed', 'no_show', 'no_show_closed'].includes(a.status));

            window.currentStudentActiveApp = activeApp || null;

            let myTrueStatus = "not_booked";
            if (isVerified) {
                myTrueStatus = "verified";
            } else if (lastProcessedApp && String(lastProcessedApp.status).includes('pending')) {
                myTrueStatus = "pending";
            } else if (activeApp) {
                myTrueStatus = "waiting";
            } else if (allApps[0] && allApps[0].status.includes('no_show')) {
                myTrueStatus = "no_show";
            }

            if (!window.studentAnnounceListener) {
                window.studentAnnounceListener = db.collection('announcements').orderBy('createdAt', 'desc').onSnapshot(announceSnap => {
                    const container = document.getElementById('studentGlobalAnnouncements');
                    if (!container) return;

                    let activeHtml = "";
                    let newAnnouncementsFound = false;

                    announceSnap.forEach(doc => {
                        const ann = doc.data();

                        if (ann.isRevoked) return;

                        const deptMatch = ann.targetDept === 'ALL' || ann.targetDept === currentUser.department;
                        const yearMatch = ann.targetYear === 'ALL' || ann.targetYear === String(currentUser.currentYear);
                        const statusMatch = ann.targetStatus === 'ALL' || ann.targetStatus === myTrueStatus;

                        if (deptMatch && yearMatch && statusMatch) {
                            activeHtml += `
                                <div class="bg-blue-50/90 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm mb-3 relative animate-slide">
                                    <div class="flex justify-between items-start">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="flex h-2 w-2 relative">
                                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                              <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                            <h4 class="text-xs font-black text-blue-800 uppercase tracking-widest">Admin Broadcast</h4>
                                        </div>
                                        <span class="text-[10px] font-bold text-blue-400">${ann.timestampString || 'Just now'}</span>
                                    </div>
                                    <p class="text-sm text-blue-900 font-medium mt-1">${ann.message}</p>
                                </div>
                            `;

                            if (!window.seenAnnouncements) window.seenAnnouncements = new Set();
                            if (!window.seenAnnouncements.has(doc.id)) {
                                newAnnouncementsFound = true;
                                window.seenAnnouncements.add(doc.id);
                            }
                        }
                    });

                    if (activeHtml !== "") {
                        container.innerHTML = activeHtml;
                        container.classList.remove('hidden');
                        if (newAnnouncementsFound) showToast("New Admin Announcement!");
                    } else {
                        container.classList.add('hidden');
                        container.innerHTML = "";
                    }
                });
            }

            const banner = document.getElementById('studentStatusBanner');
            const statusText = document.getElementById('overallStatusText');
            const statusSub = document.getElementById('overallStatusSubtext');
            const statusIcon = document.getElementById('overallStatusIcon');

            let bColor = 'border-slate-300'; let iconBg = 'bg-slate-100'; let iconText = 'text-slate-400';
            let title = "Not Verified Yet";
            let subtextHtml = "Please book a slot below to verify your documents.";
            let svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;

            if (isVerified) {
                bColor = 'border-emerald-500'; iconBg = 'bg-emerald-100'; iconText = 'text-emerald-600';
                title = "Verified ✓";
                subtextHtml = "Your MahaDBT application is successfully verified for this year.";
                svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>`;
            } else {
                let hasPendingDocs = false;
                let missingHtml = "";

                if (lastProcessedApp && String(lastProcessedApp.status).includes('pending')) {
                    hasPendingDocs = true;
                    bColor = 'border-amber-500'; iconBg = 'bg-amber-100'; iconText = 'text-amber-600';
                    title = "Documents Pending ⚠";
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`;

                    const requiredDocs = scholarshipDocs[currentUser.scholarshipType] || [];
                    const verifiedMap = lastProcessedApp.documentVerification || {};
                    const missingDocs = requiredDocs.filter(d => !verifiedMap[d]);

                    if (missingDocs.length > 0) {
                        const tags = missingDocs.map(d => `<span class="inline-block bg-white text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold mr-1.5 mb-1.5 shadow-sm">${d}</span>`).join('');
                        missingHtml = `<div class="mb-3"><p class="mb-1 text-slate-600 font-bold text-xs uppercase">Missing Documents:</p><div class="flex flex-wrap">${tags}</div></div>`;
                    } else {
                        missingHtml = `<p class="mb-2 text-slate-600">You are missing some documents.</p>`;
                    }
                } else {
                    bColor = 'border-slate-300'; iconBg = 'bg-slate-100'; iconText = 'text-slate-500';
                    title = "Not Verified Yet";
                }

                if (activeApp) {
                    bColor = 'border-blue-500'; iconBg = 'bg-blue-100'; iconText = 'text-blue-600';
                    if (!hasPendingDocs) title = "Verification Scheduled";
                    subtextHtml = missingHtml + `<div class="mt-2 text-sm font-medium text-blue-700 bg-blue-50 inline-block px-3 py-2 rounded-lg border border-blue-100 shadow-sm">📅 Scheduled for <span class="font-bold">${activeApp.date}</span> at <span class="font-bold">${activeApp.time}</span></div>`;
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>`;
                } else {
                    const latestApp = allApps[0];
                    let promptText = "Please book a slot below to verify your documents.";
                    if (hasPendingDocs) promptText = "Please arrange the missing documents and book a slot below.";

                    if (latestApp) {
                        const baseLatest = latestApp.status.replace('_closed', '');
                        if (baseLatest === 'cancelled') {
                            subtextHtml = missingHtml + `<p class="mb-2 text-slate-500 text-sm border-l-2 border-slate-300 pl-2"><em>Note: You cancelled your last appointment. <span class="text-red-500 font-bold">This attempt was deducted from your limit.</span></em></p><p class="font-medium text-emerald-600">${promptText}</p>`;
                        } else if (baseLatest === 'no_show') {
                            subtextHtml = missingHtml + `<p class="mb-2 text-red-500 text-sm border-l-2 border-red-300 pl-2"><em>Note: You missed your last scheduled appointment.</em></p><p class="font-medium text-emerald-600">${promptText}</p>`;
                        } else {
                            subtextHtml = missingHtml + `<p class="font-medium text-emerald-600">${promptText}</p>`;
                        }
                    } else {
                        subtextHtml = `<p class="font-medium text-emerald-600">${promptText}</p>`;
                    }
                }
            }

            if (banner) {
                banner.className = `glass-card rounded-2xl p-6 mb-8 border-l-8 ${bColor} animate-slide shadow-md transition-all duration-500`;
                statusText.textContent = title;
                statusSub.innerHTML = subtextHtml;
                statusIcon.className = `hidden md:flex w-14 h-14 rounded-full items-center justify-center shadow-inner shrink-0 ml-4 ${iconBg} ${iconText}`;
                statusIcon.innerHTML = `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">${svg}</svg>`;
            }

            refreshRemarkBanner();

            const historyBody = document.getElementById('studentHistoryBody');
            if (historyBody) {
                historyBody.innerHTML = '';
                if (allApps.length === 0) {
                    historyBody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-400 italic">No booking history found.</td></tr>`;
                } else {
                    allApps.forEach(app => {
                        const row = document.createElement('tr');
                        row.className = 'hover:bg-slate-50 transition-colors';

                        let badgeStyle = "";
                        let statusLabel = "";
                        const baseStatus = app.status ? app.status.replace('_closed', '') : 'waiting';

                        switch (baseStatus) {
                            case 'current': badgeStyle = "bg-emerald-500 text-white animate-pulse shadow-sm"; statusLabel = "Current"; break;
                            case 'verified': badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200"; statusLabel = "Verified"; break;
                            case 'pending': badgeStyle = "bg-amber-100 text-amber-700 border border-amber-200"; statusLabel = "Pending"; break;
                            case 'no_show': badgeStyle = "bg-red-100 text-red-700 border border-red-200"; statusLabel = "Didn't Show"; break;
                            case 'cancelled': badgeStyle = "bg-slate-100 text-slate-500 line-through"; statusLabel = "Cancelled"; break;
                            case 'waiting': badgeStyle = "bg-blue-50 text-blue-600 border border-blue-100"; statusLabel = "Waiting"; break;
                            default: badgeStyle = "bg-slate-100 text-slate-500"; statusLabel = app.status;
                        }

                        row.innerHTML = `
                            <td class="px-6 py-4 font-mono font-bold text-slate-600">${app.token}</td>
                            <td class="px-6 py-4">
                                <p class="font-bold text-slate-800">${app.date}</p>
                                <p class="text-xs text-slate-500 mt-0.5">${app.time}</p>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeStyle}">
                                    ${statusLabel}
                                </span>
                            </td>
                        `;
                        historyBody.appendChild(row);
                    });
                }
            }

            if (activeApp) {
                if (bookingContainer) bookingContainer.classList.add('hidden');
                if (fineMessage) fineMessage.classList.add('hidden');
                if (liveQueue) liveQueue.classList.remove('hidden');
                document.getElementById('yourToken').textContent = activeApp.token;

                const cancelBlock = document.getElementById('bannerCancelBlock');
                if (cancelBlock) cancelBlock.classList.toggle('hidden', activeApp.status === 'current');

                db.collection('appointments').where('date', '==', activeApp.date).where('status', '==', 'waiting').get().then(waitSnap => {
                    let waitingList = [];
                    waitSnap.forEach(doc => waitingList.push(doc.data()));
                    waitingList.sort((a, b) => parseTime(a.time) - parseTime(b.time));
                    const position = waitingList.findIndex(s => s.token === activeApp.token);
                    const aheadEl = document.getElementById('peopleAhead');
                    if (aheadEl) aheadEl.textContent = (activeApp.status === 'waiting') ? (position === -1 ? "0" : position) : "0";
                });

                const slotEl = document.getElementById('yourSlotTime');
                if (slotEl) slotEl.innerHTML = `<span class="animate-pulse text-xs text-slate-400">Syncing live clock...</span>`;

            } else {
                if (liveQueue) liveQueue.classList.add('hidden');
                const cancelBlock = document.getElementById('bannerCancelBlock');
                if (cancelBlock) cancelBlock.classList.add('hidden');

                const waitEl = document.getElementById('waitTime');
                if (waitEl) waitEl.textContent = "--";
                const slotEl = document.getElementById('yourSlotTime');
                if (slotEl) slotEl.textContent = "--";
                const aheadEl = document.getElementById('peopleAhead');
                if (aheadEl) aheadEl.textContent = "--";

                if (isVerified) {
                    if (bookingContainer) bookingContainer.classList.add('hidden');
                    if (fineMessage) fineMessage.classList.add('hidden');
                } else if (attemptsLeft <= 0) {
                    if (bookingContainer) bookingContainer.classList.add('hidden');
                    if (fineMessage) fineMessage.classList.remove('hidden');
                } else if (currentUser.mahadbtId && currentUser.mahadbtId.trim() !== "") {
                    if (bookingContainer) bookingContainer.classList.remove('hidden');
                    if (fineMessage) fineMessage.classList.add('hidden');
                    restrictDateToDepartmentDay();
                } else {
                    if (bookingContainer) bookingContainer.classList.add('hidden');
                    if (fineMessage) fineMessage.classList.add('hidden');
                }
            }
        });
}

function openCancelModal() {
    document.getElementById('cancelConfirmModal').classList.remove('hidden');
}

function closeCancelModal() {
    document.getElementById('cancelConfirmModal').classList.add('hidden');
}

async function confirmCancelBooking() {
    if (!currentUser) return;
    try {
        const snap = await db.collection('appointments')
            .where('uid', '==', currentUser.uid)
            .where('status', '==', 'waiting')
            .get();

        if (!snap.empty) {
            const docId = snap.docs[0].id;
            await db.collection('appointments').doc(docId).update({ status: 'cancelled' });
            showToast("Appointment Cancelled. Attempt deducted.");
        }
        closeCancelModal();
    } catch (e) {
        showToast("Error cancelling booking.");
    }
}

function renderDocumentChecklist(student, appointment) {
    const container = document.getElementById('docChecklist');
    const progress = document.getElementById('docProgress');

    if (!container || !student || !appointment) return;

    const docs = scholarshipDocs[student.scholarshipType] || [];
    const verified = appointment.documentVerification || {};

    let verifiedCount = 0;

    container.innerHTML = docs.map(doc => {
        const isChecked = verified[doc] === true;
        if (isChecked) verifiedCount++;

        return `
        <div class="flex items-center justify-between bg-white p-2 rounded-lg border">
            <span class="text-sm font-medium ${isChecked ? 'text-emerald-600' : 'text-slate-700'}">
                ${doc}
            </span>
            <input 
                type="checkbox" 
                ${isChecked ? 'checked' : ''} 
                onchange="updateDocumentStatus('${appointment.id}','${doc}',this.checked)"
                class="w-4 h-4 accent-emerald-500 cursor-pointer"
            >
        </div>
        `;
    }).join('');

    if (progress) {
        progress.textContent = `${verifiedCount}/${docs.length} Verified`;
    }
}

// ==================== ADMIN DASHBOARD & DATA PIPELINE ====================
function showAdminDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    document.getElementById('todaysDept').textContent = `${currentUser.role} | ${currentUser.department}`;

    toggleAdminView('live');

    const todayDayNum = new Date().getDay();
    let todaysDepts = [];
    for (const [dept, info] of Object.entries(deptToDay)) {
        if (info.day === todayDayNum) todaysDepts.push(dept);
    }

    const deptBannerText = document.getElementById('adminTodayDeptText');
    if (deptBannerText) {
        if (todayDayNum === 0) {
            deptBannerText.textContent = `HOLIDAY (SUNDAY)`;
        } else if (todaysDepts.length > 0) {
            deptBannerText.textContent = `TODAY: ${todaysDepts.join(', ')}`;
        } else {
            deptBannerText.textContent = `OPEN DAY (ALL)`;
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    window.renderAdminQueueTable = function () {
        const tbody = document.getElementById('queueTableBody');
        if (!tbody || !window.currentAdminQueueList) return;

        let masterDelay = getMasterDelay();
        let newHtml = '';

        window.currentAdminQueueList.forEach(data => {
            const isCurrent = data.status === 'current';
            let badgeStyle = "";
            let statusLabel = "";
            const baseStatus = data.status ? data.status.replace('_closed', '') : 'waiting';

            if (baseStatus === 'cancelled') return;

            let rowClass = `divide-x divide-slate-100 transition-all duration-500 ${isCurrent ? 'bg-emerald-50/50 ring-2 ring-inset ring-emerald-500 shadow-lg z-10 relative' : 'hover:bg-slate-50'}`;

            switch (baseStatus) {
                case 'current': badgeStyle = "bg-emerald-500 text-white animate-pulse shadow-sm"; statusLabel = "Current"; break;
                case 'verified': badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200"; statusLabel = "Verified"; break;
                case 'pending': badgeStyle = "bg-amber-100 text-amber-700 border border-amber-200"; statusLabel = "Pending"; break;
                case 'no_show': badgeStyle = "bg-slate-200 text-slate-600 border border-slate-300"; statusLabel = "Didn't Show"; break;
                case 'waiting': badgeStyle = "bg-violet-50 text-violet-600 border border-violet-100"; statusLabel = "Waiting"; break;
                default: badgeStyle = "bg-slate-100 text-slate-500"; statusLabel = data.status;
            }

            const originalStart = data.time ? String(data.time).toLowerCase() : "--:--";
            const originalEnd = originalStart !== "--:--" ? safeAddMinutes(originalStart, 7) : "--:--";
            let timeHtml = "";

            if (['verified', 'pending', 'no_show'].includes(baseStatus)) {
                timeHtml = `<span class="text-slate-500">${originalStart} - ${originalEnd}</span>`;
            } else {
                if (masterDelay > 0 && originalStart !== "--:--") {
                    const delayedEnd = safeAddMinutes(originalEnd, masterDelay);
                    let delayedStart = safeAddMinutes(originalStart, masterDelay);
                    if (baseStatus === 'current') delayedStart = originalStart;

                    timeHtml = `
                        <span class="text-slate-500 mr-3">SCH: ${originalStart} - ${originalEnd}</span> 
                        <span class="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 mt-1 inline-flex items-center gap-2">
                            EXP: ${delayedStart} - ${delayedEnd}
                            <span class="bg-red-500 text-white px-1.5 py-0.5 rounded-sm text-[9px] animate-pulse shadow-sm">+${masterDelay}m</span>
                        </span>
                    `;
                } else if (originalStart !== "--:--") {
                    timeHtml = `
                        <span class="text-slate-500 mr-3">SCH: ${originalStart} - ${originalEnd}</span> 
                        <span class="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 inline-flex items-center gap-2 text-[10px]">
                            ON TIME
                        </span>
                    `;
                }
            }

            newHtml += `
                <tr class="${rowClass}">
                    <td class="px-6 py-4 font-mono font-bold ${isCurrent ? 'text-emerald-600 scale-110' : 'text-slate-500'} transition-transform">${data.token}</td>
                    <td class="px-6 py-4">
                        <p class="font-bold ${isCurrent ? 'text-emerald-900' : 'text-slate-800'}">${data.name}</p>
                        <div class="text-[11px] uppercase tracking-tight mt-1 flex flex-col md:flex-row md:items-center">
                            <span class="text-slate-400 font-bold mr-2 mb-1 md:mb-0">${data.department}</span> 
                            <div class="flex-1">${timeHtml}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeStyle}">
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = newHtml;
    };

    if (window.adminQueueSnapshotObj) window.adminQueueSnapshotObj();

    window.adminQueueSnapshotObj = db.collection('appointments').where('date', '==', todayStr)
        .onSnapshot(snap => {
            let list = [];
            let waitingCount = 0;

            snap.forEach(doc => {
                const data = doc.data();
                list.push({ id: doc.id, ...data });
                if (data.status === 'waiting') waitingCount++;
            });
            list.sort((a, b) => parseTime(a.time) - parseTime(b.time));

            window.currentAdminQueueList = list;
            window.renderAdminQueueTable();
            refreshActiveStudentDisplay();

            const queueCounter = document.getElementById('adminPeopleInQueue');
            if (queueCounter) queueCounter.textContent = waitingCount;
        });

    if (window.adminTableUpdateInterval) clearInterval(window.adminTableUpdateInterval);
    window.adminTableUpdateInterval = setInterval(() => {
        if (!isQueuePaused && window.renderAdminQueueTable) {
            window.renderAdminQueueTable();
        }
    }, 1000);
}

function toggleAdminView(view) {
    const liveView = document.getElementById('adminLiveQueueView');
    const statsView = document.getElementById('adminStatsView');
    const dirView = document.getElementById('adminDirectoryView');
    const announceView = document.getElementById('adminAnnouncementsView');

    [liveView, statsView, dirView, announceView].forEach(el => {
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('block');
        }
    });

    ['btnViewStats', 'btnViewDirectory', 'btnViewAnnouncements'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('bg-emerald-600', 'text-white');
    });

    if (view === 'live' && liveView) {
        liveView.classList.remove('hidden');
    } else if (view === 'stats' && statsView) {
        statsView.classList.remove('hidden');
        const btn = document.getElementById('btnViewStats');
        if (btn) btn.classList.add('bg-emerald-600', 'text-white');
        if (window.unifiedCollegeData && window.unifiedCollegeData.length > 0) applyFilters();
    } else if (view === 'directory' && dirView) {
        dirView.classList.remove('hidden');
        const btn = document.getElementById('btnViewDirectory');
        if (btn) btn.classList.add('bg-emerald-600', 'text-white');
        loadStudentDirectory();
    } else if (view === 'announcements' && announceView) {
        announceView.classList.remove('hidden');
        const btn = document.getElementById('btnViewAnnouncements');
        if (btn) btn.classList.add('bg-emerald-600', 'text-white');
        if (typeof initAdminAnnouncementListener === 'function') initAdminAnnouncementListener();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

async function refreshActiveStudentDisplay() {
    const snap = await db.collection('appointments').where('status', 'in', ['current', 'verified', 'pending', 'no_show']).limit(1).get();

    const dossier = document.getElementById('activeDossier');
    if (!dossier) return;
    const container = dossier.parentElement;

    const timerContainer = document.getElementById('timerContainer');
    const studentMetaCards = document.getElementById('studentMetaCards');
    const adminChecklistBlock = document.getElementById('adminChecklistBlock');
    const emptyQueueGraphic = document.getElementById('emptyQueueGraphic');
    const actionButtonsBlock = document.getElementById('adminActionButtonsBlock');
    const remarksBlock = document.getElementById('adminRemarksBlock');

    const remarksInput = document.getElementById('adminRemarksInput');
    const saveRemarkBtn = document.getElementById('saveRemarkBtn');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const slotIndicator = document.getElementById('activeSlotIndicator');

    container.classList.remove('bg-emerald-50', 'bg-red-50', 'bg-slate-100', 'border-emerald-500', 'border-red-500', 'border-slate-400');
    if (timerContainer) timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');

    const oldFlag = document.getElementById('resultFlag');
    if (oldFlag) oldFlag.remove();

    if (!snap.empty) {
        const docRef = snap.docs[0];
        const data = docRef.data();
        const status = data.status;

        if (timerContainer) timerContainer.classList.remove('hidden');
        if (studentMetaCards) studentMetaCards.classList.remove('hidden');
        if (adminChecklistBlock) adminChecklistBlock.classList.remove('hidden');
        if (actionButtonsBlock) actionButtonsBlock.classList.remove('hidden');
        if (remarksBlock) remarksBlock.classList.remove('hidden');
        if (emptyQueueGraphic) emptyQueueGraphic.classList.add('hidden');

        if (remarksInput) {
            remarksInput.value = data.remarks || '';
        }

        document.getElementById('activeStudentName').textContent = data.name;
        document.getElementById('activeStudentGR').textContent = data.prn || "--";
        document.getElementById('activeMahaDBT').textContent = data.mahadbtId || "--";
        document.getElementById('activeSchType').textContent = data.scholarshipType;
        document.getElementById('adminCurrentToken').textContent = `TOKEN: ${data.token}`;

        if (slotIndicator) slotIndicator.textContent = `Slot: ${data.time}`;

        if (['verified', 'pending', 'no_show'].includes(status)) {
            isTimerRunning = false;
            const flag = document.createElement('div');
            flag.id = 'resultFlag';
            flag.className = `absolute top-24 right-8 px-6 py-2 rounded-full font-black text-xl uppercase tracking-widest shadow-md animate-pop text-white z-50 flex items-center gap-2`;

            if (status === 'verified') {
                container.classList.add('bg-emerald-50', 'border-emerald-500');
                flag.classList.add('bg-emerald-500');
                flag.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Verified`;
            } else if (status === 'pending') {
                container.classList.add('bg-red-50', 'border-red-500');
                flag.classList.add('bg-red-500');
                flag.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Pending`;
            } else if (status === 'no_show') {
                container.classList.add('bg-slate-100', 'border-slate-400');
                flag.classList.add('bg-slate-500');
                flag.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg> No Show`;
            }

            container.appendChild(flag);
            if (actionButtonsBlock) actionButtonsBlock.classList.add('hidden');
            if (startTimerBtn) startTimerBtn.classList.add('hidden');
            if (sessionCountdown) clearInterval(sessionCountdown);

            if (remarksInput) {
                remarksInput.readOnly = true;
                remarksInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
                remarksInput.classList.remove('bg-white');
                if (!data.remarks) remarksInput.value = "No remark provided.";
            }
            if (saveRemarkBtn) saveRemarkBtn.classList.add('hidden');

        } else {
            if (!isTimerRunning && status === 'current') {
                isTimerRunning = true;
                startSessionTimer(420);
                if (!data.isProcessing) {
                    db.collection('appointments').doc(docRef.id).update({ isProcessing: true });
                }
            }
            if (startTimerBtn) startTimerBtn.classList.add('hidden');

            if (remarksInput) {
                remarksInput.readOnly = false;
                remarksInput.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
                remarksInput.classList.add('bg-white');
            }
            if (saveRemarkBtn) saveRemarkBtn.classList.remove('hidden');
        }

        const studentData = { scholarshipType: data.scholarshipType };
        const appointmentData = { id: docRef.id, documentVerification: data.documentVerification || {} };
        if (typeof renderDocumentChecklist === 'function') {
            renderDocumentChecklist(studentData, appointmentData);
        }

    } else {
        isTimerRunning = false;
        if (timerContainer) timerContainer.classList.add('hidden');
        if (studentMetaCards) studentMetaCards.classList.add('hidden');
        if (adminChecklistBlock) adminChecklistBlock.classList.add('hidden');
        if (actionButtonsBlock) actionButtonsBlock.classList.add('hidden');
        if (remarksBlock) remarksBlock.classList.add('hidden');
        if (emptyQueueGraphic) emptyQueueGraphic.classList.remove('hidden');

        document.getElementById('activeStudentName').textContent = "Desk Available";
        document.getElementById('adminCurrentToken').textContent = "TOKEN: --";

        if (remarksInput) {
            remarksInput.value = '';
            remarksInput.readOnly = true;
        }

        if (startTimerBtn) startTimerBtn.classList.add('hidden');
        if (sessionCountdown) clearInterval(sessionCountdown);
    }
}

async function manualStartTimer() {
    isTimerRunning = true;
    const startBtn = document.getElementById('startTimerBtn');
    if (startBtn) startBtn.classList.add('hidden');
    startSessionTimer(420);

    try {
        const snap = await db.collection('appointments').where('status', '==', 'current').limit(1).get();
        if (!snap.empty) {
            await db.collection('appointments').doc(snap.docs[0].id).update({ isProcessing: true });
        }
    } catch (e) { console.error(e); }
}

function startSessionTimer(s) {
    if (sessionCountdown) clearInterval(sessionCountdown);
    remainingSeconds = s;
    isTimerRunning = true;

    const timerDisplay = document.getElementById('sessionTimer');
    const timerContainer = document.getElementById('timerContainer');
    const progressBar = document.getElementById('timerProgress');

    if (timerDisplay) timerDisplay.classList.remove('text-red-500', 'animate-pulse');
    if (timerContainer) timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');

    sessionCountdown = setInterval(() => {
        remainingSeconds--;
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;

        if (timerDisplay) timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        let totalScale = Math.max(420, remainingSeconds);
        if (progressBar) progressBar.style.width = `${(remainingSeconds / totalScale) * 100}%`;

        if (remainingSeconds <= 0) {
            clearInterval(sessionCountdown);
            showToast("Slot time exceeded! Auto-adding 5 mins to Queue Delay.");
            addExtraTime();
        }
    }, 1000);
}

async function addExtraTime() {
    remainingSeconds += 300;

    const timerDisplay = document.getElementById('sessionTimer');
    const timerContainer = document.getElementById('timerContainer');
    if (timerDisplay) timerDisplay.classList.remove('text-red-500', 'animate-pulse');
    if (timerContainer) timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');

    startSessionTimer(remainingSeconds);

    try {
        await db.collection('settings').doc('queueStatus').set({
            delayMinutes: firebase.firestore.FieldValue.increment(5)
        }, { merge: true });
        showToast("+5 Minutes Added & Queue Delayed");
    } catch (e) { console.error(e); }
}

async function resetQueueDelay() {
    try {
        await db.collection('settings').doc('queueStatus').set({ delayMinutes: 0 }, { merge: true });
        showToast("Queue Delay Reset to 0");
    } catch (e) { console.error(e); }
}

async function updateActiveStatus(newStatus) {
    try {
        const snap = await db.collection('appointments').where('status', '==', 'current').limit(1).get();
        if (snap.empty) return showToast("No active student.");

        const docRef = snap.docs[0];
        const data = docRef.data();

        if (newStatus === 'verified') {
            const requiredDocs = scholarshipDocs[data.scholarshipType] || [];
            const verifiedDocs = data.documentVerification || {};
            const pendingDocs = requiredDocs.filter(docName => !verifiedDocs[docName]);

            if (pendingDocs.length > 0) {
                showToast(`Cannot Verify: ${pendingDocs.length} documents pending.`);
                return;
            }
        }

        const remarksInput = document.getElementById('adminRemarksInput');
        const remarkText = remarksInput ? remarksInput.value.trim() : "";

        await db.collection('appointments').doc(docRef.id).update({
            status: newStatus,
            processedAt: new Date().toISOString(),
            remarks: remarkText
        });

        let recoveredMins = 0;
        if (globalDelayMinutes > 0 && remainingSeconds > 0) {
            const timeSaved = Math.floor(remainingSeconds / 60);
            if (timeSaved > 0) {
                recoveredMins = Math.min(globalDelayMinutes, timeSaved);
                const newDelay = globalDelayMinutes - recoveredMins;
                await db.collection('settings').doc('queueStatus').set({ delayMinutes: newDelay }, { merge: true });
            }
        }

        if (sessionCountdown) {
            clearInterval(sessionCountdown);
            sessionCountdown = null;
        }
        isTimerRunning = false;

        if (recoveredMins > 0) {
            showToast(`Marked ${newStatus.toUpperCase()}! Queue caught up by ${recoveredMins} mins ⏱️`);
        } else {
            showToast(`Student set to ${newStatus.toUpperCase()}`);
        }

    } catch (e) { showToast("System error."); }
}

async function updateDocumentStatus(id, doc, stat) {
    try {
        await db.collection('appointments').doc(id).update({ [`documentVerification.${doc}`]: stat });
        showToast(stat ? "Document Checked" : "Document Unchecked");
    } catch (e) { showToast("Save Failed"); }
}

async function nextToken() {
    try {
        const currentActive = await db.collection('appointments').where('status', '==', 'current').get();
        if (!currentActive.empty) {
            showToast("Action Required: Please Finalize current student first!");
            return;
        }

        const batch = db.batch();
        const finishedAtDesk = await db.collection('appointments').where('status', 'in', ['verified', 'pending', 'no_show']).get();

        finishedAtDesk.forEach(doc => {
            let finalStatus = doc.data().status === 'verified' ? 'verified_closed' :
                doc.data().status === 'pending' ? 'pending_closed' : 'no_show_closed';
            batch.update(doc.ref, { status: finalStatus });
        });

        const allWaiting = await db.collection('appointments').where('status', '==', 'waiting').get();
        let list = [];
        allWaiting.forEach(doc => list.push({ id: doc.id, data: doc.data() }));
        list.sort((a, b) => parseTime(a.data.time) - parseTime(b.data.time));

        if (list.length > 0) {
            batch.update(db.collection('appointments').doc(list[0].id), { status: 'current', isProcessing: true });
            remainingSeconds = 420;
            await batch.commit();
        } else {
            await batch.commit();
            showToast("Queue is empty!");
        }
    } catch (e) { console.error(e); }
}

function togglePause() {
    isQueuePaused = !isQueuePaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        if (isQueuePaused) {
            if (sessionCountdown) clearInterval(sessionCountdown);
            pauseBtn.textContent = "Resume Queue";
            pauseBtn.className = "px-4 py-3 bg-amber-500 text-white font-semibold rounded-xl transition-all";
        } else {
            pauseBtn.textContent = "Pause Queue";
            pauseBtn.className = "px-4 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl transition-all";
            startSessionTimer(remainingSeconds);
        }
    }
    db.collection('settings').doc('queueStatus').set({ isPaused: isQueuePaused });
}

// --- ADMIN ACTION CONFIRMATION MODAL ---
let pendingAdminAction = null;

function openActionConfirmModal(action) {
    if (action !== 'next') {
        const name = document.getElementById('activeStudentName').textContent;
        if (!name || name === "Desk Available" || name === "--") {
            return showToast("No active student to update.");
        }
    }

    pendingAdminAction = action;
    const modal = document.getElementById('adminActionConfirmModal');
    const title = document.getElementById('actionModalTitle');
    const text = document.getElementById('actionModalText');
    const btn = document.getElementById('actionModalConfirmBtn');
    const icon = document.getElementById('actionModalIcon');

    if (action === 'verified') {
        title.textContent = "Verify Student?";
        text.textContent = "Are you sure all documents are correct? This will mark the student as Verified.";
        btn.className = "flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all";
        icon.className = "w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4";
        icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
    } else if (action === 'pending') {
        title.textContent = "Mark as Pending?";
        text.textContent = "Are you sure? This will record the student as having missing documents.";
        btn.className = "flex-1 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all";
        icon.className = "w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4";
        icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else if (action === 'no_show') {
        title.textContent = "Mark as No Show?";
        text.textContent = "This will penalize the student and deduct an attempt. Proceed?";
        btn.className = "flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all";
        icon.className = "w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4";
        icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    } else if (action === 'next') {
        title.textContent = "Call Next Case?";
        text.textContent = "This will finalize the current session and call the next student in queue.";
        btn.className = "flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all";
        icon.className = "w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4";
        icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>`;
    }

    modal.classList.remove('hidden');
}

function closeActionConfirmModal() {
    document.getElementById('adminActionConfirmModal').classList.add('hidden');
    pendingAdminAction = null;
}

function executeConfirmedAction() {
    if (pendingAdminAction === 'next') {
        nextToken();
    } else if (pendingAdminAction) {
        updateActiveStatus(pendingAdminAction);
    }
    closeActionConfirmModal();
}

function openRemarkConfirmModal() {
    const name = document.getElementById('activeStudentName').textContent;
    if (!name || name === "Desk Available" || name === "--") {
        return showToast("No active student to add a remark for.");
    }

    const remarkText = document.getElementById('adminRemarksInput').value.trim();
    if (!remarkText) {
        return showToast("Please type a remark before saving.");
    }

    document.getElementById('remarkConfirmModal').classList.remove('hidden');
}

function closeRemarkConfirmModal() {
    document.getElementById('remarkConfirmModal').classList.add('hidden');
}

async function confirmAndSaveRemark() {
    try {
        if (!window.currentActiveTokenData || !window.currentActiveTokenData.id) {
            return showToast("No active session found.");
        }
        const remarkText = document.getElementById('adminRemarksInput').value.trim();

        await db.collection('appointments').doc(window.currentActiveTokenData.id).update({
            remarks: remarkText
        });

        showToast("Remark successfully saved and sent to student!");
        closeRemarkConfirmModal();
    } catch (e) {
        console.error(e);
        showToast("Failed to save remark.");
    }
}

// ==================== MASTER ROSTER MANAGEMENT (ADMIN) ====================

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

            if (rows.length < 2) return showToast("Excel file appears empty or invalid.");

            let batch = db.batch();
            let count = 0;
            let skipped = 0;

            let seenPRNs = new Set();
            let hasDuplicates = false;

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i];
                const rawPrn = cols[0] ? String(cols[0]).toUpperCase().trim() : null;

                if (!rawPrn || rawPrn === 'UNDEFINED' || rawPrn.includes('---')) {
                    skipped++;
                    continue;
                }

                if (rawPrn.includes('E+') || seenPRNs.has(rawPrn)) {
                    hasDuplicates = true;
                    break;
                }
                seenPRNs.add(rawPrn);

                const docRef = db.collection('master_students').doc(rawPrn);

                batch.set(docRef, {
                    prn: rawPrn,
                    firstName: cols[1] ? String(cols[1]).trim() : "Unknown",
                    lastName: cols[2] ? String(cols[2]).trim() : "",
                    name: `${cols[1] || ''} ${cols[2] || ''}`.trim() || "Unknown Student",
                    department: cols[3] ? String(cols[3]).toUpperCase().trim() : "N/A",
                    joiningYear: cols[4] ? String(cols[4]).trim() : "N/A",
                    currentYear: cols[5] ? String(cols[5]).trim() : "1",
                    scholarshipType: cols[6] ? String(cols[6]).trim() : "Not Specified",
                    isRegistered: false
                }, { merge: true });

                count++;

                if (count > 0 && count % 490 === 0) {
                    await batch.commit();
                    batch = db.batch();
                }
            }

            if (hasDuplicates) {
                document.getElementById('fileInput').value = "";
                return showToast("ERROR: Excel corrupted your PRNs! Format Column A as 'Text' in Excel before pasting.");
            }

            await batch.commit();
            showToast(`Uploaded ${count} students successfully!`);
            document.getElementById('fileInput').value = "";
            loadStudentDirectory();

        } catch (error) {
            console.error("Excel Parsing Error: ", error);
            showToast("Error reading file. Check the console for details.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function openAddStudentModal() {
    document.getElementById('addStudentForm').reset();
    document.getElementById('addStudentModal').classList.remove('hidden');
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('hidden');
}

async function submitSingleStudent(e) {
    e.preventDefault();
    const prn = document.getElementById('addPRN').value.toUpperCase().trim();
    const firstName = document.getElementById('addFirstName').value;
    const lastName = document.getElementById('addLastName').value;

    const studentData = {
        prn: prn,
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        department: document.getElementById('addDept').value,
        joiningYear: document.getElementById('addJoinYear').value,
        currentYear: document.getElementById('addCurrYear').value,
        scholarshipType: document.getElementById('addSchType').value,
        isRegistered: false
    };

    try {
        await db.collection('master_students').doc(prn).set(studentData, { merge: true });
        showToast(`Student ${prn} added to Master Roster.`);
        closeAddStudentModal();
        loadStudentDirectory();
    } catch (err) { showToast("Error adding student."); }
}

async function enableAdminEditMode() {
    if (!activeModalStudentUid) return showToast("Error: No student selected.");

    try {
        const doc = await db.collection('master_students').doc(activeModalStudentUid).get();
        if (!doc.exists) return showToast("Student not found in roster.");
        const data = doc.data();

        document.getElementById('editFirstName').value = data.firstName || '';
        document.getElementById('editLastName').value = data.lastName || '';
        document.getElementById('editDept').value = data.department || '';
        document.getElementById('editJoinYear').value = data.joiningYear || '';
        document.getElementById('editCurrYear').value = data.currentYear || '';
        document.getElementById('editSchType').value = data.scholarshipType || '';

        document.getElementById('editStudentModal').classList.remove('hidden');
    } catch (error) {
        showToast("Error fetching student details.");
    }
}
window.enableAdminEditMode = enableAdminEditMode;

function closeEditStudentModal() {
    document.getElementById('editStudentModal').classList.add('hidden');
}

async function submitEditStudent(e) {
    e.preventDefault();
    if (!activeModalStudentUid) return;

    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const department = document.getElementById('editDept').value;
    const joiningYear = document.getElementById('editJoinYear').value;
    const currentYear = document.getElementById('editCurrYear').value;
    const scholarshipType = document.getElementById('editSchType').value;

    const updatedData = {
        firstName, lastName, name: `${firstName} ${lastName}`,
        department, joiningYear, currentYear, scholarshipType
    };

    try {
        await db.collection('master_students').doc(activeModalStudentUid).update(updatedData);
        const snap = await db.collection('users').where('prn', '==', activeModalStudentUid).get();
        if (!snap.empty) {
            await db.collection('users').doc(snap.docs[0].id).update(updatedData);
        }

        showToast("Student details updated successfully!");
        closeEditStudentModal();

        document.getElementById('modalName').textContent = updatedData.name;
        document.getElementById('modalDept').textContent = updatedData.department;
        document.getElementById('modalJoinYr').textContent = updatedData.joiningYear;
        document.getElementById('modalCurrYr').textContent = yearLabels[updatedData.currentYear] || updatedData.currentYear;
        document.getElementById('modalSchType').textContent = updatedData.scholarshipType;
        document.getElementById('modalInitials').textContent = updatedData.firstName.charAt(0).toUpperCase();

        loadStudentDirectory();
    } catch (err) { showToast("Error updating student."); }
}

// ==================== PIPELINE & ANALYTICS ENGINE ====================
async function loadStudentDirectory() {
    try {
        console.log("Fetching complete pipeline database...");

        const masterSnap = await db.collection('master_students').get();
        window.rawMasterData = [];
        masterSnap.forEach(doc => window.rawMasterData.push(doc.data()));
        window.allStudentsData = window.rawMasterData;

        const usersSnap = await db.collection('users').get();
        window.rawUsersData = [];
        usersSnap.forEach(doc => window.rawUsersData.push(doc.data()));

        const appsSnap = await db.collection('appointments').get();
        window.rawAppsData = [];
        appsSnap.forEach(doc => window.rawAppsData.push(doc.data()));

        if (typeof filterDirectory === 'function') filterDirectory();
        if (typeof processUnifiedAnalytics === 'function') processUnifiedAnalytics();

    } catch (e) {
        console.error("Database Load Error:", e);
        const tbody = document.getElementById('directoryTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-red-500 font-bold">Error loading database. Check console.</td></tr>`;
    }
}

function filterDirectory() {
    const query = (document.getElementById('dirSearchInput').value || "").toLowerCase();
    const tbody = document.getElementById('directoryTableBody');
    if (!tbody) return;

    let newHtml = '';

    const filtered = window.allStudentsData.filter(s => {
        const safeName = s.name || "";
        const safePRN = s.prn || "";
        const safeDept = s.department || "";
        const str = `${safeName} ${safePRN} ${safeDept}`.toLowerCase();
        return str.includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-slate-500 italic">No students found matching your search.</td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const statusBadge = s.isRegistered
            ? `<span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wider">Registered</span>`
            : `<span class="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider">Unregistered</span>`;

        const safeName = s.name || "Unknown Student";
        const initial = safeName !== "Unknown Student" ? safeName.charAt(0).toUpperCase() : "?";

        newHtml += `
            <tr class="hover:bg-slate-50 transition-colors cursor-pointer group" onclick="window.openStudentProfile('${s.prn}')">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-black shadow-sm group-hover:bg-violet-500 group-hover:text-white transition-colors">
                            ${initial}
                        </div>
                        <div>
                            <p class="font-bold text-slate-800">${safeName}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="font-bold text-slate-700">${s.prn || '--'}</p>
                    <div class="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center gap-2">
                        <span>${s.department || '--'}</span> • <span>${yearLabels[s.currentYear] || s.currentYear || '--'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    ${statusBadge}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = newHtml;
}

window.openStudentProfile = function (prn) {
    const student = window.allStudentsData.find(s => s.prn === prn);
    if (student) {
        openStudentDetailsModal(student);
    } else {
        showToast("Error locating student data.");
    }
};

async function openStudentDetailsModal(student) {
    try {
        console.log("Successfully passed data to modal function.");
        activeModalStudentUid = student.prn;

        const safeName = student.name || "Unknown Student";

        const setEl = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setEl('modalInitials', safeName !== "Unknown Student" ? safeName.charAt(0).toUpperCase() : "?");
        setEl('modalName', safeName);
        setEl('modalEmail', student.contactNo ? `Ph: ${student.contactNo}` : "");
        setEl('modalGR', student.prn || "--");
        setEl('modalPhone', student.contactNo || "--");
        setEl('modalDept', student.department || "--");
        setEl('modalJoinYr', student.joiningYear || "--");
        setEl('modalCurrYr', yearLabels[student.currentYear] || student.currentYear || "--");
        setEl('modalSchType', student.scholarshipType || "--");
        setEl('modalMahaDBT', student.mahadbtId || "Not Provided");

        const tbody = document.getElementById('modalHistoryBody');
        const statusEl = document.getElementById('modalCurrentStatus');
        const pendingDocsEl = document.getElementById('modalPendingDocs');
        const attemptsInfo = document.getElementById('modalAttemptsInfo');

        const msgBlock = document.getElementById('adminDirectMessageBlock');
        const fineBlock = document.getElementById('adminFineBlock');
        const remarkInput = document.getElementById('dirAdminRemarkInput');

        if (pendingDocsEl) {
            pendingDocsEl.classList.add('hidden');
            pendingDocsEl.innerHTML = '';
        }

        if (!student.isRegistered || !student.uid) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-slate-400 italic">Student has not created an account yet.</td></tr>`;
            if (statusEl) statusEl.innerHTML = `<span class="text-slate-500 font-bold">Unregistered</span>`;
            if (attemptsInfo) attemptsInfo.innerHTML = `<span class="text-slate-400 text-lg">N/A</span>`;

            if (msgBlock) msgBlock.classList.add('hidden');
            if (fineBlock) fineBlock.classList.add('hidden');

            document.getElementById('studentDetailsModal').classList.remove('hidden');
            return;
        }

        if (msgBlock) msgBlock.classList.remove('hidden');
        if (fineBlock) fineBlock.classList.remove('hidden');
        if (remarkInput) remarkInput.value = student.adminRemark || "";

        window.listenToStudentMessages(student.prn);

        const snap = await db.collection('appointments').where('uid', '==', student.uid).get();
        let apps = [];
        snap.forEach(doc => apps.push(doc.data()));

        apps.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return parseTime(b.time) - parseTime(a.time);
        });

        if (tbody) {
            tbody.innerHTML = '';
            if (apps.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-slate-400 italic">No bookings found for this student.</td></tr>`;
            } else {
                apps.forEach(app => {
                    let badgeStyle = "bg-slate-100 text-slate-600";
                    let sLabel = app.status || 'waiting';
                    const baseS = sLabel.replace('_closed', '');

                    if (baseS === 'verified') badgeStyle = "bg-emerald-100 text-emerald-700";
                    else if (baseS === 'pending') badgeStyle = "bg-amber-100 text-amber-700";
                    else if (baseS === 'no_show') badgeStyle = "bg-red-100 text-red-700";
                    else if (baseS === 'cancelled') badgeStyle = "bg-slate-100 text-slate-500 line-through";
                    else if (baseS === 'current') badgeStyle = "bg-blue-100 text-blue-700";

                    tbody.innerHTML += `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-3 font-medium text-slate-700">${app.date} <span class="text-xs text-slate-400 ml-1">${app.time}</span></td>
                            <td class="px-4 py-3 font-mono text-slate-600 text-xs">${app.token}</td>
                            <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${badgeStyle}">${baseS}</span></td>
                        </tr>
                    `;
                });
            }
        }

        const usedAttempts = apps.length;
        const extraAttempts = student.extraAttempts || 0;
        const limit = 3 + extraAttempts;
        const left = Math.max(0, limit - usedAttempts);

        if (attemptsInfo) {
            attemptsInfo.innerHTML = `
                <span class="${left === 0 ? 'text-red-500' : 'text-emerald-600'}">${left} Left</span> 
                <span class="text-sm text-slate-500 font-medium">/ ${limit} Allowed</span>
                <span class="block text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">(${usedAttempts} Used, ${extraAttempts} Extra Granted)</span>
            `;
        }

        const latestApp = apps[0];
        if (!latestApp) {
            if (statusEl) statusEl.innerHTML = `<span class="text-slate-500">Not Booked Yet</span>`;
        } else {
            const baseStatus = latestApp.status.replace('_closed', '');
            if (baseStatus === 'verified') {
                if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Verified</span>`;
            } else if (baseStatus === 'pending') {
                if (statusEl) statusEl.innerHTML = `<span class="text-amber-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Pending Documents</span>`;

                const req = scholarshipDocs[student.scholarshipType] || [];
                const ver = latestApp.documentVerification || {};
                const missing = req.filter(d => !ver[d]);

                if (missing.length > 0 && pendingDocsEl) {
                    pendingDocsEl.classList.remove('hidden');
                    pendingDocsEl.innerHTML = `<span class="font-bold uppercase tracking-wider text-[10px] block mb-1">Missing Documents:</span> • ${missing.join('<br> • ')}`;
                }
            } else if (baseStatus === 'no_show') {
                if (statusEl) statusEl.innerHTML = `<span class="text-red-600">No Show</span>`;
            } else if (baseStatus === 'cancelled') {
                if (statusEl) statusEl.innerHTML = `<span class="text-slate-500">Cancelled by Student</span>`;
            } else {
                if (statusEl) statusEl.innerHTML = `<span class="text-blue-600">Slot Booked / Waiting</span>`;
            }
        }

        document.getElementById('studentDetailsModal').classList.remove('hidden');

    } catch (e) {
        console.error("Modal Crash: ", e);
        showToast("Error opening profile. Please check console.");
    }
}

function closeStudentDetailsModal() {
    document.getElementById('studentDetailsModal').classList.add('hidden');
    activeModalStudentUid = null;
}

function processUnifiedAnalytics() {
    try {
        const appsByPRN = {};

        window.rawAppsData.sort((a, b) => {
            if (a.date !== b.date) return (b.date || "").localeCompare(a.date || "");
            return parseTime(b.time) - parseTime(a.time);
        });

        window.rawAppsData.forEach(app => {
            if (!appsByPRN[app.prn] && app.status !== 'cancelled') appsByPRN[app.prn] = app;
        });

        const usersByPRN = {};
        window.rawUsersData.forEach(u => { if (u.prn) usersByPRN[u.prn] = u; });

        window.unifiedCollegeData = window.rawMasterData.map(student => {
            const latestApp = appsByPRN[student.prn];
            const userProfile = usersByPRN[student.prn] || {};
            let trueStatus = "unregistered";
            let lastActive = "--";

            if (student.isRegistered) {
                trueStatus = "not_booked";
                if (latestApp) {
                    trueStatus = latestApp.status.replace('_closed', '');
                    lastActive = `${latestApp.date} ${latestApp.time}`;
                }
            }

            return {
                ...student,
                contactNo: userProfile.contactNo || student.contactNo || "",
                mahadbtId: userProfile.mahadbtId || student.mahadbtId || "",
                trueStatus: trueStatus,
                latestApp: latestApp || null,
                lastActive: lastActive
            };
        });

        if (typeof renderLiveDashboard === 'function') renderLiveDashboard();
        if (typeof applyFilters === 'function') applyFilters();

    } catch (e) { console.error("Analytics Error:", e); }
}

function renderLiveDashboard() {
    let totals = { roster: 0, unreg: 0, notBooked: 0, booked: 0, verified: 0, pending: 0, noShow: 0 };
    let deptStats = {};

    window.unifiedCollegeData.forEach(s => {
        totals.roster++;
        if (!deptStats[s.department]) {
            deptStats[s.department] = { total: 0, unreg: 0, notBooked: 0, booked: 0, verified: 0, pending: 0, noShow: 0 };
        }
        deptStats[s.department].total++;

        if (s.trueStatus === 'unregistered') { totals.unreg++; deptStats[s.department].unreg++; }
        else if (s.trueStatus === 'not_booked') { totals.notBooked++; deptStats[s.department].notBooked++; }
        else if (s.trueStatus === 'waiting' || s.trueStatus === 'current') { totals.booked++; deptStats[s.department].booked++; }
        else if (s.trueStatus === 'verified') { totals.verified++; deptStats[s.department].verified++; }
        else if (s.trueStatus === 'pending') { totals.pending++; deptStats[s.department].pending++; }
        else if (s.trueStatus === 'no_show') { totals.noShow++; deptStats[s.department].noShow++; }
    });

    if (document.getElementById('dashTotal')) {
        document.getElementById('dashTotal').textContent = totals.roster;
        document.getElementById('dashVerified').textContent = totals.verified;
        document.getElementById('dashBooked').textContent = totals.booked;
        document.getElementById('dashNotBooked').textContent = totals.notBooked;
        document.getElementById('dashPending').textContent = totals.pending;
        document.getElementById('dashNoShow').textContent = totals.noShow;
        document.getElementById('dashUnregistered').textContent = totals.unreg;
    }

    const grid = document.getElementById('departmentStatsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(deptStats).sort().forEach(dept => {
        const d = deptStats[dept];
        const progress = Math.round((d.verified / d.total) * 100) || 0;

        grid.innerHTML += `
            <div class="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col h-full hover:shadow-lg transition-shadow">
                <div class="flex justify-between items-center mb-6">
                    <h4 class="font-black text-slate-800 text-2xl">${dept}</h4>
                    <span class="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">${d.total} Total</span>
                </div>
                
                <div class="w-full bg-slate-100 h-3 rounded-full mb-6 overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" style="width: ${progress}%"></div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mt-auto">
                    <div class="flex flex-col p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Verified</span>
                        <span class="text-2xl font-black text-emerald-700">${d.verified}</span>
                    </div>
                    <div class="flex flex-col p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Slot Booked</span>
                        <span class="text-2xl font-black text-blue-700">${d.booked}</span>
                    </div>
                    <div class="flex flex-col p-3 rounded-xl bg-violet-50 border border-violet-100">
                        <span class="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Needs Booking</span>
                        <span class="text-2xl font-black text-violet-700">${d.notBooked}</span>
                    </div>
                    <div class="flex flex-col p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <span class="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Docs Pending</span>
                        <span class="text-2xl font-black text-amber-700">${d.pending}</span>
                    </div>
                    <div class="flex flex-col p-3 rounded-xl bg-red-50 border border-red-100">
                        <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">No Show</span>
                        <span class="text-2xl font-black text-red-700">${d.noShow}</span>
                    </div>
                    <div class="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Not Signed Up</span>
                        <span class="text-2xl font-black text-slate-700">${d.unreg}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function switchReportTab(tab) {
    const dashBtn = document.getElementById('tabDashboardBtn');
    const expBtn = document.getElementById('tabExportBtn');
    const dashSec = document.getElementById('statsDashboardSection');
    const expSec = document.getElementById('statsExportSection');

    if (tab === 'dashboard') {
        dashBtn.className = "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all bg-violet-500 text-white shadow-md";
        expBtn.className = "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all text-slate-400 hover:text-white";
        dashSec.classList.remove('hidden');
        expSec.classList.add('hidden');
    } else {
        expBtn.className = "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all bg-violet-500 text-white shadow-md";
        dashBtn.className = "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all text-slate-400 hover:text-white";
        expSec.classList.remove('hidden');
        dashSec.classList.add('hidden');
        applyFilters();
    }
}

function applyFilters() {
    const fDept = document.getElementById('filterDept').value;
    const fYear = document.getElementById('filterYear').value;
    const fStatus = document.getElementById('filterStatus').value;

    let filtered = window.unifiedCollegeData.filter(s => {
        if (fDept !== 'ALL' && s.department !== fDept) return false;
        if (fYear !== 'ALL' && String(s.currentYear) !== String(fYear)) return false;
        if (fStatus !== 'ALL' && s.trueStatus !== fStatus) return false;
        return true;
    });

    const tbody = document.getElementById('statsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500 italic">No records found matching filters.</td></tr>`;
        window.currentFilteredData = [];
        return;
    }

    filtered.forEach(s => {
        let badgeStyle = "bg-slate-100 text-slate-600";
        let label = s.trueStatus;
        let statusDetails = "";

        if (s.trueStatus === 'verified') {
            badgeStyle = "bg-emerald-100 text-emerald-700"; label = "Verified";
            statusDetails = `<span class="text-emerald-600 font-medium">Verified on ${s.latestApp ? s.latestApp.date : ''}</span>`;
        }
        else if (s.trueStatus === 'pending') {
            badgeStyle = "bg-amber-100 text-amber-700"; label = "Docs Pending";
            const req = scholarshipDocs[s.scholarshipType] || [];
            const ver = s.latestApp && s.latestApp.documentVerification ? s.latestApp.documentVerification : {};
            const missing = req.filter(d => !ver[d]);

            if (missing.length > 0) {
                statusDetails = `<span class="text-amber-600 font-medium">Missing: ${missing.join(', ')}</span>`;
            } else {
                statusDetails = `<span class="text-amber-600 font-medium">Please check profile</span>`;
            }
        }
        else if (s.trueStatus === 'no_show') {
            badgeStyle = "bg-red-100 text-red-700"; label = "Missed Appt";
            statusDetails = `<span class="text-red-500 font-medium">Missed slot on ${s.latestApp ? s.latestApp.date : ''}</span>`;
        }
        else if (s.trueStatus === 'waiting' || s.trueStatus === 'current') {
            badgeStyle = "bg-blue-100 text-blue-700"; label = "Slot Booked";
            statusDetails = `<span class="text-blue-600 font-medium">Scheduled: ${s.latestApp ? s.latestApp.date + ' at ' + s.latestApp.time : ''}</span>`;
        }
        else if (s.trueStatus === 'unregistered') {
            badgeStyle = "bg-slate-200 text-slate-500"; label = "Not Signed Up";
            statusDetails = `<span class="text-slate-400 italic">Needs to create an account</span>`;
        }
        else if (s.trueStatus === 'not_booked') {
            badgeStyle = "bg-violet-100 text-violet-700"; label = "Signed Up";
            statusDetails = `<span class="text-violet-500 font-medium">Needs to book a slot</span>`;
        }

        const dbtHtml = s.mahadbtId ? `<p class="text-[10px] uppercase font-bold text-slate-400 mt-0.5">MahaDBT: <span class="text-emerald-600">${s.mahadbtId}</span></p>` : ``;
        const phoneHtml = s.contactNo ? s.contactNo : `--`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <p class="font-bold text-slate-800">${s.name}</p>
                    ${dbtHtml}
                </td>
                <td class="px-4 py-3 font-mono text-slate-600 font-bold">${s.prn}</td>
                <td class="px-4 py-3 text-xs">
                    <span class="font-bold text-slate-700">${s.department}</span><br>
                    <span class="text-slate-500">${yearLabels[s.currentYear] || s.currentYear}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-500 font-medium">
                    ${phoneHtml}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${badgeStyle}">${label}</span>
                </td>
                <td class="px-4 py-3 text-xs font-medium text-slate-500">${statusDetails}</td>
            </tr>
        `;
    });

    window.currentFilteredData = filtered;
}

function downloadCSV() {
    const data = window.currentFilteredData || [];
    if (data.length === 0) return showToast("No data to export!");

    let csvContent = "Student Name,PRN,Department,Joining Year,Current Year,Scholarship Category,MahaDBT App ID,Contact Number,Verification Status,Remarks / Missing Documents\n";

    data.forEach(s => {
        const name = `"${(s.name || "").replace(/"/g, '""')}"`;
        const prn = s.prn || "";
        const dept = s.department || "";
        const joinYr = s.joiningYear || "";
        const currYr = yearLabels[s.currentYear] ? `"${yearLabels[s.currentYear]}"` : (s.currentYear || "");
        const cat = s.scholarshipType || "";
        const dbt = s.mahadbtId || "Not Provided";
        const phone = s.contactNo ? `="${s.contactNo}"` : "Not Provided";

        let statLabel = "Unknown";
        let details = "";

        if (s.trueStatus === 'verified') {
            statLabel = "Verified";
            details = `Successfully verified on ${s.latestApp ? s.latestApp.date : ''}`;
        }
        else if (s.trueStatus === 'pending') {
            statLabel = "Pending";
            const req = scholarshipDocs[s.scholarshipType] || [];
            const ver = s.latestApp && s.latestApp.documentVerification ? s.latestApp.documentVerification : {};
            const missing = req.filter(d => !ver[d]);
            details = missing.length > 0 ? `Missing Documents: ${missing.join(', ')}` : "Pending document review";
        }
        else if (s.trueStatus === 'no_show') {
            statLabel = "No Show";
            details = `Missed scheduled appointment on ${s.latestApp ? s.latestApp.date : ''}`;
        }
        else if (s.trueStatus === 'waiting' || s.trueStatus === 'current') {
            statLabel = "Slot Booked";
            details = `Appointment scheduled for ${s.latestApp ? s.latestApp.date + ' at ' + s.latestApp.time : ''}`;
        }
        else if (s.trueStatus === 'not_booked') {
            statLabel = "Registered (No Slot)";
            details = "Student has created an portal account but hasn't booked a verification slot";
        }
        else if (s.trueStatus === 'unregistered') {
            statLabel = "Not Registered";
            details = "Student has not signed up on the portal yet";
        }

        csvContent += `${name},${prn},${dept},${joinYr},${currYr},${cat},${dbt},${phone},${statLabel},"${details}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ScholarSwift_Verification_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Official Report CSV Downloaded!");
}

function restrictDateToDepartmentDay() {
    const dateSelect = document.getElementById('slotDate');
    const dayDisplay = document.getElementById('bookingDayDisplay');

    if (!dateSelect || !currentUser) return;

    const deptInfo = deptToDay[currentUser.department];
    if (!deptInfo) {
        if (dayDisplay) dayDisplay.textContent = "Dept Day Not Assigned";
        return;
    }

    if (dayDisplay) dayDisplay.textContent = `${deptInfo.name}s Only`;
    dateSelect.innerHTML = `<option value="">Select an upcoming ${deptInfo.name}</option>`;

    const today = new Date();
    const currentHour = today.getHours();
    let found = 0;
    let checkDate = new Date(today);
    let safetyCounter = 0;

    while (found < 3 && safetyCounter < 50) {
        safetyCounter++;
        if (checkDate.getDay() === deptInfo.day) {
            const isToday = checkDate.toDateString() === today.toDateString();
            if (!isToday || currentHour < 23) {
                const dateString = checkDate.toISOString().split('T')[0];
                const readableDate = checkDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                const option = document.createElement('option');
                option.value = dateString;
                option.textContent = isToday ? `${readableDate} (Today)` : readableDate;
                dateSelect.appendChild(option);
                found++;
            }
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    if (found === 0) dateSelect.innerHTML = `<option value="">No dates available</option>`;

    dateSelect.onchange = async function () {
        if (!dateSelect.value) return;
        const selectedDate = new Date(dateSelect.value);
        const openingTime = new Date(selectedDate);
        openingTime.setDate(selectedDate.getDate() - 1);
        openingTime.setHours(9, 0, 0, 0);

        if (new Date() < openingTime) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            showToast(`Booking opens ${days[openingTime.getDay()]} at 9:00 AM.`);
            dateSelect.value = "";
            document.getElementById('slotTime').innerHTML = '';
            return;
        }

        await generateAvailableTimeSlots(dateSelect.value);
    };
}

async function generateAvailableTimeSlots(selectedDate) {
    const select = document.getElementById('slotTime');
    if (!select) return;
    select.innerHTML = '<option value="">Checking availability...</option>';

    try {
        const snapshot = await db.collection('appointments').where('date', '==', selectedDate).get();
        const bookedTimes = [];

        snapshot.forEach(doc => {
            if (doc.data().status !== 'cancelled') {
                bookedTimes.push(doc.data().time);
            }
        });

        select.innerHTML = '<option value="">Select a 7-min slot</option>';
        let time = new Date();
        time.setHours(9, 30, 0, 0);
        const bookingEnd = 23;
        let safetyCounter = 0;

        const now = new Date();
        const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);

        while (time.getHours() < bookingEnd && safetyCounter < 200) {
            safetyCounter++;
            if (time.getHours() === 13) { time.setHours(14, 0, 0, 0); continue; }
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            let endTime = new Date(time);
            endTime.setMinutes(endTime.getMinutes() + 7);
            if (endTime.getHours() >= bookingEnd && endTime.getMinutes() > 0) break;

            const slotDateTime = new Date(selYear, selMonth - 1, selDay, time.getHours(), time.getMinutes(), 0, 0);

            const isBooked = bookedTimes.includes(timeStr);
            const isPast = slotDateTime < now;

            const option = document.createElement('option');
            option.value = timeStr;

            if (isBooked) {
                option.textContent = `${timeStr} (BOOKED)`;
                option.disabled = true;
                option.className = "text-slate-300 bg-slate-50 italic";
            } else if (isPast) {
                option.textContent = `${timeStr} (PASSED)`;
                option.disabled = true;
                option.className = "text-slate-300 bg-slate-50 italic opacity-60";
            } else {
                option.textContent = timeStr;
            }
            select.appendChild(option);
            time.setMinutes(time.getMinutes() + 7);
        }
    } catch (error) { showToast("Error checking availability."); }
}

async function toggleMahadbtWindow() {
    try {
        await db.collection('settings').doc('lifecycle').set({
            mahadbtWindowOpen: !window.isMahadbtWindowOpen
        }, { merge: true });
        showToast(window.isMahadbtWindowOpen ? "Window Closed - Students Locked" : "Window Opened - Students can Update");
    } catch (e) { showToast("Error updating window state"); }
}

async function promptUpdateAcademicYear() {
    const newYear = prompt("Enter new Academic Year (e.g., 2026-2027):", window.systemAcademicYear);
    if (newYear && newYear.trim() !== "") {
        try {
            await db.collection('settings').doc('lifecycle').set({
                academicYear: newYear.trim()
            }, { merge: true });
            showToast("Academic Year Updated to " + newYear);
        } catch (e) { showToast("Error updating year"); }
    }
}
window.toggleMahadbtWindow = toggleMahadbtWindow;
window.promptUpdateAcademicYear = promptUpdateAcademicYear;

window.grantExtraAttempts = async function () {
    if (!activeModalStudentUid) return showToast("Error: No student selected.");

    try {
        const masterRef = db.collection('master_students').doc(activeModalStudentUid);
        const doc = await masterRef.get();
        if (!doc.exists) return showToast("Student not found in database.");

        const data = doc.data();

        if (data.uid) {
            await db.collection('users').doc(data.uid).update({
                extraAttempts: firebase.firestore.FieldValue.increment(3)
            });
        }

        await masterRef.update({
            extraAttempts: firebase.firestore.FieldValue.increment(3)
        });

        showToast("Success! Account Unlocked & Attempts Granted.");
        closeStudentDetailsModal();
        loadStudentDirectory();
    } catch (e) {
        console.error("Fine Unlock Error: ", e);
        showToast("Error updating student record. Check console.");
    }
};

window.saveDirectoryMessage = async function () {
    if (!activeModalStudentUid) return showToast("Error: No student selected.");

    const inputEl = document.getElementById('dirAdminRemarkInput');
    if (!inputEl) return showToast("Error finding input box.");

    const msg = inputEl.value.trim();
    if (!msg) return showToast("Please type a message first.");

    let btn = null;
    let origText = "Save & Send Message";
    try {
        btn = document.querySelector('button[onclick*="saveDirectoryMessage"]');
        if (btn) { origText = btn.innerHTML; btn.innerHTML = "Saving..."; btn.disabled = true; }
    } catch (e) { }

    try {
        const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

        await db.collection('student_messages').add({
            prn: activeModalStudentUid,
            message: msg,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            timestampString: timestampStr,
            isRevoked: false
        });

        await db.collection('master_students').doc(activeModalStudentUid).update({
            adminRemark: msg,
            adminRemarkTimestamp: timestampStr
        });

        const doc = await db.collection('master_students').doc(activeModalStudentUid).get();
        const data = doc.data();
        if (data.uid) {
            await db.collection('users').doc(data.uid).update({
                adminRemark: msg,
                adminRemarkTimestamp: timestampStr
            });
        }

        inputEl.value = "";
        showToast("Message Pinned & Logged!");
    } catch (e) {
        console.error("Direct Message Error: ", e);
        showToast("Error saving message.");
    } finally {
        if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    }
};


window.recallStudentMessage = async function (msgId, prn) {
    if (!confirm("Recall this direct message?\n\nIt will fade from the log and disappear from the student's dashboard.")) return;

    try {
        // Soft Delete
        await db.collection('student_messages').doc(msgId).update({ isRevoked: true });

        // Fetch remaining active messages without triggering Firebase Index Errors
        const snap = await db.collection('student_messages')
            .where('prn', '==', prn)
            .where('isRevoked', '==', false)
            .get();

        // Sort them newest-to-oldest directly in the browser!
        let msgs = [];
        snap.forEach(doc => msgs.push(doc.data()));
        msgs.sort((a, b) => {
            const tA = a.createdAt ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt ? b.createdAt.toMillis() : 0;
            return tB - tA;
        });

        let newActiveRemark = "";
        let newActiveTimestamp = "";
        if (msgs.length > 0) {
            newActiveRemark = msgs[0].message;
            newActiveTimestamp = msgs[0].timestampString || "";
        }

        await db.collection('master_students').doc(prn).update({
            adminRemark: newActiveRemark,
            adminRemarkTimestamp: newActiveTimestamp
        });
        const doc = await db.collection('master_students').doc(prn).get();
        const data = doc.data();
        if (data.uid) {
            await db.collection('users').doc(data.uid).update({
                adminRemark: newActiveRemark,
                adminRemarkTimestamp: newActiveTimestamp
            });
        }

        showToast("Message Recalled Successfully!");
    } catch (e) {
        console.error("Error recalling:", e);
        showToast("Error recalling message.");
    }
};

window.listenToStudentMessages = function (prn) {
    if (window.currentMsgListener) window.currentMsgListener();

    // Removed .orderBy() to bypass the strict Firebase Index requirement!
    window.currentMsgListener = db.collection('student_messages')
        .where('prn', '==', prn)
        .onSnapshot(snap => {
            const tbody = document.getElementById('studentMessageLogBody');
            if (!tbody) return;

            if (snap.empty) {
                tbody.innerHTML = `<tr><td class="p-3 text-center text-slate-400 italic">No messages yet.</td></tr>`;
                return;
            }

            // Pull all messages into an array
            let msgs = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));

            // Sort them newest-to-oldest right here in the Javascript
            msgs.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
                const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
                return timeB - timeA;
            });

            let html = '';
            msgs.forEach(data => {
                const isRevoked = data.isRevoked;

                const textClass = isRevoked ? "text-slate-400" : "text-violet-900 font-medium";
                const rowClass = isRevoked ? "bg-slate-50 opacity-60" : "bg-white hover:bg-violet-50 transition-colors";

                const btnHtml = isRevoked
                    ? `<span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-100">Recalled</span>`
                    : `<button onclick="window.recallStudentMessage('${data.id}', '${prn}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 p-1.5 rounded transition-colors" title="Recall Message">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>`;

                html += `
                    <tr class="${rowClass} border-b border-violet-50 last:border-0">
                        <td class="p-3 w-1/4 text-[10px] font-bold text-slate-500 whitespace-nowrap align-top border-r border-violet-50">${data.timestampString || 'Just now'}</td>
                        <td class="p-3 w-2/4 ${textClass} break-words align-top text-sm">${data.message}</td>
                        <td class="p-3 w-1/4 text-right align-top border-l border-violet-50">${btnHtml}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }, err => {
            console.error("Log fetch error:", err);
        });
};


// ==========================================
// BROADCAST ANNOUNCEMENT ENGINE
// ==========================================
async function submitAnnouncement(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSendBroadcast');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Publishing...";
    btn.disabled = true;

    try {
        const payload = {
            message: document.getElementById('announceMsg').value.trim(),
            targetDept: document.getElementById('announceDept').value,
            targetYear: document.getElementById('announceYear').value,
            targetStatus: document.getElementById('announceStatus').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            timestampString: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
            isRevoked: false
        };
        await db.collection('announcements').add(payload);
        showToast("Announcement Broadcasted Successfully!");
        document.getElementById('announcementForm').reset();
    } catch (err) {
        showToast("Error broadcasting announcement.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
window.submitAnnouncement = submitAnnouncement;

let pendingRecallId = null;

function deleteAnnouncement(id) {
    pendingRecallId = id;
    const modal = document.getElementById('recallConfirmModal');
    if (modal) modal.classList.remove('hidden');
}
window.deleteAnnouncement = deleteAnnouncement;

function closeRecallModal() {
    const modal = document.getElementById('recallConfirmModal');
    if (modal) modal.classList.add('hidden');
    pendingRecallId = null;
}
window.closeRecallModal = closeRecallModal;

async function confirmRecallAnnouncement() {
    if (!pendingRecallId) return;

    try {
        await db.collection('announcements').doc(pendingRecallId).update({
            isRevoked: true
        });
        showToast("Announcement recalled from student dashboards.");
        closeRecallModal();
    } catch (e) {
        showToast("Error recalling announcement.");
    }
}
window.confirmRecallAnnouncement = confirmRecallAnnouncement;

function initAdminAnnouncementListener() {
    if (window.adminAnnounceListener) return;
    window.adminAnnounceListener = db.collection('announcements').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const tbody = document.getElementById('adminAnnouncementsLog');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-slate-400 italic">No past announcements.</td></tr>`;
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const isRevoked = data.isRevoked === true;

            const tagClass = "inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mr-1 mb-1 shadow-sm border";
            let filtersHTML = "";
            filtersHTML += `<span class="${tagClass} ${data.targetDept === 'ALL' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-100 text-blue-700 border-blue-200'}">DEPT: ${data.targetDept}</span>`;
            filtersHTML += `<span class="${tagClass} ${data.targetYear === 'ALL' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}">YR: ${data.targetYear}</span>`;
            filtersHTML += `<span class="${tagClass} ${data.targetStatus === 'ALL' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-100 text-amber-700 border-amber-200'}">STATUS: ${data.targetStatus}</span>`;

            const rowClass = isRevoked ? "bg-slate-50 opacity-60" : "bg-white hover:bg-slate-50 transition-colors";
            const textClass = isRevoked ? "text-slate-500" : "text-slate-800";

            let actionBtn = isRevoked
                ? `<span class="px-2 py-1 bg-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded">Recalled</span>`
                : `<button onclick="window.deleteAnnouncement('${doc.id}')" class="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors" title="Recall Broadcast">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>`;

            tbody.innerHTML += `
                <tr class="${rowClass}">
                    <td class="px-6 py-4 font-bold text-slate-500 text-xs whitespace-nowrap">${data.timestampString || 'Just now'}</td>
                    <td class="px-6 py-4 ${textClass} font-medium">${data.message}</td>
                    <td class="px-6 py-4">${filtersHTML}</td>
                    <td class="px-6 py-4">${actionBtn}</td>
                </tr>
            `;
        });
    });
}

// ==========================================
// UNIFIED CUSTOM MODAL ENGINE (Overrides Ugly Browser Popups)
// ==========================================

// Create fresh global variables to avoid conflicts with older code
window.sharedRecallId = null;
window.sharedRecallType = null;
window.sharedRecallPrn = null;

// 1. Override the Direct Message Delete click
window.recallStudentMessage = function (msgId, prn) {
    window.sharedRecallId = msgId;
    window.sharedRecallPrn = prn;
    window.sharedRecallType = 'message'; // Tag it as a direct message
    const modal = document.getElementById('recallConfirmModal');
    if (modal) modal.classList.remove('hidden');
};

// 2. Override the Global Announcement Delete click
window.deleteAnnouncement = function (id) {
    window.sharedRecallId = id;
    window.sharedRecallType = 'announcement'; // Tag it as a global broadcast
    const modal = document.getElementById('recallConfirmModal');
    if (modal) modal.classList.remove('hidden');
};

// 3. Override the "Cancel" button inside the modal
window.closeRecallModal = function () {
    const modal = document.getElementById('recallConfirmModal');
    if (modal) modal.classList.add('hidden');
    window.sharedRecallId = null;
    window.sharedRecallType = null;
    window.sharedRecallPrn = null;
};

// 4. Override the "Recall It" confirm button inside the modal to handle BOTH types dynamically!
window.confirmRecallAnnouncement = async function () {
    if (!window.sharedRecallId) return;

    // Grab the button to show the loading animation
    const btn = document.querySelector('#recallConfirmModal button.bg-red-500');
    const origText = btn ? btn.textContent : "Recall It";
    if (btn) btn.textContent = "Recalling...";

    try {
        if (window.sharedRecallType === 'announcement') {
            // Handle Global Announcement Recall
            await db.collection('announcements').doc(window.sharedRecallId).update({ isRevoked: true });
            showToast("Announcement recalled from student dashboards.");
        }
        else if (window.sharedRecallType === 'message') {
            // Handle Direct Student Message Recall
            await db.collection('student_messages').doc(window.sharedRecallId).update({ isRevoked: true });

            // Fetch the remaining active messages to rollback the student's dashboard
            const snap = await db.collection('student_messages')
                .where('prn', '==', window.sharedRecallPrn)
                .where('isRevoked', '==', false)
                .get();

            let msgs = [];
            snap.forEach(doc => msgs.push(doc.data()));
            msgs.sort((a, b) => {
                const tA = a.createdAt ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt ? b.createdAt.toMillis() : 0;
                return tB - tA;
            });

            let newActiveRemark = "";
            let newActiveTimestamp = "";
            if (msgs.length > 0) {
                newActiveRemark = msgs[0].message;
                newActiveTimestamp = msgs[0].timestampString || "";
            }

            // Sync the rollback to the database
            await db.collection('master_students').doc(window.sharedRecallPrn).update({
                adminRemark: newActiveRemark,
                adminRemarkTimestamp: newActiveTimestamp
            });
            const doc = await db.collection('master_students').doc(window.sharedRecallPrn).get();
            if (doc.exists && doc.data().uid) {
                await db.collection('users').doc(doc.data().uid).update({
                    adminRemark: newActiveRemark,
                    adminRemarkTimestamp: newActiveTimestamp
                });
            }
            showToast("Message Recalled Successfully!");
        }

        window.closeRecallModal(); // Hide the modal when done

    } catch (e) {
        console.error("Error recalling:", e);
        showToast("Error recalling item.");
    } finally {
        if (btn) btn.textContent = origText; // Reset the button text
    }
};
// Make sure the academic year update function is properly exposed
window.promptUpdateAcademicYear = async function() {
    const newYear = prompt("Enter new Academic Year (e.g., 2026-2027):", window.systemAcademicYear);
    if (newYear && newYear.trim() !== "") {
        try {
            await db.collection('settings').doc('lifecycle').set({
                academicYear: newYear.trim()
            }, { merge: true });
            showToast("Academic Year Updated to " + newYear);
            // Refresh the display
            const yearDisplay = document.getElementById('adminSystemYearDisplay');
            if (yearDisplay) yearDisplay.textContent = newYear.trim();
        } catch (e) { 
            console.error("Error updating year:", e);
            showToast("Error updating year"); 
        }
    }
};

// ==================== WINDOW EXPORTS ====================
window.setUserType = setUserType;
window.setAuthMode = setAuthMode;
window.handleAuth = handleAuth;
window.showAdminDashboard = showAdminDashboard;
window.logout = () => location.reload();
window.bookSlot = bookSlot;
window.nextToken = nextToken;
window.togglePause = togglePause;
window.addExtraTime = addExtraTime;
window.resetQueueDelay = resetQueueDelay;
window.updateDocumentStatus = updateDocumentStatus;
window.handleFileUpload = handleFileUpload;
window.openAddStudentModal = openAddStudentModal;
window.closeAddStudentModal = closeAddStudentModal;
window.submitSingleStudent = submitSingleStudent;
window.enableAdminEditMode = enableAdminEditMode;

window.toggleEditProfile = () => {
    const modal = document.getElementById('updateProfileModal');
    const inputArea = document.getElementById('editMahadbtInputArea');
    const lockedArea = document.getElementById('editMahadbtLockedArea');
    const saveBtn = document.getElementById('saveProfileBtn');
    const input = document.getElementById('editMahadbtId');

    if (window.isMahadbtWindowOpen) {
        inputArea.classList.remove('hidden');
        lockedArea.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        input.value = currentUser.mahadbtId || "";
    } else {
        inputArea.classList.add('hidden');
        lockedArea.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        const displayYear = currentUser.mahadbtYear || window.systemAcademicYear || "2025-2026";
        document.getElementById('lockedYearDisplay').textContent = displayYear;
    }
    modal.classList.remove('hidden');
};

window.saveProfileUpdate = async () => {
    const id = document.getElementById('editMahadbtId').value.trim();
    if (!id) return showToast("Please enter a valid Application ID");

    await db.collection('users').doc(currentUser.uid).update({
        mahadbtId: id, mahadbtYear: window.systemAcademicYear
    });
    await db.collection('master_students').doc(currentUser.prn).update({
        mahadbtId: id, mahadbtYear: window.systemAcademicYear
    });

    currentUser.mahadbtId = id;
    currentUser.mahadbtYear = window.systemAcademicYear;

    document.getElementById('updateProfileModal').classList.add('hidden');
    showStudentDashboard();
    showToast(`MahaDBT ID Updated for ${window.systemAcademicYear}`);
};

window.toggleLiveQueue = () => document.getElementById('liveQueueSection').classList.toggle('hidden');
window.closeUpdateModal = () => document.getElementById('updateProfileModal').classList.add('hidden');
window.updateActiveStatus = updateActiveStatus;
window.manualStartTimer = manualStartTimer;
window.applyFilters = applyFilters;
window.downloadCSV = downloadCSV;
window.toggleAdminView = toggleAdminView;
window.filterDirectory = filterDirectory;
window.openStudentDetailsModal = openStudentDetailsModal;
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.grantExtraAttempts = grantExtraAttempts;
window.requestNotificationPermission = requestNotificationPermission;
window.toggleNotifications = toggleNotifications;
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.confirmCancelBooking = confirmCancelBooking;
window.closeEditStudentModal = closeEditStudentModal;
window.submitEditStudent = submitEditStudent;
window.openActionConfirmModal = openActionConfirmModal;
window.closeActionConfirmModal = closeActionConfirmModal;
window.executeConfirmedAction = executeConfirmedAction;
window.openRemarkConfirmModal = openRemarkConfirmModal;
window.closeRemarkConfirmModal = closeRemarkConfirmModal;
window.confirmAndSaveRemark = confirmAndSaveRemark;

document.addEventListener('DOMContentLoaded', initApp);