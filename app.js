// ================================================================
// FIREBASE CONFIG
// ================================================================
const firebaseConfig = {
    apiKey: "AIzaSyB6r4WYjiH7Ebrsyj-bI1kdjwPUIx0s6YQ",
    authDomain: "pstrader-64eaa.firebaseapp.com",
    projectId: "pstrader-64eaa",
    storageBucket: "pstrader-64eaa.firebasestorage.app",
    messagingSenderId: "30447360884",
    appId: "1:30447360884:web:b11cf8473d746a6fb22a21",
    measurementId: "G-JWVDME16G8"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================================================================
// STATE
// ================================================================
let currentUser = null;
let userData = null;
let userTrades = [];
let userStrategy = null;
let chartInstances = {};
let editingTradeId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ================================================================
// DOM HELPERS
// ================================================================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ================================================================
// THEME
// ================================================================
function initTheme() {
    const saved = localStorage.getItem('ps-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

document.querySelector('.theme-toggle')?.addEventListener('click', function() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ps-theme', next);
    const icon = this.querySelector('i');
    if (icon) icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    setTimeout(() => updateAllCharts(), 200);
});

// ================================================================
// AUTH
// ================================================================
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        $$('.auth-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const form = this.dataset.form;
        $$('.auth-form').forEach(f => f.classList.remove('active'));
        $(form + 'Form').classList.add('active');
    });
});

// Login
$('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    const alert = $('loginAlert');
    if (!email || !password) return showAlert(alert, 'يرجى ملء جميع الحقول', 'danger');
    try {
        showAlert(alert, 'جاري تسجيل الدخول...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        showAlert(alert, 'تم تسجيل الدخول بنجاح!', 'success');
        setTimeout(() => alert.style.display = 'none', 1500);
    } catch (err) {
        showAlert(alert, getAuthMessage(err.code), 'danger');
        $('loginPassword').value = '';
    }
});

// Register
$('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('registerName').value.trim();
    const email = $('registerEmail').value.trim();
    const password = $('registerPassword').value;
    const confirm = $('registerConfirmPassword').value;
    const capital = parseFloat($('initialCapital').value) || 1000;
    const alert = $('registerAlert');

    if (!name || !email || !password || !confirm) return showAlert(alert, 'يرجى ملء جميع الحقول', 'danger');
    if (name.length < 2) return showAlert(alert, 'الاسم يجب أن يكون حرفين على الأقل', 'danger');
    if (password.length < 6) return showAlert(alert, 'كلمة المرور 6 أحرف على الأقل', 'danger');
    if (password !== confirm) return showAlert(alert, 'كلمات المرور غير متطابقة', 'danger');
    if (capital < 1) return showAlert(alert, 'رأس المال يجب أن يكون أكبر من 0', 'danger');

    try {
        showAlert(alert, 'جاري إنشاء الحساب...', 'info');
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name,
            email,
            initialCapital: capital,
            currentCapital: capital,
            totalTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert(alert, 'تم إنشاء الحساب بنجاح!', 'success');
        setTimeout(() => alert.style.display = 'none', 1500);
    } catch (err) {
        showAlert(alert, getAuthMessage(err.code), 'danger');
    }
});

// Logout
$('logoutBtn')?.addEventListener('click', () => auth.signOut());

// Auth state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        $('authOverlay').classList.add('hidden');
        $('appMain').classList.remove('hidden');
        await loadUserData();
    } else {
        currentUser = null;
        userData = null;
        userTrades = [];
        $('appMain').classList.add('hidden');
        $('authOverlay').classList.remove('hidden');
    }
});

function getAuthMessage(code) {
    const map = {
        'auth/email-already-in-use': 'البريد مستخدم بالفعل',
        'auth/invalid-email': 'بريد غير صالح',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة مرور خاطئة',
        'auth/weak-password': 'كلمة المرور ضعيفة',
        'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
        'auth/network-request-failed': 'خطأ في الشبكة'
    };
    return map[code] || 'حدث خطأ غير معروف';
}

function showAlert(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = `alert alert-${type}`;
    el.style.display = 'block';
}

// ================================================================
// LOAD USER DATA
// ================================================================
async function loadUserData() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (!doc.exists) return;
        userData = doc.data();
        $('userGreeting').textContent = `مرحباً، ${userData.name}`;
        $('userCapital').textContent = `$${userData.currentCapital.toFixed(2)}`;
        $('currentCapitalDisplay').textContent = `$${userData.currentCapital.toFixed(2)}`;
        $('initialCapitalDisplay').textContent = `$${userData.initialCapital.toFixed(2)}`;

        await loadTrades();
        await loadStrategy();
        updateStats();
        updateTradesList();
        updateCalendar();
        updateAllCharts();
        updateAnalysis();
    } catch (err) {
        console.error('Load user data error:', err);
    }
}

// ================================================================
// TRADES
// ================================================================
async function loadTrades() {
    if (!currentUser) return;
    try {
        const snap = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        userTrades = [];
        snap.forEach(doc => {
            const d = doc.data();
            d.id = doc.id;
            if (d.date?.toDate) d.date = d.date.toDate();
            userTrades.push(d);
        });
    } catch (err) {
        const snap = await db.collection('trades').where('userId', '==', currentUser.uid).get();
        userTrades = [];
        snap.forEach(doc => {
            const d = doc.data();
            d.id = doc.id;
            if (d.date?.toDate) d.date = d.date.toDate();
            userTrades.push(d);
        });
        userTrades.sort((a, b) => (b.date || 0) - (a.date || 0));
    }
}

// Add Trade
$('tradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !userData) return alert('يجب تسجيل الدخول');

    const asset = $('asset').value;
    const other = $('otherAsset').value.trim();
    const selectedAsset = asset === 'other' ? other : asset;
    const tradeType = $('tradeType').value;
    const amount = parseFloat($('amount').value);
    const result = $('result').value;
    const profitLoss = parseFloat($('profitLoss').value);
    const session = $('session').value;
    const notes = $('notes').value;
    const date = $('tradeDate').value;
    const imageFile = $('tradeImage').files[0];

    if (!selectedAsset || !tradeType || !amount || !result || isNaN(profitLoss) || !session || !date) {
        return alert('يرجى ملء جميع الحقول المطلوبة');
    }
    if (amount <= 0) return alert('اللوت يجب أن يكون أكبر من 0');
    if (asset === 'other' && !other) return alert('يرجى إدخال اسم الأصل');

    try {
        let imageUrl = '';
        if (imageFile) {
            const ref = storage.ref(`trades/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const snap = await ref.put(imageFile);
            imageUrl = await snap.ref.getDownloadURL();
        }

        await db.collection('trades').add({
            userId: currentUser.uid,
            userName: userData.name,
            asset: selectedAsset,
            tradeType,
            amount,
            result,
            profitLoss,
            session,
            notes,
            imageUrl,
            date: firebase.firestore.Timestamp.fromDate(new Date(date)),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const newCapital = userData.currentCapital + profitLoss;
        const update = { currentCapital: newCapital, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() };
        if (result === 'ربح') update.totalProfit = (userData.totalProfit || 0) + profitLoss;
        else update.totalLoss = (userData.totalLoss || 0) + Math.abs(profitLoss);
        update.totalTrades = (userData.totalTrades || 0) + 1;
        await db.collection('users').doc(currentUser.uid).update(update);

        $('tradeForm').reset();
        $('imagePreview').classList.remove('show');
        $('removeImageBtn').style.display = 'none';
        await loadUserData();
        alert('✅ تم إضافة الصفقة بنجاح!');
    } catch (err) {
        alert('❌ خطأ: ' + err.message);
    }
});

// Delete Trade (global)
window.deleteTrade = async (id) => {
    if (!currentUser) return;
    if (!confirm('هل أنت متأكد من حذف هذه الصفقة؟')) return;
    try {
        const doc = await db.collection('trades').doc(id).get();
        if (!doc.exists) return;
        const trade = doc.data();
        const pl = parseFloat(trade.profitLoss) || 0;
        await db.collection('trades').doc(id).delete();

        const newCapital = userData.currentCapital - pl;
        const update = { currentCapital: newCapital };
        if (trade.result === 'ربح') update.totalProfit = (userData.totalProfit || 0) - pl;
        else update.totalLoss = (userData.totalLoss || 0) - Math.abs(pl);
        update.totalTrades = (userData.totalTrades || 0) - 1;
        await db.collection('users').doc(currentUser.uid).update(update);
        await loadUserData();
        alert('✅ تم حذف الصفقة');
    } catch (err) {
        alert('❌ خطأ: ' + err.message);
    }
};

// Edit Trade (global)
window.editTrade = async (id) => {
    if (!currentUser) return;
    try {
        const doc = await db.collection('trades').doc(id).get();
        if (!doc.exists) return;
        const t = doc.data();
        editingTradeId = id;
        $('editTradeId').value = id;
        $('editOriginalProfitLoss').value = t.profitLoss || 0;

        const common = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD'];
        if (common.includes(t.asset)) {
            $('editAsset').value = t.asset;
            $('editOtherAsset').style.display = 'none';
        } else {
            $('editAsset').value = 'other';
            $('editOtherAsset').style.display = 'block';
            $('editOtherAsset').value = t.asset;
        }
        $('editTradeType').value = t.tradeType || 'شراء';
        $('editAmount').value = t.amount || 0;
        $('editResult').value = t.result || 'ربح';
        $('editProfitLoss').value = t.profitLoss || 0;
        $('editSession').value = t.session || 'أسيوية';
        $('editNotes').value = t.notes || '';

        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || Date.now());
        $('editTradeDate').value = d.toISOString().slice(0, 16);

        const preview = $('editImagePreview');
        const removeBtn = $('editRemoveImageBtn');
        if (t.imageUrl) {
            preview.src = t.imageUrl;
            preview.classList.add('show');
            removeBtn.style.display = 'inline-block';
        } else {
            preview.classList.remove('show');
            removeBtn.style.display = 'none';
        }
        openModal('editTradeModal');
    } catch (err) {
        alert('❌ خطأ في تحميل الصفقة: ' + err.message);
    }
};

// Update Trade
$('editTradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('editTradeId').value;
    const originalPL = parseFloat($('editOriginalProfitLoss').value) || 0;
    if (!id) return;

    const asset = $('editAsset').value;
    const other = $('editOtherAsset').value.trim();
    const selectedAsset = asset === 'other' ? other : asset;
    const tradeType = $('editTradeType').value;
    const amount = parseFloat($('editAmount').value);
    const result = $('editResult').value;
    const profitLoss = parseFloat($('editProfitLoss').value);
    const session = $('editSession').value;
    const notes = $('editNotes').value;
    const date = $('editTradeDate').value;
    const imageFile = $('editTradeImage').files[0];

    if (!selectedAsset || !tradeType || !amount || !result || isNaN(profitLoss) || !session || !date) {
        return alert('يرجى ملء جميع الحقول');
    }

    try {
        let imageUrl = '';
        const oldDoc = await db.collection('trades').doc(id).get();
        if (oldDoc.exists) imageUrl = oldDoc.data().imageUrl || '';
        if (imageFile) {
            const ref = storage.ref(`trades/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const snap = await ref.put(imageFile);
            imageUrl = await snap.ref.getDownloadURL();
        }

        await db.collection('trades').doc(id).update({
            asset: selectedAsset,
            tradeType,
            amount,
            result,
            profitLoss,
            session,
            notes,
            imageUrl,
            date: firebase.firestore.Timestamp.fromDate(new Date(date)),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const diff = profitLoss - originalPL;
        const newCapital = userData.currentCapital + diff;
        const update = { currentCapital: newCapital };
        if (oldDoc.exists) {
            const old = oldDoc.data();
            if (old.result === 'ربح') update.totalProfit = (userData.totalProfit || 0) - old.profitLoss;
            else update.totalLoss = (userData.totalLoss || 0) - Math.abs(old.profitLoss);
            if (result === 'ربح') update.totalProfit = (update.totalProfit || 0) + profitLoss;
            else update.totalLoss = (update.totalLoss || 0) + Math.abs(profitLoss);
        }
        await db.collection('users').doc(currentUser.uid).update(update);
        closeModal('editTradeModal');
        await loadUserData();
        alert('✅ تم تحديث الصفقة');
    } catch (err) {
        alert('❌ خطأ: ' + err.message);
    }
});

// ================================================================
// STRATEGY
// ================================================================
async function loadStrategy() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('strategies').doc(currentUser.uid).get();
        if (doc.exists) {
            userStrategy = doc.data();
            $('strategyText').value = userStrategy.text || '';
            $('strategyPreview').textContent = userStrategy.text || 'لم تقم بكتابة استراتيجية بعد';
        }
    } catch (err) { /* ignore */ }
}

$('saveStrategyBtn')?.addEventListener('click', async () => {
    if (!currentUser) return alert('يجب تسجيل الدخول');
    const text = $('strategyText').value.trim();
    if (!text) return alert('يرجى كتابة الاستراتيجية');
    try {
        await db.collection('strategies').doc(currentUser.uid).set({ text, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        userStrategy = { text };
        $('strategyPreview').textContent = text;
        alert('✅ تم حفظ الاستراتيجية');
    } catch (err) {
        alert('❌ خطأ: ' + err.message);
    }
});

// ================================================================
// STATS
// ================================================================
function updateStats() {
    const total = userTrades.length;
    if (total === 0) {
        ['totalTrades', 'winRate', 'totalProfit', 'totalLoss', 'netProfit'].forEach(id => {
            const el = $(id);
            if (el) el.textContent = id === 'totalTrades' ? '0' : id === 'winRate' ? '0%' : '$0.00';
        });
        return;
    }
    const profits = userTrades.map(t => parseFloat(t.profitLoss) || 0);
    const wins = profits.filter(p => p > 0).length;
    const totalProfit = profits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const totalLoss = profits.filter(p => p < 0).reduce((a, b) => a + Math.abs(b), 0);
    const net = totalProfit - totalLoss;
    const rate = (wins / total) * 100;

    $('totalTrades').textContent = total;
    $('winRate').textContent = rate.toFixed(1) + '%';
    $('totalProfit').textContent = '$' + totalProfit.toFixed(2);
    $('totalLoss').textContent = '$' + totalLoss.toFixed(2);
    const netEl = $('netProfit');
    if (netEl) {
        netEl.textContent = '$' + net.toFixed(2);
        netEl.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
    }
}

// ================================================================
// TRADES LIST
// ================================================================
function updateTradesList() {
    const container = $('tradesList');
    const count = $('tradesCount');
    if (!container) return;

    let filtered = [...userTrades];
    const asset = $('filterAsset')?.value || 'all';
    const session = $('filterSession')?.value || 'all';
    const result = $('filterResult')?.value || 'all';

    if (asset !== 'all') filtered = filtered.filter(t => t.asset === asset);
    if (session !== 'all') filtered = filtered.filter(t => t.session === session);
    if (result !== 'all') filtered = filtered.filter(t => t.result === result);

    if (count) count.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML =
            `<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد صفقات</p></div>`;
        return;
    }

    container.innerHTML = filtered.slice(0, 50).map(t => {
        const pl = parseFloat(t.profitLoss) || 0;
        const isProfit = pl >= 0;
        const dateStr = t.date ? new Date(t.date).toLocaleDateString('ar-EG') : '—';
        return `
            <div class="trade-item ${isProfit ? '' : 'loss'}">
                <div class="trade-main">
                    <span class="symbol">${t.asset || '—'}</span>
                    <span class="type ${t.tradeType === 'شراء' ? 'buy' : 'sell'}">${t.tradeType || '—'}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${dateStr}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${t.session || '—'}</span>
                </div>
                <div class="trade-meta">
                    <span class="pnl ${isProfit ? 'positive' : 'negative'}">${isProfit ? '+' : ''}$${Math.abs(pl).toFixed(2)}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">لوت $${(t.amount || 0).toFixed(2)}</span>
                    <div class="trade-actions">
                        ${t.imageUrl ? `<button class="btn-icon" onclick="showImage('${t.imageUrl}')"><i class="fas fa-image"></i></button>` : ''}
                        ${t.notes ? `<button class="btn-icon" onclick="showNotes('${t.notes.replace(/'/g, "\\'")}')"><i class="fas fa-sticky-note"></i></button>` : ''}
                        <button class="btn-icon" onclick="editTrade('${t.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="deleteTrade('${t.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ================================================================
// CALENDAR
// ================================================================
function updateCalendar() {
    const grid = $('calendarGrid');
    if (!grid) return;
    const title = $('calendarTitle');
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    if (title) title.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    let html = '';
    const weekdays = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
    weekdays.forEach(d => html += `<div class="calendar-weekday">${d}</div>`);

    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr =
            `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrades = userTrades.filter(t => {
            if (!t.date) return false;
            const d = t.date instanceof Date ? t.date : new Date(t.date);
            return d.toISOString().split('T')[0] === dateStr;
        });
        let dayPnl = 0;
        dayTrades.forEach(t => dayPnl += parseFloat(t.profitLoss) || 0);

        let cls = 'calendar-day';
        if (dayTrades.length > 0) cls += ' has-trades';
        const pnlClass = dayPnl >= 0 ? 'positive' : 'negative';
        html += `
            <div class="${cls}" onclick="showDayTrades('${dateStr}')">
                <div class="day-num">${day}</div>
                ${dayTrades.length > 0 ? `<div class="day-count">${dayTrades.length} صفقة</div>` : ''}
                ${dayTrades.length > 0 ? `<div class="day-pnl ${pnlClass}">${dayPnl >= 0 ? '+' : ''}$${dayPnl.toFixed(2)}</div>` : ''}
            </div>
        `;
    }
    grid.innerHTML = html;
}

window.prevMonth = function() { currentMonth--; if (currentMonth < 0) { currentMonth = 11;
        currentYear--; } updateCalendar(); };
window.nextMonth = function() { currentMonth++; if (currentMonth > 11) { currentMonth = 0;
        currentYear++; } updateCalendar(); };

window.showDayTrades = function(dateStr) {
    const dayTrades = userTrades.filter(t => {
        if (!t.date) return false;
        const d = t.date instanceof Date ? t.date : new Date(t.date);
        return d.toISOString().split('T')[0] === dateStr;
    });
    const details = $('dayDetails');
    const title = $('selectedDayTitle');
    const list = $('dayTradesList');
    if (!details || !list) return;

    const d = new Date(dateStr + 'T00:00:00');
    title.textContent =
        `تفاصيل الصفقات ليوم ${d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    if (dayTrades.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">لا توجد صفقات في هذا اليوم</p>';
    } else {
        let total = 0;
        list.innerHTML = dayTrades.map(t => {
            const pl = parseFloat(t.profitLoss) || 0;
            total += pl;
            return `
                <div class="trade-item ${pl >= 0 ? '' : 'loss'}" style="margin-bottom:6px;">
                    <div class="trade-main">
                        <span class="symbol">${t.asset}</span>
                        <span class="type ${t.tradeType === 'شراء' ? 'buy' : 'sell'}">${t.tradeType}</span>
                        <span style="font-size:0.75rem;color:var(--text-muted);">${t.session}</span>
                    </div>
                    <span class="pnl ${pl >= 0 ? 'positive' : 'negative'}">${pl >= 0 ? '+' : ''}$${Math.abs(pl).toFixed(2)}</span>
                </div>
            `;
        }).join('');
        list.innerHTML += `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);font-weight:700;text-align:left;">
                إجمالي اليوم: <span style="color:${total >= 0 ? 'var(--green)' : 'var(--red)'}">${total >= 0 ? '+' : ''}$${total.toFixed(2)}</span>
            </div>
        `;
    }
    details.style.display = 'block';
};

// ================================================================
// CHARTS - FULL FIXED VERSION
// ================================================================
function updateAllCharts() {
    // Destroy old charts
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            try { chartInstances[key].destroy(); } catch (e) {}
            delete chartInstances[key];
        }
    });

    if (userTrades.length === 0) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#848e9c' : '#5e6673';
    const gridColor = isDark ? '#2a2f3d' : '#e6e8ec';

    // 1. Win/Loss Doughnut
    const wins = userTrades.filter(t => t.result === 'ربح').length;
    const losses = userTrades.filter(t => t.result === 'خسارة').length;
    const wlCanvas = $('winLossChart');
    if (wlCanvas) {
        chartInstances.winLoss = new Chart(wlCanvas, {
            type: 'doughnut',
            data: { labels: ['أرباح', 'خسائر'], datasets: [{ data: [wins, losses], backgroundColor: ['#00d4aa',
                        '#f6465d'
                    ], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom',
                        labels: { color: textColor } } } }
        });
    }

    // 2. Session Bar
    const sessions = {};
    userTrades.forEach(t => { if (t.session) sessions[t.session] = (sessions[t.session] || 0) + 1; });
    const sCanvas = $('sessionChart');
    if (sCanvas) {
        chartInstances.session = new Chart(sCanvas, {
            type: 'bar',
            data: { labels: Object.keys(sessions), datasets: [{ label: 'الصفقات', data: Object.values(sessions),
                    backgroundColor: '#4a7cf7', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } } } }
        });
    }

    // 3. Asset Pie
    const assets = {};
    userTrades.forEach(t => { if (t.asset) assets[t.asset] = (assets[t.asset] || 0) + 1; });
    const colors = ['#00d4aa', '#4a7cf7', '#fbbf24', '#f6465d', '#a78bfa', '#34d399', '#f472b6'];
    const assetLabels = Object.keys(assets);
    const assetData = Object.values(assets);
    const aCanvas = $('assetChart');
    if (aCanvas) {
        chartInstances.asset = new Chart(aCanvas, {
            type: 'pie',
            data: { labels: assetLabels, datasets: [{ data: assetData, backgroundColor: colors.slice(0,
                        assetLabels.length), borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right',
                        labels: { color: textColor } } } }
        });
    }

    // 4. Profit Line (last 7 days)
    const last7 = [];
    const profit7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        let sum = 0;
        userTrades.forEach(t => {
            if (!t.date) return;
            const td = t.date instanceof Date ? t.date : new Date(t.date);
            if (td.toISOString().split('T')[0] === key) sum += parseFloat(t.profitLoss) || 0;
        });
        last7.push(key.slice(5));
        profit7.push(sum);
    }
    const pCanvas = $('profitChart');
    if (pCanvas) {
        chartInstances.profit = new Chart(pCanvas, {
            type: 'line',
            data: { labels: last7, datasets: [{ label: 'صافي الربح اليومي', data: profit7, borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0,212,170,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } },
                scales: { y: { grid: { color: gridColor }, ticks: { color: textColor } }, x: { ticks: { color: textColor } } } }
        });
    }

    // 5. Capital Chart
    const capData = [userData.initialCapital];
    const capLabels = ['البداية'];
    let cap = userData.initialCapital;
    const sorted = [...userTrades].sort((a, b) => (a.date || 0) - (b.date || 0));
    sorted.forEach((t, i) => {
        cap += parseFloat(t.profitLoss) || 0;
        capData.push(cap);
        capLabels.push(`#${i + 1}`);
    });
    const cCanvas = $('capitalChart');
    if (cCanvas) {
        chartInstances.capital = new Chart(cCanvas, {
            type: 'line',
            data: { labels: capLabels, datasets: [{ label: 'رأس المال', data: capData, borderColor: '#4a7cf7',
                    backgroundColor: 'rgba(74,124,247,0.1)', fill: true, tension: 0.3, pointRadius: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } },
                scales: { y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => '$' + v
                            .toFixed(0) } }, x: { ticks: { color: textColor, maxTicksLimit: 15 } } } }
        });
    }

    // 6. Monthly Trades
    const monthly = {};
    userTrades.forEach(t => {
        if (!t.date) return;
        const d = t.date instanceof Date ? t.date : new Date(t.date);
        const key = d.getFullYear() + '-' + d.getMonth();
        monthly[key] = (monthly[key] || 0) + 1;
    });
    const sortedMonths = Object.keys(monthly).sort();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر',
        'ديسمبر'
    ];
    const mLabels = sortedMonths.map(k => { const [y, m] = k.split('-'); return monthNames[parseInt(m)] + ' ' + y; });
    const mData = sortedMonths.map(k => monthly[k]);
    const mtCanvas = $('monthlyTradesChart');
    if (mtCanvas) {
        chartInstances.monthlyTrades = new Chart(mtCanvas, {
            type: 'bar',
            data: { labels: mLabels, datasets: [{ label: 'عدد الصفقات', data: mData, backgroundColor: '#4a7cf7',
                    borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } } } }
        });
    }

    // 7. Monthly Success Rate
    const monthlySuccess = {};
    userTrades.forEach(t => {
        if (!t.date) return;
        const d = t.date instanceof Date ? t.date : new Date(t.date);
        const key = d.getFullYear() + '-' + d.getMonth();
        if (!monthlySuccess[key]) monthlySuccess[key] = { total: 0, wins: 0 };
        monthlySuccess[key].total++;
        if (t.result === 'ربح') monthlySuccess[key].wins++;
    });
    const sortedMS = Object.keys(monthlySuccess).sort();
    const msLabels = sortedMS.map(k => { const [y, m] = k.split('-'); return monthNames[parseInt(m)] + ' ' + y; });
    const rates = sortedMS.map(k => monthlySuccess[k].total > 0 ? (monthlySuccess[k].wins / monthlySuccess[k].total) *
        100 : 0);
    const msCanvas = $('monthlySuccessChart');
    if (msCanvas) {
        chartInstances.monthlySuccess = new Chart(msCanvas, {
            type: 'line',
            data: { labels: msLabels, datasets: [{ label: 'نسبة الفوز %', data: rates, borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0,212,170,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } },
                scales: { y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } } } }
        });
    }
}

// ================================================================
// ANALYSIS
// ================================================================
function updateAnalysis() {
    const container = $('analysisContent');
    if (!container) return;
    if (userTrades.length < 5) {
        container.innerHTML =
            `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-chart-line"></i><p>يحتاج التحليل إلى 5 صفقات على الأقل</p></div>`;
        return;
    }

    const total = userTrades.length;
    const wins = userTrades.filter(t => t.result === 'ربح').length;
    const losses = total - wins;
    const rate = (wins / total) * 100;
    const profits = userTrades.map(t => parseFloat(t.profitLoss) || 0);
    const totalProfit = profits.filter(p => p > 0).reduce((a, b) => a + b, 0);
    const totalLoss = profits.filter(p => p < 0).reduce((a, b) => a + Math.abs(b), 0);
    const avgWin = wins > 0 ? totalProfit / wins : 0;
    const avgLoss = losses > 0 ? totalLoss / losses : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
    const pf = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;

    const lossBySession = {};
    const lossByAsset = {};
    userTrades.filter(t => t.result === 'خسارة').forEach(t => {
        if (t.session) lossBySession[t.session] = (lossBySession[t.session] || 0) + 1;
        if (t.asset) lossByAsset[t.asset] = (lossByAsset[t.asset] || 0) + 1;
    });
    const worstSession = Object.keys(lossBySession).sort((a, b) => lossBySession[b] - lossBySession[a])[0] || '—';
    const worstAsset = Object.keys(lossByAsset).sort((a, b) => lossByAsset[b] - lossByAsset[a])[0] || '—';

    const tips = rate < 40 ? ['راجع استراتيجية الدخول', 'استخدم وقف الخسارة', 'تدرب على حساب تجريبي'] :
        rate < 60 ? ['حسن نسبة العائد للمخاطرة', 'استخدم التحليل الفني', 'احتفظ بمذكرة تداول'] :
        ['استمر في استراتيجيتك', 'زود حجم الصفقات تدريجياً', 'نوع بين الأصول'];

    container.innerHTML = `
        <div class="analysis-card">
            <h4><i class="fas fa-chart-line-down"></i> أنماط الخسارة</h4>
            <div class="metric-row"><span class="label">عدد الخسائر</span><span class="value">${losses}</span></div>
            <div class="metric-row"><span class="label">نسبة الخسائر</span><span class="value">${(losses / total * 100).toFixed(1)}%</span></div>
            <div class="metric-row"><span class="label">الجلسة الأكثر خسارة</span><span class="value">${worstSession}</span></div>
            <div class="metric-row"><span class="label">الأصل الأكثر خسارة</span><span class="value">${worstAsset}</span></div>
        </div>
        <div class="analysis-card">
            <h4><i class="fas fa-lightbulb"></i> نصائح لتحسين الأداء</h4>
            <div class="tip-grid">
                ${tips.map(t => `<div class="tip-item"><i class="fas fa-bullseye"></i>${t}</div>`).join('')}
            </div>
        </div>
        <div class="analysis-card">
            <h4><i class="fas fa-balance-scale"></i> مقاييس المخاطرة</h4>
            <div class="metric-row"><span class="label">نسبة Risk/Reward</span><span class="value ${rr >= 1.5 ? 'positive' : 'negative'}">${rr.toFixed(2)}</span></div>
            <div class="metric-row"><span class="label">Profit Factor</span><span class="value ${pf >= 1.5 ? 'positive' : 'negative'}">${pf.toFixed(2)}</span></div>
            <div class="metric-row"><span class="label">متوسط الربح</span><span class="value positive">$${avgWin.toFixed(2)}</span></div>
            <div class="metric-row"><span class="label">متوسط الخسارة</span><span class="value negative">$${avgLoss.toFixed(2)}</span></div>
        </div>
        ${losses >= 3 ? `
        <div class="analysis-card warning" style="grid-column:1/-1;">
            <h4><i class="fas fa-exclamation-triangle"></i> تنبيه: سلسلة خسائر</h4>
            <p style="color:var(--text-secondary);">لديك ${losses} خسائر. ننصح بأخذ استراحة لمدة 24 ساعة لإعادة التركيز.</p>
        </div>` : ''}
    `;
}

$('analyzeBtn')?.addEventListener('click', updateAnalysis);

// ================================================================
// MODALS
// ================================================================
function openModal(id) {
    const el = $(id);
    if (el) el.classList.add('active');
}
window.closeModal = function(id) {
    const el = $(id);
    if (el) el.classList.remove('active');
};

window.showImage = function(url) {
    $('modalImage').src = url;
    openModal('imageModal');
};
window.showNotes = function(notes) {
    $('notesContent').textContent = notes;
    openModal('notesModal');
};

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
});

// Capital Modal
$('editCapitalBtn')?.addEventListener('click', () => {
    if (!userData) return;
    $('currentCapitalInput').value = userData.currentCapital;
    openModal('capitalModal');
});

$('saveCapitalBtn')?.addEventListener('click', async () => {
    if (!currentUser || !userData) return;
    const val = parseFloat($('currentCapitalInput').value);
    if (isNaN(val) || val < 0) return alert('قيمة غير صالحة');
    try {
        await db.collection('users').doc(currentUser.uid).update({ currentCapital: val });
        userData.currentCapital = val;
        $('userCapital').textContent = '$' + val.toFixed(2);
        $('currentCapitalDisplay').textContent = '$' + val.toFixed(2);
        closeModal('capitalModal');
        alert('✅ تم تحديث رأس المال');
    } catch (err) {
        alert('❌ خطأ: ' + err.message);
    }
});

// ================================================================
// FILTERS
// ================================================================
['filterAsset', 'filterSession', 'filterResult'].forEach(id => {
    $(id)?.addEventListener('change', updateTradesList);
});

// ================================================================
// TABS
// ================================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        const target = this.dataset.tab;
        const el = $(target + '-tab');
        if (el) el.classList.add('active');
        if (target === 'charts' || target === 'performance') setTimeout(updateAllCharts, 200);
        if (target === 'analysis') updateAnalysis();
        if (target === 'calendar') updateCalendar();
    });
});

// ================================================================
// IMAGE PREVIEWS
// ================================================================
$('tradeImage')?.addEventListener('change', function() {
    const preview = $('imagePreview');
    const remove = $('removeImageBtn');
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result;
            preview.classList.add('show');
            remove.style.display = 'inline-block'; };
        reader.readAsDataURL(this.files[0]);
    }
});
$('removeImageBtn')?.addEventListener('click', () => {
    $('imagePreview').classList.remove('show');
    $('removeImageBtn').style.display = 'none';
    $('tradeImage').value = '';
});

$('editTradeImage')?.addEventListener('change', function() {
    const preview = $('editImagePreview');
    const remove = $('editRemoveImageBtn');
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result;
            preview.classList.add('show');
            remove.style.display = 'inline-block'; };
        reader.readAsDataURL(this.files[0]);
    }
});
$('editRemoveImageBtn')?.addEventListener('click', () => {
    $('editImagePreview').classList.remove('show');
    $('editRemoveImageBtn').style.display = 'none';
    $('editTradeImage').value = '';
});

// Asset "other" toggle
$('asset')?.addEventListener('change', function() {
    $('otherAsset').style.display = this.value === 'other' ? 'block' : 'none';
});
$('editAsset')?.addEventListener('change', function() {
    $('editOtherAsset').style.display = this.value === 'other' ? 'block' : 'none';
});

// ================================================================
// INIT
// ================================================================
initTheme();

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 16);
    if ($('tradeDate')) $('tradeDate').value = iso;
    if ($('editTradeDate')) $('editTradeDate').value = iso;
});

console.log('🚀 PS-Trader Pro loaded successfully!');
