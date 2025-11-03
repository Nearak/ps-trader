// إدارة المستخدمين والجلسات
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let users = JSON.parse(localStorage.getItem('users')) || {};

// مصفوفة لتخزين صفقات المستخدم الحالي
let trades = [];

// متغيرات التقويم
let currentDate = new Date();
let selectedDate = null;
let calendarView = 'month'; // 'month' or 'week'

// عناصر DOM
const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent');
const userInfo = document.getElementById('userInfo');
const userGreeting = document.getElementById('userGreeting');
const logoutBtn = document.getElementById('logoutBtn');
const userCapitalEl = document.getElementById('userCapital');

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
const weekView = document.getElementById('week-view');

// عناصر الإحصائيات
const totalTradesEl = document.getElementById('totalTrades');
const winningTradesEl = document.getElementById('winningTrades');
const losingTradesEl = document.getElementById('losingTrades');
const successRateEl = document.getElementById('successRate');
const totalPnLEl = document.getElementById('totalPnL');
const averageProfitEl = document.getElementById('averageProfit');
const averageLossEl = document.getElementById('averageLoss');
const bestSessionEl = document.getElementById('bestSession');
const bestAssetEl = document.getElementById('bestAsset');
const currentCapitalEl = document.getElementById('currentCapital');
const returnPercentageEl = document.getElementById('returnPercentage');

// عناصر أداء رأس المال
const initialCapitalDisplay = document.getElementById('initialCapitalDisplay');
const currentCapitalDisplay = document.getElementById('currentCapitalDisplay');
const netPnLDisplay = document.getElementById('netPnLDisplay');
const roiDisplay = document.getElementById('roiDisplay');

// عناصر الفلاتر
const filterAsset = document.getElementById('filterAsset');
const filterSession = document.getElementById('filterSession');
const filterResult = document.getElementById('filterResult');

// عناصر إدارة رأس المال
const editCapitalBtn = document.getElementById('editCapitalBtn');
const capitalModal = document.getElementById('capitalModal');
const newCapitalInput = document.getElementById('newCapital');
const saveCapitalBtn = document.getElementById('saveCapitalBtn');
const closeModal = document.querySelectorAll('.close');

// عناصر إدارة الصور
const tradeImageInput = document.getElementById('tradeImage');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');

// عناصر التحكم في التقويم
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthBtn = document.getElementById('current-month');
const viewButtons = document.querySelectorAll('.view-btn');

// عناصر الرسم البياني
let winLossChart, sessionChart, assetChart, profitChart, capitalChart, monthlyTradesChart, monthlySuccessChart;

// عناصر صفحة الاستراتيجية
const saveStrategyBtn = document.getElementById('saveStrategyBtn');
const strategyTitle = document.getElementById('strategyTitle');
const tradingStyle = document.getElementById('tradingStyle');
const timeframe = document.getElementById('timeframe');
const riskPerTrade = document.getElementById('riskPerTrade');
const rewardRatio = document.getElementById('rewardRatio');
const entryRules = document.getElementById('entryRules');
const exitRules = document.getElementById('exitRules');
const riskManagement = document.getElementById('riskManagement');
const psychologyNotes = document.getElementById('psychologyNotes');
const strategyNotes = document.getElementById('strategyNotes');
const previewContent = document.getElementById('previewContent');

// عناصر صفحة لوحة المتصدرين
const leaderboardType = document.getElementById('leaderboardType');
const timePeriod = document.getElementById('timePeriod');
const userRank = document.getElementById('userRank');
const userRankDetails = document.getElementById('userRankDetails');
const leaderboardList = document.getElementById('leaderboardList');
const achievementsGrid = document.getElementById('achievementsGrid');

// تهيئة التطبيق
function initApp() {
    if (currentUser) {
        showApp();
        loadUserTrades();
        loadUserStrategy();
        updateLeaderboard();
        updateAchievements();
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
            if (tabId === 'charts' || tabId === 'performance') {
                setTimeout(updateCharts, 100);
            }
            
            // إذا كان التبويب هو لوحة المتصدرين، قم بتحديثها
            if (tabId === 'leaderboard') {
                updateLeaderboard();
                updateAchievements();
            }
            
            // إذا كان التبويب هو الاستراتيجية، قم بتحميلها
            if (tabId === 'strategy') {
                loadUserStrategy();
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
    
    // أحداث تغيير عرض التقويم
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            calendarView = this.getAttribute('data-view');
            renderCalendar();
        });
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
            if (!asset.trim()) {
                showAlert(loginAlert, 'يرجى إدخال اسم الأصل', 'error');
                return;
            }
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
            notes: document.getElementById('notes').value,
            image: previewImage.src !== '#' ? previewImage.src : null
        };
        
        // التحقق من البيانات
        if (isNaN(trade.amount) || isNaN(trade.profitLoss)) {
            showAlert(loginAlert, 'يرجى إدخال قيم رقمية صحيحة', 'error');
            return;
        }
        
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
        imagePreview.style.display = 'none';
        previewImage.src = '#';
        
        // إظهار رسالة نجاح
        showAlert(loginAlert, 'تم إضافة الصفقة بنجاح!', 'success');
    });
    
    // أحداث الفلاتر
    filterAsset.addEventListener('change', renderTrades);
    filterSession.addEventListener('change', renderTrades);
    filterResult.addEventListener('change', renderTrades);
    
    // أحداث إدارة رأس المال
    editCapitalBtn.addEventListener('click', function() {
        const userData = users[currentUser.email];
        newCapitalInput.value = userData && userData.capital ? userData.capital : 0;
        capitalModal.style.display = 'block';
    });
    
    saveCapitalBtn.addEventListener('click', function() {
        const newCapital = parseFloat(newCapitalInput.value);
        if (!isNaN(newCapital) && newCapital >= 0) {
            if (!users[currentUser.email]) {
                users[currentUser.email] = {};
            }
            users[currentUser.email].capital = newCapital;
            localStorage.setItem('users', JSON.stringify(users));
            updateCapitalInfo();
            capitalModal.style.display = 'none';
            showAlert(loginAlert, 'تم تحديث رأس المال بنجاح!', 'success');
        } else {
            showAlert(loginAlert, 'يرجى إدخال قيمة صحيحة لرأس المال', 'error');
        }
    });
    
    // أحداث إغلاق الـ modals
    closeModal.forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            capitalModal.style.display = 'none';
            imageModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === capitalModal) {
            capitalModal.style.display = 'none';
        }
        if (event.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
    
    // أحداث إدارة الصور
    tradeImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // التحقق من حجم الصورة (5MB كحد أقصى)
            if (file.size > 5 * 1024 * 1024) {
                showAlert(loginAlert, 'حجم الصورة يجب أن يكون أقل من 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.onerror = function() {
                showAlert(loginAlert, 'حدث خطأ في تحميل الصورة', 'error');
            };
            reader.readAsDataURL(file);
        }
    });
    
    removeImageBtn.addEventListener('click', function() {
        tradeImageInput.value = '';
        imagePreview.style.display = 'none';
        previewImage.src = '#';
    });
    
    // أحداث صفحة الاستراتيجية
    saveStrategyBtn.addEventListener('click', saveUserStrategy);
    
    // تحديث معاينة الاستراتيجية عند تغيير الحقول
    const strategyFields = [strategyTitle, tradingStyle, timeframe, riskPerTrade, rewardRatio, 
                          entryRules, exitRules, riskManagement, psychologyNotes, strategyNotes];
    
    strategyFields.forEach(field => {
        if (field) {
            field.addEventListener('input', updateStrategyPreview);
        }
    });
    
    // أحداث صفحة لوحة المتصدرين
    leaderboardType.addEventListener('change', updateLeaderboard);
    timePeriod.addEventListener('change', updateLeaderboard);
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
        loadUserStrategy();
        updateLeaderboard();
        updateAchievements();
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
    const initialCapital = parseFloat(document.getElementById('initialCapital').value);
    
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
    
    // التحقق من رأس المال
    if (isNaN(initialCapital) || initialCapital < 0) {
        showAlert(registerAlert, 'يرجى إدخال قيمة صحيحة لرأس المال', 'error');
        return;
    }
    
    // إنشاء حساب جديد
    users[email] = { 
        name, 
        password, 
        capital: initialCapital,
        trades: [],
        strategy: {}
    };
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
    document.getElementById('initialCapital').value = 1000; // قيمة افتراضية
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
        updateCapitalInfo();
    }
}

// حفظ صفقات المستخدم الحالي
function saveUserTrades() {
    if (currentUser && users[currentUser.email]) {
        if (!users[currentUser.email].trades) {
            users[currentUser.email].trades = [];
        }
        users[currentUser.email].trades = trades;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// تحميل استراتيجية المستخدم
function loadUserStrategy() {
    if (currentUser && users[currentUser.email] && users[currentUser.email].strategy) {
        const strategy = users[currentUser.email].strategy;
        
        if (strategyTitle) strategyTitle.value = strategy.title || '';
        if (tradingStyle) tradingStyle.value = strategy.tradingStyle || '';
        if (timeframe) timeframe.value = strategy.timeframe || '';
        if (riskPerTrade) riskPerTrade.value = strategy.riskPerTrade || '';
        if (rewardRatio) rewardRatio.value = strategy.rewardRatio || '';
        if (entryRules) entryRules.value = strategy.entryRules || '';
        if (exitRules) exitRules.value = strategy.exitRules || '';
        if (riskManagement) riskManagement.value = strategy.riskManagement || '';
        if (psychologyNotes) psychologyNotes.value = strategy.psychologyNotes || '';
        if (strategyNotes) strategyNotes.value = strategy.strategyNotes || '';
        
        updateStrategyPreview();
    }
}

// حفظ استراتيجية المستخدم
function saveUserStrategy() {
    if (currentUser && users[currentUser.email]) {
        const strategy = {
            title: strategyTitle.value,
            tradingStyle: tradingStyle.value,
            timeframe: timeframe.value,
            riskPerTrade: riskPerTrade.value,
            rewardRatio: rewardRatio.value,
            entryRules: entryRules.value,
            exitRules: exitRules.value,
            riskManagement: riskManagement.value,
            psychologyNotes: psychologyNotes.value,
            strategyNotes: strategyNotes.value,
            lastUpdated: new Date().toISOString()
        };
        
        if (!users[currentUser.email].strategy) {
            users[currentUser.email].strategy = {};
        }
        
        users[currentUser.email].strategy = strategy;
        localStorage.setItem('users', JSON.stringify(users));
        
        showAlert(loginAlert, 'تم حفظ الاستراتيجية بنجاح!', 'success');
        updateStrategyPreview();
    }
}

// تحديث معاينة الاستراتيجية
function updateStrategyPreview() {
    if (!previewContent) return;
    
    const title = strategyTitle.value || 'استراتيجية التداول';
    const tradingStyleText = tradingStyle.options[tradingStyle.selectedIndex]?.text || 'غير محدد';
    const timeframeText = timeframe.options[timeframe.selectedIndex]?.text || 'غير محدد';
    const riskPerTradeText = riskPerTrade.value ? `${riskPerTrade.value}%` : 'غير محدد';
    const rewardRatioText = rewardRatio.value ? `${rewardRatio.value}:1` : 'غير محدد';
    
    let html = `
        <div class="strategy-preview-content">
            <h4>${title}</h4>
            <div class="preview-grid">
                <div class="preview-item">
                    <strong>نمط التداول:</strong> ${tradingStyleText}
                </div>
                <div class="preview-item">
                    <strong>الإطار الزمني:</strong> ${timeframeText}
                </div>
                <div class="preview-item">
                    <strong>نسبة المخاطرة:</strong> ${riskPerTradeText}
                </div>
                <div class="preview-item">
                    <strong>نسبة العائد للمخاطرة:</strong> ${rewardRatioText}
                </div>
            </div>
    `;
    
    if (entryRules.value) {
        html += `
            <div class="preview-section">
                <h5>قواعد الدخول:</h5>
                <p>${entryRules.value}</p>
            </div>
        `;
    }
    
    if (exitRules.value) {
        html += `
            <div class="preview-section">
                <h5>قواعد الخروج:</h5>
                <p>${exitRules.value}</p>
            </div>
        `;
    }
    
    if (riskManagement.value) {
        html += `
            <div class="preview-section">
                <h5>إدارة المخاطر:</h5>
                <p>${riskManagement.value}</p>
            </div>
        `;
    }
    
    if (psychologyNotes.value) {
        html += `
            <div class="preview-section">
                <h5>ملاحظات نفسية:</h5>
                <p>${psychologyNotes.value}</p>
            </div>
        `;
    }
    
    if (strategyNotes.value) {
        html += `
            <div class="preview-section">
                <h5>ملاحظات إضافية:</h5>
                <p>${strategyNotes.value}</p>
            </div>
        `;
    }
    
    html += `</div>`;
    
    previewContent.innerHTML = html;
}

// تحديث لوحة المتصدرين
function updateLeaderboard() {
    if (!leaderboardList) return;
    
    const type = leaderboardType.value;
    const period = timePeriod.value;
    
    // تحضير بيانات المستخدمين للتصنيف
    const leaderboardData = [];
    
    Object.keys(users).forEach(email => {
        const user = users[email];
        if (user.trades && user.trades.length > 0) {
            const userTrades = filterTradesByPeriod(user.trades, period);
            const totalTrades = userTrades.length;
            const winningTrades = userTrades.filter(t => t.result === 'ربح').length;
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            const totalProfit = userTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
            const capital = user.capital || 1000;
            const roi = capital > 0 ? (totalProfit / capital) * 100 : 0;
            
            leaderboardData.push({
                name: user.name,
                email: email,
                totalTrades: totalTrades,
                winRate: winRate,
                totalProfit: totalProfit,
                roi: roi,
                isCurrentUser: email === currentUser.email
            });
        }
    });
    
    // ترتيب البيانات حسب نوع التصنيف
    if (type === 'winRate') {
        leaderboardData.sort((a, b) => b.winRate - a.winRate);
    } else if (type === 'totalProfit') {
        leaderboardData.sort((a, b) => b.totalProfit - a.totalProfit);
    } else if (type === 'roi') {
        leaderboardData.sort((a, b) => b.roi - a.roi);
    } else if (type === 'consistency') {
        // حساب الاتساق (نسبة الفوز مع مراعاة عدد الصفقات)
        leaderboardData.sort((a, b) => {
            const aScore = a.winRate * Math.min(a.totalTrades / 10, 1);
            const bScore = b.winRate * Math.min(b.totalTrades / 10, 1);
            return bScore - aScore;
        });
    }
    
    // تحديث تصنيف المستخدم الحالي
    const currentUserIndex = leaderboardData.findIndex(user => user.isCurrentUser);
    if (currentUserIndex !== -1) {
        userRank.textContent = `#${currentUserIndex + 1}`;
        const currentUserData = leaderboardData[currentUserIndex];
        userRankDetails.textContent = `نسبة فوز: ${currentUserData.winRate.toFixed(1)}% | أرباح: $${currentUserData.totalProfit.toFixed(2)}`;
    } else {
        userRank.textContent = 'غير مصنف';
        userRankDetails.textContent = 'أضف صفقات لتدخل التصنيف';
    }
    
    // عرض لوحة المتصدرين
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = '<div class="no-data">لا توجد بيانات كافية لعرض التصنيف</div>';
        return;
    }
    
    let html = '';
    leaderboardData.slice(0, 10).forEach((user, index) => {
        const rankClass = `rank-${index + 1}`;
        const userClass = user.isCurrentUser ? 'current-user' : '';
        
        html += `
            <div class="leaderboard-item ${userClass}">
                <div class="rank ${rankClass}">${index + 1}</div>
                <div class="user-name">${user.name} ${user.isCurrentUser ? '(أنت)' : ''}</div>
                <div class="stat-value">${user.winRate.toFixed(1)}%</div>
                <div class="stat-value ${user.totalProfit >= 0 ? 'positive' : 'negative'}">$${user.totalProfit.toFixed(2)}</div>
                <div class="stat-value ${user.roi >= 0 ? 'positive' : 'negative'}">${user.roi.toFixed(1)}%</div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = html;
}

// تصفية الصفقات حسب الفترة الزمنية
function filterTradesByPeriod(trades, period) {
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else {
        // جميع الفترات
        return trades;
    }
    
    return trades.filter(trade => new Date(trade.date) >= startDate);
}

// تحديث الإنجازات
function updateAchievements() {
    if (!achievementsGrid) return;
    
    const userData = users[currentUser.email];
    if (!userData || !userData.trades) return;
    
    const totalTrades = userData.trades.length;
    const winningTrades = userData.trades.filter(t => t.result === 'ربح').length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalProfit = userData.trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    
    // إنجاز المتداول المبتدئ
    const beginnerProgress = Math.min((totalTrades / 10) * 100, 100);
    const beginnerUnlocked = totalTrades >= 10;
    
    // إنجاز محترف الربح
    const profitProgress = Math.min((totalProfit / 1000) * 100, 100);
    const profitUnlocked = totalProfit >= 1000;
    
    // إنجاز مدير المخاطر
    const riskProgress = Math.min((winRate / 70) * 100, 100);
    const riskUnlocked = winRate >= 70;
    
    let html = `
        <div class="achievement-card ${beginnerUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">
                <i class="fas fa-rocket"></i>
            </div>
            <div class="achievement-info">
                <h4>المتداول المبتدئ</h4>
                <p>إكمال 10 صفقات</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${beginnerProgress}%"></div>
                </div>
                <span class="progress-text">${totalTrades}/10</span>
            </div>
        </div>
        
        <div class="achievement-card ${profitUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="achievement-info">
                <h4>محترف الربح</h4>
                <p>تحقيق $1000 ربح</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${profitProgress}%"></div>
                </div>
                <span class="progress-text">$${Math.min(totalProfit, 1000).toFixed(0)}/$1000</span>
            </div>
        </div>
        
        <div class="achievement-card ${riskUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">
                <i class="fas fa-shield-alt"></i>
            </div>
            <div class="achievement-info">
                <h4>مدير المخاطر</h4>
                <p>نسبة فوز 70% أو أكثر</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${riskProgress}%"></div>
                </div>
                <span class="progress-text">${winRate.toFixed(1)}%/70%</span>
            </div>
        </div>
    `;
    
    achievementsGrid.innerHTML = html;
}

// تحديث معلومات رأس المال
function updateCapitalInfo() {
    if (currentUser && users[currentUser.email]) {
        const userData = users[currentUser.email];
        const capital = userData.capital || 0;
        const totalPnL = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        const currentCapital = capital + totalPnL;
        const returnPercentage = capital > 0 ? ((totalPnL / capital) * 100).toFixed(2) : 0;
        
        userCapitalEl.textContent = capital.toFixed(2);
        currentCapitalEl.textContent = `$${currentCapital.toFixed(2)}`;
        totalPnLEl.textContent = `$${totalPnL.toFixed(2)}`;
        returnPercentageEl.textContent = `${returnPercentage}%`;
        
        // تحديث لون العائد
        returnPercentageEl.className = `capital-value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
        totalPnLEl.className = `capital-value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
        currentCapitalEl.className = `capital-value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
        
        // تحديث أداء رأس المال
        updatePerformanceStats(capital, currentCapital, totalPnL, returnPercentage);
    }
}

// تحديث إحصائيات الأداء
function updatePerformanceStats(initialCapital, currentCapital, netPnL, roi) {
    initialCapitalDisplay.textContent = `$${initialCapital.toFixed(2)}`;
    currentCapitalDisplay.textContent = `$${currentCapital.toFixed(2)}`;
    netPnLDisplay.textContent = `$${netPnL.toFixed(2)}`;
    roiDisplay.textContent = `${roi}%`;
    
    // تحديث الألوان حسب الأداء
    netPnLDisplay.className = `performance-value ${netPnL >= 0 ? 'positive' : 'negative'}`;
    roiDisplay.className = `performance-value ${netPnL >= 0 ? 'positive' : 'negative'}`;
    currentCapitalDisplay.className = `performance-value ${netPnL >= 0 ? 'positive' : 'negative'}`;
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
    updateCapitalInfo();
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
                    <th>الصورة</th>
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
        const imageHtml = trade.image ? 
            `<img src="${trade.image}" alt="صورة الصفقة" class="trade-image" onclick="showImageModal('${trade.image}')">` : 
            '-';
        
        html += `
            <tr>
                <td>${formatDateTime(trade.date)}</td>
                <td>${trade.asset}</td>
                <td>${trade.type}</td>
                <td><span class="session-badge ${sessionClass}">${trade.session}</span></td>
                <td>$${trade.amount.toFixed(2)}</td>
                <td class="${resultClass}">${trade.result}</td>
                <td class="${resultClass}">${resultSign}$${trade.profitLoss.toFixed(2)}</td>
                <td class="image-cell">${imageHtml}</td>
                <td class="notes-cell" title="${trade.notes || 'لا توجد ملاحظات'}">${trade.notes || '-'}</td>
                <td><button class="delete-btn" onclick="deleteTrade(${trade.id})"><i class="fas fa-trash"></i> حذف</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    transactionsList.innerHTML = html;
}

// عرض صورة في modal
function showImageModal(imageSrc) {
    modalImage.src = imageSrc;
    imageModal.style.display = 'block';
}

// تحديث الإحصائيات
function updateStats() {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.result === 'ربح').length;
    const losingTrades = totalTrades - winningTrades;
    const successRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    const totalPnL = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    
    // حساب متوسط الربح والخسارة
    const winningTradesArray = trades.filter(trade => trade.result === 'ربح');
    const losingTradesArray = trades.filter(trade => trade.result === 'خسارة');
    const averageProfit = winningTradesArray.length > 0 ? 
        (winningTradesArray.reduce((sum, trade) => sum + trade.profitLoss, 0) / winningTradesArray.length).toFixed(2) : 0;
    const averageLoss = losingTradesArray.length > 0 ? 
        (losingTradesArray.reduce((sum, trade) => sum + Math.abs(trade.profitLoss), 0) / losingTradesArray.length).toFixed(2) : 0;
    
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
    
    averageProfitEl.textContent = `$${averageProfit}`;
    averageProfitEl.className = `stat-value positive`;
    
    averageLossEl.textContent = `$${averageLoss}`;
    averageLossEl.className = `stat-value negative`;

    bestSessionEl.textContent = bestSession;
    bestAssetEl.textContent = bestAsset;
    
    // تحديث معلومات رأس المال
    updateCapitalInfo();
}

// تحديث الرسوم البيانية
function updateCharts() {
    if (trades.length === 0) {
        // إخفاء الرسوم البيانية إذا لم توجد صفقات
        const chartContainers = document.querySelectorAll('.chart-container canvas');
        chartContainers.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        return;
    }
    
    // تدمير المخططات القديمة إذا كانت موجودة
    if (winLossChart) winLossChart.destroy();
    if (sessionChart) sessionChart.destroy();
    if (assetChart) assetChart.destroy();
    if (profitChart) profitChart.destroy();
    if (capitalChart) capitalChart.destroy();
    if (monthlyTradesChart) monthlyTradesChart.destroy();
    if (monthlySuccessChart) monthlySuccessChart.destroy();
    
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
                }
            }
        }
    });
    
    // مخطط الجلسات
    const sessionCtx = document.getElementById('sessionChart').getContext('2d');
    const sessionData = {};
    trades.forEach(trade => {
        if (!sessionData[trade.session]) {
            sessionData[trade.session] = 0;
        }
        sessionData[trade.session] += trade.profitLoss;
    });
    
    sessionChart = new Chart(sessionCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(sessionData),
            datasets: [{
                label: 'صافي الربح ($)',
                data: Object.values(sessionData),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // مخطط الأصول (نأخذ أفضل 8 أصول فقط)
    const assetCtx = document.getElementById('assetChart').getContext('2d');
    const assetData = {};
    trades.forEach(trade => {
        if (!assetData[trade.asset]) {
            assetData[trade.asset] = 0;
        }
        assetData[trade.asset] += trade.profitLoss;
    });
    
    const topAssets = Object.entries(assetData)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 8);
    
    assetChart = new Chart(assetCtx, {
        type: 'pie',
        data: {
            labels: topAssets.map(a => a[0]),
            datasets: [{
                data: topAssets.map(a => a[1]),
                backgroundColor: [
                    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
                    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
                ],
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
                borderWidth: 3,
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
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // مخطط تطور رأس المال
    const capitalCtx = document.getElementById('capitalChart').getContext('2d');
    const userData = users[currentUser.email];
    const initialCapital = userData && userData.capital ? userData.capital : 0;
    let currentCapital = initialCapital;
    const capitalData = [initialCapital];
    const capitalDates = ['البداية'];
    
    sortedTradesByDate.forEach(trade => {
        currentCapital += trade.profitLoss;
        capitalData.push(currentCapital);
        capitalDates.push(formatDate(trade.date));
    });
    
    capitalChart = new Chart(capitalCtx, {
        type: 'line',
        data: {
            labels: capitalDates,
            datasets: [{
                label: 'رأس المال ($)',
                data: capitalData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
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
                }
            }
        }
    });
    
    // مخطط الصفقات الشهرية
    const monthlyTradesCtx = document.getElementById('monthlyTradesChart').getContext('2d');
    const monthlyData = {};
    
    trades.forEach(trade => {
        const date = new Date(trade.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { wins: 0, losses: 0 };
        }
        if (trade.result === 'ربح') {
            monthlyData[monthYear].wins++;
        } else {
            monthlyData[monthYear].losses++;
        }
    });
    
    const months = Object.keys(monthlyData).sort();
    const monthlyWins = months.map(month => monthlyData[month].wins);
    const monthlyLosses = months.map(month => monthlyData[month].losses);
    
    monthlyTradesChart = new Chart(monthlyTradesCtx, {
        type: 'bar',
        data: {
            labels: months.map(month => {
                const [year, monthNum] = month.split('-');
                return `${monthNum}/${year}`;
            }),
            datasets: [
                {
                    label: 'صفقات رابحة',
                    data: monthlyWins,
                    backgroundColor: '#27ae60',
                    borderWidth: 1
                },
                {
                    label: 'صفقات خاسرة',
                    data: monthlyLosses,
                    backgroundColor: '#e74c3c',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // مخطط نسبة النجاح الشهرية
    const monthlySuccessCtx = document.getElementById('monthlySuccessChart').getContext('2d');
    const monthlySuccessData = months.map(month => {
        const total = monthlyData[month].wins + monthlyData[month].losses;
        return total > 0 ? (monthlyData[month].wins / total * 100) : 0;
    });
    
    monthlySuccessChart = new Chart(monthlySuccessCtx, {
        type: 'line',
        data: {
            labels: months.map(month => {
                const [year, monthNum] = month.split('-');
                return `${monthNum}/${year}`;
            }),
            datasets: [{
                label: 'نسبة النجاح (%)',
                data: monthlySuccessData,
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                borderWidth: 3,
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
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
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
        if (document.getElementById('charts-tab').classList.contains('active') || 
            document.getElementById('performance-tab').classList.contains('active')) {
            setTimeout(updateCharts, 100);
        }
        
        // تحديث لوحة المتصدرين إذا كانت مرئية
        if (document.getElementById('leaderboard-tab').classList.contains('active')) {
            updateLeaderboard();
            updateAchievements();
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
    if (calendarView === 'month') {
        renderMonthCalendar();
    } else {
        renderWeekCalendar();
    }
}

// عرض التقويم الشهري
function renderMonthCalendar() {
    calendarDays.style.display = 'grid';
    weekView.style.display = 'none';
    
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

// عرض التقويم الأسبوعي
function renderWeekCalendar() {
    calendarDays.style.display = 'none';
    weekView.style.display = 'block';
    
    // تحديد بداية الأسبوع (الأحد)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    // تحديث العنوان
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    calendarMonthYear.textContent = `أسبوع ${startOfWeek.getDate()} - ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
    
    let weekHTML = '';
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    
    // إضافة أيام الأسبوع
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dateStr = day.toISOString().split('T')[0];
        const dayTrades = trades.filter(trade => trade.date.startsWith(dateStr));
        
        const isToday = day.toDateString() === new Date().toDateString();
        const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
        
        let dayClass = 'week-day';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';
        if (dayTrades.length > 0) dayClass += ' has-trades';
        
        // حساب إجمالي الربح/الخسارة لهذا اليوم
        const dayProfitLoss = dayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        
        weekHTML += `
            <div class="${dayClass}" data-date="${dateStr}">
                <div class="week-day-header">
                    <div class="week-day-name">${dayNames[i]}</div>
                    <div class="week-day-date">${day.getDate()} ${monthNames[day.getMonth()]}</div>
                </div>
                <div class="week-day-trades">
                    ${dayTrades.length > 0 ? `
                        <div class="trade-count">${dayTrades.length} صفقة</div>
                        <div class="day-profit ${dayProfitLoss >= 0 ? 'profit' : 'loss'}">
                            ${dayProfitLoss >= 0 ? '+' : ''}$${dayProfitLoss.toFixed(2)}
                        </div>
                        <div class="trades-list">
                            ${dayTrades.map(trade => `
                                <div class="week-trade-item">
                                    <span class="trade-asset">${trade.asset}</span>
                                    <span class="trade-result ${trade.result === 'ربح' ? 'profit' : 'loss'}">
                                        ${trade.result === 'ربح' ? '+' : ''}$${trade.profitLoss.toFixed(2)}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-trades">لا توجد صفقات</div>
                    `}
                </div>
            </div>
        `;
    }
    
    weekView.innerHTML = weekHTML;
    
    // إضافة مستمعي الأحداث لأيام الأسبوع
    document.querySelectorAll('.week-day').forEach(day => {
        day.addEventListener('click', function() {
            const dateStr = this.getAttribute('data-date');
            selectedDate = new Date(dateStr);
            
            // إزالة التحديد من جميع الأيام
            document.querySelectorAll('.week-day').forEach(d => {
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
            const imageHtml = trade.image ? 
                `<br><img src="${trade.image}" alt="صورة الصفقة" class="trade-image" style="width: 80px; height: 80px;" onclick="showImageModal('${trade.image}')">` : 
                '';
            
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
                        ${imageHtml}
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
