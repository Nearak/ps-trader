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

// عناصر التحكم في التقويم
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthBtn = document.getElementById('current-month');

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
    
    // تعيين تاريخ اليوم كقيمة افتراضية
    document.getElementById('tradeDate').valueAsDate = new Date();
    
    // إضافة صفقة جديدة
    tradeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const trade = {
            id: Date.now(),
            date: document.getElementById('tradeDate').value,
            asset: document.getElementById('asset').value,
            type: document.getElementById('tradeType').value,
            amount: parseFloat(document.getElementById('amount').value),
            result: document.getElementById('result').value,
            profitLoss: parseFloat(document.getElementById('profitLoss').value)
        };
        
        trades.push(trade);
        saveUserTrades();
        renderTrades();
        updateStats();
        renderCalendar();
        
        // إعادة تعيين النموذج
        tradeForm.reset();
        document.getElementById('tradeDate').valueAsDate = new Date();
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
    
    // ترتيب الصفقات من الأحدث إلى الأقدم
    const sortedTrades = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الأصل</th>
                    <th>النوع</th>
                    <th>القيمة ($)</th>
                    <th>النتيجة</th>
                    <th>الربح/الخسارة ($)</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sortedTrades.forEach(trade => {
        const resultClass = trade.result === 'ربح' ? 'profit' : 'loss';
        const resultSign = trade.result === 'ربح' ? '+' : '';
        
        html += `
            <tr>
                <td>${formatDate(trade.date)}</td>
                <td>${trade.asset}</td>
                <td>${trade.type}</td>
                <td>$${trade.amount.toFixed(2)}</td>
                <td class="${resultClass}">${trade.result}</td>
                <td class="${resultClass}">${resultSign}$${trade.profitLoss.toFixed(2)}</td>
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
    
    totalTradesEl.textContent = totalTrades;
    winningTradesEl.textContent = winningTrades;
    losingTradesEl.textContent = losingTrades;
    successRateEl.textContent = `${successRate}%`;
    
    totalProfitLossEl.textContent = `$${totalProfitLoss.toFixed(2)}`;
    totalProfitLossEl.className = totalProfitLoss >= 0 ? 'stat-value positive' : 'stat-value negative';
    
    averageTradeEl.textContent = `$${averageTrade}`;
    averageTradeEl.className = averageTrade >= 0 ? 'stat-value positive' : 'stat-value negative';
}

// حذف صفقة
function deleteTrade(id) {
    if (confirm('هل أنت متأكد من حذف هذه الصفقة؟')) {
        trades = trades.filter(trade => trade.id !== id);
        saveUserTrades();
        renderTrades();
        updateStats();
        renderCalendar();
        
        // إذا كانت الصفقة المحذوفة هي من اليوم المحدد، قم بتحديث التفاصيل
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const dayTrades = trades.filter(trade => trade.date === dateStr);
            
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
        const dayTrades = trades.filter(trade => trade.date === dateStr);
        
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
    const dayTrades = trades.filter(trade => trade.date === dateStr);
    
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
            
            html += `
                <div class="trade-item">
                    <div>
                        <strong>${trade.asset}</strong> - ${trade.type}
                    </div>
                    <div class="${resultClass}">
                        ${resultSign}$${trade.profitLoss.toFixed(2)}
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
