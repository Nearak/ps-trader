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
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
    showError("خطأ في تهيئة Firebase. تأكد من اتصال الإنترنت.");
}

// الحصول على الخدمات
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// حالة التطبيق
let currentUser = null;
let userData = null;
let userTrades = [];
let userStrategy = null;

// ========== تهيئة التطبيق عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Starting application...");
    
    // إعداد التواريخ الافتراضية
    initializeDates();
    
    // إعداد المستمعين للأحداث
    setupEventListeners();
    
    // التحقق من حالة المصادقة
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // اختبار Firebase connection
    testFirebaseConnection();
});

// ========== اختبار اتصال Firebase ==========
async function testFirebaseConnection() {
    try {
        await auth.signOut(); // مجرد اختبار للوصول
        console.log("✅ Firebase connection test passed");
    } catch (error) {
        console.log("ℹ️ Firebase connection test:", error.code);
        if (error.code === 'auth/network-request-failed') {
            showError("خطأ في الاتصال بالإنترنت. تأكد من اتصالك بالشبكة.");
        }
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
    
    console.log("✅ Event listeners setup complete");
}

// ========== معالجة حالة المصادقة ==========
function handleAuthStateChange(user) {
    console.log("👤 Auth state changed:", user ? "User logged in" : "No user");
    
    if (user) {
        currentUser = user;
        console.log("✅ User authenticated:", user.email);
        loadUserData();
    } else {
        currentUser = null;
        userData = null;
        userTrades = [];
        console.log("👋 No user, showing auth section");
        showAuthSection();
    }
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
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("✅ Login successful:", userCredential.user.email);
        
        showAlert(alertDiv, 'تم تسجيل الدخول بنجاح!', 'success');
        
        // إخفاء التنبيه بعد ثانيتين
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error("❌ Login error:", error.code, error.message);
        const errorMessage = getAuthErrorMessage(error.code);
        showAlert(alertDiv, errorMessage, 'danger');
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
        
        // 3. إنشاء استراتيجية افتراضية
        console.log("3. Creating default strategy...");
        const defaultStrategy = {
            title: "استراتيجية التداول الخاصة بي",
            tradingStyle: "",
            timeframe: "",
            riskPerTrade: 2,
            rewardRatio: 2,
            entryRules: "",
            exitRules: "",
            riskManagement: "",
            psychologyNotes: "",
            strategyNotes: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('strategies').doc(user.uid).set(defaultStrategy);
        console.log("✅ Default strategy created");
        
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
        await auth.signOut();
        console.log("✅ Logout successful");
        showAuthSection();
    } catch (error) {
        console.error("❌ Logout error:", error);
        showError('حدث خطأ أثناء تسجيل الخروج');
    }
}

// ========== إدارة بيانات المستخدم ==========
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        console.log("📥 Loading user data for:", currentUser.uid);
        
        // جلب بيانات المستخدم
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
            document.getElementById('userGreeting').textContent = `مرحباً، ${userData.name}`;
            document.getElementById('userCapital').textContent = userData.currentCapital.toFixed(2);
            document.getElementById('currentCapitalDisplay').textContent = `$${userData.currentCapital.toFixed(2)}`;
            document.getElementById('initialCapitalDisplay').textContent = `$${userData.initialCapital.toFixed(2)}`;
            
            // جلب الصفقات
            await loadUserTrades();
            
            // جلب الاستراتيجية
            await loadUserStrategy();
            
            // تحديث الإحصائيات
            updateStats();
            
            // تحديث الرسم البياني
            updateCharts();
            
        } else {
            console.error("❌ User document not found in Firestore");
            showError('بيانات المستخدم غير موجودة');
        }
        
    } catch (error) {
        console.error("❌ Error loading user data:", error);
        showError('خطأ في تحميل بيانات المستخدم');
    }
}

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

// ========== إضافة صفقة جديدة ==========
async function addTrade() {
    if (!currentUser) {
        showError('يجب تسجيل الدخول أولاً');
        return;
    }
    
    // الحصول على القيم من النموذج
    const tradeDate = document.getElementById('tradeDate').value;
    let asset = document.getElementById('asset').value;
    const otherAsset = document.getElementById('otherAsset').value;
    const tradeType = document.getElementById('tradeType').value;
    const session = document.getElementById('session').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const result = document.getElementById('result').value;
    const profitLoss = parseFloat(document.getElementById('profitLoss').value);
    const notes = document.getElementById('notes').value;
    const imageFile = document.getElementById('tradeImage').files[0];
    
    // التحقق من الحقول
    if (!tradeDate || !asset || !tradeType || !session || isNaN(amount) || !result || isNaN(profitLoss)) {
        showError('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    if (asset === 'other') {
        if (!otherAsset.trim()) {
            showError('يرجى كتابة اسم الأصل');
            return;
        }
        asset = otherAsset;
    }
    
    if (amount <= 0) {
        showError('قيمة الصفقة يجب أن تكون أكبر من صفر');
        return;
    }
    
    try {
        console.log("➕ Adding new trade...");
        
        // تحضير بيانات الصفقة
        const tradeData = {
            userId: currentUser.uid,
            date: new Date(tradeDate),
            asset: asset,
            tradeType: tradeType,
            session: session,
            amount: amount,
            result: result,
            profitLoss: profitLoss,
            notes: notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // رفع الصورة إذا وجدت
        if (imageFile) {
            console.log("📸 Uploading trade image...");
            const imageUrl = await uploadTradeImage(imageFile);
            tradeData.imageUrl = imageUrl;
            console.log("✅ Image uploaded:", imageUrl);
        }
        
        // حفظ الصفقة في Firestore
        console.log("💾 Saving trade to Firestore...");
        const docRef = await db.collection('trades').add(tradeData);
        console.log("✅ Trade saved with ID:", docRef.id);
        
        // تحديث رأس المال
        const capitalChange = profitLoss;
        const newCapital = userData.currentCapital + capitalChange;
        
        await db.collection('users').doc(currentUser.uid).update({
            currentCapital: newCapital,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userData.currentCapital = newCapital;
        document.getElementById('userCapital').textContent = newCapital.toFixed(2);
        
        // إعادة تحميل الصفقات
        await loadUserTrades();
        
        // إعادة تعيين النموذج
        document.getElementById('tradeForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('otherAsset').style.display = 'none';
        
        // إعادة تعيين التاريخ
        initializeDates();
        
        // إظهار رسالة النجاح
        showSuccess('تم إضافة الصفقة بنجاح!');
        
        console.log("🎉 Trade addition complete!");
        
    } catch (error) {
        console.error("❌ Error adding trade:", error);
        showError('حدث خطأ أثناء إضافة الصفقة');
    }
}

async function uploadTradeImage(file) {
    if (!currentUser || !file) return null;
    
    try {
        const storageRef = storage.ref();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const imageRef = storageRef.child(`trades/${currentUser.uid}/${fileName}`);
        
        const snapshot = await imageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return downloadURL;
    } catch (error) {
        console.error("❌ Error uploading image:", error);
        throw error;
    }
}

// ========== تحديث رأس المال ==========
function showCapitalModal() {
    if (!userData) return;
    
    document.getElementById('newCapital').value = userData.currentCapital;
    document.getElementById('capitalModal').style.display = 'block';
}

async function updateCapital() {
    const newCapital = parseFloat(document.getElementById('newCapital').value);
    
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
        document.getElementById('userCapital').textContent = newCapital.toFixed(2);
        document.getElementById('capitalModal').style.display = 'none';
        
        // تحديث الإحصائيات
        updateStats();
        
        showSuccess('تم تحديث رأس المال بنجاح!');
        
    } catch (error) {
        console.error("❌ Error updating capital:", error);
        showError('حدث خطأ أثناء تحديث رأس المال');
    }
}

// ========== حفظ الاستراتيجية ==========
async function saveStrategy() {
    if (!currentUser) return;
    
    const strategyData = {
        title: document.getElementById('strategyTitle').value || '',
        tradingStyle: document.getElementById('tradingStyle').value || '',
        timeframe: document.getElementById('timeframe').value || '',
        riskPerTrade: parseFloat(document.getElementById('riskPerTrade').value) || 0,
        rewardRatio: parseFloat(document.getElementById('rewardRatio').value) || 0,
        entryRules: document.getElementById('entryRules').value || '',
        exitRules: document.getElementById('exitRules').value || '',
        riskManagement: document.getElementById('riskManagement').value || '',
        psychologyNotes: document.getElementById('psychologyNotes').value || '',
        strategyNotes: document.getElementById('strategyNotes').value || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('strategies').doc(currentUser.uid).set(strategyData, { merge: true });
        userStrategy = strategyData;
        displayStrategyPreview();
        
        showSuccess('تم حفظ الاستراتيجية بنجاح!');
        
    } catch (error) {
        console.error("❌ Error saving strategy:", error);
        showError('حدث خطأ أثناء حفظ الاستراتيجية');
    }
}

// ========== تحديث واجهة المستخدم ==========
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
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
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

function updateTradesList() {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!userTrades || userTrades.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">لا توجد صفقات مسجلة بعد. ابدأ بإضافة أول صفقة.</p>';
        return;
    }
    
    // تطبيق الفلاتر
    const filterAsset = document.getElementById('filterAsset')?.value || '';
    const filterSession = document.getElementById('filterSession')?.value || '';
    const filterResult = document.getElementById('filterResult')?.value || '';
    
    let filteredTrades = userTrades.filter(trade => {
        if (filterAsset && trade.asset !== filterAsset) return false;
        if (filterSession && trade.session !== filterSession) return false;
        if (filterResult && trade.result !== filterResult) return false;
        return true;
    });
    
    // تحديث خيارات تصفية الأصول
    updateAssetFilterOptions();
    
    if (filteredTrades.length === 0) {
        transactionsList.innerHTML = '<p class="no-transactions">لا توجد صفقات تطابق معايير التصفية.</p>';
        return;
    }
    
    let html = '';
    filteredTrades.forEach(trade => {
        const profitClass = trade.result === 'ربح' ? 'positive' : 'negative';
        const profitSign = trade.result === 'ربح' ? '+' : '-';
        const amount = parseFloat(trade.amount) || 0;
        const profitLoss = parseFloat(trade.profitLoss) || 0;
        const date = formatDate(trade.date);
        
        html += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-type ${trade.tradeType === 'شراء' ? 'buy' : 'sell'}">
                        ${trade.tradeType === 'شراء' ? 'شراء' : 'بيع'} ${trade.asset}
                    </div>
                    <div class="transaction-date">${date}</div>
                </div>
                <div class="transaction-details">
                    <div class="detail">
                        <span class="label">الجلسة:</span>
                        <span class="value">${trade.session}</span>
                    </div>
                    <div class="detail">
                        <span class="label">المبلغ:</span>
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
                        <p>${(trade.notes || '').substring(0, 100)}${(trade.notes || '').length > 100 ? '...' : ''}</p>
                        ${(trade.notes || '').length > 100 ? `
                            <button onclick="showFullNotes('${trade.notes.replace(/'/g, "\\'")}')" style="margin-top: 10px; background: #667eea; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                                عرض المزيد
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                ${trade.imageUrl ? `
                    <div class="transaction-image">
                        <img src="${trade.imageUrl}" alt="صورة الصفقة" style="max-width: 200px; border-radius: 8px; cursor: pointer;" 
                             onclick="showImageModal('${trade.imageUrl}')">
                    </div>
                ` : ''}
                <div class="transaction-actions">
                    <button class="delete-btn delete-trade-btn" data-id="${trade.id}" onclick="deleteTrade('${trade.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
}

function updateAssetFilterOptions() {
    const filterAsset = document.getElementById('filterAsset');
    if (!filterAsset) return;
    
    // الحصول على جميع الأصول الفريدة
    const assets = [...new Set(userTrades.map(trade => trade.asset))].sort();
    
    // حفظ القيمة المحددة حالياً
    const currentValue = filterAsset.value;
    
    // تحديث الخيارات
    let options = '<option value="">جميع الأصول</option>';
    assets.forEach(asset => {
        options += `<option value="${asset}">${asset}</option>`;
    });
    
    filterAsset.innerHTML = options;
    
    // استعادة القيمة المحددة
    if (assets.includes(currentValue)) {
        filterAsset.value = currentValue;
    }
}

async function deleteTrade(tradeId) {
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
}

function displayStrategyPreview() {
    const previewContent = document.getElementById('previewContent');
    
    if (!userStrategy) {
        previewContent.innerHTML = '<p class="no-preview">لم يتم حفظ استراتيجية بعد. املأ النموذج أعلاه واحفظ استراتيجيتك.</p>';
        return;
    }
    
    let html = `
        <div class="strategy-preview-item">
            <h4>${userStrategy.title || 'استراتيجية التداول الخاصة بي'}</h4>
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
    
    if (userStrategy.riskManagement) {
        html += `
            <div class="strategy-preview-item">
                <h5><i class="fas fa-shield-alt"></i> إدارة المخاطر</h5>
                <p>${userStrategy.riskManagement}</p>
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

function updateStats() {
    if (!userData || !userTrades) return;
    
    // تحديث رأس المال
    document.getElementById('currentCapital').textContent = `$${userData.currentCapital.toFixed(2)}`;
    document.getElementById('userCapital').textContent = userData.currentCapital.toFixed(2);
    document.getElementById('currentCapitalDisplay').textContent = `$${userData.currentCapital.toFixed(2)}`;
    
    // حساب الإحصائيات
    const stats = calculateStats(userTrades);
    
    // تحديث القيم
    document.getElementById('totalTrades').textContent = stats.totalTrades;
    document.getElementById('winningTrades').textContent = stats.winningTrades;
    document.getElementById('losingTrades').textContent = stats.losingTrades;
    document.getElementById('successRate').textContent = `${stats.successRate.toFixed(1)}%`;
    document.getElementById('totalPnL').textContent = `$${stats.totalPnL.toFixed(2)}`;
    document.getElementById('returnPercentage').textContent = `${stats.returnPercentage.toFixed(2)}%`;
    document.getElementById('averageProfit').textContent = `$${stats.averageProfit.toFixed(2)}`;
    document.getElementById('averageLoss').textContent = `$${stats.averageLoss.toFixed(2)}`;
    document.getElementById('bestSession').textContent = stats.bestSession || '-';
    document.getElementById('bestAsset').textContent = stats.bestAsset || '-';
    
    // تحديث أداء رأس المال
    const netPnL = userData.currentCapital - userData.initialCapital;
    document.getElementById('netPnLDisplay').textContent = `$${netPnL.toFixed(2)}`;
    document.getElementById('roiDisplay').textContent = `${stats.returnPercentage.toFixed(2)}%`;
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
        const profitLoss = parseFloat(trade.profitLoss) || 0;
        stats.totalPnL += profitLoss;
        
        if (trade.result === 'ربح') {
            stats.winningTrades++;
            stats.totalProfit += Math.abs(profitLoss);
        } else if (trade.result === 'خسارة') {
            stats.losingTrades++;
            stats.totalLoss += Math.abs(profitLoss);
        }
        
        // تتبع الأداء حسب الجلسة
        if (trade.session) {
            if (!stats.sessionPerformance[trade.session]) {
                stats.sessionPerformance[trade.session] = 0;
            }
            stats.sessionPerformance[trade.session] += profitLoss;
        }
        
        // تتبع الأداء حسب الأصل
        if (trade.asset) {
            if (!stats.assetPerformance[trade.asset]) {
                stats.assetPerformance[trade.asset] = 0;
            }
            stats.assetPerformance[trade.asset] += profitLoss;
        }
    });
    
    // حساب الإحصائيات الإضافية
    stats.successRate = stats.totalTrades > 0 ? 
        (stats.winningTrades / stats.totalTrades) * 100 : 0;
    
    stats.averageProfit = stats.winningTrades > 0 ? 
        stats.totalProfit / stats.winningTrades : 0;
    
    stats.averageLoss = stats.losingTrades > 0 ? 
        stats.totalLoss / stats.losingTrades : 0;
    
    stats.returnPercentage = userData.initialCapital > 0 ? 
        (stats.totalPnL / userData.initialCapital) * 100 : 0;
    
    // تحديد أفضل جلسة وأفضل أصل
    if (Object.keys(stats.sessionPerformance).length > 0) {
        stats.bestSession = Object.keys(stats.sessionPerformance).reduce((a, b) => 
            stats.sessionPerformance[a] > stats.sessionPerformance[b] ? a : b
        );
    }
    
    if (Object.keys(stats.assetPerformance).length > 0) {
        stats.bestAsset = Object.keys(stats.assetPerformance).reduce((a, b) => 
            stats.assetPerformance[a] > stats.assetPerformance[b] ? a : b
        );
    }
    
    return stats;
}

// ========== الرسوم البيانية ==========
function updateCharts() {
    if (!userTrades || userTrades.length === 0) {
        console.log("📊 No trades to display charts");
        return;
    }
    
    console.log("📊 Updating charts with", userTrades.length, "trades");
    
    try {
        // رسم بياني الربح/الخسارة
        updateWinLossChart();
        
        // رسم بياني الجلسات
        updateSessionChart();
        
        // رسم بياني الأصول
        updateAssetChart();
        
        // رسم بياني تطور الأرباح
        updateProfitChart();
        
    } catch (error) {
        console.error("❌ Error updating charts:", error);
    }
}

function updateWinLossChart() {
    const ctx = document.getElementById('winLossChart');
    if (!ctx) return;
    
    const stats = calculateStats(userTrades);
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['الصفقات الرابحة', 'الصفقات الخاسرة'],
            datasets: [{
                data: [stats.winningTrades, stats.losingTrades],
                backgroundColor: ['#4CAF50', '#F44336'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true,
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });
}

function updateSessionChart() {
    const ctx = document.getElementById('sessionChart');
    if (!ctx) return;
    
    const stats = calculateStats(userTrades);
    const sessions = Object.keys(stats.sessionPerformance);
    const profits = Object.values(stats.sessionPerformance);
    
    new Chart(ctx.getContext('2d'), {
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
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
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

function updateAssetChart() {
    const ctx = document.getElementById('assetChart');
    if (!ctx) return;
    
    const stats = calculateStats(userTrades);
    const assets = Object.keys(stats.assetPerformance).slice(0, 10); // أول 10 أصول فقط
    const profits = assets.map(asset => stats.assetPerformance[asset]);
    
    new Chart(ctx.getContext('2d'), {
        type: 'horizontalBar',
        data: {
            labels: assets,
            datasets: [{
                label: 'الأرباح/الخسائر',
                data: profits,
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
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

function updateProfitChart() {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    
    // تجميع الأرباح حسب التاريخ
    const profitsByDate = {};
    userTrades.forEach(trade => {
        if (trade.date) {
            const date = trade.date.toDate ? trade.date.toDate() : new Date(trade.date);
            const dateStr = date.toLocaleDateString('ar-SA');
            if (!profitsByDate[dateStr]) {
                profitsByDate[dateStr] = 0;
            }
            profitsByDate[dateStr] += parseFloat(trade.profitLoss) || 0;
        }
    });
    
    const dates = Object.keys(profitsByDate).sort((a, b) => new Date(a) - new Date(b));
    const profits = dates.map(date => profitsByDate[date]);
    
    // حساب الأرباح التراكمية
    let cumulativeProfit = 0;
    const cumulativeProfits = profits.map(profit => {
        cumulativeProfit += profit;
        return cumulativeProfit;
    });
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'الأرباح التراكمية',
                data: cumulativeProfits,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// ========== دوال مساعدة ==========
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

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    try {
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
    } catch (error) {
        console.error("❌ Error formatting date:", error);
        return 'تاريخ غير معروف';
    }
}

function previewImage() {
    const preview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const file = this.files[0];
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
        }
        
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    document.getElementById('tradeImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
}

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
            updateCharts();
        } else if (tabId === 'performance') {
            updatePerformanceCharts();
        }
    }
}

async function loadLeaderboard() {
    try {
        // هذا مثال مبسط للوحة المتصدرين
        // في التطبيق الحقيقي، ستحتاج لجلب بيانات جميع المستخدمين
        
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = `
            <div class="leaderboard-item top-three">
                <div class="rank-col">1 🥇</div>
                <div class="name-col">${userData?.name || 'أنت'}</div>
                <div class="stats-col">${calculateStats(userTrades).successRate.toFixed(1)}%</div>
                <div class="stats-col">$${calculateStats(userTrades).totalProfit.toFixed(2)}</div>
                <div class="stats-col">${calculateStats(userTrades).returnPercentage.toFixed(1)}%</div>
            </div>
            <div class="no-data" style="padding: 20px; text-align: center; color: #666;">
                جاري تطوير ميزة لوحة المتصدرين...
            </div>
        `;
        
    } catch (error) {
        console.error("❌ Error loading leaderboard:", error);
    }
}

function updatePerformanceCharts() {
    // هذا مثال مبسط للرسوم البيانية للأداء
    // في التطبيق الحقيقي، ستحتاج لمزيد من البيانات
    
    const ctx = document.getElementById('capitalChart');
    if (!ctx) return;
    
    // بيانات وهمية للعرض
    const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    const data = [userData?.initialCapital || 1000, 1100, 1050, 1200, 1150, userData?.currentCapital || 1250];
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'رأس المال',
                data: data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

function updateCalendar() {
    // هذا مثال مبسط للتقويم
    // في التطبيق الحقيقي، ستحتاج لعرض الصفقات حسب التاريخ
    
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    document.getElementById('calendar-month-year').textContent = 
        today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
    
    // إنشاء التقويم
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let html = '';
    
    // أيام الأسبوع
    const weekdays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    weekdays.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // الأيام الفارغة في بداية الشهر
    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="calendar-day"></div>';
    }
    
    // أيام الشهر
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toLocaleDateString('ar-SA');
        
        // التحقق إذا كان هناك صفقات في هذا اليوم
        const hasTrades = userTrades.some(trade => {
            const tradeDate = trade.date?.toDate ? trade.date.toDate() : new Date(trade.date);
            return tradeDate.toLocaleDateString('ar-SA') === dateStr;
        });
        
        const isToday = date.toDateString() === today.toDateString();
        
        let className = 'calendar-day';
        if (isToday) className += ' today';
        if (hasTrades) className += ' has-trades';
        
        html += `
            <div class="${className}" onclick="showDayTrades('${dateStr}')">
                <div>${day}</div>
                ${hasTrades ? '<div style="font-size: 10px; color: #4CAF50;">صفقات</div>' : ''}
            </div>
        `;
    }
    
    calendarDays.innerHTML = html;
}

function showDayTrades(dateStr) {
    const dayTrades = userTrades.filter(trade => {
        const tradeDate = trade.date?.toDate ? trade.date.toDate() : new Date(trade.date);
        return tradeDate.toLocaleDateString('ar-SA') === dateStr;
    });
    
    const dayDetails = document.getElementById('day-details');
    const selectedDay = document.getElementById('selected-day');
    const dayTradesList = document.getElementById('day-trades-list');
    
    if (!dayDetails || !selectedDay || !dayTradesList) return;
    
    selectedDay.textContent = `تفاصيل الصفقات ليوم ${dateStr}`;
    
    if (dayTrades.length === 0) {
        dayTradesList.innerHTML = '<p class="no-data">لا توجد صفقات في هذا اليوم.</p>';
    } else {
        let html = '';
        dayTrades.forEach(trade => {
            const profitClass = trade.result === 'ربح' ? 'positive' : 'negative';
            const profitSign = trade.result === 'ربح' ? '+' : '-';
            
            html += `
                <div class="transaction-item" style="margin-bottom: 10px;">
                    <div class="transaction-header">
                        <div class="transaction-type ${trade.tradeType === 'شراء' ? 'buy' : 'sell'}">
                            ${trade.tradeType === 'شراء' ? 'شراء' : 'بيع'} ${trade.asset}
                        </div>
                    </div>
                    <div class="transaction-details">
                        <div class="detail">
                            <span class="label">المبلغ:</span>
                            <span class="value">$${(parseFloat(trade.amount) || 0).toFixed(2)}</span>
                        </div>
                        <div class="detail">
                            <span class="label">النتيجة:</span>
                            <span class="value ${profitClass}">
                                ${trade.result} (${profitSign}$${Math.abs(parseFloat(trade.profitLoss) || 0).toFixed(2)})
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        dayTradesList.innerHTML = html;
    }
    
    dayDetails.style.display = 'block';
}

function showImageModal(imageUrl) {
    const modalImage = document.getElementById('modalImage');
    const imageModal = document.getElementById('imageModal');
    
    if (modalImage && imageModal) {
        modalImage.src = imageUrl;
        imageModal.style.display = 'block';
    }
}

function showFullNotes(notes) {
    const notesContent = document.getElementById('notesContent');
    const notesModal = document.getElementById('notesModal');
    
    if (notesContent && notesModal) {
        notesContent.textContent = notes;
        notesModal.style.display = 'block';
    }
}

// ========== دوال العرض والتنبيهات ==========
function showAlert(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    // تمرير للأسفل لمشاهدة التنبيه
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showError(message) {
    alert(message); // يمكن استبدال هذا بنافذة تنبيه أفضل
}

function showSuccess(message) {
    alert(message); // يمكن استبدال هذا بنافذة تنبيه أفضل
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

// ========== دوال عامة للوصول من HTML ==========
window.showImageModal = showImageModal;
window.showFullNotes = showFullNotes;
window.deleteTrade = deleteTrade;
window.showDayTrades = showDayTrades;

console.log("🎯 Application initialized successfully!");
