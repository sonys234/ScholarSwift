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

const scholarshipDocs = {
    'EBC': ['Income Certificate', 'Domicile Certificate', 'Mark Sheet', 'Fee Receipt', 'Ration Card'],
    'OBC': ['Caste Certificate', 'Caste Validity', 'Non-Creamy Layer', 'Income Certificate', 'Mark Sheet'],
    'SC': ['Caste Certificate', 'Caste Validity', 'Income Certificate (Form 16)', 'Mark Sheet', 'Hostel Certificate'],
    'ST': ['Caste Certificate', 'Caste Validity', 'Tribe Validity', 'Income Certificate', 'Mark Sheet'],
    'VJNT': ['Caste Certificate', 'Non-Creamy Layer', 'Income Certificate', 'Domicile', 'Mark Sheet'],
    'EWS': ['EWS Eligibility Certificate', 'Income Certificate', 'Domicile Certificate', 'Mark Sheet', 'Leaving Certificate'],
    'Minority': ['Self Declaration', 'Income Certificate', 'Domicile', 'Mark Sheet', 'Admission Receipt']
};

const yearLabels = {
    '1': 'First Year (FE)', '2': 'Second Year (SE)', '3': 'Third Year (TE)', '4': 'Fourth Year (BE)'
};

const deptToDay = {
    'DS': { day: 1, name: 'Monday' },
    'AIML': { day: 2, name: 'Tuesday' },
    'COMP': { day: 3, name: 'Wednesday' },
    'IT': { day: 4, name: 'Thursday' },
    'MECH': { day: 6, name: 'Saturday' },      // Changed to 6
    'CIVIL': { day: 6, name: 'Saturday' },     // Changed to 6
    'AUTOMOBILE': { day: 6, name: 'Saturday' } // Changed to 6
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
    } catch(e) {
        return timeStr; 
    }
}

function getSlotTokenNumber(selectedTimeStr) {
    let time = new Date();
    time.setHours(9, 30, 0, 0); 
    const bookingEnd = 23; // FIX: Use 23 (11 PM) to prevent rollover loops
    let tokenIndex = 1;
    let safetyCounter = 0; // FIX: Prevents infinite loops

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
}

function setMinDate() {
    const el = document.getElementById('slotDate');
    if (el) el.min = new Date().toISOString().split('T')[0];
}

// ==================== AUTH FUNCTIONS ====================
function setUserType(type) {
    currentUserType = type;
    const studentToggle = document.getElementById('studentToggle');
    const adminToggle = document.getElementById('adminToggle');
    const signupTab = document.getElementById('signupTab');
    
    if (type === 'student') {
        studentToggle.classList.add('bg-emerald-500', 'text-white');
        adminToggle.classList.remove('bg-violet-500', 'text-white');
        if(signupTab) signupTab.classList.remove('hidden');
    } else {
        adminToggle.classList.add('bg-violet-500', 'text-white');
        studentToggle.classList.remove('bg-emerald-500', 'text-white');
        if(signupTab) signupTab.classList.add('hidden');
        setAuthMode('login'); 
    }
}

function setAuthMode(mode) {
    if (currentUserType === 'admin' && mode === 'signup') return;
    authMode = mode;
    
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const signupExtraFields = document.getElementById('signupExtraFields');
    const authSubmit = document.getElementById('authSubmit');
    
    if (mode === 'login') {
        if(loginTab) loginTab.classList.add('bg-white', 'shadow', 'text-slate-800');
        if(signupTab) signupTab.classList.remove('bg-white', 'shadow', 'text-slate-800');
        if (signupExtraFields) signupExtraFields.classList.add('hidden');
        if(authSubmit) authSubmit.textContent = 'Sign In';
    } else {
        if(signupTab) signupTab.classList.add('bg-white', 'shadow', 'text-slate-800');
        if(loginTab) loginTab.classList.remove('bg-white', 'shadow', 'text-slate-800');
        if (signupExtraFields) signupExtraFields.classList.remove('hidden');
        if(authSubmit) authSubmit.textContent = 'Create Account';
    }
}

async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('authError');
    errorDiv.classList.add('hidden');

    try {
        if (currentUserType === 'student') {
            if (authMode === 'signup') {
                const firstName = document.getElementById('firstNameInput').value;
                const lastName = document.getElementById('lastNameInput').value;
                const contactNo = document.getElementById('contactInput').value;
                const grNumber = document.getElementById('grNumberInput').value;
                const dept = document.getElementById('deptSelect').value;
                const joiningYear = document.getElementById('joiningYearInput').value;
                const currentYear = document.getElementById('currentYearInput').value;
                const mahadbtId = document.getElementById('mahadbtIdInput').value;
                const scholarshipType = document.getElementById('scholarshipTypeInput').value;

                if (!firstName || !dept || !grNumber || !joiningYear) throw new Error("Fill all required fields!");

                const scholarId = `${dept}${Math.floor(100 + Math.random() * 900)}`;
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                const studentData = {
                    firstName, lastName, name: `${firstName} ${lastName}`,
                    email, contactNo, scholarId, department: dept, grNumber: grNumber.toUpperCase(),
                    joiningYear, currentYear, mahadbtId, scholarshipType, role: 'student',
                    extraAttempts: 0
                };

                await db.collection('users').doc(userCredential.user.uid).set(studentData);
                currentUser = { ...studentData, uid: userCredential.user.uid, type: 'student' };
                showToast(`Success! Your Scholar ID: ${scholarId}`);
                showStudentDashboard();
            } else {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const doc = await db.collection('users').doc(userCredential.user.uid).get();
                if (doc.exists) {
                    currentUser = { ...doc.data(), uid: userCredential.user.uid, type: 'student' };
                    showStudentDashboard();
                } else throw new Error("Profile not found!");
            }
        } else {
            const ADMIN_EMAIL = "admin@scholarswift.com";
            const ADMIN_PASS = "admin123";

            if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
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

// ==================== STUDENT DASHBOARD ====================
async function updateWaitTimeDisplay(studentToken, studentDate) {
    try {
        const statusDoc = await db.collection('settings').doc('queueStatus').get();
        const paused = statusDoc.exists ? statusDoc.data().isPaused : false;

        const snap = await db.collection('appointments').where('date', '==', studentDate).where('status', '==', 'waiting').get();

        let waitingList = [];
        snap.forEach(doc => waitingList.push(doc.data()));
        waitingList.sort((a, b) => (a.time||"").localeCompare(b.time||""));

        const position = waitingList.findIndex(s => s.token === studentToken);
        const waitEl = document.getElementById('waitTime');

        if (position === -1) {
            waitEl.textContent = "In Progress";
        } else {
            const baseMinutes = (position + 1) * 7;
            const totalMinutes = baseMinutes + globalDelayMinutes;
            
            waitEl.textContent = paused ? `${totalMinutes} mins (Paused)` : `${totalMinutes} mins`;
            waitEl.className = paused ? "text-4xl font-bold text-amber-500" : "text-4xl font-bold text-slate-800";
        }
    } catch (e) { console.error(e); }
}

function showStudentDashboard() {
    if (!currentUser) return;
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('studentDashboard').classList.remove('hidden');

    const fields = {
        'studentName': currentUser.name, 'studentKey': currentUser.scholarId,
        'profileName': currentUser.name, 'profileGrNumber': currentUser.grNumber,
        'profileDept': currentUser.department, 'profileYear': yearLabels[currentUser.currentYear] || "Year " + currentUser.currentYear,
        'profileMahaDBT': currentUser.mahadbtId, 'profileSchType': currentUser.scholarshipType
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "--";
    }

    db.collection('appointments').where('uid', '==', currentUser.uid)
        .onSnapshot(snap => {
            const bookingContainer = document.getElementById('bookingContainer');
            const liveQueue = document.getElementById('liveQueueSection');
            const fineMessage = document.getElementById('fineLockedMessage');
            
            let allApps = [];
            snap.forEach(doc => allApps.push(doc.data()));
            
            allApps.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return (b.time || "").localeCompare(a.time || "");
            });

            const totalAttempts = allApps.length;
            const extraAttempts = currentUser.extraAttempts || 0;
            const attemptsLeft = Math.max(0, (3 + extraAttempts) - totalAttempts);
            
            const attemptsEl = document.getElementById('profileAttempts');
            if (attemptsEl) {
                attemptsEl.textContent = `${attemptsLeft}/${3 + extraAttempts}`;
                attemptsEl.className = attemptsLeft === 0 ? "font-bold text-red-500 text-lg" : "font-bold text-emerald-600 text-lg";
            }

            const latestApp = allApps[0]; 
            const activeApp = allApps.find(a => ['waiting', 'current'].includes(a.status)); 
            const isVerified = allApps.some(a => String(a.status).includes('verified')); 

            // Banner Updates
            const banner = document.getElementById('studentStatusBanner');
            const statusText = document.getElementById('overallStatusText');
            const statusSub = document.getElementById('overallStatusSubtext');
            const statusIcon = document.getElementById('overallStatusIcon');

            let bColor = 'border-slate-300'; let iconBg = 'bg-slate-100'; let iconText = 'text-slate-400';
            let title = "Not Booked Yet"; 
            let subtextHtml = "Please book a slot below to verify your documents.";
            let svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;

            if (latestApp) {
                const baseStatus = latestApp.status.replace('_closed', '');
                
                if (baseStatus === 'verified') {
                    bColor = 'border-emerald-500'; iconBg = 'bg-emerald-100'; iconText = 'text-emerald-600';
                    title = "Verified ✓"; 
                    subtextHtml = "Your MahaDBT application is successfully verified for this year.";
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>`;
                } 
                else if (baseStatus === 'pending') {
                    bColor = 'border-amber-500'; iconBg = 'bg-amber-100'; iconText = 'text-amber-600';
                    title = "Documents Pending ⚠"; 
                    
                    const requiredDocs = scholarshipDocs[currentUser.scholarshipType] || [];
                    const verifiedMap = latestApp.documentVerification || {};
                    const missingDocs = requiredDocs.filter(d => !verifiedMap[d]);

                    let missingHtml = "";
                    if (missingDocs.length > 0) {
                        const tags = missingDocs.map(d => `<span class="inline-block bg-white text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold mr-1.5 mb-1.5 shadow-sm">${d}</span>`).join('');
                        missingHtml = `
                            <p class="mb-2 text-slate-600">You are missing the following documents:</p>
                            <div class="flex flex-wrap">${tags}</div>
                        `;
                    } else {
                        missingHtml = `<p class="mb-2 text-slate-600">You are missing some documents.</p>`;
                    }

                    subtextHtml = `
                        ${missingHtml}
                        <p class="mt-2 text-xs text-amber-800 font-bold bg-amber-200/50 inline-block px-2 py-1 rounded">Please arrange the missing documents and book a regular slot below.</p>
                    `;
                    
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`;
                }
                else if (baseStatus === 'no_show') {
                    bColor = 'border-red-500'; iconBg = 'bg-red-100'; iconText = 'text-red-600';
                    title = "Missed Slot 🚫"; 
                    subtextHtml = "You did not appear for your last scheduled slot. Please book again.";
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`;
                }
                else if (baseStatus === 'waiting' || baseStatus === 'current') {
                    bColor = 'border-blue-500'; iconBg = 'bg-blue-100'; iconText = 'text-blue-600';
                    title = "Slot Booked"; 
                    subtextHtml = `Scheduled for <span class="font-bold">${latestApp.date}</span> at <span class="font-bold">${latestApp.time}</span>.`;
                    svg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>`;
                }
            }

            if(banner) {
                banner.className = `glass-card rounded-2xl p-6 mb-8 border-l-8 ${bColor} animate-slide transition-all duration-500`;
                statusText.textContent = title;
                statusSub.innerHTML = subtextHtml; 
                statusIcon.className = `w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${iconBg} ${iconText}`;
                statusIcon.innerHTML = `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">${svg}</svg>`;
            }

            // History Render
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

                        switch(baseStatus) {
                            case 'current': badgeStyle = "bg-emerald-500 text-white animate-pulse shadow-sm"; statusLabel = "Current"; break;
                            case 'verified': badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200"; statusLabel = "Verified"; break;
                            case 'pending': badgeStyle = "bg-amber-100 text-amber-700 border border-amber-200"; statusLabel = "Pending"; break;
                            case 'no_show': badgeStyle = "bg-red-100 text-red-700 border border-red-200"; statusLabel = "Didn't Show"; break;
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

            // Booking Visibility Logic
            if (activeApp) {
                if (bookingContainer) bookingContainer.classList.add('hidden');
                if (fineMessage) fineMessage.classList.add('hidden');
                if (liveQueue) liveQueue.classList.remove('hidden');
                
                document.getElementById('yourToken').textContent = activeApp.token;
                
                const originalStart = activeApp.time ? String(activeApp.time).toLowerCase() : "--:--";
                const originalEnd = originalStart !== "--:--" ? safeAddMinutes(originalStart, 7) : "--:--";
                const slotEl = document.getElementById('yourSlotTime');
                const waitLabel = document.getElementById('waitTime').previousElementSibling; 
                
                if (globalDelayMinutes > 0 && originalStart !== "--:--") {
                    const delayedEnd = safeAddMinutes(originalEnd, globalDelayMinutes);
                    let delayedStart = safeAddMinutes(originalStart, globalDelayMinutes);
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
                                <span class="text-sm font-black text-red-600">+${globalDelayMinutes}m</span>
                            </div>
                        </div>
                    `;
                    waitLabel.innerHTML = `Est. Wait Time`; 
                } else {
                    slotEl.innerHTML = `<span class="text-emerald-600">${originalStart} - ${originalEnd}</span>`;
                    waitLabel.textContent = "Est. Wait Time";
                }
                
                updateWaitTimeDisplay(activeApp.token, activeApp.date);
            } else {
                if (liveQueue) liveQueue.classList.add('hidden');
                
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

    db.collection('appointments').where('status', '==', 'current').onSnapshot(snap => {
        const el = document.getElementById('currentToken');
        if (el) el.textContent = !snap.empty ? snap.docs[0].data().token : "--";
    });
}

// ==================== ADMIN DASHBOARD ====================

function toggleAdminView(view) {
    const liveView = document.getElementById('adminLiveQueueView');
    const statsView = document.getElementById('adminStatsView');
    const dirView = document.getElementById('adminDirectoryView');
    const btnViewStats = document.getElementById('btnViewStats');
    const btnViewDir = document.getElementById('btnViewDirectory');

    if(liveView) liveView.classList.add('hidden');
    if(statsView) statsView.classList.add('hidden');
    if(dirView) dirView.classList.add('hidden');

    if (view === 'stats') {
        if(statsView) statsView.classList.remove('hidden');
        loadStatsData();
    } else if (view === 'directory') {
        if(dirView) dirView.classList.remove('hidden');
        loadStudentDirectory();
    } else {
        if(liveView) liveView.classList.remove('hidden');
    }
}

// --- STUDENT DIRECTORY & MASTER PROFILE ENGINE ---
async function loadStudentDirectory() {
    try {
        const snap = await db.collection('users').where('role', '==', 'student').get();
        allStudentsData = [];
        snap.forEach(doc => {
            allStudentsData.push({ uid: doc.id, ...doc.data() });
        });
        filterDirectory(); 
    } catch (e) {
        showToast("Error loading directory.");
    }
}

function filterDirectory() {
    const query = (document.getElementById('dirSearchInput').value || "").toLowerCase();
    const tbody = document.getElementById('directoryTableBody');
    tbody.innerHTML = '';

    const filtered = allStudentsData.filter(s => {
        const str = `${s.name} ${s.grNumber} ${s.email} ${s.mahadbtId} ${s.contactNo}`.toLowerCase();
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
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-black shadow-sm group-hover:bg-violet-500 group-hover:text-white transition-colors">
                        ${s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p class="font-bold text-slate-800">${s.name}</p>
                        <p class="text-xs text-slate-500 font-mono mt-0.5">${s.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="font-bold text-slate-700">${s.grNumber}</p>
                <div class="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center gap-2">
                    <span>${s.department}</span> • <span>${yearLabels[s.currentYear] || s.currentYear}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <button class="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">View Profile</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// NEW: ENHANCED MASTER PROFILE FETCHER
async function openStudentDetailsModal(student) {
    activeModalStudentUid = student.uid;
    
    // 1. Populate Basic Info
    document.getElementById('modalInitials').textContent = student.name.charAt(0).toUpperCase();
    document.getElementById('modalName').textContent = student.name;
    document.getElementById('modalEmail').textContent = student.email;
    document.getElementById('modalGR').textContent = student.grNumber;
    document.getElementById('modalPhone').textContent = student.contactNo;
    document.getElementById('modalDept').textContent = student.department;
    document.getElementById('modalJoinYr').textContent = student.joiningYear;
    document.getElementById('modalCurrYr').textContent = yearLabels[student.currentYear] || student.currentYear;
    document.getElementById('modalSchType').textContent = student.scholarshipType;
    document.getElementById('modalMahaDBT').textContent = student.mahadbtId || "Not Provided";
    
    // 2. Fetch fresh appointment history from Firebase
    try {
        const snap = await db.collection('appointments').where('uid', '==', student.uid).get();
        let apps = [];
        snap.forEach(doc => apps.push(doc.data()));
        
        apps.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.time || "").localeCompare(a.time || "");
        });

        // 3. Render History Table inside Modal
        const tbody = document.getElementById('modalHistoryBody');
        tbody.innerHTML = '';
        if(apps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-6 text-center text-slate-400 italic">No bookings found for this student.</td></tr>`;
        } else {
            apps.forEach(app => {
                let badgeStyle = "bg-slate-100 text-slate-600";
                let sLabel = app.status || 'waiting';
                const baseS = sLabel.replace('_closed', '');
                
                if(baseS === 'verified') badgeStyle = "bg-emerald-100 text-emerald-700";
                else if(baseS === 'pending') badgeStyle = "bg-amber-100 text-amber-700";
                else if(baseS === 'no_show') badgeStyle = "bg-red-100 text-red-700";
                else if(baseS === 'current') badgeStyle = "bg-blue-100 text-blue-700";

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-700">${app.date} <span class="text-xs text-slate-400 ml-1">${app.time}</span></td>
                        <td class="px-4 py-3 font-mono text-slate-600 text-xs">${app.token}</td>
                        <td class="px-4 py-3"><span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${badgeStyle}">${baseS}</span></td>
                    </tr>
                `;
            });
        }

        // 4. Calculate & Render Attempts
        const totalAttempts = apps.length;
        const extraAttempts = student.extraAttempts || 0;
        const limit = 3 + extraAttempts;
        const left = Math.max(0, limit - totalAttempts);
        
        document.getElementById('modalAttemptsInfo').innerHTML = `
            <span class="${left === 0 ? 'text-red-500' : 'text-emerald-600'}">${left} Left</span> 
            <span class="text-sm text-slate-500 font-medium">/ ${limit} Allowed</span>
            <span class="block text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">(${totalAttempts} Used, ${extraAttempts} Extra Granted)</span>
        `;

        // 5. Calculate & Render Latest Validation Status + Missing Docs
        const statusEl = document.getElementById('modalCurrentStatus');
        const pendingDocsEl = document.getElementById('modalPendingDocs');
        pendingDocsEl.classList.add('hidden');
        pendingDocsEl.innerHTML = '';

        const latestApp = apps[0]; 
        if (!latestApp) {
            statusEl.innerHTML = `<span class="text-slate-500">Not Booked Yet</span>`;
        } else {
            const baseStatus = latestApp.status.replace('_closed', '');
            if (baseStatus === 'verified') {
                statusEl.innerHTML = `<span class="text-emerald-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Verified</span>`;
            } else if (baseStatus === 'pending') {
                statusEl.innerHTML = `<span class="text-amber-600 flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Pending Documents</span>`;
                
                // Cross-reference docs to find exactly what they missed
                const req = scholarshipDocs[student.scholarshipType] || [];
                const ver = latestApp.documentVerification || {};
                const missing = req.filter(d => !ver[d]);
                
                if (missing.length > 0) {
                    pendingDocsEl.classList.remove('hidden');
                    pendingDocsEl.innerHTML = `<span class="font-bold uppercase tracking-wider text-[10px] block mb-1">Missing Documents:</span> • ${missing.join('<br> • ')}`;
                }
            } else if (baseStatus === 'no_show') {
                statusEl.innerHTML = `<span class="text-red-600">No Show</span>`;
            } else {
                statusEl.innerHTML = `<span class="text-blue-600">Slot Booked / Waiting</span>`;
            }
        }

        // 6. Show the modal
        document.getElementById('studentDetailsModal').classList.remove('hidden');

    } catch(e) {
        showToast("Error loading student history");
    }
}

function closeStudentDetailsModal() {
    document.getElementById('studentDetailsModal').classList.add('hidden');
    activeModalStudentUid = null;
}

async function grantExtraAttempts() {
    if (!activeModalStudentUid) return;
    
    try {
        const userRef = db.collection('users').doc(activeModalStudentUid);
        await userRef.update({
            extraAttempts: firebase.firestore.FieldValue.increment(3)
        });
        
        showToast("Success! Account Unlocked & Attempts Granted.");
        closeStudentDetailsModal();
        loadStudentDirectory(); 
    } catch (e) {
        showToast("Error updating student record.");
    }
}

// --- STATS & REPORTS ENGINE ---
async function loadStatsData() {
    try {
        const usersSnap = await db.collection('users').get();
        const usersMap = {};
        usersSnap.forEach(doc => {
            usersMap[doc.id] = doc.data();
        });

        const snap = await db.collection('appointments').get();
        allAppointmentsData = [];
        
        snap.forEach(doc => {
            const appData = doc.data();
            const userData = usersMap[appData.uid] || {}; 

            allAppointmentsData.push({
                id: doc.id,
                ...appData,
                currentYear: appData.currentYear || userData.currentYear || 'N/A',
                joiningYear: appData.joiningYear || userData.joiningYear || 'N/A',
                email: appData.email || userData.email || 'N/A',
                contactNo: appData.contactNo || userData.contactNo || 'N/A'
            });
        });
        
        allAppointmentsData.sort((a, b) => {
            if (a.date !== b.date) return (b.date || "").localeCompare(a.date || "");
            return (b.time || "").localeCompare(a.time || "");
        });
        
        applyFilters();
    } catch (e) {
        console.error("Error loading stats:", e);
        showToast("Error loading reporting data.");
    }
}

function applyFilters() {
    const fDept = document.getElementById('filterDept').value;
    const fYear = document.getElementById('filterYear').value;
    const fStatus = document.getElementById('filterStatus').value;
    const fTimeRange = document.getElementById('filterTimeRange').value;
    const fDate = document.getElementById('filterDate').value;

    const today = new Date();

    let filtered = allAppointmentsData.filter(app => {
        let match = true;

        if (fDept !== 'ALL' && app.department !== fDept) match = false;
        if (fYear !== 'ALL' && String(app.currentYear) !== String(fYear)) match = false;
        
        if (fStatus !== 'ALL') {
            const baseStatus = app.status ? app.status.replace('_closed', '') : '';
            if (baseStatus !== fStatus) match = false;
        }

        if (fDate) {
            if (app.date !== fDate) match = false;
        } else if (fTimeRange !== 'ALL') {
            const appDate = new Date(app.date);
            
            if (fTimeRange === 'TODAY') {
                if (app.date !== today.toISOString().split('T')[0]) match = false;
            } else if (fTimeRange === 'WEEK') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(today.getDate() - 7);
                if (appDate < sevenDaysAgo || appDate > today) match = false;
            } else if (fTimeRange === 'MONTH') {
                if (appDate.getMonth() !== today.getMonth() || appDate.getFullYear() !== today.getFullYear()) match = false;
            } else if (fTimeRange === 'YEAR') {
                if (appDate.getFullYear() !== today.getFullYear()) match = false;
            }
        }

        return match;
    });

    let vCount = 0, pCount = 0, nsCount = 0;
    filtered.forEach(app => {
        const s = app.status ? app.status.replace('_closed', '') : '';
        if (s === 'verified') vCount++;
        else if (s === 'pending') pCount++;
        else if (s === 'no_show') nsCount++;
    });

    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statVerified').textContent = vCount;
    document.getElementById('statPending').textContent = pCount;
    document.getElementById('statNoShow').textContent = nsCount;

    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500 italic">No records found matching filters.</td></tr>`;
        window.currentFilteredData = [];
        return;
    }

    filtered.forEach(app => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        
        let badgeStyle = "bg-slate-100 text-slate-600";
        let sLabel = app.status || 'waiting';
        const baseS = sLabel.replace('_closed', '');
        
        if(baseS === 'verified') badgeStyle = "bg-emerald-100 text-emerald-700";
        else if(baseS === 'pending') badgeStyle = "bg-amber-100 text-amber-700";
        else if(baseS === 'no_show') badgeStyle = "bg-red-100 text-red-700";
        else if(baseS === 'current') badgeStyle = "bg-blue-100 text-blue-700";

        tr.innerHTML = `
            <td class="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">${app.date} <span class="text-xs text-slate-400 block">${app.time}</span></td>
            <td class="px-4 py-3 font-bold text-slate-800">${app.name}</td>
            <td class="px-4 py-3 font-mono text-slate-600 text-xs">${app.grNumber}</td>
            <td class="px-4 py-3 text-slate-600 font-bold text-xs">${app.department}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">${yearLabels[app.currentYear] || app.currentYear}</td>
            <td class="px-4 py-3 font-mono text-emerald-600 text-xs">${app.mahadbtId || '--'}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${badgeStyle}">${baseS}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    window.currentFilteredData = filtered;
}

function downloadCSV() {
    const data = window.currentFilteredData || [];
    if (data.length === 0) return showToast("No data to export!");

    let csvContent = "Date,Time,Token,Student Name,Email,Contact No,GR Number,Department,Joining Year,Current Year,MahaDBT ID,Category,Status\n";

    data.forEach(app => {
        const date = app.date || "";
        const time = app.time || "";
        const token = app.token || "";
        const name = `"${(app.name || "").replace(/"/g, '""')}"`;
        const email = app.email || "";
        const phone = app.contactNo || "";
        const gr = app.grNumber || "";
        const dept = app.department || "";
        const joinYr = app.joiningYear || "";
        const currYr = yearLabels[app.currentYear] ? `"${yearLabels[app.currentYear]}"` : (app.currentYear || "");
        const dbt = app.mahadbtId || "";
        const cat = app.scholarshipType || "";
        const stat = (app.status || "").replace('_closed', '').toUpperCase();

        csvContent += `${date},${time},${token},${name},${email},${phone},${gr},${dept},${joinYr},${currYr},${dbt},${cat},${stat}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Verification_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Downloaded!");
}


function showAdminDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    document.getElementById('todaysDept').textContent = `${currentUser.role} | ${currentUser.department}`;
    
    toggleAdminView('live');

    const todayStr = new Date().toISOString().split('T')[0];

    db.collection('appointments').where('date', '==', todayStr) 
        .onSnapshot(snap => {
        const tbody = document.getElementById('queueTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            let list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

            list.sort((a, b) => (a.time||"").localeCompare(b.time||""));

            list.forEach(data => {
                const row = document.createElement('tr');
                const isCurrent = data.status === 'current';
                row.className = `divide-x divide-slate-100 transition-all duration-500 ${isCurrent ? 'bg-emerald-50/50 ring-2 ring-inset ring-emerald-500 shadow-lg z-10 relative' : 'hover:bg-slate-50'}`;
                
                let badgeStyle = "";
                let statusLabel = "";
                const baseStatus = data.status ? data.status.replace('_closed', '') : 'waiting'; 

                switch(baseStatus) {
                    case 'current': badgeStyle = "bg-emerald-500 text-white animate-pulse shadow-sm"; statusLabel = "Current"; break;
                    case 'verified': badgeStyle = "bg-emerald-100 text-emerald-700 border border-emerald-200"; statusLabel = "Verified"; break;
                    case 'pending': badgeStyle = "bg-red-100 text-red-700 border border-red-200"; statusLabel = "Pending"; break;
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
                    if (globalDelayMinutes > 0 && originalStart !== "--:--") {
                        const delayedEnd = safeAddMinutes(originalEnd, globalDelayMinutes);
                        let delayedStart = safeAddMinutes(originalStart, globalDelayMinutes);
                        
                        if (baseStatus === 'current') delayedStart = originalStart; 

                        timeHtml = `
                            <span class="text-slate-500 mr-3">SCH: ${originalStart} - ${originalEnd}</span> 
                            <span class="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 mt-1 inline-flex items-center gap-2">
                                EXP: ${delayedStart} - ${delayedEnd}
                                <span class="bg-red-500 text-white px-1.5 py-0.5 rounded-sm text-[9px] animate-pulse shadow-sm">+${globalDelayMinutes}m</span>
                            </span>
                        `;
                    } else {
                        timeHtml = `<span class="text-slate-500 font-medium">${originalStart} - ${originalEnd}</span>`;
                    }
                }

                row.innerHTML = `
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
                `;
                tbody.appendChild(row);
            });
        }
        refreshActiveStudentDisplay();
    });

    setInterval(async () => {
        if (isQueuePaused) return;

        const activeSnap = await db.collection('appointments').where('status', 'in', ['current', 'verified', 'pending', 'no_show']).limit(1).get();

        if (activeSnap.empty) {
            const now = new Date();
            const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
            const todayStr = now.toISOString().split('T')[0];

            const waitingSnap = await db.collection('appointments').where('date', '==', todayStr).where('status', '==', 'waiting').get();

            let toCall = [];
            waitingSnap.forEach(doc => {
                if ((doc.data().time||"").toLowerCase() <= currentTimeStr) {
                    toCall.push({ id: doc.id, ...doc.data() });
                }
            });

            if (toCall.length > 0) {
                toCall.sort((a, b) => (a.time||"").localeCompare(b.time||""));
                await db.collection('appointments').doc(toCall[0].id).update({ status: 'current' });
                showToast(`Auto-calling ${toCall[0].name}`);
            }
        }
    }, 10000); 
}

async function refreshActiveStudentDisplay() {
    const snap = await db.collection('appointments').where('status', 'in', ['current', 'verified', 'pending', 'no_show']).limit(1).get();
    
    const dossier = document.getElementById('activeDossier');
    const container = dossier.parentElement; 
    const checklistDiv = document.getElementById('docChecklist');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const timerContainer = document.getElementById('timerContainer');
    
    container.classList.remove('bg-emerald-50', 'bg-red-50', 'bg-slate-100', 'border-emerald-500', 'border-red-500', 'border-slate-400');
    if(timerContainer) timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');
    
    const oldFlag = document.getElementById('resultFlag');
    if(oldFlag) oldFlag.remove();

    const actionButtons = document.querySelectorAll("[onclick*='updateActiveStatus']");
    actionButtons.forEach(btn => btn.classList.remove('hidden'));

    if (!snap.empty) {
        const docRef = snap.docs[0];
        const data = docRef.data();
        const status = data.status;

        document.getElementById('activeStudentName').textContent = data.name;
        document.getElementById('activeStudentGR').textContent = data.grNumber;
        document.getElementById('activeMahaDBT').textContent = data.mahadbtId || "--";
        document.getElementById('activeSchType').textContent = data.scholarshipType;
        document.getElementById('adminCurrentToken').textContent = `TOKEN: ${data.token}`;
        
        if(document.getElementById('activeSlotIndicator')) {
            document.getElementById('activeSlotIndicator').textContent = `Slot: ${data.time}`;
        }

        if (['verified', 'pending', 'no_show'].includes(status)) {
            isTimerRunning = false; 
            const flag = document.createElement('div');
            flag.id = 'resultFlag';
            flag.className = `absolute top-24 right-8 px-6 py-2 rounded-full font-black text-xl uppercase tracking-widest shadow-md animate-pop text-white z-50`;

            if (status === 'verified') {
                container.classList.add('bg-emerald-50', 'border-emerald-500');
                flag.classList.add('bg-emerald-500');
                flag.textContent = '✓ Verified';
            } else if (status === 'pending') {
                container.classList.add('bg-red-50', 'border-red-500');
                flag.classList.add('bg-red-500');
                flag.textContent = '⚠ Pending';
            } else if (status === 'no_show') {
                container.classList.add('bg-slate-100', 'border-slate-400');
                flag.classList.add('bg-slate-500');
                flag.textContent = '∅ No Show';
            }

            container.appendChild(flag);
            actionButtons.forEach(btn => btn.classList.add('hidden'));
            if(startTimerBtn) startTimerBtn.classList.add('hidden');
            if (sessionCountdown) clearInterval(sessionCountdown);
        } else {
            if (isTimerRunning) {
                if(startTimerBtn) startTimerBtn.classList.add('hidden');
            } else {
                if(startTimerBtn) startTimerBtn.classList.remove('hidden');
                const timerDisplay = document.getElementById('sessionTimer');
                if (timerDisplay && !sessionCountdown) timerDisplay.textContent = "07:00";
            }
        }

        const requiredDocs = scholarshipDocs[data.scholarshipType] || ['Aadhar Card'];
        const verifiedData = data.documentVerification || {};
        const verifiedCount = Object.values(verifiedData).filter(val => val === true).length;
        
        document.getElementById('docProgress').textContent = `${verifiedCount}/${requiredDocs.length} Verified`;
        
        checklistDiv.innerHTML = '';
        requiredDocs.forEach(doc => {
            const isChecked = verifiedData[doc] === true;
            const item = document.createElement('div');
            item.className = `flex items-center gap-3 p-2 rounded-lg border ${isChecked ? 'bg-white border-emerald-200 shadow-sm' : 'border-slate-100'}`;
            item.innerHTML = `
                <input type="checkbox" ${isChecked ? 'checked' : ''} 
                    onchange="updateDocumentStatus('${docRef.id}','${doc}',this.checked)" 
                    class="w-4 h-4 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500">
                <span class="text-sm ${isChecked ? 'text-slate-800 font-medium' : 'text-slate-500'}">${doc}</span>
            `;
            checklistDiv.appendChild(item);
        });
    } else {
        isTimerRunning = false;
        document.getElementById('activeStudentName').textContent = "Desk Available";
        document.getElementById('docProgress').textContent = "0/0 Verified";
        if(startTimerBtn) startTimerBtn.classList.add('hidden');
        checklistDiv.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-center text-slate-300 animate-pulse"><svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h4 class="font-bold">Queue is Empty</h4></div>`;
    }
}

// ==================== TIMER & ACTIONS LOGIC ====================
function manualStartTimer() {
    isTimerRunning = true;
    const startBtn = document.getElementById('startTimerBtn');
    if (startBtn) startBtn.classList.add('hidden'); 
    startSessionTimer(420); 
}

function startSessionTimer(s) {
    if (sessionCountdown) clearInterval(sessionCountdown);
    remainingSeconds = s;
    isTimerRunning = true; 

    const timerDisplay = document.getElementById('sessionTimer');
    const timerContainer = document.getElementById('timerContainer');
    const progressBar = document.getElementById('timerProgress');

    timerDisplay.classList.remove('text-red-500', 'animate-pulse');
    timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');

    sessionCountdown = setInterval(() => {
        remainingSeconds--;
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        
        timerDisplay.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        let totalScale = Math.max(420, remainingSeconds); 
        progressBar.style.width = `${(remainingSeconds / totalScale) * 100}%`;

        if (remainingSeconds <= 0) {
            clearInterval(sessionCountdown);
            isTimerRunning = false;
            timerDisplay.textContent = "00:00";
            timerDisplay.classList.add('text-red-500', 'animate-pulse');
            timerContainer.classList.add('ring-4', 'ring-red-500', 'bg-red-50');
            showToast("Time Expired! Please finalize or add time.");
        }
    }, 1000);
}

async function addExtraTime() {
    remainingSeconds += 300; 

    const timerDisplay = document.getElementById('sessionTimer');
    const timerContainer = document.getElementById('timerContainer');
    if(timerDisplay) timerDisplay.classList.remove('text-red-500', 'animate-pulse');
    if(timerContainer) timerContainer.classList.remove('ring-4', 'ring-red-500', 'bg-red-50');

    startSessionTimer(remainingSeconds);
    
    try {
        await db.collection('settings').doc('queueStatus').set({
            delayMinutes: firebase.firestore.FieldValue.increment(5)
        }, { merge: true });
        showToast("+5 Minutes Added & Queue Delayed");
    } catch(e) { console.error(e); }
}

async function resetQueueDelay() {
    try {
        await db.collection('settings').doc('queueStatus').set({ delayMinutes: 0 }, { merge: true });
        showToast("Queue Delay Reset to 0");
    } catch(e) { console.error(e); }
}

async function updateActiveStatus(newStatus) {
    try {
        const snap = await db.collection('appointments').where('status', '==', 'current').limit(1).get();
        if(snap.empty) return showToast("No active student.");

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

        await db.collection('appointments').doc(docRef.id).update({ 
            status: newStatus, 
            processedAt: new Date().toISOString() 
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
        allWaiting.forEach(doc => list.push({id: doc.id, data: doc.data()}));
        list.sort((a,b) => (a.data.time||"").localeCompare(b.data.time||""));

        if (list.length > 0) {
            batch.update(db.collection('appointments').doc(list[0].id), { status: 'current' });
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

// ==================== BOOKING LOGIC ====================
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
            if (!isToday || currentHour < 23) { // FIX: Changed to 23
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

    dateSelect.onchange = async function() {
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
        snapshot.forEach(doc => bookedTimes.push(doc.data().time));

        select.innerHTML = '<option value="">Select a 7-min slot</option>';
        let time = new Date();
        time.setHours(9, 30, 0, 0); 
        const bookingEnd = 23; // FIX: Use 23 (11 PM)
        let safetyCounter = 0; // FIX: Prevents infinite loops

        while (time.getHours() < bookingEnd && safetyCounter < 200) {
            safetyCounter++;
            if (time.getHours() === 13) { time.setHours(14, 0, 0, 0); continue; }
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            let endTime = new Date(time);
            endTime.setMinutes(endTime.getMinutes() + 7);
            if (endTime.getHours() >= bookingEnd && endTime.getMinutes() > 0) break; 
            
            const isBooked = bookedTimes.includes(timeStr);
            const option = document.createElement('option');
            option.value = timeStr;
            if (isBooked) {
                option.textContent = `${timeStr} (BOOKED)`;
                option.disabled = true;
                option.className = "text-slate-300 bg-slate-50 italic";
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
    
    try {
        const snap = await db.collection('appointments').where('uid', '==', currentUser.uid).get();
        let pastApps = [];
        snap.forEach(doc => pastApps.push(doc.data()));
        
        const extraAttempts = currentUser.extraAttempts || 0;
        const limit = 3 + extraAttempts;

        if (pastApps.length >= limit) {
            return showToast("Booking limit exceeded! Please visit Admin.");
        }
        if (pastApps.some(app => app.date === d)) {
            return showToast("You already booked a slot on this date!");
        }

        const correctToken = getSlotTokenNumber(t);
        await db.collection('appointments').add({
            uid: currentUser.uid, 
            name: currentUser.name, 
            email: currentUser.email, 
            contactNo: currentUser.contactNo, 
            joiningYear: currentUser.joiningYear, 
            currentYear: currentUser.currentYear, 
            scholarshipType: currentUser.scholarshipType,
            grNumber: currentUser.grNumber, 
            mahadbtId: currentUser.mahadbtId, 
            department: currentUser.department,
            date: d, 
            time: t, 
            status: 'waiting', 
            token: correctToken
        });
        showToast(`Slot Booked! Your Token is ${correctToken}`);
    } catch (e) { showToast("Booking Failed"); }
}

// ==================== WINDOW EXPORTS ====================
window.setUserType = setUserType;
window.setAuthMode = setAuthMode;
window.handleAuth = handleAuth;
window.logout = () => location.reload();
window.bookSlot = bookSlot;
window.nextToken = nextToken;
window.togglePause = togglePause;
window.addExtraTime = addExtraTime; 
window.resetQueueDelay = resetQueueDelay; 
window.updateDocumentStatus = updateDocumentStatus;
window.toggleEditProfile = () => {
    document.getElementById('editMahadbtId').value = currentUser.mahadbtId;
    document.getElementById('editCurrentYear').value = currentUser.currentYear;
    document.getElementById('updateProfileModal').classList.remove('hidden');
};
window.saveProfileUpdate = async () => {
    const id = document.getElementById('editMahadbtId').value;
    const yr = document.getElementById('editCurrentYear').value;
    await db.collection('users').doc(currentUser.uid).update({ mahadbtId: id, currentYear: yr });
    currentUser.mahadbtId = id; currentUser.currentYear = yr;
    document.getElementById('updateProfileModal').classList.add('hidden');
    showStudentDashboard();
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

document.addEventListener('DOMContentLoaded', initApp);