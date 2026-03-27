// ==================== 负债管理 ====================

// 加载负债数据
function loadDebts() {
    debts = DataManager.getAllDebts();
}

// 保存负债数据
function saveDebts() {
    debts.forEach(debt => DataManager.saveDebt(debt));
}

// 渲染负债列表（资产负债页面使用）
function renderDebtList() {
    const debtList = document.getElementById('debtList');
    if (!debtList) return;
    
    const totalDebts = debts.reduce((sum, debt) => sum + safeNumber(debt.amount), 0);
    
    const typeNames = {
        mortgage: '<i class="fas fa-home"></i> 房贷',
        car_loan: '<i class="fas fa-car"></i> 车贷',
        credit_card: '<i class="fas fa-credit-card"></i> 信用卡',
        consumer_loan: '<i class="fas fa-shopping-bag"></i> 消费贷',
        student_loan: '<i class="fas fa-graduation-cap"></i> 助学贷款',
        personal_loan: '<i class="fas fa-user"></i> 个人借款',
        other: '<i class="fas fa-file-alt"></i> 其他负债'
    };
    
    const typeColors = {
        mortgage: '#9f7aea',
        car_loan: '#4299e1',
        credit_card: '#ecc94b',
        consumer_loan: '#ed8936',
        student_loan: '#48bb78',
        personal_loan: '#667eea',
        other: '#a0aec0'
    };
    
    const grouped = {};
    debts.forEach(d => {
        if (!grouped[d.type]) grouped[d.type] = [];
        grouped[d.type].push(d);
    });
    
    let html = '';
    Object.keys(grouped).forEach(type => {
        const items = grouped[type];
        const typeTotal = items.reduce((sum, i) => sum + safeNumber(i.amount), 0);
        const percent = totalDebts > 0 ? (typeTotal / totalDebts * 100).toFixed(1) : 0;
        
        html += `
            <div class="asset-card debt-card" style="border-left-color: ${typeColors[type]}">
                <div class="asset-card-title">
                    ${typeNames[type]}
                    <span style="margin-left: auto; font-size: 14px; color: #718096;">
                        ¥${safeNumber(typeTotal).toFixed(2)}
                    </span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%; opacity: 0.7;"></div>
                </div>
                <div style="font-size: 12px; color: #a0aec0; margin-top: 5px; text-align: right;">
                    占比 ${percent}%
                </div>
        `;
        
        items.forEach(item => {
            html += `
                <div class="asset-item">
                    <div>
                        <span class="asset-item-label">${item.name}</span>
                        ${item.rate ? `<div style="font-size: 11px; color: #a0aec0;">利率: ${safeNumber(item.rate)}% | 剩余${safeNumber(item.term)}期 | 月供: ¥${safeNumber(item.monthly).toFixed(0)}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="asset-item-value" style="color: #f56565;">¥${safeNumber(item.amount).toFixed(2)}</span>
                        <button class="icon-btn edit-btn" onclick="editDebt('${item.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" onclick="deleteDebt('${item.id}')" title="删除"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    debtList.innerHTML = html || 
        '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-icon"><i class="fas fa-credit-card"></i></div><div>暂无负债记录，点击"新增负债"开始记录</div></div>';
}

// 渲染负债卡片（简化版）
function renderDebtCards() {
    renderDebtList();
}

// 获取负债类型名称
function getDebtTypeName(type) {
    const typeMap = {
        mortgage: '房贷',
        car_loan: '车贷',
        credit_card: '信用卡',
        consumer_loan: '消费贷',
        student_loan: '助学贷款',
        personal_loan: '个人借款',
        other: '其他负债'
    };
    return typeMap[type] || '其他负债';
}

// 打开负债模态框
function openDebtModal() {
    document.getElementById('debtModalTitle').textContent = '新增负债';
    document.getElementById('debtEditId').value = '';
    document.getElementById('debtName').value = '';
    document.getElementById('debtType').value = 'mortgage';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtRate').value = '';
    document.getElementById('debtTerm').value = '';
    document.getElementById('debtMonthly').value = '';
    document.getElementById('debtRemark').value = '';
    document.getElementById('debtModal').classList.add('active');
}

// 关闭负债模态框
function closeDebtModal() {
    document.getElementById('debtModal').classList.remove('active');
}

// 编辑负债
function editDebt(id) {
    const debt = debts.find(d => d.id == id);
    if (!debt) return;
    
    document.getElementById('debtModalTitle').textContent = '编辑负债';
    document.getElementById('debtEditId').value = debt.id;
    document.getElementById('debtName').value = debt.name;
    document.getElementById('debtType').value = debt.type;
    document.getElementById('debtAmount').value = debt.amount;
    document.getElementById('debtRate').value = debt.rate || '';
    document.getElementById('debtTerm').value = debt.term || '';
    document.getElementById('debtMonthly').value = debt.monthly || '';
    document.getElementById('debtRemark').value = debt.remark || '';
    document.getElementById('debtModal').classList.add('active');
}

// 删除负债
function deleteDebt(id) {
    if (confirm('确定要删除这个负债吗？')) {
        const index = debts.findIndex(d => d.id == id);
        if (index !== -1) {
            debts.splice(index, 1);
            saveDebts();
            renderDebtList();
            updateAssetStats();
            renderDebtChart();
            showToast('负债删除成功');
        }
    }
}

// 保存负债
function saveDebt(e) {
    e.preventDefault();
    
    const editId = document.getElementById('debtEditId').value;
    const debtName = document.getElementById('debtName').value;
    const debtType = document.getElementById('debtType').value;
    const debtAmount = safeNumber(document.getElementById('debtAmount').value);
    const debtRate = safeNumber(document.getElementById('debtRate').value);
    const debtTerm = safeNumber(document.getElementById('debtTerm').value);
    const debtMonthly = safeNumber(document.getElementById('debtMonthly').value);
    const debtRemark = document.getElementById('debtRemark').value;
    
    if (!debtName || debtAmount <= 0) {
        showToast('请填写完整信息');
        return;
    }
    
    const debt = {
        id: editId || generateId(),
        name: debtName,
        type: debtType,
        amount: debtAmount,
        rate: debtRate,
        term: debtTerm,
        monthly: debtMonthly,
        remark: debtRemark
    };
    
    if (editId) {
        const index = debts.findIndex(d => d.id === editId);
        if (index !== -1) {
            debts[index] = debt;
            showToast('负债更新成功');
        }
    } else {
        debts.push(debt);
        showToast('负债添加成功');
    }
    
    saveDebts();
    renderDebtList();
    updateAssetStats();
    renderDebtChart();
    closeDebtModal();
}

// 绑定负债表单提交事件
document.getElementById('debtForm').addEventListener('submit', saveDebt);
