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

let allAppointmentsData = [];
let allStudentsData = [];
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
    'IT': { day: 4, name: 'Thursday' }, // Fixed: Moved from Friday to Thursday
    'MECH': { day: 6, name: 'Saturday' }, // Fixed: Moved from Saturday to Friday
    'CIVIL': { day: 6, name: 'Saturday' }, // Fixed: Moved from Saturday to Friday
    'AUTOMOBILE': { day: 6, name: 'Saturday' } // Fixed: Moved from Saturday to Friday
};

// ==================== HELPER FUNCTIONS ====================
function showToast(m) {
    const t = document.getElementById('toast');
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

// Proper numerical time sorting function
function parseTime(timeStr) {
    if (!timeStr || timeStr === "--:--") return 0;
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length < 2) return 0;
    let [hours, minutes] = parts[0].split(':').map(Number);
    let modifier = parts[1].toUpperCase();
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// Centralized Master Delay Calculation Engine for BOTH views
function getMasterDelay() {
    const now = new Date();
    let masterDelay = globalDelayMinutes;

    if (window.globalQueueHead && window.globalQueueHead.time) {
        const headMins = parseTime(window.globalQueueHead.time);
        if (headMins > 0) {
            const headDate = new Date();
            headDate.setHours(Math.floor(headMins / 60), (headMins % 60) + globalDelayMinutes, 0, 0);

            // Use exact elapsed minutes for 1:1 synchronization
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
        const now = new Date();

        const clockEl = document.getElementById('liveClock');
        if (clockEl) {
            const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
            clockEl.textContent = now.toLocaleString('en-US', options).replace(/,/g, ' |');
        }

        // ONE unified delay for everyone in the system
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

    // Listen to System Lifecycle Settings
    db.collection('settings').doc('lifecycle').onSnapshot(doc => {
        let data = {};
        if (doc.exists) {
            data = doc.data();
        } else {
            // Auto-initialize the database document if it doesn't exist yet
            data = { academicYear: "2025-2026", mahadbtWindowOpen: false };
            db.collection('settings').doc('lifecycle').set(data);
        }

        window.systemAcademicYear = data.academicYear || "2025-2026";
        window.isMahadbtWindowOpen = data.mahadbtWindowOpen || false;

        // Update Admin UI
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

        // Refresh Student Edit Modal if it's currently open
        const updateModal = document.getElementById('updateProfileModal');
        if (updateModal && !updateModal.classList.contains('hidden') && typeof window.toggleEditProfile === 'function') {
            window.toggleEditProfile();
        }
    });

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

    if (type === 'student') {
        studentToggle.classList.add('bg-emerald-500', 'text-white');
        studentToggle.classList.remove('text-slate-400');
        authTabs.classList.remove('hidden');
        authTitle.textContent = "Student Login";
        adminToggle.classList.remove('bg-violet-500', 'text-white');
        adminToggle.classList.add('text-slate-400', 'hover:text-white');
        if (signupTab) signupTab.classList.remove('hidden');
    } else {
        adminToggle.classList.add('bg-violet-500', 'text-white');
        adminToggle.classList.remove('text-slate-400');
        authTabs.classList.add('hidden');
        authTitle.textContent = "Admin Login";
        studentToggle.classList.remove('bg-emerald-500', 'text-white');
        studentToggle.classList.add('text-slate-400', 'hover:text-white');
        if (signupTab) signupTab.classList.add('hidden');
        setAuthMode('login');
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

    const prnInput = document.getElementById('prnInput');
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

                // --- SIGN-UP STEP 1: VERIFY DATA ---
                if (window.currentSignupStep === 1 || !window.currentSignupStep) {
                    if (!prn) throw new Error("16-digit PRN is required to verify!");

                    const masterDoc = await db.collection('master_students').doc(prn).get();
                    if (!masterDoc.exists) {
                        throw new Error("PRN not found in official roster. Contact Admin.");
                    }

                    const masterData = masterDoc.data();
                    if (masterData.isRegistered) {
                        throw new Error("An account with this PRN already exists. Please Sign In.");
                    }

                    // Success! Show Step 2
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
                // --- SIGN-UP STEP 2: CREATE ACCOUNT ---
                else if (window.currentSignupStep === 2) {
                    if (!mahadbtId || !password) throw new Error("Password and MahaDBT ID are required to complete sign up!");

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
    listenToStudentBroadcasts();

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

    // Helper function to update the remark banner dynamically
    function refreshRemarkBanner() {
        const remarksBlock = document.getElementById('studentRemarksBlock');
        const remarkTextEl = document.getElementById('studentRemarkText');

        let displayRemark = '';
        let displayDate = '';

        // 1. Check for the latest Active Direct Message
        if (currentUser.directMessages && currentUser.directMessages.length > 0) {
            const activeMsgs = currentUser.directMessages.filter(m => m.status === 'active');
            if (activeMsgs.length > 0) {
                const latestMsg = activeMsgs[activeMsgs.length - 1];
                displayRemark = latestMsg.text;

                // Format the timestamp cleanly
                const d = new Date(latestMsg.timestamp);
                displayDate = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        }

        // 2. Fallback to Verification Appointment Remarks if no direct message exists
        const relevantApp = window.currentStudentActiveApp || (window.allStudentApps && window.allStudentApps[0]);
        if (!displayRemark && relevantApp && relevantApp.remarks && relevantApp.remarks.trim() !== '') {
            displayRemark = relevantApp.remarks;

            // Format the appointment processing time
            let dObj = relevantApp.processedAt ? new Date(relevantApp.processedAt) : new Date();
            displayDate = dObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // 3. Render to the UI with the injected Timestamp
        if (displayRemark && displayRemark.trim() !== '') {
            if (remarksBlock) remarksBlock.classList.remove('hidden');
            if (remarkTextEl) {
                remarkTextEl.innerHTML = `
                    "${displayRemark}"
                    <span class="block text-[11px] font-bold text-violet-400 mt-2 tracking-wide uppercase">Received: ${displayDate}</span>
                `;
            }
        } else {
            if (remarksBlock) remarksBlock.classList.add('hidden');
        }
    }
    // NEW: Real-time listener for the User Profile (Catches live Admin Remarks & Extra Attempts instantly)
    if (!window.userProfileListener) {
        window.userProfileListener = db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                currentUser = { ...currentUser, ...doc.data() };
                refreshRemarkBanner(); // Instantly update the message

                // Instantly update attempts if Admin grants them
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

            window.allStudentApps = allApps; // Save globally so the profile listener can use it

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

            // Call the helper to update the remarks banner!
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
                if (cancelBlock) {
                    if (activeApp.status === 'current') {
                        cancelBlock.classList.add('hidden');
                    } else {
                        cancelBlock.classList.remove('hidden');
                    }
                }

                db.collection('appointments').where('date', '==', activeApp.date).where('status', '==', 'waiting').get().then(waitSnap => {
                    let waitingList = [];
                    waitSnap.forEach(doc => waitingList.push(doc.data()));
                    waitingList.sort((a, b) => parseTime(a.time) - parseTime(b.time));
                    const position = waitingList.findIndex(s => s.token === activeApp.token);
                    const aheadEl = document.getElementById('peopleAhead');
                    if (aheadEl && activeApp.status === 'waiting') {
                        aheadEl.textContent = position === -1 ? "0" : position;
                    } else if (aheadEl) {
                        aheadEl.textContent = "0";
                    }
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

// ==================== ADMIN DASHBOARD ====================
function showAdminDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    document.getElementById('todaysDept').textContent = `${currentUser.role} | ${currentUser.department}`;

    toggleAdminView('live');

    // Calculate and display today's department schedule compactly
    const todayDayNum = new Date().getDay();
    let todaysDepts = [];
    for (const [dept, info] of Object.entries(deptToDay)) {
        if (info.day === todayDayNum) todaysDepts.push(dept);
    }

    const deptBannerText = document.getElementById('adminTodayDeptText');
    if (deptBannerText) {
        if (todaysDepts.length > 0) {
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
            let waitingCount = 0; // Track the queue

            snap.forEach(doc => {
                const data = doc.data();
                list.push({ id: doc.id, ...data });
                if (data.status === 'waiting') waitingCount++; // Tally up waiting students
            });
            list.sort((a, b) => parseTime(a.time) - parseTime(b.time));

            window.currentAdminQueueList = list;
            window.renderAdminQueueTable();
            refreshActiveStudentDisplay();

            // Instantly update the new UI counter!
            const queueCounter = document.getElementById('adminPeopleInQueue');
            if (queueCounter) queueCounter.textContent = waitingCount;
        });

    if (window.adminTableUpdateInterval) clearInterval(window.adminTableUpdateInterval);
    window.adminTableUpdateInterval = setInterval(() => {
        if (!isQueuePaused && window.renderAdminQueueTable) {
            window.renderAdminQueueTable();
        }
    }, 1000);

    if (window.adminAutoCallInterval) {
        clearInterval(window.adminAutoCallInterval);
        window.adminAutoCallInterval = null;
    }
}

function toggleAdminView(view) {
    const liveView = document.getElementById('adminLiveQueueView');
    const statsView = document.getElementById('adminStatsView');
    const dirView = document.getElementById('adminDirectoryView');
    const annView = document.getElementById('adminAnnouncementsView'); // FIX: Added this reference

    // Hide everything first
    if (liveView) liveView.classList.add('hidden');
    if (statsView) statsView.classList.add('hidden');
    if (dirView) dirView.classList.add('hidden');
    if (annView) annView.classList.add('hidden');

    // Show the requested view
    if (view === 'stats') {
        if (statsView) statsView.classList.remove('hidden');
        startLiveAnalytics();
    } else if (view === 'directory') {
        if (dirView) dirView.classList.remove('hidden');
        loadStudentDirectory();
    } else if (view === 'announcements') {
        if (annView) annView.classList.remove('hidden');
        loadAdminAnnouncements(); // FIX: Trigger the announcement log to load!
    } else {
        if (liveView) liveView.classList.remove('hidden');
    }
}

async function refreshActiveStudentDisplay() {
    const snap = await db.collection('appointments').where('status', 'in', ['current', 'verified', 'pending', 'no_show']).limit(1).get();

    const dossier = document.getElementById('activeDossier');
    const container = dossier.parentElement;

    // UI Elements to toggle based on Empty vs Active state
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
        // --- DESK IS OCCUPIED ---
        const docRef = snap.docs[0];
        const data = docRef.data();
        const status = data.status;

        // Unhide all the active UI blocks
        if (timerContainer) timerContainer.classList.remove('hidden');
        if (studentMetaCards) studentMetaCards.classList.remove('hidden');
        if (adminChecklistBlock) adminChecklistBlock.classList.remove('hidden');
        if (actionButtonsBlock) actionButtonsBlock.classList.remove('hidden');
        if (remarksBlock) remarksBlock.classList.remove('hidden');
        if (emptyQueueGraphic) emptyQueueGraphic.classList.add('hidden'); // Hide the empty graphic

        if (remarksInput) {
            remarksInput.value = data.remarks || '';
        }

        document.getElementById('activeStudentName').textContent = data.name;
        document.getElementById('activeStudentGR').textContent = data.prn || "--";
        document.getElementById('activeMahaDBT').textContent = data.mahadbtId || "--";
        document.getElementById('activeSchType').textContent = data.scholarshipType;
        document.getElementById('adminCurrentToken').textContent = `TOKEN: ${data.token}`;

        if (slotIndicator) {
            slotIndicator.textContent = `Slot: ${data.time}`;
        }

        if (['verified', 'pending', 'no_show'].includes(status)) {
            // STUDENT IS FINISHED
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

            if (actionButtonsBlock) actionButtonsBlock.classList.add('hidden'); // Hide action buttons
            if (startTimerBtn) startTimerBtn.classList.add('hidden');
            if (sessionCountdown) clearInterval(sessionCountdown);

            // Lock remarks
            if (remarksInput) {
                remarksInput.readOnly = true;
                remarksInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
                remarksInput.classList.remove('bg-white');
                if (!data.remarks) remarksInput.value = "No remark provided.";
            }
            if (saveRemarkBtn) saveRemarkBtn.classList.add('hidden');

        } else {
            // STUDENT IS CURRENTLY ACTIVE
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
        // We only render the checklist if the block is actually visible
        if (typeof renderDocumentChecklist === 'function') {
            renderDocumentChecklist(studentData, appointmentData);
        }

    } else {
        // --- QUEUE IS EMPTY ---
        isTimerRunning = false;

        // INSTANTLY HIDE ALL UNNECESSARY CLUTTER
        if (timerContainer) timerContainer.classList.add('hidden');
        if (studentMetaCards) studentMetaCards.classList.add('hidden');
        if (adminChecklistBlock) adminChecklistBlock.classList.add('hidden');
        if (actionButtonsBlock) actionButtonsBlock.classList.add('hidden');
        if (remarksBlock) remarksBlock.classList.add('hidden');

        // Show the beautiful "Empty" graphic
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

        // NEW: Capture Admin Remarks before updating the database
        const remarksInput = document.getElementById('adminRemarksInput');
        const remarkText = remarksInput ? remarksInput.value.trim() : "";

        await db.collection('appointments').doc(docRef.id).update({
            status: newStatus,
            processedAt: new Date().toISOString(),
            remarks: remarkText // Save the remark to the student's appointment record
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
    if (isQueuePaused) {
        if (sessionCountdown) clearInterval(sessionCountdown);
        pauseBtn.textContent = "Resume Queue";
        pauseBtn.className = "px-4 py-3 bg-amber-500 text-white font-semibold rounded-xl transition-all";
    } else {
        pauseBtn.textContent = "Pause Queue";
        pauseBtn.className = "px-4 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl transition-all";
        startSessionTimer(remainingSeconds);
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

// --- DEDICATED ADMIN REMARKS MODAL LOGIC ---
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

function handleFileUpload(event) {
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

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i];
                if (!cols || cols.length < 7) continue;

                const grNumber = String(cols[0]).toUpperCase().trim();
                if (!grNumber || grNumber === 'UNDEFINED') continue;

                const docRef = db.collection('master_students').doc(grNumber);

                batch.set(docRef, {
                    grNumber: grNumber,
                    firstName: String(cols[1]).trim(),
                    lastName: String(cols[2]).trim(),
                    name: `${String(cols[1]).trim()} ${String(cols[2]).trim()}`,
                    department: String(cols[3]).toUpperCase().trim(),
                    joiningYear: String(cols[4]).trim(),
                    currentYear: String(cols[5]).trim(),
                    scholarshipType: String(cols[6]).trim(),
                    email: cols[7] ? String(cols[7]).toLowerCase().trim() : "",
                    isRegistered: false
                }, { merge: true });

                count++;

                if (count % 490 === 0) {
                    await batch.commit();
                    batch = db.batch();
                }
            }

            await batch.commit();
            showToast(`Successfully uploaded ${count} students to Master Roster!`);
            document.getElementById('fileInput').value = "";
            loadStudentDirectory();

        } catch (error) {
            console.error("Excel Parsing Error: ", error);
            showToast("Error reading file. Ensure it is a valid Excel spreadsheet.");
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
    } catch (err) {
        showToast("Error adding student.");
    }
}

async function enableAdminEditMode() {
    if (!activeModalStudentUid) return;

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
        document.getElementById('editEmail').value = data.email || '';

        document.getElementById('editStudentModal').classList.remove('hidden');
    } catch (error) {
        showToast("Error fetching student details.");
    }
}

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
    const email = document.getElementById('editEmail').value.toLowerCase().trim();

    const updatedData = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        department,
        joiningYear,
        currentYear,
        scholarshipType,
        email
    };

    try {
        await db.collection('master_students').doc(activeModalStudentUid).update(updatedData);

        const snap = await db.collection('users').where('grNumber', '==', activeModalStudentUid).get();
        if (!snap.empty) {
            await db.collection('users').doc(snap.docs[0].id).update(updatedData);
        }

        showToast("Student details updated successfully!");
        closeEditStudentModal();

        document.getElementById('modalName').textContent = updatedData.name;
        document.getElementById('modalEmail').textContent = updatedData.email;
        document.getElementById('modalDept').textContent = updatedData.department;
        document.getElementById('modalJoinYr').textContent = updatedData.joiningYear;
        document.getElementById('modalCurrYr').textContent = yearLabels[updatedData.currentYear] || updatedData.currentYear;
        document.getElementById('modalSchType').textContent = updatedData.scholarshipType;
        document.getElementById('modalInitials').textContent = updatedData.firstName.charAt(0).toUpperCase();

        loadStudentDirectory();
    } catch (err) {
        showToast("Error updating student.");
    }
}

async function loadStudentDirectory() {
    try {
        // 1. Fetch BOTH the Master Roster AND the Live User Profiles
        const [masterSnap, usersSnap] = await Promise.all([
            db.collection('master_students').get(),
            db.collection('users').where('role', '==', 'student').get()
        ]);

        // 2. Map the live users by their PRN so we can grab their phone numbers
        const liveUsersMap = {};
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.grNumber) liveUsersMap[data.grNumber] = data;
            if (data.prn) liveUsersMap[data.prn] = data;
        });

        allStudentsData = [];

        // 3. Merge the data together
        masterSnap.forEach(doc => {
            const mData = doc.data();
            const studentId = mData.grNumber || doc.id;
            const uData = liveUsersMap[studentId] || {};

            allStudentsData.push({
                ...mData,
                // If they signed up, grab their phone & MahaDBT ID, otherwise leave blank
                contactNo: uData.contactNo || mData.contactNo || "",
                mahadbtId: uData.mahadbtId || mData.mahadbtId || "",
                prn: uData.prn || studentId,
                uid: uData.uid || mData.uid
            });
        });

        filterDirectory();
    } catch (e) {
        console.error(e);
        showToast("Error loading directory.");
    }
}

function filterDirectory() {
    const query = (document.getElementById('dirSearchInput').value || "").toLowerCase();
    const tbody = document.getElementById('directoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = ''; // Clear the loading text

    const filtered = allStudentsData.filter(s => {
        // Bulletproof safety checks encompassing ALL merged data fields
        const safeName = s.name || "";
        const safePRN = s.prn || s.grNumber || "";
        const safeDept = s.department || "";
        const safePhone = s.contactNo || "";
        const safeMahaDBT = s.mahadbtId || "";

        // Combine all searchable strings (Email removed)
        const str = `${safeName} ${safePRN} ${safeDept} ${safePhone} ${safeMahaDBT}`.toLowerCase();
        return str.includes(query);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-slate-500 italic">No students found matching your search.</td></tr>`;
        return;
    }

    filtered.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors cursor-pointer group";
        tr.onclick = () => openStudentDetailsModal(s);

        const statusBadge = s.isRegistered
            ? `<span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wider">Registered</span>`
            : `<span class="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider">Unregistered</span>`;

        const safeName = s.name || "Unknown Student";
        const initial = safeName !== "Unknown Student" ? safeName.charAt(0).toUpperCase() : "?";

        // Safely pull merged data
        const displayPRN = s.prn || s.grNumber || "No PRN";
        const displayMahaDBT = s.mahadbtId ? `MahaDBT: ${s.mahadbtId}` : "MahaDBT: Not Provided";

        // FIX: Display Phone neatly, completely omitting email
        const displayPhone = s.contactNo ? `<p class="text-[10px] text-slate-400 font-mono mt-0.5">📞 ${s.contactNo}</p>` : ``;

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-black shadow-sm group-hover:bg-violet-500 group-hover:text-white transition-colors shrink-0">
                        ${initial}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800">${safeName}</p>
                        <p class="text-[11px] font-bold text-violet-600 font-mono mt-0.5">${displayPRN}</p>
                        ${displayPhone}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="font-bold text-emerald-600">${displayMahaDBT}</p>
                <div class="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <span>${s.department || '--'}</span> • <span>${yearLabels[s.currentYear] || s.currentYear || '--'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                ${statusBadge}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function openStudentDetailsModal(student) {
    activeModalStudentUid = student.prn || student.grNumber || student.id;

    // Safety check for corrupt missing names
    const safeName = student.name || "Unknown Student";
    document.getElementById('modalInitials').textContent = safeName !== "Unknown Student" ? safeName.charAt(0).toUpperCase() : "?";
    document.getElementById('modalName').textContent = safeName;

    // FIX: Completely hide the email element from the UI
    const emailEl = document.getElementById('modalEmail');
    if (emailEl) emailEl.classList.add('hidden');

    document.getElementById('modalGR').textContent = activeModalStudentUid || "--";
    document.getElementById('modalPhone').textContent = student.contactNo || "--";
    document.getElementById('modalDept').textContent = student.department;
    document.getElementById('modalJoinYr').textContent = student.joiningYear;
    document.getElementById('modalCurrYr').textContent = yearLabels[student.currentYear] || student.currentYear;
    document.getElementById('modalSchType').textContent = student.scholarshipType;
    document.getElementById('modalMahaDBT').textContent = student.mahadbtId || "Not Provided";

    const tbody = document.getElementById('modalHistoryBody');
    const statusEl = document.getElementById('modalCurrentStatus');
    const pendingDocsEl = document.getElementById('modalPendingDocs');
    const attemptsInfo = document.getElementById('modalAttemptsInfo');

    const msgBlock = document.getElementById('adminDirectMessageBlock');
    const fineBlock = document.getElementById('adminFineBlock');

    pendingDocsEl.classList.add('hidden');
    pendingDocsEl.innerHTML = '';

    if (!student.isRegistered || !student.uid) {
        // --- UNREGISTERED STUDENT STATE ---
        tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-slate-400 italic">Student has not created an account yet.</td></tr>`;
        statusEl.innerHTML = `<span class="text-slate-500 font-bold">Unregistered</span>`;
        attemptsInfo.innerHTML = `<span class="text-slate-400 text-lg">N/A</span>`;

        if (msgBlock) msgBlock.classList.add('hidden');
        if (fineBlock) fineBlock.classList.add('hidden');

        document.getElementById('studentDetailsModal').classList.remove('hidden');
        return;
    }

    // --- REGISTERED STUDENT STATE ---
    if (msgBlock) msgBlock.classList.remove('hidden');
    if (fineBlock) fineBlock.classList.remove('hidden');

    try {
        const snap = await db.collection('appointments').where('uid', '==', student.uid).get();
        let apps = [];
        snap.forEach(doc => apps.push({ id: doc.id, ...doc.data() })); // Ensure ID is passed

        apps.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return parseTime(b.time) - parseTime(a.time);
        });

        // 1. Populate Booking History Table
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

        // 2. NEW: Populate Communication Log Table
        const logBody = document.getElementById('messageLogBody');
        if (logBody) {
            let logEntries = [];

            // Grab Direct Messages from user profile
            if (student.directMessages && Array.isArray(student.directMessages)) {
                student.directMessages.forEach(m => {
                    logEntries.push({ ...m, type: 'direct', dateObj: new Date(m.timestamp) });
                });
            }

            // Grab Verification Remarks from appointments
            apps.forEach(app => {
                if (app.remarks && app.remarks.trim() !== '') {
                    // Fallback date if processedAt isn't available
                    let dObj = app.processedAt ? new Date(app.processedAt) : new Date(`${app.date}T12:00:00`);
                    logEntries.push({
                        id: app.id,
                        text: app.remarks,
                        type: 'remark',
                        status: 'archived', // Remarks are permanent, cannot be recalled
                        dateObj: dObj,
                        displayDate: `${app.date} ${app.time}`
                    });
                }
            });

            // Sort Logs Newest First
            logEntries.sort((a, b) => b.dateObj - a.dateObj);

            logBody.innerHTML = '';
            if (logEntries.length === 0) {
                logBody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 italic">No communication history found.</td></tr>`;
            } else {
                logEntries.forEach(log => {
                    const isRecalled = log.status === 'recalled';
                    const isRemark = log.type === 'remark';
                    const timeString = log.displayDate || log.dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    let typeBadge = isRemark
                        ? `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Verification Remark</span>`
                        : `<span class="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Direct Msg</span>`;

                    let actionHtml = '';
                    if (log.type === 'direct' && log.status === 'active') {
                        actionHtml = `<button onclick="recallMessage('${log.id}')" class="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">Recall</button>`;
                    } else if (isRecalled) {
                        actionHtml = `<span class="text-[10px] text-slate-400 font-bold uppercase italic">Recalled</span>`;
                    } else if (isRemark) {
                        actionHtml = `<span class="text-[10px] text-slate-300 font-bold uppercase">Logged</span>`;
                    }

                    const textClass = isRecalled ? 'text-slate-400 line-through opacity-60' : 'text-slate-700 font-medium';

                    logBody.innerHTML += `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">${timeString}</td>
                            <td class="px-4 py-3">${typeBadge}</td>
                            <td class="px-4 py-3 text-sm ${textClass}">${log.text}</td>
                            <td class="px-4 py-3 text-right">${actionHtml}</td>
                        </tr>
                    `;
                });
            }
        }

        const usedAttempts = apps.length;
        const extraAttempts = student.extraAttempts || 0;
        const limit = 3 + extraAttempts;
        const left = Math.max(0, limit - usedAttempts);

        attemptsInfo.innerHTML = `
            <span class="${left === 0 ? 'text-red-500' : 'text-emerald-600'}">${left} Left</span> 
            <span class="text-sm text-slate-500 font-medium">/ ${limit} Allowed</span>
            <span class="block text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">(${usedAttempts} Used, ${extraAttempts} Extra Granted)</span>
        `;

        const latestApp = apps[0];
        if (!latestApp) {
            statusEl.innerHTML = `<span class="text-slate-500">Not Booked Yet</span>`;
        } else {
            const baseStatus = latestApp.status.replace('_closed', '');
            if (baseStatus === 'verified') {
                statusEl.innerHTML = `<span class="text-emerald-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Verified</span>`;
            } else if (baseStatus === 'pending') {
                statusEl.innerHTML = `<span class="text-amber-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Pending Documents</span>`;

                const req = scholarshipDocs[student.scholarshipType] || [];
                const ver = latestApp.documentVerification || {};
                const missing = req.filter(d => !ver[d]);

                if (missing.length > 0) {
                    pendingDocsEl.classList.remove('hidden');
                    pendingDocsEl.innerHTML = `<span class="font-bold uppercase tracking-wider text-[10px] block mb-1">Missing Documents:</span> • ${missing.join('<br> • ')}`;
                }
            } else if (baseStatus === 'no_show') {
                statusEl.innerHTML = `<span class="text-red-600">No Show</span>`;
            } else if (baseStatus === 'cancelled') {
                statusEl.innerHTML = `<span class="text-slate-500">Cancelled by Student</span>`;
            } else {
                statusEl.innerHTML = `<span class="text-blue-600">Slot Booked / Waiting</span>`;
            }
        }

        document.getElementById('studentDetailsModal').classList.remove('hidden');

    } catch (e) {
        showToast("Error loading student history");
        console.error(e);
    }
}


function closeStudentDetailsModal() {
    document.getElementById('studentDetailsModal').classList.add('hidden');
    activeModalStudentUid = null;
}


async function grantExtraAttempts() {
    if (!activeModalStudentUid) return;

    try {
        const masterRef = db.collection('master_students').doc(activeModalStudentUid);
        const doc = await masterRef.get();
        if (!doc.exists) return;

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
        showToast("Error updating student record.");
    }
}

async function saveDirectoryMessage() {
    if (!activeModalStudentUid) {
        showToast("Error: No student ID found to attach message to.");
        return;
    }

    const msg = document.getElementById('dirAdminRemarkInput').value.trim();
    if (!msg) return showToast("Please enter a message to send.");

    const btn = document.querySelector('button[onclick="saveDirectoryMessage()"]');
    let originalText = "Send";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = "Saving...";
    }

    // Create detailed message object
    const newMessage = {
        id: 'msg_' + Date.now(),
        text: msg,
        timestamp: new Date().toISOString(),
        status: 'active'
    };

    try {
        const docRef = db.collection('master_students').doc(activeModalStudentUid);
        const doc = await docRef.get();

        // Grab existing messages or start a new array
        let currentMessages = doc.exists && doc.data().directMessages ? doc.data().directMessages : [];
        currentMessages.push(newMessage);

        // FIX: Save BOTH the log array AND the adminRemark string for the pinned banner
        await docRef.set({
            directMessages: currentMessages,
            adminRemark: msg
        }, { merge: true });

        // Push to live user profile if they have one
        const data = doc.data() || {};
        if (data.uid) {
            await db.collection('users').doc(data.uid).set({
                directMessages: currentMessages,
                adminRemark: msg
            }, { merge: true });
        }

        showToast("Message Sent & Pinned to Dashboard!");
        document.getElementById('dirAdminRemarkInput').value = '';

        // FIX: Explicitly pass the freshly updated arrays and remarks into the modal refresh!
        openStudentDetailsModal({
            ...data,
            prn: activeModalStudentUid,
            directMessages: currentMessages,
            adminRemark: msg
        });

    } catch (e) {
        console.error(e);
        showToast("Error saving message.");
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
}

// --- RECALL LOGIC ---
let pendingRecallMsgId = null;

// This now just opens the confirmation modal
function recallMessage(msgId) {
    pendingRecallMsgId = msgId;
    document.getElementById('recallConfirmModal').classList.remove('hidden');
}

function closeRecallConfirmModal() {
    pendingRecallMsgId = null;
    document.getElementById('recallConfirmModal').classList.add('hidden');
}

// This executes the actual recall after the admin clicks "Yes, Recall"
async function confirmAndExecuteRecall() {
    if (!activeModalStudentUid || !pendingRecallMsgId) return;

    const btn = document.getElementById('confirmRecallBtn');
    let originalText = "Yes, Recall";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = "Recalling...";
    }

    try {
        const docRef = db.collection('master_students').doc(activeModalStudentUid);
        const doc = await docRef.get();
        if (!doc.exists) return;

        let messages = doc.data().directMessages || [];
        const msgIndex = messages.findIndex(m => m.id === pendingRecallMsgId);

        if (msgIndex > -1) {
            // Change status to recalled
            messages[msgIndex].status = 'recalled';

            // Find the most recent active message to fall back to (if any)
            let updatedRemark = "";
            const activeMsgs = messages.filter(m => m.status === 'active');
            if (activeMsgs.length > 0) {
                updatedRemark = activeMsgs[activeMsgs.length - 1].text;
            }

            // Update Database
            await docRef.set({
                directMessages: messages,
                adminRemark: updatedRemark
            }, { merge: true });

            if (doc.data().uid) {
                await db.collection('users').doc(doc.data().uid).set({
                    directMessages: messages,
                    adminRemark: updatedRemark
                }, { merge: true });
            }

            showToast("Message Recalled Successfully.");
            closeRecallConfirmModal();

            // Explicitly pass the updated data to the modal so it refreshes instantly
            openStudentDetailsModal({
                ...doc.data(),
                prn: activeModalStudentUid,
                directMessages: messages,
                adminRemark: updatedRemark
            });
        }
    } catch (e) {
        console.error(e);
        showToast("Error recalling message.");
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
}

// Add this line to the bottom of main.js with the other exports
window.recallMessage = recallMessage;
window.saveDirectoryMessage = saveDirectoryMessage;

window.saveDirectoryMessage = saveDirectoryMessage;

// ==================== REAL-TIME ANALYTICS ENGINE ====================
// ==================== REAL-TIME ANALYTICS ENGINE ====================
let liveStatsUnsubscribeMaster = null;
let liveStatsUnsubscribeApps = null;
let liveStatsUnsubscribeUsers = null; // NEW
let rawMasterData = [];
let rawAppsData = [];
let rawUsersData = []; // NEW
window.unifiedCollegeData = [];

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
        applyFilters(); // Re-render table
    }
}

function startLiveAnalytics() {
    if (liveStatsUnsubscribeMaster) liveStatsUnsubscribeMaster();
    if (liveStatsUnsubscribeApps) liveStatsUnsubscribeApps();
    if (liveStatsUnsubscribeUsers) liveStatsUnsubscribeUsers();

    // Listen to Master Roster
    liveStatsUnsubscribeMaster = db.collection('master_students').onSnapshot(snap => {
        rawMasterData = [];
        snap.forEach(doc => rawMasterData.push(doc.data()));
        processUnifiedAnalytics();
    });

    // Listen to all Appointments
    liveStatsUnsubscribeApps = db.collection('appointments').onSnapshot(snap => {
        rawAppsData = [];
        snap.forEach(doc => rawAppsData.push({ id: doc.id, ...doc.data() }));
        processUnifiedAnalytics();
    });

    // NEW: Listen to Users to pull their actual Phone & MahaDBT IDs!
    liveStatsUnsubscribeUsers = db.collection('users').where('role', '==', 'student').onSnapshot(snap => {
        rawUsersData = [];
        snap.forEach(doc => rawUsersData.push(doc.data()));
        processUnifiedAnalytics();
    });
}

function processUnifiedAnalytics() {
    const appsByGR = {};
    rawAppsData.sort((a, b) => {
        if (a.date !== b.date) return (b.date || "").localeCompare(a.date || "");
        return parseTime(b.time) - parseTime(a.time);
    });

    rawAppsData.forEach(app => {
        const appId = app.prn || app.grNumber;
        if (appId && !appsByGR[appId] && app.status !== 'cancelled') {
            appsByGR[appId] = app;
        }
    });

    const usersByGR = {};
    rawUsersData.forEach(u => {
        if (u.grNumber) usersByGR[u.grNumber] = u;
        if (u.prn) usersByGR[u.prn] = u;
    });

    window.unifiedCollegeData = rawMasterData.map(student => {
        // Catch the ID whether it came from Excel (grNumber) or Modal (prn)
        const studentId = student.prn || student.grNumber || student.id;
        const latestApp = appsByGR[studentId];
        const userProfile = usersByGR[studentId] || {};

        let trueStatus = "unregistered";
        let lastActive = "--";

        if (student.isRegistered || userProfile.uid) {
            trueStatus = "not_booked";
            if (latestApp) {
                trueStatus = latestApp.status.replace('_closed', '');
                lastActive = `${latestApp.date} ${latestApp.time}`;
            }
        }

        return {
            ...student,
            // Create unified "Safe" variables for the UI
            safePRN: userProfile.prn || userProfile.grNumber || student.prn || student.grNumber || "N/A",
            safeContact: userProfile.contactNo || student.contactNo || "",
            safeMahaDBT: userProfile.mahadbtId || student.mahadbtId || "",
            safeEmail: userProfile.email || student.email || "",
            trueStatus: trueStatus,
            latestApp: latestApp || null,
            lastActive: lastActive
        };
    });

    renderLiveDashboard();
    applyFilters();
}

function renderLiveDashboard() {
    // 6 exact buckets
    let totals = { roster: 0, unreg: 0, notBooked: 0, booked: 0, verified: 0, pending: 0, noShow: 0 };
    let deptStats = {};

    window.unifiedCollegeData.forEach(s => {
        totals.roster++;
        if (!deptStats[s.department]) {
            deptStats[s.department] = { total: 0, unreg: 0, notBooked: 0, booked: 0, verified: 0, pending: 0, noShow: 0 };
        }

        deptStats[s.department].total++;

        // No ambiguity, map directly to trueStatus
        if (s.trueStatus === 'unregistered') { totals.unreg++; deptStats[s.department].unreg++; }
        else if (s.trueStatus === 'not_booked') { totals.notBooked++; deptStats[s.department].notBooked++; }
        else if (s.trueStatus === 'waiting' || s.trueStatus === 'current') { totals.booked++; deptStats[s.department].booked++; }
        else if (s.trueStatus === 'verified') { totals.verified++; deptStats[s.department].verified++; }
        else if (s.trueStatus === 'pending') { totals.pending++; deptStats[s.department].pending++; }
        else if (s.trueStatus === 'no_show') { totals.noShow++; deptStats[s.department].noShow++; }
    });

    // Update Global Cards
    if (document.getElementById('dashTotal')) {
        document.getElementById('dashTotal').textContent = totals.roster;
        document.getElementById('dashVerified').textContent = totals.verified;
        document.getElementById('dashBooked').textContent = totals.booked;
        document.getElementById('dashNotBooked').textContent = totals.notBooked;
        document.getElementById('dashPending').textContent = totals.pending;
        document.getElementById('dashNoShow').textContent = totals.noShow;
        document.getElementById('dashUnregistered').textContent = totals.unreg;
    }

    // Render Department Grid
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

// Controls the visibility of the Custom Date Picker
function toggleCustomDate() {
    const timeSelect = document.getElementById('filterTime');
    if (!timeSelect) return;

    const fTime = timeSelect.value;

    const rangeContainer = document.getElementById('customDateInputs');
    const specificContainer = document.getElementById('specificDateInput');

    const startD = document.getElementById('filterStartDate');
    const endD = document.getElementById('filterEndDate');
    const specificD = document.getElementById('filterSpecificDate');

    if (fTime === 'CUSTOM') {
        // Show Dual Range, Hide Single Date
        if (rangeContainer) rangeContainer.classList.remove('hidden');
        if (specificContainer) specificContainer.classList.add('hidden');
        if (specificD) specificD.value = '';
    } else if (fTime === 'SPECIFIC_DATE') {
        // Show Single Date, Hide Dual Range
        if (specificContainer) specificContainer.classList.remove('hidden');
        if (rangeContainer) rangeContainer.classList.add('hidden');
        if (startD) startD.value = '';
        if (endD) endD.value = '';
    } else {
        // Hide Both for all standard filters (Today, This Week, etc.)
        if (rangeContainer) rangeContainer.classList.add('hidden');
        if (specificContainer) specificContainer.classList.add('hidden');
        if (startD) startD.value = '';
        if (endD) endD.value = '';
        if (specificD) specificD.value = '';
    }
}

function applyFilters() {
    const fDept = document.getElementById('filterDept').value;
    const fYear = document.getElementById('filterYear').value;
    const fStatus = document.getElementById('filterStatus').value;

    const fTime = document.getElementById('filterTime') ? document.getElementById('filterTime').value : 'ALL';

    const now = new Date();
    const tYear = now.getFullYear();
    const tMonth = String(now.getMonth() + 1).padStart(2, '0');
    const tDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let filtered = window.unifiedCollegeData.filter(s => {
        if (fDept !== 'ALL' && s.department !== fDept) return false;
        if (fYear !== 'ALL' && String(s.currentYear) !== String(fYear)) return false;
        if (fStatus !== 'ALL' && s.trueStatus !== fStatus) return false;

        if (fTime !== 'ALL') {
            if (!s.latestApp || !s.latestApp.date) return false;

            const appDateStr = s.latestApp.date;

            if (fTime === 'TODAY') {
                if (appDateStr !== todayStr) return false;
            }
            else if (fTime === 'UPCOMING') {
                if (appDateStr < todayStr) return false;
            }
            else if (fTime === 'THIS_MONTH') {
                if (!appDateStr.startsWith(`${tYear}-${tMonth}`)) return false;
            }
            else if (fTime === 'THIS_WEEK') {
                const appD = new Date(appDateStr);
                if (appD < startOfWeek || appD > endOfWeek) return false;
            }
            else if (fTime === 'SPECIFIC_DATE') {
                const specStr = document.getElementById('filterSpecificDate').value;
                if (!specStr) return false;
                if (appDateStr !== specStr) return false;
            }
            else if (fTime === 'CUSTOM') {
                const startStr = document.getElementById('filterStartDate').value;
                const endStr = document.getElementById('filterEndDate').value;

                if (startStr && !endStr && appDateStr !== startStr) return false;
                if (startStr && endStr) {
                    if (appDateStr < startStr || appDateStr > endStr) return false;
                }
                if (!startStr && !endStr) return false;
            }
        }

        return true;
    });

    // NEW: Instantly update the counter card!
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
        countEl.textContent = filtered.length;
    }

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

        const dbtHtml = s.safeMahaDBT
            ? `<p class="text-[10px] uppercase font-bold text-slate-400 mt-0.5">MahaDBT: <span class="text-emerald-600">${s.safeMahaDBT}</span></p>`
            : ``;

        const phoneHtml = s.safeContact ? `<span class="text-slate-700 font-semibold">${s.safeContact}</span>` : `<span class="text-slate-400 italic">No Contact</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-3">
                    <p class="font-bold text-slate-800">${s.name || "Unknown"}</p>
                    ${dbtHtml}
                </td>
                <td class="px-4 py-3 font-mono text-slate-600 font-bold">${s.safePRN}</td>
                <td class="px-4 py-3 text-xs">
                    <span class="font-bold text-slate-700">${s.department || '--'}</span><br>
                    <span class="text-slate-500">${yearLabels[s.currentYear] || s.currentYear || '--'}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-500">
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

    // FIX: Removed "Email ID" from the CSV Headers
    let csvContent = "Student Name,PRN Number,Department,Joining Year,Current Year,Scholarship Category,MahaDBT App ID,Contact Number,Verification Status,Remarks / Missing Documents\n";

    data.forEach(s => {
        const name = `"${(s.name || "").replace(/"/g, '""')}"`;
        const prn = s.safePRN || "";
        const dept = s.department || "";
        const joinYr = s.joiningYear || "";
        const currYr = yearLabels[s.currentYear] ? `"${yearLabels[s.currentYear]}"` : (s.currentYear || "");
        const cat = s.scholarshipType || "";
        const dbt = s.safeMahaDBT || "Not Provided";

        // Force Excel to format as text to avoid scientific notation
        const phone = s.safeContact ? `="${s.safeContact}"` : "Not Provided";

        let statLabel = "Unknown";
        let details = "";

        if (s.trueStatus === 'verified') { statLabel = "Verified"; details = `Successfully verified on ${s.latestApp ? s.latestApp.date : ''}`; }
        else if (s.trueStatus === 'pending') {
            statLabel = "Pending";
            const req = scholarshipDocs[s.scholarshipType] || [];
            const ver = s.latestApp && s.latestApp.documentVerification ? s.latestApp.documentVerification : {};
            const missing = req.filter(d => !ver[d]);
            details = missing.length > 0 ? `Missing Documents: ${missing.join(', ')}` : "Pending document review";
        }
        else if (s.trueStatus === 'no_show') { statLabel = "No Show"; details = `Missed scheduled appointment on ${s.latestApp ? s.latestApp.date : ''}`; }
        else if (s.trueStatus === 'waiting' || s.trueStatus === 'current') { statLabel = "Slot Booked"; details = `Appointment scheduled for ${s.latestApp ? s.latestApp.date + ' at ' + s.latestApp.time : ''}`; }
        else if (s.trueStatus === 'not_booked') { statLabel = "Registered (No Slot)"; details = "Student has created an portal account but hasn't booked a verification slot"; }
        else if (s.trueStatus === 'unregistered') { statLabel = "Not Registered"; details = "Student has not signed up on the portal yet"; }

        // FIX: Removed the email variable from the final string output
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

async function bookSlot() {
    const d = document.getElementById('slotDate').value;
    const t = document.getElementById('slotTime').value;
    if (!d || !t) return showToast("Pick Date and Time");

    const btn = document.getElementById('bookSlotBtn');
    const originalText = btn.textContent;
    btn.textContent = "Booking...";
    btn.disabled = true;

    try {
        const slotCheckSnap = await db.collection('appointments').where('date', '==', d).get();
        let isSlotTaken = false;
        slotCheckSnap.forEach(doc => {
            const data = doc.data();
            if (data.time === t && data.status !== 'cancelled') {
                isSlotTaken = true;
            }
        });

        if (isSlotTaken) {
            generateAvailableTimeSlots(d);
            btn.textContent = originalText;
            btn.disabled = false;
            return showToast("Oops! Someone just booked this exact slot. Please pick another.");
        }

        const snap = await db.collection('appointments').where('uid', '==', currentUser.uid).get();
        let pastApps = [];
        snap.forEach(doc => pastApps.push(doc.data()));

        const extraAttempts = currentUser.extraAttempts || 0;
        // ALL statuses (including 'cancelled') now consume 1 of their 3 attempts.
        const usedAttempts = pastApps.length;

        const limit = 3 + extraAttempts;

        if (usedAttempts >= limit) {
            btn.textContent = originalText;
            btn.disabled = false;
            return showToast("Booking limit exceeded! Please visit Admin.");
        }

        if (pastApps.some(app => String(app.status).includes('verified'))) {
            btn.textContent = originalText;
            btn.disabled = false;
            return showToast("You are already verified for this academic year!");
        }

        const hasActiveBooking = pastApps.some(app =>
            ['waiting', 'current'].includes(app.status)
        );

        if (hasActiveBooking) {
            btn.textContent = originalText;
            btn.disabled = false;
            return showToast("You already have an active waiting slot!");
        }

        const correctToken = getSlotTokenNumber(t);
        await db.collection('appointments').add({
            uid: currentUser.uid,
            name: currentUser.name,
            contactNo: currentUser.contactNo,
            joiningYear: currentUser.joiningYear,
            currentYear: currentUser.currentYear,
            scholarshipType: currentUser.scholarshipType,
            prn: currentUser.prn,
            mahadbtId: currentUser.mahadbtId,
            department: currentUser.department,
            date: d,
            time: t,
            status: 'waiting',
            token: correctToken
        });
        showToast(`Slot Booked! Your Token is ${correctToken}`);
    } catch (e) {
        console.error("Firebase Booking Error:", e);
        showToast("Booking Failed - Check Console");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
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

// --- BROADCAST ANNOUNCEMENTS LOGIC ---

// --- BROADCAST ANNOUNCEMENTS LOGIC ---

async function submitAnnouncement(e) {
    e.preventDefault();
    const msg = document.getElementById('announceMsg').value.trim();
    const dept = document.getElementById('announceDept').value;
    const year = document.getElementById('announceYear').value;
    const status = document.getElementById('announceStatus').value;

    if (!msg) return showToast("Please type an announcement message.");

    const btn = document.getElementById('btnSendBroadcast');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Publishing...";
    btn.disabled = true;

    try {
        await db.collection('broadcasts').add({
            message: msg,
            targetDept: dept,
            targetYear: year,
            targetStatus: status,
            timestamp: new Date().toISOString(),
            author: currentUser.name,
            status: 'active' // FIX: Track the active state so we can recall it later
        });

        showToast("Broadcast Published Successfully!");
        document.getElementById('announcementForm').reset();
    } catch (error) {
        console.error(error);
        showToast("Error sending broadcast.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

let broadcastListener = null;


function loadAdminAnnouncements() {
    if (broadcastListener) broadcastListener();

    broadcastListener = db.collection('broadcasts').orderBy('timestamp', 'desc').limit(50)
        .onSnapshot(snap => {
            const tbody = document.getElementById('adminAnnouncementsLog');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (snap.empty) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 italic">No previous broadcasts found.</td></tr>`;
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const d = new Date(data.timestamp);
                const timeStr = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                const deptLabel = data.targetDept === 'ALL' ? 'All Depts' : data.targetDept;
                const yearLabel = data.targetYear === 'ALL' ? 'All Years' : `Year ${data.targetYear}`;

                let statusLabel = 'All Statuses';
                if (data.targetStatus === 'unregistered') statusLabel = 'Not Signed Up';
                else if (data.targetStatus === 'not_booked') statusLabel = 'Signed Up (No Slot)';
                else if (data.targetStatus === 'waiting') statusLabel = 'Slot Booked';
                else if (data.targetStatus === 'verified') statusLabel = 'Verified';
                else if (data.targetStatus === 'pending') statusLabel = 'Docs Pending';
                else if (data.targetStatus === 'no_show') statusLabel = 'No Show';

                let filtersHtml = `
                    <span class="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-[9px] font-bold border border-violet-100 shadow-sm whitespace-nowrap">${deptLabel}</span>
                    <span class="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-[9px] font-bold border border-violet-100 shadow-sm whitespace-nowrap">${yearLabel}</span>
                    <span class="bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-[9px] font-bold border border-violet-100 shadow-sm whitespace-nowrap">${statusLabel}</span>
                `;

                // FIX: Removed 'line-through' and added 'italic' with 'opacity-75' for clean readability
                const isRecalled = data.status === 'recalled';
                const textClass = isRecalled ? 'text-slate-400 italic opacity-75' : 'text-slate-800 font-medium';

                let actionHtml = '';
                if (isRecalled) {
                    actionHtml = `<span class="text-[10px] text-slate-400 font-bold uppercase italic">Recalled</span>`;
                } else {
                    actionHtml = `<button onclick="promptRecallBroadcast('${doc.id}')" class="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100">Recall</button>`;
                }

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4 text-xs text-slate-500 whitespace-nowrap align-top">${timeStr}</td>
                        <td class="px-6 py-4 text-sm ${textClass}">${data.message}</td>
                        <td class="px-6 py-4 align-top"><div class="flex flex-wrap gap-1.5">${filtersHtml}</div></td>
                        <td class="px-6 py-4 text-right align-top">${actionHtml}</td>
                    </tr>
                `;
            });
        });
}
// ... Keep promptRecallBroadcast and closeBroadcastRecallModal exactly as they are ...

async function executeBroadcastRecall() {
    if (!pendingBroadcastRecallId) return;

    const btn = document.getElementById('confirmBroadcastRecallBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Recalling...";
    btn.disabled = true;

    try {
        // FIX: Update status to 'recalled' instead of deleting the document
        await db.collection('broadcasts').doc(pendingBroadcastRecallId).update({
            status: 'recalled'
        });
        showToast("Broadcast Recalled Successfully");
        closeBroadcastRecallModal();
    } catch (e) {
        showToast("Error recalling broadcast");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- STUDENT LISTENER LOGIC ---
let studentBroadcastListener = null;

function listenToStudentBroadcasts() {
    if (!currentUser || currentUserType !== 'student') return;

    if (studentBroadcastListener) studentBroadcastListener();

    studentBroadcastListener = db.collection('broadcasts').orderBy('timestamp', 'desc').limit(10)
        .onSnapshot(snap => {
            const container = document.getElementById('studentGlobalAnnouncements');
            if (!container) return;
            container.innerHTML = '';

            let hasShown = false;

            let myStatus = 'not_booked';
            if (window.currentStudentActiveApp) {
                myStatus = window.currentStudentActiveApp.status.replace('_closed', '');
            } else if (window.allStudentApps && window.allStudentApps.length > 0) {
                myStatus = window.allStudentApps[0].status.replace('_closed', '');
            } else if (!currentUser.mahadbtId) {
                myStatus = 'unregistered';
            }

            snap.forEach(doc => {
                const data = doc.data();

                // FIX: Skip rendering if the broadcast was recalled by the admin!
                if (data.status === 'recalled') return;

                const matchDept = data.targetDept === 'ALL' || data.targetDept === currentUser.department;
                const matchYear = data.targetYear === 'ALL' || String(data.targetYear) === String(currentUser.currentYear);
                const matchStatus = data.targetStatus === 'ALL' || data.targetStatus === myStatus;

                if (matchDept && matchYear && matchStatus) {
                    hasShown = true;

                    const d = new Date(data.timestamp);
                    const timeStr = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    container.innerHTML += `
                        <div class="bg-violet-600 rounded-2xl p-5 mb-4 shadow-xl text-white flex items-start gap-4 animate-pop border border-violet-500 relative overflow-hidden">
                            <div class="absolute -right-10 -top-10 w-32 h-32 bg-violet-500 rounded-full opacity-50 blur-2xl pointer-events-none"></div>
                            <div class="bg-white/20 p-2.5 rounded-xl shrink-0 backdrop-blur-sm shadow-sm relative z-10">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                            </div>
                            <div class="relative z-10 flex-1">
                                <h4 class="font-bold text-xs text-violet-200 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.8)]"></span>
                                    Official Broadcast from Admin
                                </h4>
                                <p class="font-medium text-[15px] leading-relaxed text-white">${data.message}</p>
                                <p class="text-[10px] text-violet-300 mt-2 font-bold tracking-widest uppercase opacity-80">Broadcasted: ${timeStr}</p>
                            </div>
                        </div>
                    `;
                }
            });

            if (hasShown) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        });
}





// --- NEW BROADCAST RECALL MODAL LOGIC ---
let pendingBroadcastRecallId = null;

function promptRecallBroadcast(id) {
    pendingBroadcastRecallId = id;
    const modal = document.getElementById('broadcastRecallModal');
    if (modal) modal.classList.remove('hidden');
}

function closeBroadcastRecallModal() {
    pendingBroadcastRecallId = null;
    const modal = document.getElementById('broadcastRecallModal');
    if (modal) modal.classList.add('hidden');
}





window.toggleMahadbtWindow = toggleMahadbtWindow;
window.promptUpdateAcademicYear = promptUpdateAcademicYear;

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

        // Explicitly show the year it belongs to!
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
window.closeRecallConfirmModal = closeRecallConfirmModal;
window.confirmAndExecuteRecall = confirmAndExecuteRecall;

window.toggleCustomDate = toggleCustomDate;

window.openRemarkConfirmModal = openRemarkConfirmModal;
window.closeRemarkConfirmModal = closeRemarkConfirmModal;
window.confirmAndSaveRemark = confirmAndSaveRemark;
window.promptRecallBroadcast = promptRecallBroadcast;
window.closeBroadcastRecallModal = closeBroadcastRecallModal;
window.executeBroadcastRecall = executeBroadcastRecall;
window.submitAnnouncement = submitAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;

document.addEventListener('DOMContentLoaded', initApp);