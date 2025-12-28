// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB6r4WYjiH7Ebrsyj-bI1kdjwPUIx0s6YQ",
    authDomain: "pstrader-64eaa.firebaseapp.com",
    projectId: "pstrader-64eaa",
    storageBucket: "pstrader-64eaa.firebasestorage.app",
    messagingSenderId: "30447360884",
    appId: "1:30447360884:web:b11cf8473d746a6fb22a21",
    measurementId: "G-JWVDME16G8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على الخدمات
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// حالة التطبيق
let currentUser = null;
let userData = null;
let userTrades = [];
let userStrategy = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من حالة المصادقة
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            showAuthSection();
        }
    });

    // أحداث تسجيل الدخول والتسجيل
    document.getElementById('loginUserForm').addEventListener('submit', loginUser);
    document.getElementById('registerUserForm').addEventListener('submit', registerUser);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // تبديل بين أشكال التسجيل
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const formType = this.getAttribute('data-form');
            
            // تحديث التبويبات النشطة
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // إظهار النموذج المحدد
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(formType + 'Form').classList.add('active');
        });
    });
});

// ========== وظائف المصادقة ==========

async function loginUser(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const alertDiv = document.getElementById('loginAlert');
    
    try {
        alertDiv.textContent = 'جاري تسجيل الدخول...';
        alertDiv.className = 'alert alert-info';
        alertDiv.style.display = 'block';
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        alertDiv.textContent = 'تم تسجيل الدخول بنجاح!';
        alertDiv.className = 'alert alert-success';
        
        // إخفاء التنبيه بعد 2 ثانية
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        alertDiv.textContent = getAuthErrorMessage(error.code);
        alertDiv.className = 'alert alert-danger';
    }
}

async function registerUser(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const initialCapital = parseFloat(document.getElementById('initialCapital').value);
    const alertDiv = document.getElementById('registerAlert');
    
    // التحقق من كلمات المرور
    if (password !== confirmPassword) {
        alertDiv.textContent = 'كلمات المرور غير متطابقة!';
        alertDiv.className = 'alert alert-danger';
        alertDiv.style.display = 'block';
        return;
    }
    
    try {
        alertDiv.textContent = 'جاري إنشاء الحساب...';
        alertDiv.className = 'alert alert-info';
        alertDiv.style.display = 'block';
        
        // إنشاء المستخدم
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // حفظ بيانات المستخدم في Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            initialCapital: initialCapital,
            currentCapital: initialCapital,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alertDiv.textContent = 'تم إنشاء الحساب بنجاح!';
        alertDiv.className = 'alert alert-success';
        
        // إخفاء التنبيه بعد 2 ثانية
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في إنشاء الحساب:', error);
        alertDiv.textContent = getAuthErrorMessage(error.code);
        alertDiv.className = 'alert alert-danger';
    }
}

async function logout() {
    try {
        await auth.signOut();
        showAuthSection();
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
}

// ========== إدارة بيانات المستخدم ==========

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // جلب بيانات المستخدم
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            showAppContent();
            
            // تحديث واجهة المستخدم
            document.getElementById('userGreeting').textContent = `مرحباً، ${userData.name}`;
            document.getElementById('userCapital').textContent = userData.currentCapital.toFixed(2);
            
            // جلب الصفقات
            await loadUserTrades();
            
            // جلب الاستراتيجية
            await loadUserStrategy();
            
            // تحديث الإحصائيات
            updateStats();
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
    }
}

async function loadUserTrades() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        userTrades = [];
        snapshot.forEach(doc => {
            userTrades.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateTradesList();
        updateCalendar();
        updateCharts();
    } catch (error) {
        console.error('خطأ في تحميل الصفقات:', error);
    }
}

async function loadUserStrategy() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('strategies').doc(currentUser.uid).get();
        
        if (doc.exists) {
            userStrategy = doc.data();
            displayStrategyPreview();
        }
    } catch (error) {
        console.error('خطأ في تحميل الاستراتيجية:', error);
    }
}

// ========== إدارة الصفقات ==========

// دالة إضافة صفقة جديدة (اضفها إلى event listener الموجود في الكود الأصلي)
async function addTrade(tradeData) {
    if (!currentUser) return null;
    
    try {
        // إضافة userId إلى بيانات الصفقة
        tradeData.userId = currentUser.uid;
        tradeData.date = firebase.firestore.FieldValue.serverTimestamp();
        
        // حفظ في Firestore
        const docRef = await db.collection('trades').add(tradeData);
        
        // تحديث رأس المال
        const capitalChange = tradeData.profitLoss;
        const newCapital = userData.currentCapital + capitalChange;
        
        await db.collection('users').doc(currentUser.uid).update({
            currentCapital: newCapital
        });
        
        userData.currentCapital = newCapital;
        document.getElementById('userCapital').textContent = newCapital.toFixed(2);
        
        // إعادة تحميل الصفقات
        await loadUserTrades();
        
        return docRef.id;
    } catch (error) {
        console.error('خطأ في إضافة الصفقة:', error);
        throw error;
    }
}

// دالة حذف صفقة
async function deleteTrade(tradeId) {
    if (!currentUser) return;
    
    try {
        await db.collection('trades').doc(tradeId).delete();
        await loadUserTrades();
    } catch (error) {
        console.error('خطأ في حذف الصفقة:', error);
    }
}

// ========== إدارة الاستراتيجية ==========

async function saveStrategy() {
    if (!currentUser) return;
    
    const strategyData = {
        title: document.getElementById('strategyTitle').value,
        tradingStyle: document.getElementById('tradingStyle').value,
        timeframe: document.getElementById('timeframe').value,
        riskPerTrade: parseFloat(document.getElementById('riskPerTrade').value) || 0,
        rewardRatio: parseFloat(document.getElementById('rewardRatio').value) || 0,
        entryRules: document.getElementById('entryRules').value,
        exitRules: document.getElementById('exitRules').value,
        riskManagement: document.getElementById('riskManagement').value,
        psychologyNotes: document.getElementById('psychologyNotes').value,
        strategyNotes: document.getElementById('strategyNotes').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('strategies').doc(currentUser.uid).set(strategyData, { merge: true });
        userStrategy = strategyData;
        displayStrategyPreview();
        
        alert('تم حفظ الاستراتيجية بنجاح!');
    } catch (error) {
        console.error('خطأ في حفظ الاستراتيجية:', error);
        alert('حدث خطأ أثناء حفظ الاستراتيجية');
    }
}

// ========== وظائف المساعدة ==========

function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appContent').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    currentUser = null;
    userData = null;
    userTrades = [];
}

function showAppContent() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/operation-not-allowed': 'عملية غير مسموح بها',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/user-disabled': 'تم تعطيل هذا الحساب',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'محاولات تسجيل دخول كثيرة، حاول لاحقاً'
    };
    
    return messages[errorCode] || 'حدث خطأ غير معروف';
}

// ========== تعديل رأس المال ==========

document.getElementById('editCapitalBtn').addEventListener('click', function() {
    document.getElementById('newCapital').value = userData.currentCapital;
    document.getElementById('capitalModal').style.display = 'block';
});

document.getElementById('saveCapitalBtn').addEventListener('click', async function() {
    const newCapital = parseFloat(document.getElementById('newCapital').value);
    
    if (!isNaN(newCapital) && newCapital >= 0) {
        try {
            await db.collection('users').doc(currentUser.uid).update({
                currentCapital: newCapital
            });
            
            userData.currentCapital = newCapital;
            document.getElementById('userCapital').textContent = newCapital.toFixed(2);
            document.getElementById('capitalModal').style.display = 'none';
            
            updateStats();
        } catch (error) {
            console.error('خطأ في تحديث رأس المال:', error);
        }
    }
});

// ========== تحديث الإحصائيات ==========

function updateStats() {
    if (!userTrades || userTrades.length === 0) {
        resetStats();
        return;
    }
    
    const stats = calculateStats(userTrades);
    
    // تحديث القيم
    document.getElementById('currentCapital').textContent = `$${userData.currentCapital.toFixed(2)}`;
    document.getElementById('totalPnL').textContent = `$${stats.totalPnL.toFixed(2)}`;
    document.getElementById('returnPercentage').textContent = `${stats.returnPercentage.toFixed(2)}%`;
    document.getElementById('totalTrades').textContent = stats.totalTrades;
    document.getElementById('winningTrades').textContent = stats.winningTrades;
    document.getElementById('losingTrades').textContent = stats.losingTrades;
    document.getElementById('successRate').textContent = `${stats.successRate.toFixed(1)}%`;
    document.getElementById('averageProfit').textContent = `$${stats.averageProfit.toFixed(2)}`;
    document.getElementById('averageLoss').textContent = `$${stats.averageLoss.toFixed(2)}`;
    document.getElementById('bestSession').textContent = stats.bestSession || '-';
    document.getElementById('bestAsset').textContent = stats.bestAsset || '-';
}

function resetStats() {
    const elements = [
        'currentCapital', 'totalPnL', 'returnPercentage', 'totalTrades',
        'winningTrades', 'losingTrades', 'successRate', 'averageProfit',
        'averageLoss', 'bestSession', 'bestAsset'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id.includes('Capital') || id.includes('PnL') || id.includes('Profit') || id.includes('Loss')) {
                element.textContent = '$0';
            } else if (id.includes('Percentage') || id.includes('Rate')) {
                element.textContent = '0%';
            } else if (id === 'totalTrades' || id === 'winningTrades' || id === 'losingTrades') {
                element.textContent = '0';
            } else {
                element.textContent = '-';
            }
        }
    });
}

function calculateStats(trades) {
    const stats = {
        totalTrades: trades.length,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        totalProfit: 0,
        totalLoss: 0,
        sessionPerformance: {},
        assetPerformance: {}
    };
    
    trades.forEach(trade => {
        const profitLoss = parseFloat(trade.profitLoss);
        stats.totalPnL += profitLoss;
        
        if (trade.result === 'ربح') {
            stats.winningTrades++;
            stats.totalProfit += Math.abs(profitLoss);
        } else {
            stats.losingTrades++;
            stats.totalLoss += Math.abs(profitLoss);
        }
        
        // تتبع الأداء حسب الجلسة
        if (!stats.sessionPerformance[trade.session]) {
            stats.sessionPerformance[trade.session] = 0;
        }
        stats.sessionPerformance[trade.session] += profitLoss;
        
        // تتبع الأداء حسب الأصل
        if (!stats.assetPerformance[trade.asset]) {
            stats.assetPerformance[trade.asset] = 0;
        }
        stats.assetPerformance[trade.asset] += profitLoss;
    });
    
    // حساب الإحصائيات الإضافية
    stats.successRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
    stats.averageProfit = stats.winningTrades > 0 ? stats.totalProfit / stats.winningTrades : 0;
    stats.averageLoss = stats.losingTrades > 0 ? stats.totalLoss / stats.losingTrades : 0;
    stats.returnPercentage = userData.initialCapital > 0 ? (stats.totalPnL / userData.initialCapital) * 100 : 0;
    
    // تحديد أفضل جلسة وأفضل أصل
    stats.bestSession = Object.keys(stats.sessionPerformance).length > 0 
        ? Object.keys(stats.sessionPerformance).reduce((a, b) => stats.sessionPerformance[a] > stats.sessionPerformance[b] ? a : b)
        : null;
    
    stats.bestAsset = Object.keys(stats.assetPerformance).length > 0
        ? Object.keys(stats.assetPerformance).reduce((a, b) => stats.assetPerformance[a] > stats.assetPerformance[b] ? a : b)
        : null;
    
    return stats;
}

// ========== استمر في بقية الدوال الموجودة في app.js ==========

// أضف باقي دوال التطبيق (إضافة الصفقات، التقويم، الرسوم البيانية، إلخ) كما هي
// تأكد من استبدال localStorage بـ Firebase في جميع الوظائف

// عند إضافة صفقة جديدة، استخدم الدالة addTrade المحدثة
document.getElementById('tradeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const tradeData = {
        asset: document.getElementById('asset').value === 'other' 
            ? document.getElementById('otherAsset').value 
            : document.getElementById('asset').value,
        tradeType: document.getElementById('tradeType').value,
        session: document.getElementById('session').value,
        amount: parseFloat(document.getElementById('amount').value),
        result: document.getElementById('result').value,
        profitLoss: parseFloat(document.getElementById('profitLoss').value),
        notes: document.getElementById('notes').value
    };
    
    // إضافة صورة إذا وجدت
    const imageFile = document.getElementById('tradeImage').files[0];
    if (imageFile) {
        try {
            const imageUrl = await uploadTradeImage(imageFile);
            tradeData.imageUrl = imageUrl;
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
        }
    }
    
    try {
        await addTrade(tradeData);
        
        // إعادة تعيين النموذج
        this.reset();
        alert('تم إضافة الصفقة بنجاح!');
    } catch (error) {
        alert('حدث خطأ أثناء إضافة الصفقة');
    }
});

async function uploadTradeImage(file) {
    if (!currentUser) return null;
    
    const storageRef = storage.ref();
    const imageRef = storageRef.child(`trades/${currentUser.uid}/${Date.now()}_${file.name}`);
    const snapshot = await imageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return downloadURL;
}

// ========== حذف الصفقة ==========

function setupDeleteTradeButtons() {
    document.querySelectorAll('.delete-trade-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const tradeId = this.getAttribute('data-id');
            if (confirm('هل أنت متأكد من حذف هذه الصفقة؟')) {
                await deleteTrade(tradeId);
            }
        });
    });
}

// ========== لوحة المتصدرين ==========

async function loadLeaderboard() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const tradesSnapshot = await db.collection('trades').get();
        
        // تجميع بيانات المستخدمين
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // تجميع الصفقات
        const tradesByUser = {};
        tradesSnapshot.forEach(doc => {
            const trade = doc.data();
            if (!tradesByUser[trade.userId]) {
                tradesByUser[trade.userId] = [];
            }
            tradesByUser[trade.userId].push(trade);
        });
        
        // حساب الإحصائيات لكل مستخدم
        const leaderboardData = users.map(user => {
            const userTrades = tradesByUser[user.id] || [];
            const stats = calculateStats(userTrades);
            
            return {
                name: user.name,
                winRate: stats.successRate,
                totalProfit: stats.totalProfit,
                roi: stats.returnPercentage,
                tradesCount: userTrades.length
            };
        });
        
        // ترتيب البيانات حسب نسبة الفوز
        leaderboardData.sort((a, b) => b.winRate - a.winRate);
        
        // تحديث واجهة لوحة المتصدرين
        updateLeaderboardUI(leaderboardData);
    } catch (error) {
        console.error('خطأ في تحميل لوحة المتصدرين:', error);
    }
}

// ========== تحديث واجهة لوحة المتصدرين ==========

function updateLeaderboardUI(data) {
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (!data || data.length === 0) {
        leaderboardList.innerHTML = '<div class="no-data">لا توجد بيانات متاحة</div>';
        return;
    }
    
    let html = '';
    data.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        html += `
            <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                <div class="rank-col">${index + 1} ${medal}</div>
                <div class="name-col">${user.name}</div>
                <div class="stats-col">${user.winRate.toFixed(1)}%</div>
                <div class="stats-col">$${user.totalProfit.toFixed(2)}</div>
                <div class="stats-col">${user.roi.toFixed(1)}%</div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = html;
    
    // تحديث تصنيف المستخدم الحالي
    if (currentUser) {
        const currentUserIndex = data.findIndex(user => user.name === userData.name);
        if (currentUserIndex !== -1) {
            document.getElementById('userRank').textContent = `#${currentUserIndex + 1}`;
            document.getElementById('userRankDetails').textContent = 
                `نسبة الفوز: ${data[currentUserIndex].winRate.toFixed(1)}% | العائد: ${data[currentUserIndex].roi.toFixed(1)}%`;
        }
    }
}

// ========== استدعاء دوال التحميل عند التبديل بين التبويبات ==========

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        
        // تحديث التبويبات النشطة
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // إظهار المحتوى المحدد
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId + '-tab').classList.add('active');
        
        // تحميل البيانات عند التبديل إلى تبويب معين
        if (tabId === 'leaderboard') {
            loadLeaderboard();
        }
    });
});

// ========== إضافة مستمع لحفظ الاستراتيجية ==========

document.getElementById('saveStrategyBtn').addEventListener('click', saveStrategy);

// ========== عرض معاينة الاستراتيجية ==========

function displayStrategyPreview() {
    if (!userStrategy) return;
    
    const previewContent = document.getElementById('previewContent');
    let html = `
        <div class="strategy-preview-item">
            <h4>${userStrategy.title || 'استراتيجية بدون عنوان'}</h4>
            <p><strong>نمط التداول:</strong> ${getTradingStyleName(userStrategy.tradingStyle)}</p>
            <p><strong>الإطار الزمني:</strong> ${getTimeframeName(userStrategy.timeframe)}</p>
            <p><strong>نسبة المخاطرة:</strong> ${userStrategy.riskPerTrade || 0}%</p>
            <p><strong>نسبة العائد للمخاطرة:</strong> ${userStrategy.rewardRatio || 0}:1</p>
        </div>
    `;
    
    if (userStrategy.entryRules) {
        html += `
            <div class="strategy-preview-item">
                <h5><i class="fas fa-sign-in-alt"></i> قواعد الدخول</h5>
                <p>${userStrategy.entryRules}</p>
            </div>
        `;
    }
    
    if (userStrategy.exitRules) {
        html += `
            <div class="strategy-preview-item">
                <h5><i class="fas fa-sign-out-alt"></i> قواعد الخروج</h5>
                <p>${userStrategy.exitRules}</p>
            </div>
        `;
    }
    
    previewContent.innerHTML = html;
}

function getTradingStyleName(style) {
    const styles = {
        'scalping': 'سكالبينج',
        'day': 'تداول يومي',
        'swing': 'تداول أرجوحي',
        'position': 'تداول مراكز',
        'investing': 'استثمار طويل الأجل'
    };
    return styles[style] || style || 'غير محدد';
}

function getTimeframeName(timeframe) {
    const timeframes = {
        '1m': '1 دقيقة',
        '5m': '5 دقائق',
        '15m': '15 دقيقة',
        '1h': '1 ساعة',
        '4h': '4 ساعات',
        '1d': 'يومي',
        '1w': 'أسبوعي'
    };
    return timeframes[timeframe] || timeframe || 'غير محدد';
}

// ========== تحديث قائمة الصفقات ==========

function updateTradesList() {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!userTrades || userTrades.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">لا توجد صفقات مسجلة بعد. ابدأ بإضافة أول صفقة.</p>';
        return;
    }
    
    let html = '';
    userTrades.forEach(trade => {
        const profitClass = trade.result === 'ربح' ? 'positive' : 'negative';
        const profitSign = trade.result === 'ربح' ? '+' : '-';
        
        html += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-type ${trade.tradeType === 'شراء' ? 'buy' : 'sell'}">
                        ${trade.tradeType === 'شراء' ? 'شراء' : 'بيع'} ${trade.asset}
                    </div>
                    <div class="transaction-date">
                        ${formatDate(trade.date)}
                    </div>
                </div>
                <div class="transaction-details">
                    <div class="detail">
                        <span class="label">الجلسة:</span>
                        <span class="value">${trade.session}</span>
                    </div>
                    <div class="detail">
                        <span class="label">المبلغ:</span>
                        <span class="value">$${parseFloat(trade.amount).toFixed(2)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">النتيجة:</span>
                        <span class="value ${profitClass}">
                            ${trade.result} (${profitSign}$${Math.abs(parseFloat(trade.profitLoss)).toFixed(2)})
                        </span>
                    </div>
                </div>
                ${trade.notes ? `
                    <div class="transaction-notes">
                        <p>${trade.notes.substring(0, 100)}${trade.notes.length > 100 ? '...' : ''}</p>
                    </div>
                ` : ''}
                ${trade.imageUrl ? `
                    <div class="transaction-image">
                        <img src="${trade.imageUrl}" alt="صورة الصفقة" onclick="showImageModal('${trade.imageUrl}')">
                    </div>
                ` : ''}
                <div class="transaction-actions">
                    <button class="delete-btn delete-trade-btn" data-id="${trade.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
    
    // إعداد أزرار الحذف
    setupDeleteTradeButtons();
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========== دوال الرسوم البيانية ==========

function updateCharts() {
    if (!userTrades || userTrades.length === 0) return;
    
    const stats = calculateStats(userTrades);
    
    // رسم بياني الربح/الخسارة
    updateWinLossChart(stats);
    
    // رسم بياني الجلسات
    updateSessionChart(stats.sessionPerformance);
    
    // رسم بياني الأصول
    updateAssetChart(stats.assetPerformance);
}

function updateWinLossChart(stats) {
    const ctx = document.getElementById('winLossChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['الصفقات الرابحة', 'الصفقات الخاسرة'],
            datasets: [{
                data: [stats.winningTrades, stats.losingTrades],
                backgroundColor: ['#4CAF50', '#F44336']
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
}

function updateSessionChart(sessionPerformance) {
    const ctx = document.getElementById('sessionChart').getContext('2d');
    const sessions = Object.keys(sessionPerformance);
    const profits = Object.values(sessionPerformance);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sessions,
            datasets: [{
                label: 'الأرباح/الخسائر',
                data: profits,
                backgroundColor: profits.map(p => p >= 0 ? '#4CAF50' : '#F44336')
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ========== Modal عرض الصور ==========

function showImageModal(imageUrl) {
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('imageModal').style.display = 'block';
}

// ========== إغلاق Modals ==========

document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ========== تهيئة التاريخ في نموذج الصفقة ==========

document.getElementById('tradeDate').valueAsDate = new Date();

// ========== إدارة اختيار الأصل الآخر ==========

document.getElementById('asset').addEventListener('change', function() {
    const otherAssetInput = document.getElementById('otherAsset');
    otherAssetInput.style.display = this.value === 'other' ? 'block' : 'none';
});

// ========== معاينة الصورة قبل الرفع ==========

document.getElementById('tradeImage').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
        }
        
        reader.readAsDataURL(this.files[0]);
    }
});

document.getElementById('removeImageBtn').addEventListener('click', function() {
    document.getElementById('tradeImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
});

// ========== تهيئة التطبيق ==========

// عند تحميل الصفحة، تحقق من حالة المصادقة
window.onload = function() {
    // هذه الدالة سيتم استدعاؤها تلقائياً بواسطة onAuthStateChanged
};
