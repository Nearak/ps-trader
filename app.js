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

// عناصر الإحصائيات
const totalTradesEl = document.getElementById('totalTrades');
const winningTradesEl = document.getElementById
