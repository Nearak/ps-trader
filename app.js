// إدارة المستخدمين والجلسات
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let users = JSON.parse(localStorage.getItem('users')) || {};

// مصفوفة لتخزين صفقات المستخدم الحالي
let trades = [];

// متغيرات التقويم
let currentDate = new Date();
let selectedDate = null;

// عناصر DOM
const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent');
const userInfo = document.getElementById('userInfo');
const userGreeting = document.getElementById('userGreeting');
const logoutBtn = document.getElementById('logoutBtn');

// عناصر النماذج
const loginForm = document.getElementById('loginUserForm');
const registerForm = document.getElementById('registerUserForm');
const tradeForm = document.getElementById('tradeForm');

// عناصر التنبيهات
const loginAlert = document.getElementById('loginAlert');
const registerAlert = document.getElementById('registerAlert');

// عناصر التبويبات
const authTabs = document.querySelectorAll('.auth-tab');
const appTabs = document.querySelectorAll('.tab');

// عناصر أخرى
const transactionsList = document.getElementById('transactionsList');
const calendarDays = document.getElementById('calendar-days');
const calendarMonthYear = document.getElementById('calendar-month-year');
const dayDetails = document.getElementById('day-details');
const selectedDayEl = document.getElementById('selected-day');
const dayTradesList = document.getElementById('day-trades-list');

// عناصر الإحصائيات
const totalTradesEl = document.getElementById('totalTrades');
const winningTradesEl = document.getElementById('winningTrades');
const losingTradesEl = document.getElementById('losingTrades');
const successRateEl = document.getElementById('successRate');
const totalProfitLossEl = document.getElementById('totalProfitLoss');
const averageTradeEl = document.getElementById('averageTrade');
const bestSessionEl = document.getElementById('bestSession');
const bestAssetEl = document.getElementById('bestAsset');

// عناصر الفلاتر
const filterAsset = document.getElementById('filterAsset');
const filterSession = document.getElementById('filterSession');
const filterResult = document.getElementById('filterResult');

// عناصر التحكم في التقويم
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthBtn = document.getElementById('current-month');

// عناصر الرسم البياني
let winLossChart, sessionChart, assetChart, profitChart;

// تهيئة التطبيق
function initApp() {
    if (currentUser) {
        showApp();
        loadUserTrades();
    } else {
        showAuth();
    }
    
    setupEventListeners();
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // أحداث تسجيل الدخول والتسجيل
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    
    // أحداث التبويبات
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const formType = this.getAttribute('data-form');
            switchAuthForm(formType);
        });
    });
    
    appTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchAppTab(tabId);
            
            // إذا كان التبويب هو الرسوم البيانية، قم بتحديثها
            if (tabId === 'charts') {
                updateCharts();
            }
        });
    });
    
    // أحداث التقويم
    prevMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    currentMonthBtn.addEventListener('click', function() {
        currentDate = new Date();
        renderCalendar();
    });
    
    // إدارة حقل الأصل الآخر
    document.getElementById('asset').addEventListener('change', function() {
        const otherAssetInput = document.getElementById('otherAsset');
        if (this.value === 'other') {
            otherAssetInput.style.display = 'block';
            otherAssetInput.required = true;
        } else {
            otherAssetInput.style.display = 'none';
            otherAssetInput.required = false;
        }
    });
    
    // تعيين تاريخ اليوم كقيمة افتراضية
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('tradeDate').value = now.toISOString().slice(0, 16);
    
    // إضافة صفقة جديدة
    tradeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let asset = document.getElementById('asset').value;
        if (asset === 'other') {
            asset = document.getElementById('otherAsset').value;
        }
        
        const trade = {
            id: Date.now(),
            date: document.getElementById('tradeDate').value,
            asset: asset,
            type: document.getElementById('tradeType').value,
            session: document.getElementById('session').value,
            amount: parseFloat(document.getElementById('amount').value),
            result: document.getElementById('result').value,
            profitLoss: parseFloat(document.getElementById('profitLoss').value),
            notes: document.getElementById('notes').value
        };
        
        trades.push(trade);
        saveUserTrades();
        renderTrades();
        updateStats();
        renderCalendar();
        updateFilterOptions();
        
        // إعادة تعيين النموذج
        tradeForm.reset();
        document.getElementById('tradeDate').value = now.toISOString().slice(0, 16);
        document.getElementById('otherAsset').style.display = 'none';
        
        // إظهار رسالة نجاح
        showAlert(loginAlert, 'تم إضافة الصفقة بنجاح!', 'success');
    });
    
    // أحداث الفلاتر
    filterAsset.addEventListener('change', renderTrades);
    filterSession.addEventListener('change', renderTrades);
    filterResult.addEventListener('change', renderTrades);
}

// تحديث خيارات الفلتر
function updateFilterOptions() {
    const assets = [...new Set(trades.map(trade => trade.asset))];
    filterAsset.innerHTML = '<option value="">جميع الأصول</option>';
    assets.forEach(asset => {
        filterAsset.innerHTML += `<option value="${asset}">${asset}</option>`;
    });
}

// معالجة تسجيل الدخول
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // التحقق من وجود المستخدم
    if (users[email] && users[email].password === password) {
        currentUser = { email, name: users[email].name };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        loadUserTrades();
        showAlert(loginAlert, 'تم تسجيل الدخول بنجاح!', 'success');
    } else {
        showAlert(loginAlert, 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    }
}

// معالجة إنشاء حساب جديد
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // التحقق من تطابق كلمات المرور
    if (password !== confirmPassword) {
        showAlert(registerAlert, 'كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    // التحقق من عدم وجود حساب مسبقاً
    if (users[email]) {
        showAlert(registerAlert, 'هذا البريد الإلكتروني مسجل مسبقاً', 'error');
        return;
    }
    
    // إنشاء حساب جديد
    users[email] = { name, password, trades: [] };
    localStorage.setItem('users', JSON.stringify(users));
    
    // تسجيل الدخول تلقائياً
    currentUser = { email, name };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showApp();
    loadUserTrades();
    showAlert(registerAlert, 'تم إنشاء الحساب بنجاح!', 'success');
    
    // الانتقال إلى نموذج تسجيل الدخول
    switchAuthForm('login');
    registerForm.reset();
}

// معالجة تسجيل الخروج
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuth();
    trades = [];
}

// تحميل صفقات المستخدم الحالي
function loadUserTrades() {
    if (currentUser && users[currentUser.email]) {
        trades = users[currentUser.email].trades || [];
        renderTrades();
        updateStats();
        renderCalendar();
        updateFilterOptions();
    }
}

// حفظ صفقات المستخدم الحالي
function saveUserTrades() {
    if (currentUser && users[currentUser.email]) {
        users[currentUser.email].trades = trades;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// عرض واجهة المصادقة
function showAuth() {
    authSection.style.display = 'block';
    appContent.style.display = 'none';
    userInfo.style.display = 'none';
}

// عرض واجهة التطبيق
function showApp() {
    authSection.style.display = 'none';
    appContent.style.display = 'block';
    userInfo.style.display = 'flex';
    userGreeting.textContent = `مرحباً، ${currentUser.name}`;
}

// تبديل نماذج المصادقة
function switchAuthForm(formType) {
    // إزالة النشاط من جميع التبويبات
    authTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // إخفاء جميع النماذج
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // إضافة النشاط للتبويب والنموذج المحدد
    document.querySelector(`.auth-tab[data-form="${formType}"]`).classList.add('active');
    document.getElementById(`${formType}Form`).classList.add('active');
    
    // مسح التنبيهات
    loginAlert.style.display = 'none';
    registerAlert.style.display = 'none';
}

// تبديل تبويبات التطبيق
function switchAppTab(tabId) {
    // إزالة النشاط من جميع التبويبات
    appTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // إخفاء جميع المحتويات
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // إضافة النشاط للتبويب والمحتوى المحدد
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// عرض التنبيهات
function showAlert(alertElement, message, type) {
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';
    
    // إخفاء التنبيه بعد 5 ثوانٍ
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

// عرض الصفقات في الجدول
function renderTrades() {
    if (trades.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">لا توجد صفقات مسجلة بعد. ابدأ بإضافة أول صفقة.</p>';
        return;
    }
    
    // تطبيق الفلاتر
    let filteredTrades = [...trades];
    if (filterAsset.value) {
        filteredTrades = filteredTrades.filter(trade => trade.asset === filterAsset.value);
    }
    if (filterSession.value) {
        filteredTrades = filteredTrades.filter(trade => trade.session === filterSession.value);
    }
    if (filterResult.value) {
        filteredTrades = filteredTrades.filter(trade => trade.result === filterResult.value);
    }
    
    if (filteredTrades.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">لا توجد صفقات تطابق معايير البحث.</p>';
        return;
    }
    
    // ترتيب الصفقات من الأحدث إلى الأقدم
    const sortedTrades = filteredTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الأصل</th>
                    <th>النوع</th>
                    <th>الجلسة</th>
                    <th>القيمة ($)</th>
                    <th>النتيجة</th>
                    <th>الربح/الخسارة ($)</th>
                    <th>ملاحظات</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedTrades.forEach(trade => {
        const resultClass = trade.result === 'ربح' ? 'profit' : 'loss';
        const resultSign = trade.result === 'ربح' ? '+' : '';
        const sessionClass = `session-${trade.session.toLowerCase()}`;
        
        html += `
            <tr>
                <td>${formatDateTime(trade.date)}</td>
                <td>${trade.asset}</td>
                <td>${trade.type}</td>
                <td><span class="session-badge ${sessionClass}">${trade.session}</span></td>
                <td>$${trade.amount.toFixed(2)}</td>
                <td class="${resultClass}">${trade.result}</td>
                <td class="${resultClass}">${resultSign}$${trade.profitLoss.toFixed(2)}</td>
                <td class="notes-cell" title="${trade.notes || 'لا توجد ملاحظات'}">${trade.notes || '-'}</td>
                <td><button class="delete-btn" onclick="deleteTrade(${trade.id})"><i class="fas fa-trash"></i> حذف</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    transactionsList.innerHTML = html;
}

// تحديث الإحصائيات
function updateStats() {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.result === 'ربح').length;
    const losingTrades = totalTrades - winningTrades;
    const successRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    const totalProfitLoss = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const averageTrade = totalTrades > 0 ? (totalProfitLoss / totalTrades).toFixed(2) : 0;
    
    // حساب أفضل جلسة
    const sessionProfits = {};
    trades.forEach(trade => {
        if (!sessionProfits[trade.session]) {
            sessionProfits[trade.session] = 0;
        }
        sessionProfits[trade.session] += trade.profitLoss;
    });
    
    let bestSession = '-';
    let bestSessionProfit = -Infinity;
    Object.keys(sessionProfits).forEach(session => {
        if (sessionProfits[session] > bestSessionProfit) {
            bestSession = session;
            bestSessionProfit = sessionProfits[session];
        }
    });
    
    // حساب أفضل أصل
    const assetProfits = {};
    trades.forEach(trade => {
        if (!assetProfits[trade.asset]) {
            assetProfits[trade.asset] = 0;
        }
        assetProfits[trade.asset] += trade.profitLoss;
    });
    
    let bestAsset = '-';
    let bestAssetProfit = -Infinity;
    Object.keys(assetProfits).forEach(asset => {
        if (assetProfits[asset] > bestAssetProfit) {
            bestAsset = asset;
            bestAssetProfit = assetProfits[asset];
        }
    });
    
    totalTradesEl.textContent = totalTrades;
    winningTradesEl.textContent = winningTrades;
    losingTradesEl.textContent = losingTrades;
    successRateEl.textContent = `${successRate}%`;
    
    totalProfitLossEl.textContent = `$${totalProfitLoss.toFixed(2)}`;
    totalProfitLossEl.className = totalProfitLoss >= 0 ? 'stat-value positive' : 'stat-value negative';
    
    averageTradeEl.textContent = `$${averageTrade}`;
    averageTradeEl.className = averageTrade >= 0 ? 'stat-value positive' : 'stat-value negative';
    
    bestSessionEl.textContent = bestSession;
    bestAssetEl.textContent = bestAsset;
}

// تحديث الرسوم البيانية
function updateCharts() {
    if (trades.length === 0) return;
    
    // تدمير المخططات القديمة إذا كانت موجودة
    if (winLossChart) winLossChart.destroy();
    if (sessionChart) sessionChart.destroy();
    if (assetChart) assetChart.destroy();
    if (profitChart) profitChart.destroy();
    
    // مخطط الربح/الخسارة
    const winLossCtx = document.getElementById('winLossChart').getContext('2d');
    const winCount = trades.filter(t => t.result === 'ربح').length;
    const lossCount = trades.filter(t => t.result === 'خسارة').length;
    
    winLossChart = new Chart(winLossCtx, {
        type: 'doughnut',
        data: {
            labels: ['صفقات رابحة', 'صفقات خاسرة'],
            datasets: [{
                data: [winCount, lossCount],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true
                },
                title: {
                    display: true,
                    text: 'توزيع الصفقات'
                }
            }
        }
    });
    
    // مخطط الجلسات
    const sessionCtx = document.getElementById('sessionChart').getContext('2d');
    const sessionData = {};
    trades.forEach(trade => {
        if (!sessionData[trade.session]) {
            sessionData[trade.session] = { profit: 0, count: 0 };
        }
        sessionData[trade.session].profit += trade.profitLoss;
        sessionData[trade.session].count++;
    });
    
    sessionChart = new Chart(sessionCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(sessionData),
            datasets: [{
                label: 'صافي الربح ($)',
                data: Object.values(sessionData).map(s => s.profit),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'الأداء حسب الجلسة'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // مخطط الأصول
    const assetCtx = document.getElementById('assetChart').getContext('2d');
    const assetData = {};
    trades.forEach(trade => {
        if (!assetData[trade.asset]) {
            assetData[trade.asset] = 0;
        }
        assetData[trade.asset] += trade.profitLoss;
    });
    
    // نأخذ أفضل 5 أصول فقط
    const topAssets = Object.entries(assetData)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5);
    
    assetChart = new Chart(assetCtx, {
        type: 'pie',
        data: {
            labels: topAssets.map(a => a[0]),
            datasets: [{
                data: topAssets.map(a => a[1]),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true
                },
                title: {
                    display: true,
                    text: 'الأداء حسب الأصل'
                }
            }
        }
    });
    
    // مخطط تطور الأرباح
    const profitCtx = document.getElementById('profitChart').getContext('2d');
    const sortedTradesByDate = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningTotal = 0;
    const profitData = [];
    const dates = [];
    
    sortedTradesByDate.forEach(trade => {
        runningTotal += trade.profitLoss;
        profitData.push(runningTotal);
        dates.push(formatDate(trade.date));
    });
    
    profitChart = new Chart(profitCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'إجمالي الأرباح ($)',
                data: profitData,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true
                },
                title: {
                    display: true,
                    text: 'تطور الأرباح عبر الزمن'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// حذف صفقة
function deleteTrade(id) {
    if (confirm('هل أنت متأكد من حذف هذه الصفقة؟')) {
        trades = trades.filter(trade => trade.id !== id);
        saveUserTrades();
        renderTrades();
        updateStats();
        renderCalendar();
        updateFilterOptions();
        
        // تحديث الرسوم البيانية إذا كانت مرئية
        if (document.getElementById('charts-tab').classList.contains('active')) {
            updateCharts();
        }
        
        // إذا كانت الصفقة المحذوفة هي من اليوم المحدد، قم بتحديث التفاصيل
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const dayTrades = trades.filter(trade => trade.date.startsWith(dateStr));
            
            if (dayTrades.length === 0) {
                dayDetails.classList.remove('active');
            } else {
                showDayDetails(selectedDate);
            }
        }
    }
}

// تنسيق التاريخ
function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
}

// تنسيق التاريخ والوقت
function formatDateTime(dateTimeString) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString('ar-EG', options);
}

// عرض التقويم
function renderCalendar() {
    // تحديد أول وآخر يوم من الشهر
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // تحديد أول يوم في الشبكة (قد يكون من الشهر السابق)
    const firstDayOfGrid = new Date(firstDay);
    firstDayOfGrid.setDate(firstDayOfGrid.getDate() - firstDay.getDay());
    
    // تحديد آخر يوم في الشبكة (قد يكون من الشهر التالي)
    const lastDayOfGrid = new Date(lastDay);
    lastDayOfGrid.setDate(lastDayOfGrid.getDate() + (6 - lastDay.getDay()));
    
    // تحديث عنوان الشهر والسنة
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    calendarMonthYear.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // إعداد رؤوس الأيام
    const dayNames = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    let calendarHTML = '';
    
    // إضافة رؤوس الأيام
    dayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // إضافة أيام التقويم
    const currentDay = new Date(firstDayOfGrid);
    while (currentDay <= lastDayOfGrid) {
        const dateStr = currentDay.toISOString().split('T')[0];
        const dayTrades = trades.filter(trade => trade.date.startsWith(dateStr));
        
        const isCurrentMonth = currentDay.getMonth() === currentDate.getMonth();
        const isToday = currentDay.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && currentDay.toDateString() === selectedDate.toDateString();
        
        let dayClass = 'calendar-day';
        if (!isCurrentMonth) dayClass += ' other-month';
        if (dayTrades.length > 0) dayClass += ' has-trades';
        if (isSelected) dayClass += ' selected';
        
        // حساب إجمالي الربح/الخسارة لهذا اليوم
        const dayProfitLoss = dayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateStr}">
                <div class="day-number">
                    <span>${currentDay.getDate()}</span>
                    ${isToday ? '<span class="today-indicator">•</span>' : ''}
                </div>
                ${dayTrades.length > 0 ? `
                    <div class="trade-summary">
                        <div>${dayTrades.length} صفقة</div>
                        <div class="${dayProfitLoss >= 0 ? 'profit' : 'loss'}">
                            ${dayProfitLoss >= 0 ? '+' : ''}$${dayProfitLoss.toFixed(2)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        currentDay.setDate(currentDay.getDate() + 1);
    }
    
    calendarDays.innerHTML = calendarHTML;
    
    // إضافة مستمعي الأحداث لأيام التقويم
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', function() {
            const dateStr = this.getAttribute('data-date');
            selectedDate = new Date(dateStr);
            
            // إزالة التحديد من جميع الأيام
            document.querySelectorAll('.calendar-day').forEach(d => {
                d.classList.remove('selected');
            });
            
            // إضافة التحديد لليوم المحدد
            this.classList.add('selected');
            
            // عرض تفاصيل اليوم
            showDayDetails(selectedDate);
        });
    });
}

// عرض تفاصيل الصفقات ليوم معين
function showDayDetails(date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = trades.filter(trade => trade.date.startsWith(dateStr));
    
    // تحديث عنوان اليوم المحدد
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    selectedDayEl.textContent = `تفاصيل الصفقات ليوم ${date.toLocaleDateString('ar-EG', options)}`;
    
    if (dayTrades.length === 0) {
        dayTradesList.innerHTML = '<p class="no-transactions">لا توجد صفقات في هذا اليوم.</p>';
    } else {
        // حساب إجماليات اليوم
        const totalProfitLoss = dayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        const winningTrades = dayTrades.filter(trade => trade.result === 'ربح').length;
        const successRate = (winningTrades / dayTrades.length * 100).toFixed(1);
        
        let html = `
            <div class="day-stats">
                <div><strong>عدد الصفقات:</strong> ${dayTrades.length}</div>
                <div><strong>الصفقات الرابحة:</strong> ${winningTrades}</div>
                <div><strong>نسبة النجاح:</strong> ${successRate}%</div>
                <div><strong>صافي الربح/الخسارة:</strong> 
                    <span class="${totalProfitLoss >= 0 ? 'profit' : 'loss'}">
                        ${totalProfitLoss >= 0 ? '+' : ''}$${totalProfitLoss.toFixed(2)}
                    </span>
                </div>
            </div>
            <h4>تفاصيل الصفقات:</h4>
        `;
        
        dayTrades.forEach(trade => {
            const resultClass = trade.result === 'ربح' ? 'profit' : 'loss';
            const resultSign = trade.result === 'ربح' ? '+' : '';
            const sessionClass = `session-${trade.session.toLowerCase()}`;
            
            html += `
                <div class="trade-item">
                    <div>
                        <strong>${trade.asset}</strong> - ${trade.type}
                        <br><span class="session-badge ${sessionClass}">${trade.session}</span>
                        <br><small>${formatDateTime(trade.date)}</small>
                    </div>
                    <div class="${resultClass}">
                        ${resultSign}$${trade.profitLoss.toFixed(2)}
                        ${trade.notes ? `<br><small>${trade.notes}</small>` : ''}
                    </div>
                </div>
            `;
        });
        
        dayTradesList.innerHTML = html;
    }
    
    dayDetails.classList.add('active');
}

// التهيئة الأولية
initApp();
