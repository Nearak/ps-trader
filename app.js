// ========== تهيئة Firebase ==========
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
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase initialized successfully");
    } else {
        firebase.app();
        console.log("✅ Firebase already initialized");
    }
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
    showError("خطأ في تهيئة Firebase. تأكد من اتصال الإنترنت.");
}

// الحصول على الخدمات
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// إعداد استمرارية الجلسة لمنع تسجيل الخروج التلقائي
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("✅ تم تعيين استمرارية الجلسة إلى LOCAL");
    })
    .catch((error) => {
        console.error("❌ خطأ في تعيين استمرارية الجلسة:", error);
    });

// حالة التطبيق
let currentUser = null;
let userData = null;
let userTrades = [];
let userStrategy = null;
let sessionRefreshInterval = null;
let allTradersData = [];

// متغيرات التقويم
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// متغيرات الرسوم البيانية
let chartInstances = {};

// ========== تهيئة التطبيق عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Starting application...");
    
    // إخفاء محتوى التطبيق في البداية
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'none';
    }
    
    // إظهار قسم المصادقة
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.style.display = 'block';
    }
    
    // إخفاء معلومات المستخدم
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'none';
    }
    
    // إعداد التواريخ الافتراضية
    initializeDates();
    
    // إعداد المستمعين للأحداث
    setupEventListeners();
    
    // التحقق من حالة المصادقة
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // اختبار اتصال Firebase
    testFirebaseConnection();
    
    // إظهار تبويب تسجيل الدخول افتراضياً
    showAuthForm('login');
});

// ========== اختبار اتصال Firebase ==========
async function testFirebaseConnection() {
    try {
        console.log("🔍 Testing Firebase connection...");
        if (auth) {
            console.log("✅ Firebase Auth service is available");
        }
    } catch (error) {
        console.error("❌ Firebase connection test failed:", error);
    }
}

// ========== إعداد المستمعين للأحداث ==========
function setupEventListeners() {
    console.log("🔧 Setting up event listeners...");
    
    // تسجيل الدخول
    const loginForm = document.getElementById('loginUserForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loginUser();
        });
    }
    
    // إنشاء حساب
    const registerForm = document.getElementById('registerUserForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerUser();
        });
    }
    
    // تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // تبديل تبويبات التسجيل
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const formType = this.getAttribute('data-form');
            showAuthForm(formType);
        });
    });
    
    // تعديل رأس المال
    const editCapitalBtn = document.getElementById('editCapitalBtn');
    if (editCapitalBtn) {
        editCapitalBtn.addEventListener('click', showCapitalModal);
    }
    
    // حفظ رأس المال
    const saveCapitalBtn = document.getElementById('saveCapitalBtn');
    if (saveCapitalBtn) {
        saveCapitalBtn.addEventListener('click', updateCapital);
    }
    
    // إغلاق modals
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // إغلاق modal عند النقر خارجها
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // إضافة صفقة
    const tradeForm = document.getElementById('tradeForm');
    if (tradeForm) {
        tradeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addTrade();
        });
    }
    
    // إدارة اختيار الأصل الآخر
    const assetSelect = document.getElementById('asset');
    const otherAssetInput = document.getElementById('otherAsset');
    if (assetSelect && otherAssetInput) {
        assetSelect.addEventListener('change', function() {
            otherAssetInput.style.display = this.value === 'other' ? 'block' : 'none';
            if (this.value !== 'other') {
                otherAssetInput.value = '';
            }
        });
    }
    
    // معاينة الصورة
    const tradeImage = document.getElementById('tradeImage');
    if (tradeImage) {
        tradeImage.addEventListener('change', previewImage);
    }
    
    // إزالة الصورة
    const removeImageBtn = document.getElementById('removeImageBtn');
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', removeImagePreview);
    }
    
    // حفظ الاستراتيجية
    const saveStrategyBtn = document.getElementById('saveStrategyBtn');
    if (saveStrategyBtn) {
        saveStrategyBtn.addEventListener('click', saveStrategy);
    }
    
    // التبويبات الرئيسية
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // تصفية الصفقات
    const filterAsset = document.getElementById('filterAsset');
    const filterSession = document.getElementById('filterSession');
    const filterResult = document.getElementById('filterResult');
    
    if (filterAsset) filterAsset.addEventListener('change', updateTradesList);
    if (filterSession) filterSession.addEventListener('change', updateTradesList);
    if (filterResult) filterResult.addEventListener('change', updateTradesList);
    
    // تصفية لوحة المتصدرين
    const leaderboardType = document.getElementById('leaderboardType');
    const timePeriod = document.getElementById('timePeriod');
    const minTrades = document.getElementById('minTrades');
    
    if (leaderboardType) leaderboardType.addEventListener('change', loadLeaderboard);
    if (timePeriod) timePeriod.addEventListener('change', loadLeaderboard);
    if (minTrades) minTrades.addEventListener('change', loadLeaderboard);
    
    console.log("✅ Event listeners setup complete");
}

// ========== معالجة حالة المصادقة ==========
function handleAuthStateChange(user) {
    console.log("👤 Auth state changed:", user ? "User logged in" : "No user");
    
    if (user) {
        currentUser = user;
        console.log("✅ User authenticated:", user.email);
        console.log("🔄 Starting user data loading...");
        
        // بدء تحديث الجلسة
        startSessionRefresh();
        
        // تحديث token الجلسة
        user.getIdToken(true).then(() => {
            console.log("✅ Session token refreshed");
        }).catch((error) => {
            console.error("❌ Error refreshing token:", error);
        });
        
        // تحميل بيانات المستخدم بعد تأكيد المصادقة
        setTimeout(() => {
            loadUserData();
        }, 500);
        
    } else {
        console.log("👋 No user, resetting app state");
        resetAppState();
        showAuthSection();
    }
}

// ========== تحديث حالة التطبيق ==========
async function refreshAppState() {
    console.log("🔄 Refreshing app state...");
    
    if (!currentUser) {
        console.log("⚠️ No user, cannot refresh app state");
        return;
    }
    
    try {
        // تحديث بيانات المستخدم
        await loadUserData();
        
        // تحديث الواجهة
        updateUIAfterLogin();
        
        console.log("✅ App state refreshed successfully");
        
    } catch (error) {
        console.error("❌ Error refreshing app state:", error);
        showError('حدث خطأ في تحديث التطبيق');
    }
}

// ========== تحديث الواجهة بعد تسجيل الدخول ==========
function updateUIAfterLogin() {
    console.log("🎨 Updating UI after login...");
    
    // تحديث المعلومات في الشريط العلوي
    if (userData) {
        const userGreeting = document.getElementById('userGreeting');
        const userCapital = document.getElementById('userCapital');
        const currentCapitalDisplay = document.getElementById('currentCapitalDisplay');
        const initialCapitalDisplay = document.getElementById('initialCapitalDisplay');
        
        if (userGreeting) userGreeting.textContent = `مرحباً، ${userData.name}`;
        if (userCapital) userCapital.textContent = userData.currentCapital.toFixed(2);
        if (currentCapitalDisplay) currentCapitalDisplay.textContent = `$${userData.currentCapital.toFixed(2)}`;
        if (initialCapitalDisplay) initialCapitalDisplay.textContent = `$${userData.initialCapital.toFixed(2)}`;
    }
    
    // إعادة رسم الرسوم البيانية فقط إذا كانت البيانات متوفرة
    if (userTrades && userTrades.length > 0) {
        setTimeout(() => {
            updateCharts();
        }, 1000);
    }
}

// ========== بدء تحديث الجلسة ==========
function startSessionRefresh() {
    // إيقاف أي فاصل زمني سابق
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    
    // تحديث الجلسة كل 4 دقائق (240000 مللي ثانية)
    sessionRefreshInterval = setInterval(() => {
        if (currentUser) {
            currentUser.getIdToken(true)
                .then(() => {
                    console.log("🔄 Session refreshed");
                })
                .catch((error) => {
                    console.error("❌ Error refreshing session:", error);
                });
        }
    }, 240000); // 4 دقائق
}

// ========== إعادة تعيين حالة التطبيق ==========
function resetAppState() {
    currentUser = null;
    userData = null;
    userTrades = [];
    userStrategy = null;
    allTradersData = [];
    
    // تنظيف الرسوم البيانية
    cleanupCharts();
    
    // إيقاف تحديث الجلسة
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
}

// ========== تنظيف الرسوم البيانية ==========
function cleanupCharts() {
    const chartIds = [
        'winLossChart', 
        'sessionChart', 
        'assetChart', 
        'profitChart', 
        'capitalChart',
        'monthlyTradesChart',
        'monthlySuccessChart'
    ];
    
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas) {
            const chart = Chart.getChart(canvas);
            if (chart) {
                chart.destroy();
            }
            // تنظيف المتغير المحلي
            chartInstances[chartId] = null;
        }
    });
}

// ========== دوال المصادقة ==========
async function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const alertDiv = document.getElementById('loginAlert');
    
    // التحقق من الحقول
    if (!email || !password) {
        showAlert(alertDiv, 'يرجى ملء جميع الحقول', 'danger');
        return;
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert(alertDiv, 'بريد إلكتروني غير صالح', 'danger');
        return;
    }
    
    try {
        showAlert(alertDiv, 'جاري تسجيل الدخول...', 'info');
        console.log("🔐 Attempting login for:", email);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("✅ Login successful:", userCredential.user.email);
        
        showAlert(alertDiv, 'تم تسجيل الدخول بنجاح! جاري تحميل البيانات...', 'success');
        
        // إخفاء التنبيه بعد تأخير قصير
        setTimeout(() => {
            if (alertDiv) {
                alertDiv.style.display = 'none';
            }
            
            // تأخير إضافي لضمان تحميل البيانات
            setTimeout(() => {
                refreshAppState();
            }, 1000);
            
        }, 2000);
        
    } catch (error) {
        console.error("❌ Login error:", error.code, error.message);
        const errorMessage = getAuthErrorMessage(error.code);
        showAlert(alertDiv, errorMessage, 'danger');
        
        // إعادة تعيين الحقول في حالة الخطأ
        document.getElementById('loginPassword').value = '';
    }
}

async function registerUser() {
    // الحصول على القيم من الحقول
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const initialCapital = parseFloat(document.getElementById('initialCapital').value) || 1000;
    const alertDiv = document.getElementById('registerAlert');
    
    // التحقق من الحقول
    if (!name || !email || !password || !confirmPassword) {
        showAlert(alertDiv, 'يرجى ملء جميع الحقول', 'danger');
        return;
    }
    
    if (name.length < 2) {
        showAlert(alertDiv, 'الاسم يجب أن يكون على الأقل حرفين', 'danger');
        return;
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert(alertDiv, 'بريد إلكتروني غير صالح', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showAlert(alertDiv, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'danger');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert(alertDiv, 'كلمات المرور غير متطابقة', 'danger');
        return;
    }
    
    if (isNaN(initialCapital) || initialCapital < 0) {
        showAlert(alertDiv, 'رأس المال يجب أن يكون قيمة عددية موجبة', 'danger');
        return;
    }
    
    try {
        showAlert(alertDiv, 'جاري إنشاء الحساب...', 'info');
        console.log("🚀 Starting account creation...");
        
        // 1. إنشاء المستخدم في Authentication
        console.log("1. Creating user in Firebase Auth...");
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("✅ User created in Auth:", user.uid);
        
        // 2. حفظ بيانات المستخدم في Firestore
        console.log("2. Saving user data to Firestore...");
        const userData = {
            name: name,
            email: email,
            initialCapital: initialCapital,
            currentCapital: initialCapital,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            totalTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        console.log("✅ User data saved to Firestore");
        
        showAlert(alertDiv, 'تم إنشاء الحساب بنجاح! يتم تسجيل الدخول تلقائياً...', 'success');
        console.log("🎉 Account creation complete!");
        
        // إخفاء التنبيه بعد ثانيتين
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error("❌ Registration error:", error.code, error.message);
        
        // رسالة خطأ مفصلة
        let errorMessage = getAuthErrorMessage(error.code);
        
        // إذا كان الخطأ بسبب أن البريد مستخدم بالفعل
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'هذا البريد الإلكتروني مستخدم بالفعل. حاول تسجيل الدخول بدلاً من ذلك.';
        }
        
        // إذا كان هناك مشكلة في الشبكة
        if (error.code === 'auth/network-request-failed') {
            errorMessage = 'خطأ في الاتصال بالإنترنت. تأكد من اتصالك بالشبكة وحاول مرة أخرى.';
        }
        
        showAlert(alertDiv, errorMessage, 'danger');
        
        // إذا فشل إنشاء الحساب، حاول حذف المستخدم من Auth إذا تم إنشاؤه
        if (auth.currentUser) {
            try {
                await auth.currentUser.delete();
                console.log("🗑️ Deleted partially created user from Auth");
            } catch (deleteError) {
                console.log("ℹ️ Could not delete user from Auth:", deleteError.message);
            }
        }
    }
}

async function logout() {
    try {
        resetAppState();
        await auth.signOut();
        console.log("✅ Logout successful");
        showAuthSection();
    } catch (error) {
        console.error("❌ Logout error:", error);
        showError('حدث خطأ أثناء تسجيل الخروج');
    }
}

// ========== دوال المساعدة للمصادقة ==========
function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appContent').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    
    // إعادة تعيين حقول التسجيل
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // إظهار تبويب تسجيل الدخول افتراضياً
    showAuthForm('login');
}

function showAppContent() {
    console.log("🔄 Switching to app content...");
    
    // إخفاء قسم المصادقة
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.style.display = 'none';
    }
    
    // إظهار المحتوى الرئيسي
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'block';
        
        // تبديل إلى تبويب الصفقات تلقائياً
        setTimeout(() => {
            switchTab('trades');
        }, 100);
    }
    
    // إظهار معلومات المستخدم
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'flex';
    }
    
    console.log("✅ App content displayed");
}

function showAuthForm(formType) {
    // تحديث التبويبات النشطة
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.auth-tab[data-form="${formType}"]`).classList.add('active');
    
    // إظهار النموذج المحدد
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(formType + 'Form').classList.add('active');
    
    // إخفاء أي تنبيهات
    document.querySelectorAll('.alert').forEach(alert => {
        alert.style.display = 'none';
    });
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/operation-not-allowed': 'خدمة التسجيل غير مفعلة',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف على الأقل',
        'auth/user-disabled': 'تم تعطيل هذا الحساب',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'محاولات تسجيل دخول كثيرة، حاول لاحقاً',
        'auth/network-request-failed': 'خطأ في الاتصال بالشبكة',
        'auth/invalid-api-key': 'مفتاح API غير صالح',
        'auth/app-not-authorized': 'التطبيق غير مصرح له بالوصول',
        'auth/configuration-not-found': 'إعدادات Firebase غير صحيحة',
        'auth/project-not-found': 'مشروع Firebase غير موجود',
        'auth/unauthorized-domain': 'هذا المجال غير مصرح به',
        'auth/internal-error': 'خطأ داخلي في الخادم'
    };
    
    return messages[errorCode] || `حدث خطأ غير معروف: ${errorCode}`;
}

// ========== تحميل بيانات المستخدم ==========
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        console.log("📥 Loading user data for:", currentUser.uid);
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            console.log("✅ User data loaded:", userData);
            
            // تحديث آخر تسجيل دخول
            await db.collection('users').doc(currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showAppContent();
            
            // تحديث واجهة المستخدم
            updateUIAfterLogin();
            
            // جلب الصفقات
            await loadUserTrades();
            
            // جلب الاستراتيجية
            await loadUserStrategy();
            
            // تحديث الإحصائيات
            updateStats();
            
            // تحديث الرسوم البيانية فقط إذا كان هناك بيانات
            if (userTrades && userTrades.length > 0) {
                updateCharts();
            }
            
        } else {
            console.error("❌ User document not found in Firestore");
            showError('بيانات المستخدم غير موجودة');
        }
        
    } catch (error) {
        console.error("❌ Error loading user data:", error);
        showError('خطأ في تحميل بيانات المستخدم');
    }
}

// ========== تحميل الصفقات ==========
async function loadUserTrades() {
    if (!currentUser) return;
    
    try {
        console.log("📥 Loading user trades...");
        
        const snapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        userTrades = [];
        snapshot.forEach(doc => {
            const trade = doc.data();
            trade.id = doc.id;
            // تحويل التواريخ بشكل صحيح
            if (trade.date && trade.date.toDate) {
                trade.date = trade.date.toDate();
            }
            userTrades.push(trade);
        });
        
        console.log(`✅ Loaded ${userTrades.length} trades`);
        
        // تحديث قائمة الصفقات
        updateTradesList();
        
        // تحديث التقويم
        updateCalendar();
        
        // تحديث الإحصائيات
        updateStats();
        
    } catch (error) {
        console.error("❌ Error loading trades:", error);
        // إذا كان الخطأ بسبب عدم وجود فهرس، قم بتحميل بدون ترتيب
        if (error.code === 'failed-precondition') {
            console.log("⚠️ Index not ready, loading without order...");
            await loadTradesWithoutOrder();
        }
    }
}

async function loadTradesWithoutOrder() {
    try {
        const snapshot = await db.collection('trades')
            .where('userId', '==', currentUser.uid)
            .get();
        
        userTrades = [];
        snapshot.forEach(doc => {
            const trade = doc.data();
            trade.id = doc.id;
            // تحويل التواريخ بشكل صحيح
            if (trade.date && trade.date.toDate) {
                trade.date = trade.date.toDate();
            }
            userTrades.push(trade);
        });
        
        // ترتيب يدوي حسب التاريخ
        userTrades.sort((a, b) => {
            const dateA = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : new Date(0);
            const dateB = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : new Date(0);
            return dateB - dateA;
        });
        
        updateTradesList();
        updateStats();
    } catch (error) {
        console.error("❌ Error loading trades without order:", error);
    }
}

// ========== تحميل الاستراتيجية ==========
async function loadUserStrategy() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('strategies').doc(currentUser.uid).get();
        
        if (doc.exists) {
            userStrategy = doc.data();
            displayStrategyPreview();
        }
    } catch (error) {
        console.error("❌ Error loading strategy:", error);
    }
}

// ========== لوحة المتصدرين ==========
async function loadLeaderboard() {
    try {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '<div class="loading-spinner"></div>';
        
        // جلب جميع المستخدمين
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // جلب جميع الصفقات
        const tradesSnapshot = await db.collection('trades').get();
        const allTrades = [];
        
        tradesSnapshot.forEach(doc => {
            allTrades.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // تجميع الصفقات لكل مستخدم
        const tradesByUser = {};
        allTrades.forEach(trade => {
            if (!tradesByUser[trade.userId]) {
                tradesByUser[trade.userId] = [];
            }
            tradesByUser[trade.userId].push(trade);
        });
        
        // حساب الإحصائيات لكل مستخدم
        allTradersData = [];
        let totalAllTrades = 0;
        let totalWinRateSum = 0;
        let highestProfit = 0;
        let activeTraders = 0;
        
        users.forEach(user => {
            const userTrades = tradesByUser[user.id] || [];
            const stats = calculateUserStats(userTrades, user);
            
            if (userTrades.length > 0) {
                totalAllTrades += userTrades.length;
                totalWinRateSum += stats.successRate;
                highestProfit = Math.max(highestProfit, stats.totalPnL);
                activeTraders++;
                
                allTradersData.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    initialCapital: user.initialCapital || 0,
                    currentCapital: user.currentCapital || user.initialCapital || 0,
                    tradesCount: userTrades.length,
                    ...stats
                });
            }
        });
        
        // تطبيق الفلاتر
        let filteredData = [...allTradersData];
        
        // فلترة حسب الحد الأدنى للصفقات
        const minTrades = parseInt(document.getElementById('minTrades').value) || 0;
        filteredData = filteredData.filter(trader => trader.tradesCount >= minTrades);
        
        // فلترة حسب الفترة الزمنية
        const timePeriod = document.getElementById('timePeriod').value;
        if (timePeriod === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filteredData = filteredData.filter(trader => {
                return true;
            });
        } else if (timePeriod === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
        } else if (timePeriod === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
        }
        
        // ترتيب حسب نوع التصنيف
        const leaderboardType = document.getElementById('leaderboardType').value;
        filteredData.sort((a, b) => {
            switch (leaderboardType) {
                case 'winRate':
                    return b.successRate - a.successRate;
                case 'totalProfit':
                    return b.totalProfit - a.totalProfit;
                case 'roi':
                    return b.returnPercentage - a.returnPercentage;
                case 'consistency':
                    const aConsistency = a.totalProfit / (a.tradesCount || 1);
                    const bConsistency = b.totalProfit / (b.tradesCount || 1);
                    return bConsistency - aConsistency;
                case 'totalTrades':
                    return b.tradesCount - a.tradesCount;
                default:
                    return b.successRate - a.successRate;
            }
        });
        
        // تحديث الإحصائيات العامة
        document.getElementById('totalTraders').textContent = activeTraders;
        document.getElementById('totalAllTrades').textContent = totalAllTrades;
        document.getElementById('avgWinRate').textContent = activeTraders > 0 ? 
            (totalWinRateSum / activeTraders).toFixed(1) + '%' : '0%';
        document.getElementById('highestProfit').textContent = '$' + highestProfit.toFixed(2);
        
        // تحديث لوحة المتصدرين
        updateLeaderboardUI(filteredData);
        
        // تحديث تصنيف المستخدم الحالي
        updateUserRank(filteredData);
        
        // تحديث الإنجازات
        updateAchievements();
        
    } catch (error) {
        console.error("❌ Error loading leaderboard:", error);
        document.getElementById('leaderboardList').innerHTML = 
            '<div class="no-data">حدث خطأ في تحميل بيانات المتصدرين</div>';
    }
}

function calculateUserStats(trades, user) {
    const stats = {
        totalTrades: trades.length,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        totalProfit: 0,
        totalLoss: 0,
        successRate: 0,
        averageProfit: 0,
        averageLoss: 0,
        returnPercentage: 0
    };
    
    trades.forEach(trade => {
        const profitLoss = parseFloat(trade.profitLoss) || 0;
        stats.totalPnL += profitLoss;
        
        if (trade.result === 'ربح') {
            stats.winningTrades++;
            stats.totalProfit += Math.abs(profitLoss);
        } else if (trade.result === 'خسارة') {
            stats.losingTrades++;
            stats.totalLoss += Math.abs(profitLoss);
        }
    });
    
    // حساب الإحصائيات الإضافية
    stats.successRate = stats.totalTrades > 0 ? 
        (stats.winningTrades / stats.totalTrades) * 100 : 0;
    
    stats.averageProfit = stats.winningTrades > 0 ? 
        stats.totalProfit / stats.winningTrades : 0;
    
    stats.averageLoss = stats.losingTrades > 0 ? 
        stats.totalLoss / stats.losingTrades : 0;
    
    const initialCapital = user.initialCapital || 1000;
    stats.returnPercentage = initialCapital > 0 ? 
        (stats.totalPnL / initialCapital) * 100 : 0;
    
    return stats;
}

function updateLeaderboardUI(tradersData) {
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (!tradersData || tradersData.length === 0) {
        leaderboardList.innerHTML = '<div class="no-data">لا توجد بيانات متاحة للعرض</div>';
        return;
    }
    
    let html = '';
    tradersData.forEach((trader, index) => {
        const isCurrentUser = currentUser && trader.id === currentUser.uid;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        let rowClass = '';
        
        if (index < 3) rowClass = 'top-three';
        if (isCurrentUser) rowClass += ' current-user';
        
        html += `
            <div class="leaderboard-item ${rowClass}">
                <div class="rank-col">${index + 1} ${medal}</div>
                <div class="name-col">
                    ${trader.name}
                    ${isCurrentUser ? '<span style="color: #667eea; font-size: 0.8em;">(أنت)</span>' : ''}
                </div>
                <div class="stats-col">${trader.tradesCount}</div>
                <div class="stats-col">${trader.successRate.toFixed(1)}%</div>
                <div class="stats-col">$${trader.totalProfit.toFixed(2)}</div>
                <div class="stats-col">${trader.returnPercentage.toFixed(1)}%</div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = html;
}

function updateUserRank(tradersData) {
    if (!currentUser || !userData) return;
    
    const userIndex = tradersData.findIndex(trader => trader.id === currentUser.uid);
    
    if (userIndex !== -1) {
        const userRank = userIndex + 1;
        const userData = tradersData[userIndex];
        
        document.getElementById('userRank').textContent = `#${userRank}`;
        document.getElementById('userRankDetails').innerHTML = `
            <div>عدد الصفقات: ${userData.tradesCount}</div>
            <div>نسبة الفوز: ${userData.successRate.toFixed(1)}%</div>
            <div>إجمالي الأرباح: $${userData.totalProfit.toFixed(2)}</div>
        `;
    } else {
        document.getElementById('userRank').textContent = 'غير مصنف';
        document.getElementById('userRankDetails').textContent = 'ابدأ بالتداول للظهور في التصنيف';
    }
}

function updateAchievements() {
    if (!userData || !userTrades) return;
    
    const achievementsGrid = document.getElementById('achievementsGrid');
    const stats = calculateStats(userTrades);
    
    const achievements = [
        {
            id: 'beginner',
            title: 'المتداول المبتدئ',
            description: 'إكمال 10 صفقات',
            icon: 'fas fa-rocket',
            condition: userTrades.length >= 10,
            progress: Math.min((userTrades.length / 10) * 100, 100),
            current: userTrades.length,
            target: 10
        },
        {
            id: 'profit_master',
            title: 'محترف الربح',
            description: 'تحقيق $1000 ربح',
            icon: 'fas fa-chart-line',
            condition: stats.totalProfit >= 1000,
            progress: Math.min((stats.totalProfit / 1000) * 100, 100),
            current: `$${stats.totalProfit.toFixed(2)}`,
            target: '$1000'
        },
        {
            id: 'risk_manager',
            title: 'مدير المخاطر',
            description: 'نسبة فوز 70% أو أكثر',
            icon: 'fas fa-shield-alt',
            condition: stats.successRate >= 70,
            progress: Math.min(stats.successRate, 100),
            current: `${stats.successRate.toFixed(1)}%`,
            target: '70%'
        },
        {
            id: 'consistency',
            title: 'المتداول المنتظم',
            description: '30 صفقة على الأقل',
            icon: 'fas fa-calendar-check',
            condition: userTrades.length >= 30,
            progress: Math.min((userTrades.length / 30) * 100, 100),
            current: userTrades.length,
            target: 30
        },
        {
            id: 'capital_growth',
            title: 'نمو رأس المال',
            description: 'زيادة رأس المال بنسبة 50%',
            icon: 'fas fa-money-bill-wave',
            condition: stats.returnPercentage >= 50,
            progress: Math.min(stats.returnPercentage, 100),
            current: `${stats.returnPercentage.toFixed(1)}%`,
            target: '50%'
        },
        {
            id: 'streak',
            title: 'سلسلة النجاح',
            description: '5 صفقات رابحة متتالية',
            icon: 'fas fa-fire',
            condition: checkWinningStreak(userTrades) >= 5,
            progress: Math.min((checkWinningStreak(userTrades) / 5) * 100, 100),
            current: checkWinningStreak(userTrades),
            target: 5
        }
    ];
    
    let html = '';
    achievements.forEach(achievement => {
        const isUnlocked = achievement.condition;
        
        html += `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${achievement.progress}%"></div>
                    </div>
                    <span class="progress-text">${achievement.current}/${achievement.target}</span>
                </div>
            </div>
        `;
    });
    
    achievementsGrid.innerHTML = html;
}

function checkWinningStreak(trades) {
    let currentStreak = 0;
    let maxStreak = 0;
    
    // فرز الصفقات من الأحدث إلى الأقدم
    const sortedTrades = [...trades].sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : new Date(0);
        const dateB = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : new Date(0);
        return dateB - dateA;
    });
    
    for (const trade of sortedTrades) {
        if (trade.result === 'ربح') {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            break;
        }
    }
    
    return maxStreak;
}

// ========== دالة تبديل التبويبات ==========
function switchTab(tabId) {
    // تحديث التبويبات النشطة
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    
    // إظهار المحتوى المحدد
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabContent = document.getElementById(tabId + '-tab');
    if (tabContent) {
        tabContent.classList.add('active');
        
        // تحميل البيانات عند التبديل إلى تبويب معين
        if (tabId === 'leaderboard') {
            loadLeaderboard();
        } else if (tabId === 'charts') {
            // تأخير تحديث الرسوم البيانية للتأكد من عرض العنصر
            setTimeout(() => {
                updateCharts();
            }, 100);
        } else if (tabId === 'calendar') {
            updateCalendar();
        } else if (tabId === 'performance') {
            setTimeout(() => {
                updatePerformanceCharts();
            }, 100);
        }
    }
}

// ========== دوال التطبيق الأساسية ==========
function initializeDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    const tradeDateInput = document.getElementById('tradeDate');
    if (tradeDateInput) {
        tradeDateInput.value = dateTimeLocal;
    }
}

function showAlert(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    // تمرير للأسفل لمشاهدة التنبيه
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showError(message) {
    // إنشاء تنبيه مؤقت
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10000';
    alertDiv.style.maxWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    // إنشاء تنبيه مؤقت
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '10000';
    alertDiv.style.maxWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ========== دوال عامة للوصول من HTML ==========
window.showImageModal = function(imageUrl) {
    const modalImage = document.getElementById('modalImage');
    const imageModal = document.getElementById('imageModal');
    
    if (modalImage && imageModal) {
        modalImage.src = imageUrl;
        imageModal.style.display = 'block';
    }
};

window.showFullNotes = function(notes) {
    const notesContent = document.getElementById('notesContent');
    const notesModal = document.getElementById('notesModal');
    
    if (notesContent && notesModal) {
        notesContent.textContent = notes;
        notesModal.style.display = 'block';
    }
};

window.deleteTrade = async function(tradeId) {
    if (!currentUser) return;
    
    if (!confirm('هل أنت متأكد من حذف هذه الصفقة؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    try {
        await db.collection('trades').doc(tradeId).delete();
        showSuccess('تم حذف الصفقة بنجاح!');
        
        // إعادة تحميل الصفقات
        await loadUserTrades();
        
    } catch (error) {
        console.error("❌ Error deleting trade:", error);
        showError('حدث خطأ أثناء حذف الصفقة');
    }
};

window.showDayTrades = function(dateStr) {
    const dayTrades = userTrades.filter(trade => {
        if (!trade.date) return false;
        let tradeDate;
        if (trade.date.toDate) {
            tradeDate = trade.date.toDate();
        } else {
            tradeDate = new Date(trade.date);
        }
        const tradeDateStr = tradeDate.toISOString().split('T')[0];
        return tradeDateStr === dateStr;
    });
    
    const selectedDay = document.getElementById('selected-day');
    const dayTradesList = document.getElementById('day-trades-list');
    
    if (!selectedDay || !dayTradesList) return;
    
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    selectedDay.textContent = `تفاصيل الصفقات ليوم ${formattedDate}`;
    
    if (dayTrades.length === 0) {
        dayTradesList.innerHTML = '<p class="no-data">لا توجد صفقات في هذا اليوم.</p>';
    } else {
        let html = '';
        let dayProfit = 0;
        
        dayTrades.forEach(trade => {
            const profitClass = trade.result === 'ربح' ? 'positive' : 'negative';
            const profitSign = trade.result === 'ربح' ? '+' : '-';
            const amount = parseFloat(trade.amount) || 0;
            const profitLoss = parseFloat(trade.profitLoss) || 0;
            dayProfit += profitLoss;
            
            // تنسيق الوقت
            let timeStr = '';
            if (trade.date) {
                let tradeDate;
                if (trade.date.toDate) {
                    tradeDate = trade.date.toDate();
                } else {
                    tradeDate = new Date(trade.date);
                }
                timeStr = tradeDate.toLocaleTimeString('ar-SA', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            
            html += `
                <div class="transaction-item" style="margin-bottom: 10px;">
                    <div class="transaction-header">
                        <div class="transaction-type ${trade.tradeType === 'شراء' ? 'buy' : 'sell'}">
                            ${trade.tradeType === 'شراء' ? 'شراء' : 'بيع'} ${trade.asset}
                            <span style="font-size: 0.8em; color: #666; margin-right: 10px;">${timeStr}</span>
                        </div>
                    </div>
                    <div class="transaction-details">
                        <div class="detail">
                            <span class="label">الجلسة:</span>
                            <span class="value">${trade.session}</span>
                        </div>
                        <div class="detail">
                            <span class="label">لوت:</span>
                            <span class="value">$${amount.toFixed(2)}</span>
                        </div>
                        <div class="detail">
                            <span class="label">النتيجة:</span>
                            <span class="value ${profitClass}">
                                ${trade.result} (${profitSign}$${Math.abs(profitLoss).toFixed(2)})
                            </span>
                        </div>
                    </div>
                    ${trade.notes ? `
                        <div class="transaction-notes">
                            <p>${trade.notes}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        // إضافة ملخص اليوم
        const summaryHTML = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4>ملخص اليوم</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div>
                        <strong>عدد الصفقات:</strong><br>
                        ${dayTrades.length}
                    </div>
                    <div>
                        <strong>صافي الربح/الخسارة:</strong><br>
                        <span class="${dayProfit >= 0 ? 'positive' : 'negative'}">
                            ${dayProfit >= 0 ? '+' : ''}${dayProfit.toFixed(2)}$
                        </span>
                    </div>
                    <div>
                        <strong>نسبة النجاح:</strong><br>
                        ${((dayTrades.filter(t => t.result === 'ربح').length / dayTrades.length) * 100 || 0).toFixed(1)}%
                    </div>
                </div>
            </div>
        `;
        
        dayTradesList.innerHTML = summaryHTML + html;
    }
    
    // إظهار قسم التفاصيل
    const dayDetails = document.getElementById('day-details');
    if (dayDetails) {
        dayDetails.style.display = 'block';
    }
};

// ========== دوال إضافية تحتاجها ==========
function calculateStats(trades) {
    const stats = {
        totalTrades: trades.length,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        successRate: 0,
        returnPercentage: 0
    };
    
    trades.forEach(trade => {
        const profitLoss = parseFloat(trade.profitLoss) || 0;
        
        if (trade.result === 'ربح') {
            stats.winningTrades++;
            stats.totalProfit += Math.abs(profitLoss);
        } else if (trade.result === 'خسارة') {
            stats.losingTrades++;
            stats.totalLoss += Math.abs(profitLoss);
        }
    });
    
    stats.successRate = stats.totalTrades > 0 ? 
        (stats.winningTrades / stats.totalTrades) * 100 : 0;
    
    const initialCapital = userData ? userData.initialCapital : 1000;
    const totalPnL = stats.totalProfit - stats.totalLoss;
    stats.returnPercentage = initialCapital > 0 ? 
        (totalPnL / initialCapital) * 100 : 0;
    
    return stats;
}

// ========== إضافة صفقة جديدة ==========
async function addTrade() {
    if (!currentUser || !userData) {
        showError('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const asset = document.getElementById('asset').value;
    const otherAsset = document.getElementById('otherAsset').value;
    const selectedAsset = asset === 'other' ? otherAsset : asset;
    
    const tradeType = document.getElementById('tradeType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const result = document.getElementById('result').value;
    const profitLoss = parseFloat(document.getElementById('profitLoss').value);
    const session = document.getElementById('session').value;
    const notes = document.getElementById('notes').value;
    const tradeDate = document.getElementById('tradeDate').value;
    const imageFile = document.getElementById('tradeImage').files[0];
    
    // التحقق من الحقول المطلوبة
    if (!selectedAsset || !tradeType || !amount || !result || isNaN(profitLoss) || !session || !tradeDate) {
        showError('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    if (amount <= 0) {
        showError('المبلغ يجب أن يكون أكبر من الصفر');
        return;
    }
    
    if (asset === 'other' && !otherAsset) {
        showError('يرجى إدخال اسم الأصل');
        return;
    }
    
    try {
        console.log("➕ Adding new trade...");
        
        // رفع الصورة إذا كانت موجودة
        let imageUrl = '';
        if (imageFile) {
            const storageRef = storage.ref(`trades/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const snapshot = await storageRef.put(imageFile);
            imageUrl = await snapshot.ref.getDownloadURL();
            console.log("✅ Image uploaded:", imageUrl);
        }
        
        // إنشاء كائن الصفقة
        const tradeData = {
            userId: currentUser.uid,
            userName: userData.name,
            asset: selectedAsset,
            tradeType: tradeType,
            amount: amount,
            result: result,
            profitLoss: profitLoss,
            session: session,
            notes: notes,
            imageUrl: imageUrl,
            date: firebase.firestore.Timestamp.fromDate(new Date(tradeDate)),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // إضافة الصفقة إلى Firestore
        const docRef = await db.collection('trades').add(tradeData);
        console.log("✅ Trade added with ID:", docRef.id);
        
        // تحديث رأس المال بناءً على نتيجة الصفقة
        const newCapital = userData.currentCapital + profitLoss;
        
        // تحديث إحصائيات المستخدم
        const updateData = {
            currentCapital: newCapital,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (result === 'ربح') {
            updateData.totalProfit = (userData.totalProfit || 0) + profitLoss;
        } else if (result === 'خسارة') {
            updateData.totalLoss = (userData.totalLoss || 0) + Math.abs(profitLoss);
        }
        
        updateData.totalTrades = (userData.totalTrades || 0) + 1;
        
        await db.collection('users').doc(currentUser.uid).update(updateData);
        console.log("✅ User data updated");
        
        // إعادة تعيين النموذج
        document.getElementById('tradeForm').reset();
        removeImagePreview();
        
        // إظهار رسالة النجاح
        showSuccess('تم إضافة الصفقة بنجاح!');
        
        // إعادة تحميل البيانات
        await loadUserData();
        
    } catch (error) {
        console.error("❌ Error adding trade:", error);
        showError('حدث خطأ أثناء إضافة الصفقة: ' + error.message);
    }
}

// ========== تحديث قائمة الصفقات ==========
function updateTradesList() {
    const tradesList = document.getElementById('tradesList');
    if (!tradesList) return;
    
    // تطبيق الفلاتر
    let filteredTrades = [...userTrades];
    
    const filterAsset = document.getElementById('filterAsset').value;
    const filterSession = document.getElementById('filterSession').value;
    const filterResult = document.getElementById('filterResult').value;
    
    if (filterAsset && filterAsset !== 'all') {
        filteredTrades = filteredTrades.filter(trade => trade.asset === filterAsset);
    }
    
    if (filterSession && filterSession !== 'all') {
        filteredTrades = filteredTrades.filter(trade => trade.session === filterSession);
    }
    
    if (filterResult && filterResult !== 'all') {
        filteredTrades = filteredTrades.filter(trade => trade.result === filterResult);
    }
    
    // تحديث العداد
    document.getElementById('tradesCount').textContent = filteredTrades.length;
    
    if (filteredTrades.length === 0) {
        tradesList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-chart-bar"></i>
                <p>لا توجد صفقات لعرضها</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredTrades.forEach(trade => {
        const profitClass = trade.result === 'ربح' ? 'positive' : 'negative';
        const profitSign = trade.result === 'ربح' ? '+' : '-';
        const amount = parseFloat(trade.amount) || 0;
        const profitLoss = parseFloat(trade.profitLoss) || 0;
        
        // تنسيق التاريخ
        let dateStr = '';
        if (trade.date) {
            let tradeDate;
            if (trade.date.toDate) {
                tradeDate = trade.date.toDate();
            } else {
                tradeDate = new Date(trade.date);
            }
            dateStr = tradeDate.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        html += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-type ${trade.tradeType === 'شراء' ? 'buy' : 'sell'}">
                        ${trade.tradeType === 'شراء' ? 'شراء' : 'بيع'} ${trade.asset}
                        <span style="font-size: 0.8em; color: #666; margin-right: 10px;">${dateStr}</span>
                    </div>
                    <div class="transaction-actions">
                        ${trade.imageUrl ? 
                            `<button class="btn-icon" onclick="showImageModal('${trade.imageUrl}')">
                                <i class="fas fa-image"></i>
                            </button>` : ''
                        }
                        ${trade.notes ? 
                            `<button class="btn-icon" onclick="showFullNotes('${trade.notes}')">
                                <i class="fas fa-sticky-note"></i>
                            </button>` : ''
                        }
                        <button class="btn-icon btn-danger" onclick="deleteTrade('${trade.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="transaction-details">
                    <div class="detail">
                        <span class="label">الجلسة:</span>
                        <span class="value">${trade.session}</span>
                    </div>
                    <div class="detail">
                        <span class="label">لوت:</span>
                        <span class="value">$${amount.toFixed(2)}</span>
                    </div>
                    <div class="detail">
                        <span class="label">النتيجة:</span>
                        <span class="value ${profitClass}">
                            ${trade.result} (${profitSign}$${Math.abs(profitLoss).toFixed(2)})
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    tradesList.innerHTML = html;
}

// ========== تقويم الصفقات ==========
function updateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    // حساب عدد الأيام في الشهر
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    // تحويل اليوم إلى النظام العربي (الأحد = 0 في JavaScript)
    const adjustedFirstDay = (firstDay + 6) % 7;
    
    let html = '';
    
    // إضافة أيام الأسبوع
    const weekdays = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    
    // إضافة خلايا فارغة قبل أول يوم من الشهر
    for (let i = 0; i < adjustedFirstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // إضافة أيام الشهر
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // البحث عن صفقات في هذا اليوم
        const dayTrades = userTrades.filter(trade => {
            if (!trade.date) return false;
            let tradeDate;
            if (trade.date.toDate) {
                tradeDate = trade.date.toDate();
            } else {
                tradeDate = new Date(trade.date);
            }
            const tradeDateStr = tradeDate.toISOString().split('T')[0];
            return tradeDateStr === dateStr;
        });
        
        let dayClass = 'calendar-day';
        let dayContent = `<div class="day-number">${day}</div>`;
        
        if (dayTrades.length > 0) {
            dayClass += ' has-trades';
            
            // حساب إجمالي الربح/الخسارة لهذا اليوم
            let dayProfit = 0;
            dayTrades.forEach(trade => {
                dayProfit += parseFloat(trade.profitLoss) || 0;
            });
            
            const profitClass = dayProfit >= 0 ? 'positive' : 'negative';
            const profitSign = dayProfit >= 0 ? '+' : '';
            
            dayContent += `
                <div class="day-trades-count">${dayTrades.length} صفقة</div>
                <div class="day-profit ${profitClass}">${profitSign}${dayProfit.toFixed(2)}$</div>
            `;
        }
        
        html += `<div class="${dayClass}" onclick="window.showDayTrades('${dateStr}')">${dayContent}</div>`;
    }
    
    calendarGrid.innerHTML = html;
    
    // تحديث عنوان الشهر
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const calendarTitle = document.getElementById('calendarTitle');
    if (calendarTitle) {
        calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
}

// ========== تحديث الإحصائيات ==========
function updateStats() {
    if (!userTrades || userTrades.length === 0) {
        // تعيين قيم افتراضية إذا لم توجد صفقات
        document.getElementById('totalTrades').textContent = '0';
        document.getElementById('winRate').textContent = '0%';
        document.getElementById('totalProfit').textContent = '$0.00';
        document.getElementById('totalLoss').textContent = '$0.00';
        document.getElementById('netProfit').textContent = '$0.00';
        return;
    }
    
    const stats = calculateStats(userTrades);
    
    document.getElementById('totalTrades').textContent = stats.totalTrades;
    document.getElementById('winRate').textContent = `${stats.successRate.toFixed(1)}%`;
    document.getElementById('totalProfit').textContent = `$${stats.totalProfit.toFixed(2)}`;
    document.getElementById('totalLoss').textContent = `$${stats.totalLoss.toFixed(2)}`;
    
    const netProfit = stats.totalProfit - stats.totalLoss;
    document.getElementById('netProfit').textContent = `$${netProfit.toFixed(2)}`;
    
    // تحديث رأس المال الحالي في واجهة المستخدم
    if (userData && document.getElementById('userCapital')) {
        document.getElementById('userCapital').textContent = `$${userData.currentCapital.toFixed(2)}`;
    }
}

// ========== عرض وتحديث رأس المال ==========
function showCapitalModal() {
    if (!currentUser || !userData) {
        showError('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const modal = document.getElementById('capitalModal');
    const currentCapitalInput = document.getElementById('currentCapital');
    
    if (modal && currentCapitalInput) {
        currentCapitalInput.value = userData.currentCapital;
        modal.style.display = 'block';
    }
}

async function updateCapital() {
    if (!currentUser || !userData) {
        showError('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const newCapital = parseFloat(document.getElementById('currentCapital').value);
    
    if (isNaN(newCapital) || newCapital < 0) {
        showError('رأس المال يجب أن يكون قيمة عددية موجبة');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            currentCapital: newCapital,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userData.currentCapital = newCapital;
        
        // إغلاق المودال
        document.getElementById('capitalModal').style.display = 'none';
        
        // تحديث الواجهة
        updateUIAfterLogin();
        
        showSuccess('تم تحديث رأس المال بنجاح!');
        
    } catch (error) {
        console.error("❌ Error updating capital:", error);
        showError('حدث خطأ أثناء تحديث رأس المال');
    }
}

// ========== دوال الصور ==========
function previewImage() {
    const imageFile = document.getElementById('tradeImage').files[0];
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    
    if (imageFile && preview) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            if (removeBtn) {
                removeBtn.style.display = 'inline-block';
            }
        }
        
        reader.readAsDataURL(imageFile);
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const imageInput = document.getElementById('tradeImage');
    
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    
    if (removeBtn) {
        removeBtn.style.display = 'none';
    }
    
    if (imageInput) {
        imageInput.value = '';
    }
}

// ========== دوال الاستراتيجية ==========
async function saveStrategy() {
    if (!currentUser) {
        showError('يجب تسجيل الدخول أولاً');
        return;
    }
    
    const strategyText = document.getElementById('strategyText').value;
    
    if (!strategyText.trim()) {
        showError('يرجى كتابة الاستراتيجية');
        return;
    }
    
    try {
        await db.collection('strategies').doc(currentUser.uid).set({
            text: strategyText,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userStrategy = { text: strategyText };
        displayStrategyPreview();
        
        showSuccess('تم حفظ الاستراتيجية بنجاح!');
        
    } catch (error) {
        console.error("❌ Error saving strategy:", error);
        showError('حدث خطأ أثناء حفظ الاستراتيجية');
    }
}

function displayStrategyPreview() {
    const strategyPreview = document.getElementById('strategyPreview');
    const strategyTextInput = document.getElementById('strategyText');
    
    if (!userStrategy || !strategyPreview) return;
    
    strategyPreview.textContent = userStrategy.text;
    
    if (strategyTextInput) {
        strategyTextInput.value = userStrategy.text;
    }
}

// ========== دوال الرسوم البيانية ==========
function updateCharts() {
    if (!userTrades || userTrades.length === 0 || !userData) {
        console.log("📊 No data for charts");
        // عرض رسالة "لا توجد بيانات" فقط في الحاويات الفارغة
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            if (!container.querySelector('canvas')) {
                container.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
            }
        });
        return;
    }
    
    console.log("📊 Updating charts with", userTrades.length, "trades");
    
    // تحديث الرسوم البيانية مع تأخير لضمان عرض العناصر
    setTimeout(() => {
        updateWinLossChart();
        updateSessionChart();
        updateAssetChart();
        updateProfitChart();
        updateCapitalChart();
    }, 300);
}

function updateWinLossChart() {
    const canvas = document.getElementById('winLossChart');
    if (!canvas) {
        console.log("❌ winLossChart canvas not found");
        return;
    }
    
    // تنظيف الرسم البياني السابق
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    const stats = calculateStats(userTrades);
    
    // تأكد من وجود بيانات
    if (stats.winningTrades === 0 && stats.losingTrades === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    try {
        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['صفقات رابحة', 'صفقات خاسرة'],
                datasets: [{
                    data: [stats.winningTrades, stats.losingTrades],
                    backgroundColor: ['#4CAF50', '#F44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'نسبة الربح والخسارة',
                        font: {
                            family: 'Cairo, sans-serif',
                            size: 14
                        }
                    }
                }
            }
        });
        console.log("✅ winLossChart updated");
    } catch (error) {
        console.error("❌ Error updating winLossChart:", error);
    }
}

function updateSessionChart() {
    const canvas = document.getElementById('sessionChart');
    if (!canvas) {
        console.log("❌ sessionChart canvas not found");
        return;
    }
    
    // تنظيف الرسم البياني السابق
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // تجميع الصفقات حسب الجلسة
    const sessionData = {};
    userTrades.forEach(trade => {
        if (trade.session) {
            sessionData[trade.session] = (sessionData[trade.session] || 0) + 1;
        }
    });
    
    const sessions = Object.keys(sessionData);
    const counts = Object.values(sessionData);
    
    // تأكد من وجود بيانات
    if (sessions.length === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    try {
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sessions,
                datasets: [{
                    label: 'عدد الصفقات',
                    data: counts,
                    backgroundColor: '#667eea',
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'الصفقات حسب الجلسة',
                        font: {
                            family: 'Cairo, sans-serif',
                            size: 14
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
        console.log("✅ sessionChart updated");
    } catch (error) {
        console.error("❌ Error updating sessionChart:", error);
    }
}

function updateAssetChart() {
    const canvas = document.getElementById('assetChart');
    if (!canvas) {
        console.log("❌ assetChart canvas not found");
        return;
    }
    
    // تنظيف الرسم البياني السابق
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // تجميع الصفقات حسب الأصل
    const assetData = {};
    userTrades.forEach(trade => {
        if (trade.asset) {
            assetData[trade.asset] = (assetData[trade.asset] || 0) + 1;
        }
    });
    
    const assets = Object.keys(assetData);
    const counts = Object.values(assetData);
    
    // تأكد من وجود بيانات
    if (assets.length === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    // توليد ألوان متعددة
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    try {
        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: assets,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, assets.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'توزيع الصفقات حسب الأصل',
                        font: {
                            family: 'Cairo, sans-serif',
                            size: 14
                        }
                    }
                }
            }
        });
        console.log("✅ assetChart updated");
    } catch (error) {
        console.error("❌ Error updating assetChart:", error);
    }
}

function updateProfitChart() {
    const canvas = document.getElementById('profitChart');
    if (!canvas) {
        console.log("❌ profitChart canvas not found");
        return;
    }
    
    // تنظيف الرسم البياني السابق
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // تجميع الأرباح حسب التاريخ (آخر 7 أيام)
    const last7Days = [];
    const profitData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let dayProfit = 0;
        userTrades.forEach(trade => {
            if (!trade.date) return;
            
            let tradeDate;
            if (trade.date.toDate) {
                tradeDate = trade.date.toDate();
            } else {
                tradeDate = new Date(trade.date);
            }
            
            const tradeDateStr = tradeDate.toISOString().split('T')[0];
            if (tradeDateStr === dateStr) {
                dayProfit += parseFloat(trade.profitLoss) || 0;
            }
        });
        
        last7Days.push(dateStr);
        profitData.push(dayProfit);
    }
    
    // تأكد من وجود بيانات
    if (profitData.length === 0 || profitData.every(val => val === 0)) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    try {
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'صافي الربح اليومي',
                    data: profitData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'تطور الأرباح خلال الأسبوع',
                        font: {
                            family: 'Cairo, sans-serif',
                            size: 14
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
        console.log("✅ profitChart updated");
    } catch (error) {
        console.error("❌ Error updating profitChart:", error);
    }
}

function updateCapitalChart() {
    const canvas = document.getElementById('capitalChart');
    if (!canvas) {
        console.log("❌ capitalChart canvas not found");
        return;
    }
    
    // تنظيف الرسم البياني السابق
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // محاكاة نمو رأس المال بناءً على الصفقات
    let capital = userData.initialCapital;
    const capitalData = [capital];
    const capitalDates = ['البداية'];
    
    // ترتيب الصفقات من الأقدم إلى الأحدث
    const sortedTrades = [...userTrades].sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate() : new Date(a.date)) : new Date(0);
        const dateB = b.date ? (b.date.toDate ? b.date.toDate() : new Date(b.date)) : new Date(0);
        return dateA - dateB;
    });
    
    sortedTrades.forEach((trade, index) => {
        capital += parseFloat(trade.profitLoss) || 0;
        capitalData.push(capital);
        capitalDates.push(`صفقة ${index + 1}`);
    });
    
    // تأكد من وجود بيانات
    if (capitalData.length <= 1) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    try {
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: capitalDates,
                datasets: [{
                    label: 'رأس المال',
                    data: capitalData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'تطور رأس المال',
                        font: {
                            family: 'Cairo, sans-serif',
                            size: 14
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
        console.log("✅ capitalChart updated");
    } catch (error) {
        console.error("❌ Error updating capitalChart:", error);
    }
}

// ========== دوال الأداء ==========
function updatePerformanceCharts() {
    if (!userTrades || userTrades.length === 0) return;
    
    updateMonthlyTradesChart();
    updateMonthlySuccessChart();
}

function updateMonthlyTradesChart() {
    const canvas = document.getElementById('monthlyTradesChart');
    if (!canvas) return;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // تجميع الصفقات حسب الشهر
    const monthlyData = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    userTrades.forEach(trade => {
        if (!trade.date) return;
        
        let tradeDate;
        if (trade.date.toDate) {
            tradeDate = trade.date.toDate();
        } else {
            tradeDate = new Date(trade.date);
        }
        
        const month = tradeDate.getMonth();
        const year = tradeDate.getFullYear();
        const key = `${year}-${month}`;
        
        monthlyData[key] = (monthlyData[key] || 0) + 1;
    });
    
    const sortedKeys = Object.keys(monthlyData).sort();
    const months = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        return `${monthNames[parseInt(month)]} ${year}`;
    });
    const counts = sortedKeys.map(key => monthlyData[key]);
    
    // تأكد من وجود بيانات
    if (months.length === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'عدد الصفقات',
                data: counts,
                backgroundColor: '#36A2EB',
                borderColor: '#36A2EB',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'الصفقات حسب الشهر',
                    font: {
                        family: 'Cairo, sans-serif',
                        size: 14
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Cairo, sans-serif'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo, sans-serif'
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlySuccessChart() {
    const canvas = document.getElementById('monthlySuccessChart');
    if (!canvas) return;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // حساب نسبة النجاح حسب الشهر
    const monthlySuccess = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    userTrades.forEach(trade => {
        if (!trade.date) return;
        
        let tradeDate;
        if (trade.date.toDate) {
            tradeDate = trade.date.toDate();
        } else {
            tradeDate = new Date(trade.date);
        }
        
        const month = tradeDate.getMonth();
        const year = tradeDate.getFullYear();
        const key = `${year}-${month}`;
        
        if (!monthlySuccess[key]) {
            monthlySuccess[key] = { total: 0, wins: 0 };
        }
        
        monthlySuccess[key].total++;
        if (trade.result === 'ربح') {
            monthlySuccess[key].wins++;
        }
    });
    
    const sortedKeys = Object.keys(monthlySuccess).sort();
    const months = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        return `${monthNames[parseInt(month)]} ${year}`;
    });
    const successRates = sortedKeys.map(key => {
        const data = monthlySuccess[key];
        return data.total > 0 ? (data.wins / data.total) * 100 : 0;
    });
    
    // تأكد من وجود بيانات
    if (months.length === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data">لا توجد بيانات لعرضها</div>';
        return;
    }
    
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'نسبة النجاح %',
                data: successRates,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: 'Cairo, sans-serif'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'نسبة النجاح حسب الشهر',
                    font: {
                        family: 'Cairo, sans-serif',
                        size: 14
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        font: {
                            family: 'Cairo, sans-serif'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Cairo, sans-serif'
                        }
                    }
                }
            }
        }
    });
}

// ========== دوال التحكم في التقويم ==========
window.prevMonth = function() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateCalendar();
};

window.nextMonth = function() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateCalendar();
};

console.log("🎯 Application initialized successfully!");
