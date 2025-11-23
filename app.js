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
        <div class="trades-table-container">
            <table class="trades-table">
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
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sortedTrades.forEach(trade => {
        const resultClass = trade.result === 'ربح' ? 'profit' : 'loss';
        const resultSign = trade.result === 'ربح' ? '+' : '';
        const sessionClass = `session-${trade.session.toLowerCase()}`;
        const imageHtml = trade.image ? 
            `<img src="${trade.image}" alt="صورة الصفقة" class="trade-image" data-trade-id="${trade.id}">` : 
            '-';
        
        // تقصير الملاحظات للعرض في الجدول
        const shortNotes = trade.notes ? 
            (trade.notes.length > 50 ? trade.notes.substring(0, 50) + '...' : trade.notes) : 
            '-';
        
        html += `
            <tr class="trade-row" data-trade-id="${trade.id}">
                <td>${formatDateTime(trade.date)}</td>
                <td>${trade.asset}</td>
                <td>${trade.type}</td>
                <td><span class="session-badge ${sessionClass}">${trade.session}</span></td>
                <td>$${trade.amount.toFixed(2)}</td>
                <td class="${resultClass}">${trade.result}</td>
                <td class="${resultClass}">${resultSign}$${trade.profitLoss.toFixed(2)}</td>
                <td class="image-cell">${imageHtml}</td>
                <td class="notes-cell">
                    <span class="notes-preview" data-full-notes="${trade.notes || ''}">
                        ${shortNotes}
                    </span>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button class="expand-btn" data-trade-id="${trade.id}" title="عرض التفاصيل">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="delete-btn" data-trade-id="${trade.id}" title="حذف الصفقة">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    transactionsList.innerHTML = html;
    
    // إضافة مستمعي الأحداث للصور
    document.querySelectorAll('.trade-image').forEach(img => {
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            const tradeId = this.getAttribute('data-trade-id');
            const trade = trades.find(t => t.id == tradeId);
            if (trade && trade.image) {
                showImageModal(trade.image);
            }
        });
    });
    
    // إضافة مستمعي الأحداث لأزرار التوسيع
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const tradeId = this.getAttribute('data-trade-id');
            showTradeBubble(tradeId, this);
        });
    });
    
    // إضافة مستمعي الأحداث لأزرار الحذف
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const tradeId = this.getAttribute('data-trade-id');
            deleteTrade(tradeId);
        });
    });
    
    // إضافة مستمعي الأحداث لعرض الملاحظات الكاملة
    document.querySelectorAll('.notes-preview').forEach(notes => {
        notes.addEventListener('click', function(e) {
            e.stopPropagation();
            const fullNotes = this.getAttribute('data-full-notes');
            if (fullNotes) {
                showNotesModal(fullNotes);
            }
        });
    });
    
    // إضافة مستمعي الأحداث لصفوف الجدول
    document.querySelectorAll('.trade-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // تجنب فتح الفقاعة عند النقر على الأزرار أو الصور
            if (e.target.closest('button') || e.target.closest('.trade-image')) {
                return;
            }
            const tradeId = this.getAttribute('data-trade-id');
            showTradeBubble(tradeId, this);
        });
    });
}

// عرض فقاعة تفاصيل الصفقة
function showTradeBubble(tradeId, triggerElement) {
    // إغلاق أي فقاعة مفتوحة مسبقاً
    closeTradeBubble();
    
    const trade = trades.find(t => t.id == tradeId);
    if (!trade) return;
    
    const resultClass = trade.result === 'ربح' ? 'profit' : 'loss';
    const resultSign = trade.result === 'ربح' ? '+' : '';
    const sessionClass = `session-${trade.session.toLowerCase()}`;
    const imageHtml = trade.image ? 
        `<img src="${trade.image}" alt="صورة الصفقة" class="trade-full-image" onclick="showImageModal('${trade.image}')">` : 
        '<p>لا توجد صورة</p>';
    
    const bubbleHtml = `
        <div class="trade-bubble" id="trade-bubble-${tradeId}">
            <button class="trade-bubble-close" onclick="closeTradeBubble()">
                <i class="fas fa-times"></i>
            </button>
            <div class="trade-bubble-content">
                <h3 style="margin-bottom: 15px; color: var(--primary-dark); text-align: center;">
                    <i class="fas fa-info-circle"></i> تفاصيل الصفقة
                </h3>
                
                <div class="trade-details-content">
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-calendar"></i> التاريخ والوقت</h4>
                        <p>${formatDateTime(trade.date)}</p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-coins"></i> الأصل المتداول</h4>
                        <p>${trade.asset}</p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-exchange-alt"></i> نوع الصفقة</h4>
                        <p>${trade.type}</p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-clock"></i> جلسة التداول</h4>
                        <p><span class="session-badge ${sessionClass}">${trade.session}</span></p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-money-bill-wave"></i> قيمة الصفقة</h4>
                        <p>$${trade.amount.toFixed(2)}</p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-chart-line"></i> النتيجة</h4>
                        <p class="${resultClass}">${trade.result}</p>
                    </div>
                    
                    <div class="trade-detail-item">
                        <h4><i class="fas fa-dollar-sign"></i> الربح/الخسارة</h4>
                        <p class="${resultClass}">${resultSign}$${trade.profitLoss.toFixed(2)}</p>
                    </div>
                    
                    ${trade.notes ? `
                        <div class="trade-detail-item full-width">
                            <h4><i class="fas fa-sticky-note"></i> الملاحظات</h4>
                            <p style="background: #f8f9fa; padding: 10px; border-radius: 6px; line-height: 1.6;">
                                ${trade.notes}
                            </p>
                        </div>
                    ` : ''}
                    
                    <div class="trade-detail-item full-width">
                        <h4><i class="fas fa-image"></i> صورة الصفقة</h4>
                        <div style="text-align: center;">
                            ${imageHtml}
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button class="delete-btn" onclick="deleteTrade(${tradeId}); closeTradeBubble();">
                        <i class="fas fa-trash"></i> حذف الصفقة
                    </button>
                    <button class="expand-btn" onclick="closeTradeBubble()">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // إضافة الفقاعة إلى الجسم
    document.body.insertAdjacentHTML('beforeend', bubbleHtml);
    
    // تحديد موقع الفقاعة
    const bubble = document.getElementById(`trade-bubble-${tradeId}`);
    const rect = triggerElement.getBoundingClientRect();
    
    // وضع الفقاعة في موقع مناسب
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // التأكد من أن الفقاعة لا تخرج عن الشاشة
    const bubbleRect = bubble.getBoundingClientRect();
    if (top + bubbleRect.height > window.innerHeight) {
        top = rect.top - bubbleRect.height - 10;
    }
    if (left + bubbleRect.width > window.innerWidth) {
        left = window.innerWidth - bubbleRect.width - 10;
    }
    if (left < 10) {
        left = 10;
    }
    
    bubble.style.top = top + 'px';
    bubble.style.left = left + 'px';
    
    // إضافة مستمع حدث لإغلاق الفقاعة عند النقر خارجها
    setTimeout(() => {
        document.addEventListener('click', closeTradeBubbleOnClick);
    }, 100);
}

// إغلاق الفقاعة عند النقر خارجها
function closeTradeBubbleOnClick(e) {
    const bubble = document.querySelector('.trade-bubble');
    if (bubble && !bubble.contains(e.target)) {
        closeTradeBubble();
    }
}

// إغلاق فقاعة التفاصيل
function closeTradeBubble() {
    const bubble = document.querySelector('.trade-bubble');
    if (bubble) {
        bubble.remove();
    }
    document.removeEventListener('click', closeTradeBubbleOnClick);
}

// عرض نافذة الملاحظات الكاملة
function showNotesModal(notes) {
    const modalHtml = `
        <div class="modal" id="notesModal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3><i class="fas fa-sticky-note"></i> الملاحظات الكاملة</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; line-height: 1.6;">
                    ${notes}
                </div>
                <button onclick="document.getElementById('notesModal').style.display='none'" class="submit-btn">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;
    
    // إضافة النافذة إلى الجسم
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // إظهار النافذة
    const modal = document.getElementById('notesModal');
    modal.style.display = 'block';
    
    // إضافة مستمعي الأحداث للإغلاق
    modal.querySelector('.close').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}
