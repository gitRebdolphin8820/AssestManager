// ==================== 交易管理 ====================

// 加载交易数据
function loadTransactions() {
    return DataManager.getAllTransactions();
}

// 保存交易数据
function saveTransactions(transactions) {
    transactions.forEach(transaction => DataManager.saveTransaction(transaction));
}

// 添加交易
function addTransaction(transaction) {
    return DataManager.executeTransaction(transaction);
}

// 交易排序状态
let transactionSortState = {
    column: 'datetime',
    direction: 'desc'
};

// 渲染交易页面（卡片视图）
function renderTransactionCardView(transactions = null) {
    const transactionList = document.getElementById('transactionCardView');
    const displayTransactions = transactions || loadTransactions();
    
    let html = '';
    
    if (displayTransactions.length === 0) {
        html = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt" style="font-size: 48px; color: #a0aec0;"></i>
                <p>暂无交易记录</p>
                <p style="font-size: 14px; color: #718096;">添加资产或进行交易后将显示在这里</p>
            </div>
        `;
    } else {
        displayTransactions.forEach(transaction => {
            const date = new Date(transaction.datetime);
            const formattedDate = date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const typeConfig = getTransactionTypeConfig(transaction.type);
            const amountClass = transaction.type === 'income' ? 'text-green-500' : 'text-red-500';
            const amountSign = transaction.type === 'income' ? '+' : '-';
            
            html += `
                <div class="transaction-item" data-id="${transaction.id}">
                    <div class="transaction-header">
                        <div class="transaction-info">
                            <div class="transaction-description" style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">${transaction.description || typeConfig.name}</div>
                            <div class="transaction-type" style="color: ${typeConfig.color}; font-size: 14px;">
                                <i class="fas ${typeConfig.icon}"></i>
                                <span>${typeConfig.name}</span>
                                ${transaction.category ? `<span class="transaction-category" style="margin-left: 10px;">${transaction.category}</span>` : ''}
                            </div>
                        </div>
                        <div class="transaction-right">
                            <div class="transaction-amount ${amountClass}" style="font-size: 18px; font-weight: 700;">
                                ${amountSign}¥${safeNumber(transaction.amount).toFixed(2)}
                            </div>
                            <div class="transaction-actions">
                                <button class="action-btn edit-btn" onclick="openEditTransactionModal('${transaction.id}')" title="编辑">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete-btn" onclick="deleteTransaction('${transaction.id}')" title="删除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="transaction-meta" style="font-size: 12px; color: #718096; margin-top: 8px;">
                        <span class="transaction-date">${formattedDate}</span>
                    </div>
                    ${transaction.metadata && Object.keys(transaction.metadata).length > 0 ? `
                        <div class="transaction-metadata">
                            ${Object.entries(transaction.metadata).map(([key, value]) => `
                                <div class="metadata-item">
                                    <span class="metadata-key">${getMetadataLabel(key)}:</span>
                                    <span class="metadata-value">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    transactionList.innerHTML = html;
}

// 渲染交易表格视图
function renderTransactionTableView(transactions = null) {
    const tableBody = document.getElementById('transactionTableBody');
    const displayTransactions = transactions || loadTransactions();
    
    if (displayTransactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-icon"><i class="fas fa-exchange-alt"></i></div>
                    <div>暂无交易记录</div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    displayTransactions.forEach(transaction => {
        const date = new Date(transaction.datetime);
        const formattedDate = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const typeConfig = getTransactionTypeConfig(transaction.type);
        const amountClass = transaction.type === 'income' ? 'return-negative' : 'return-positive';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        
        html += `
            <tr>
                <td>${formattedDate}</td>
                <td>
                    <span class="badge ${transaction.type === 'income' ? 'badge-income' : 'badge-expense'}">
                        ${typeConfig.name}
                    </span>
                </td>
                <td>${transaction.category || '-'}</td>
                <td class="${amountClass}">
                    ${amountSign}¥${safeNumber(transaction.amount).toFixed(2)}
                </td>
                <td>${transaction.description || '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn edit-btn" onclick="openEditTransactionModal('${transaction.id}')"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" onclick="deleteTransaction('${transaction.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// 渲染交易页面
function renderTransactionPage() {
    const transactions = loadTransactions();
    
    // 按时间倒序排序
    transactions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    renderTransactionCardView(transactions);
    renderTransactionTableView(transactions);
    updateTransactionStats();
}

// 切换交易视图
function switchTransactionView(view) {
    const cardView = document.getElementById('transactionCardView');
    const tableView = document.getElementById('transactionTableView');
    const tableFilter = document.getElementById('tableFilter');
    const viewCardBtn = document.getElementById('viewCardBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');
    
    if (view === 'card') {
        cardView.style.display = 'block';
        tableView.style.display = 'none';
        tableFilter.style.display = 'none';
        viewCardBtn.classList.add('active');
        viewTableBtn.classList.remove('active');
    } else if (view === 'table') {
        cardView.style.display = 'none';
        tableView.style.display = 'block';
        tableFilter.style.display = 'block';
        viewCardBtn.classList.remove('active');
        viewTableBtn.classList.add('active');
        
        // 设置默认日期范围为当月
        const monthRange = getCurrentMonthRange();
        document.getElementById('transactionStartDate').value = monthRange.start;
        document.getElementById('transactionEndDate').value = monthRange.end;
    }
}

// 排序交易
function sortTransactions(column) {
    if (transactionSortState.column === column) {
        transactionSortState.direction = transactionSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        transactionSortState.column = column;
        transactionSortState.direction = 'asc';
    }
    
    // 更新排序指示器
    document.querySelectorAll('.sort-indicator .up, .sort-indicator .down').forEach(el => {
        el.classList.remove('active');
    });
    const thElement = document.querySelector(`th[onclick="sortTransactions('${column}')"]`);
    if (thElement) {
        const sortIndicator = thElement.querySelector('.sort-indicator');
        if (sortIndicator) {
            const upElement = sortIndicator.querySelector('.up');
            const downElement = sortIndicator.querySelector('.down');
            if (upElement && downElement) {
                if (transactionSortState.direction === 'asc') {
                    upElement.classList.add('active');
                } else {
                    downElement.classList.add('active');
                }
            }
        }
    }
    
    const transactions = loadTransactions();
    const sortedTransactions = [...transactions].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'amount') {
            aValue = safeNumber(aValue);
            bValue = safeNumber(bValue);
        } else if (column === 'datetime') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        
        if (aValue < bValue) {
            return transactionSortState.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return transactionSortState.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    renderTransactionTableView(sortedTransactions);
}

// 筛选交易
function filterTransactions() {
    const startDate = document.getElementById('transactionStartDate').value;
    const endDate = document.getElementById('transactionEndDate').value;
    
    const transactions = loadTransactions();
    const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.datetime).toISOString().split('T')[0];
        return (!startDate || transactionDate >= startDate) && (!endDate || transactionDate <= endDate);
    });
    
    renderTransactionTableView(filteredTransactions);
}

// 重置交易筛选
function resetTransactionFilter() {
    const monthRange = getCurrentMonthRange();
    document.getElementById('transactionStartDate').value = monthRange.start;
    document.getElementById('transactionEndDate').value = monthRange.end;
    renderTransactionTableView();
}

// 获取当前月份范围
function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
}

// 获取交易类型配置
function getTransactionTypeConfig(type) {
    const configs = {
        income: { name: '收入', icon: 'fa-arrow-down', color: '#48bb78' },
        expense: { name: '支出', icon: 'fa-arrow-up', color: '#f56565' },
        invest_buy: { name: '投资购买', icon: 'fa-arrow-right', color: '#ed8936' },
        invest_sell: { name: '投资赎回', icon: 'fa-arrow-left', color: '#38a169' },
        deposit: { name: '定期存入', icon: 'fa-lock', color: '#4299e1' },
        withdraw: { name: '定期取出', icon: 'fa-unlock', color: '#48bb78' }
    };
    return configs[type] || { name: '其他', icon: 'fa-exchange-alt', color: '#a0aec0' };
}

// 获取元数据标签
function getMetadataLabel(key) {
    const labels = {
        investmentType: '投资类型',
        shares: '份额',
        price: '价格',
        maturityDate: '到期日期',
        interestRate: '利率',
        merchant: '商户',
        paymentMethod: '支付方式',
        sourceType: '来源类型',
        payer: '付款方'
    };
    return labels[key] || key;
}

// 更新交易统计
function updateTransactionStats() {
    const transactions = loadTransactions();
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);
    
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && new Date(t.datetime) >= thisMonth)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpense = transactions
        .filter(t => (t.type === 'expense' || t.type === 'invest_buy' || t.type === 'deposit') && new Date(t.datetime) >= thisMonth)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const yearlyIncome = transactions
        .filter(t => t.type === 'income' && new Date(t.datetime) >= thisYear)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const yearlyExpense = transactions
        .filter(t => (t.type === 'expense' || t.type === 'invest_buy' || t.type === 'deposit') && new Date(t.datetime) >= thisYear)
        .reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyIncome);
    document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyExpense);
    document.getElementById('yearlyIncome').textContent = formatCurrency(yearlyIncome);
    document.getElementById('yearlyExpense').textContent = formatCurrency(yearlyExpense);
    document.getElementById('monthlyNet').textContent = formatCurrency(monthlyIncome - monthlyExpense);
    document.getElementById('yearlyNet').textContent = formatCurrency(yearlyIncome - yearlyExpense);
}

// 添加收入
function addIncome() {
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const category = document.getElementById('incomeCategory').value;
    const description = document.getElementById('incomeDescription').value;
    const accountId = document.getElementById('incomeAccount').value;
    const assetId = document.getElementById('incomeAsset').value;
    
    if (!amount || !accountId || !assetId) {
        showToast('请填写完整信息');
        return;
    }
    
    const transaction = {
        id: generateId(),
        type: 'income',
        amount: amount,
        datetime: new Date().toISOString(),
        fromAccountId: null,
        toAccountId: accountId,
        fromAssetId: null,
        toAssetId: assetId,
        category: category,
        description: description,
        status: 'completed',
        relatedTransactionId: null,
        metadata: {}
    };
    
    addTransaction(transaction);
    
    showToast('收入添加成功');
    renderTransactionPage();
    renderAssetPage();
    closeIncomeModal();
}

// 添加支出
function addExpense() {
    try {
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDescription').value;
        const accountId = document.getElementById('expenseAccount').value;
        const assetId = document.getElementById('expenseAsset').value;
        
        if (!amount || !accountId || !assetId) {
            showToast('请填写完整信息');
            return;
        }
        
        const assets = DataManager.getAllAssets();
        const asset = assets.find(a => a.id === assetId);
        if (!asset || safeNumber(asset.value) < amount) {
            showToast('账户余额不足');
            return;
        }
        
        const transaction = {
            id: generateId(),
            type: 'expense',
            amount: amount,
            datetime: new Date().toISOString(),
            fromAccountId: accountId,
            toAccountId: null,
            fromAssetId: assetId,
            toAssetId: null,
            category: category,
            description: description,
            status: 'completed',
            relatedTransactionId: null,
            metadata: {}
        };
        
        addTransaction(transaction);
        
        showToast('支出添加成功');
        
        // 先关闭弹窗，再刷新页面
        closeExpenseModal();
        
        // 延迟刷新页面，确保弹窗已关闭
        setTimeout(() => {
            renderTransactionPage();
            renderAssetPage();
        }, 100);
    } catch (error) {
        console.error('Error in addExpense:', error);
        showToast('添加支出失败: ' + error.message);
    }
}

// 打开收入模态框
function openIncomeModal() {
    updateIncomeAccountSelect();
    document.getElementById('incomeModal').style.display = 'flex';
}

// 关闭收入模态框
function closeIncomeModal() {
    document.getElementById('incomeModal').style.display = 'none';
    document.getElementById('incomeForm').reset();
}

// 打开支出模态框
function openExpenseModal() {
    updateExpenseAccountSelect();
    document.getElementById('expenseModal').style.display = 'flex';
}

// 关闭支出模态框
function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('expenseForm');
    if (form) {
        form.reset();
    }
}

// 更新收入账户选择
function updateIncomeAccountSelect() {
    const accountSelect = document.getElementById('incomeAccount');
    const assetSelect = document.getElementById('incomeAsset');
    
    const accounts = DataManager.getAllAccounts();
    let accountHtml = '<option value="">-- 选择账户 --</option>';
    accounts.forEach(account => {
        accountHtml += `<option value="${account.id}">${account.name}</option>`;
    });
    accountSelect.innerHTML = accountHtml;
    
    // 默认选择第一个账户
    if (accounts.length > 0) {
        accountSelect.value = accounts[0].id;
        updateIncomeAssetSelect(accounts[0].id);
    } else {
        assetSelect.innerHTML = '<option value="">-- 请先添加账户 --</option>';
    }
}

// 更新收入资产选择
function updateIncomeAssetSelect(accountId) {
    const assetSelect = document.getElementById('incomeAsset');
    const assets = DataManager.getAllAssets();
    const accountAssets = assets.filter(a => a.accountId === accountId);
    
    let assetHtml = '<option value="">-- 选择资产 --</option>';
    accountAssets.forEach(asset => {
        assetHtml += `<option value="${asset.id}">${asset.name} (余额: ¥${safeNumber(asset.value).toFixed(2)})</option>`;
    });
    assetSelect.innerHTML = assetHtml;
}

// 更新支出账户选择
function updateExpenseAccountSelect() {
    const accountSelect = document.getElementById('expenseAccount');
    const assetSelect = document.getElementById('expenseAsset');
    
    const accounts = DataManager.getAllAccounts();
    let accountHtml = '<option value="">-- 选择账户 --</option>';
    accounts.forEach(account => {
        accountHtml += `<option value="${account.id}">${account.name}</option>`;
    });
    accountSelect.innerHTML = accountHtml;
    
    // 默认选择第一个账户
    if (accounts.length > 0) {
        accountSelect.value = accounts[0].id;
        updateExpenseAssetSelect(accounts[0].id);
    } else {
        assetSelect.innerHTML = '<option value="">-- 请先添加账户 --</option>';
    }
}

// 更新支出资产选择
function updateExpenseAssetSelect(accountId) {
    const assetSelect = document.getElementById('expenseAsset');
    const assets = DataManager.getAllAssets();
    const accountAssets = assets.filter(a => a.accountId === accountId && safeNumber(a.value) > 0);
    
    let assetHtml = '<option value="">-- 选择资产 --</option>';
    accountAssets.forEach(asset => {
        assetHtml += `<option value="${asset.id}">${asset.name} (余额: ¥${safeNumber(asset.value).toFixed(2)})</option>`;
    });
    assetSelect.innerHTML = assetHtml;
}

// 绑定事件
if (document.getElementById('incomeForm')) {
    document.getElementById('incomeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addIncome();
    });
}

if (document.getElementById('expenseForm')) {
    document.getElementById('expenseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });
}

if (document.getElementById('incomeAccount')) {
    document.getElementById('incomeAccount').addEventListener('change', function() {
        updateIncomeAssetSelect(this.value);
    });
}

if (document.getElementById('expenseAccount')) {
    document.getElementById('expenseAccount').addEventListener('change', function() {
        updateExpenseAssetSelect(this.value);
    });
}

// 打开编辑交易模态框
function openEditTransactionModal(transactionId) {
    const transaction = DataManager.getAllTransactions().find(t => t.id === transactionId);
    if (!transaction) return;
    
    // 填充编辑表单
    document.getElementById('editTransactionId').value = transaction.id;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editCategory').value = transaction.category || '';
    document.getElementById('editDescription').value = transaction.description;
    
    // 设置日期时间
    const date = new Date(transaction.datetime);
    document.getElementById('editDatetime').value = date.toISOString().slice(0, 16);
    
    // 显示模态框
    document.getElementById('editTransactionModal').style.display = 'flex';
}

// 保存编辑交易
function saveEditTransaction() {
    const transactionId = document.getElementById('editTransactionId').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const description = document.getElementById('editDescription').value;
    const datetime = document.getElementById('editDatetime').value;
    
    if (!amount || !datetime) {
        showToast('请填写完整信息');
        return;
    }
    
    // 获取原交易
    const transaction = DataManager.getAllTransactions().find(t => t.id === transactionId);
    if (!transaction) return;
    
    // 更新交易信息
    const updatedTransaction = {
        ...transaction,
        amount: amount,
        category: category,
        description: description,
        datetime: new Date(datetime).toISOString()
    };
    
    // 保存更新
    DataManager.saveTransaction(updatedTransaction);
    
    showToast('交易记录更新成功');
    renderTransactionPage();
    closeEditTransactionModal();
}

// 删除交易
function deleteTransaction(transactionId) {
    if (confirm('确定要删除这条交易记录吗？')) {
        DataManager.deleteTransaction(transactionId);
        showToast('交易记录删除成功');
        renderTransactionPage();
    }
}

// 关闭编辑交易模态框
function closeEditTransactionModal() {
    document.getElementById('editTransactionModal').style.display = 'none';
    document.getElementById('editTransactionForm').reset();
}

// 初始化交易页面
function initTransactionPage() {
    renderTransactionPage();
}

// 绑定编辑表单事件
if (document.getElementById('editTransactionForm')) {
    document.getElementById('editTransactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEditTransaction();
    });
}