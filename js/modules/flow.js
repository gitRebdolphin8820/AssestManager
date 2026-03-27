// ==================== 流水管理 ====================

// 加载流水数据（从交易记录中筛选）
function loadFlows() {
    const transactions = DataManager.getAllTransactions();
    // 流水记录是交易记录的子集，只包含收入和支出
    flows = transactions
        .filter(t => t.type === 'income' || t.type === 'expense')
        .map(t => ({
            id: t.id,
            date: t.transactionDate.split('T')[0],
            type: t.type,
            category: t.category,
            amount: t.amount,
            remark: t.description,
            accountId: t.toAccountId || t.fromAccountId,
            assetId: t.toAssetId || t.fromAssetId
        }));
}

// 保存流水数据（转换为交易记录）
function saveFlows() {
    // 流水数据通过交易记录保存
    flows.forEach(flow => {
        const transaction = {
            id: flow.id,
            type: flow.type,
            amount: flow.amount,
            fromAccountId: flow.type === 'expense' ? flow.accountId : null,
            toAccountId: flow.type === 'income' ? flow.accountId : null,
            fromAssetId: flow.type === 'expense' ? flow.assetId : null,
            toAssetId: flow.type === 'income' ? flow.assetId : null,
            category: flow.category,
            description: flow.remark,
            status: 'completed',
            transactionDate: new Date(flow.date).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {}
        };
        DataManager.saveTransaction(transaction);
    });
}

// 渲染流水表格
function renderFlowTable(filteredFlows = null) {
    const tableBody = document.getElementById('flowTableBody');
    const displayFlows = filteredFlows || flows;
    
    if (displayFlows.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <div>暂无流水记录，点击"记一笔"开始记录</div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    displayFlows.forEach((flow, index) => {
        html += `
            <tr>
                <td>${flow.date}</td>
                <td>
                    <span class="badge ${flow.type === 'income' ? 'badge-income' : 'badge-expense'}">
                        ${flow.type === 'income' ? '收入' : '支出'}
                    </span>
                </td>
                <td>${flow.category}</td>
                <td class="${flow.type === 'income' ? 'return-negative' : 'return-positive'}">
                    ${flow.type === 'income' ? '+' : '-'}
                    ¥${safeNumber(flow.amount).toFixed(2)}
                </td>
                <td>${flow.remark || '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn edit-btn" onclick="editFlow(${index})"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" onclick="deleteFlow(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// 更新流水统计
function updateFlowStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthFlows = flows.filter(flow => {
        const flowDate = new Date(flow.date);
        return flowDate.getMonth() === currentMonth && flowDate.getFullYear() === currentYear;
    });
    
    const monthIncome = monthFlows
        .filter(flow => flow.type === 'income')
        .reduce((sum, flow) => sum + safeNumber(flow.amount), 0);
    
    const monthExpense = monthFlows
        .filter(flow => flow.type === 'expense')
        .reduce((sum, flow) => sum + safeNumber(flow.amount), 0);
    
    const monthBalance = monthIncome - monthExpense;
    
    document.getElementById('monthIncome').textContent = `¥${monthIncome.toFixed(2)}`;
    document.getElementById('monthExpense').textContent = `¥${monthExpense.toFixed(2)}`;
    document.getElementById('monthBalance').textContent = `¥${monthBalance.toFixed(2)}`;
}

// 打开流水模态框
function openFlowModal() {
    document.getElementById('flowModalTitle').textContent = '记一笔';
    document.getElementById('flowEditIndex').value = '-1';
    document.getElementById('flowDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('flowType').value = 'income';
    document.getElementById('flowAmount').value = '';
    document.getElementById('flowRemark').value = '';
    updateFlowCategories();
    updateFlowAccountSelect();
    document.getElementById('flowModal').classList.add('active');
}

// 关闭流水模态框
function closeFlowModal() {
    document.getElementById('flowModal').classList.remove('active');
}

// 更新流水分类
function updateFlowCategories() {
    const type = document.getElementById('flowType').value;
    const categorySelect = document.getElementById('flowCategory');
    const categoryList = categories[type] || [];
    
    let html = '';
    categoryList.forEach(category => {
        html += `<option value="${category}">${category}</option>`;
    });
    
    categorySelect.innerHTML = html;
}

// 更新流水账户选择
function updateFlowAccountSelect() {
    const accountSelect = document.getElementById('flowAccount');
    const accounts = DataManager.getAllAccounts();
    
    let html = '<option value="">-- 选择账户 --</option>';
    accounts.forEach(account => {
        html += `<option value="${account.id}">${account.name}</option>`;
    });
    
    accountSelect.innerHTML = html;
    
    // 默认选择第一个账户
    if (accounts.length > 0) {
        accountSelect.value = accounts[0].id;
        updateFlowAssetSelect(accounts[0].id);
    } else {
        document.getElementById('flowAsset').innerHTML = '<option value="">-- 请先添加账户 --</option>';
    }
}

// 更新流水资产选择
function updateFlowAssetSelect(accountId) {
    const assetSelect = document.getElementById('flowAsset');
    const assets = DataManager.getAllAssets();
    const accountAssets = assets.filter(a => a.accountId === accountId);
    
    let html = '<option value="">-- 选择资产 --</option>';
    accountAssets.forEach(asset => {
        html += `<option value="${asset.id}">${asset.name} (余额: ¥${safeNumber(asset.value).toFixed(2)})</option>`;
    });
    
    assetSelect.innerHTML = html;
}

// 保存流水记录
function saveFlow(e) {
    e.preventDefault();
    
    const editIndex = parseInt(document.getElementById('flowEditIndex').value);
    const date = document.getElementById('flowDate').value;
    const type = document.getElementById('flowType').value;
    const category = document.getElementById('flowCategory').value;
    const amount = safeNumber(document.getElementById('flowAmount').value);
    const remark = document.getElementById('flowRemark').value;
    const accountId = document.getElementById('flowAccount').value;
    const assetId = document.getElementById('flowAsset').value;
    
    if (!date || !type || !category || amount <= 0 || !accountId || !assetId) {
        showToast('请填写完整信息');
        return;
    }
    
    const transaction = {
        id: generateId(),
        type,
        amount,
        fromAccountId: type === 'expense' ? accountId : null,
        toAccountId: type === 'income' ? accountId : null,
        fromAssetId: type === 'expense' ? assetId : null,
        toAssetId: type === 'income' ? assetId : null,
        category,
        description: remark,
        status: 'completed',
        transactionDate: new Date(date).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
    };
    
    // 执行交易并更新资产
    DataManager.executeTransaction(transaction);
    
    // 重新加载流水数据
    loadFlows();
    
    if (editIndex === -1) {
        showToast('记录添加成功');
    } else {
        showToast('记录更新成功');
    }
    
    renderFlowTable();
    updateFlowStats();
    closeFlowModal();
}

// 编辑流水记录
function editFlow(index) {
    const flow = flows[index];
    document.getElementById('flowModalTitle').textContent = '编辑记录';
    document.getElementById('flowEditIndex').value = index;
    document.getElementById('flowDate').value = flow.date;
    document.getElementById('flowType').value = flow.type;
    updateFlowCategories();
    document.getElementById('flowCategory').value = flow.category;
    document.getElementById('flowAmount').value = flow.amount;
    document.getElementById('flowRemark').value = flow.remark;
    updateFlowAccountSelect();
    
    // 设置账户和资产
    if (flow.accountId) {
        document.getElementById('flowAccount').value = flow.accountId;
        updateFlowAssetSelect(flow.accountId);
        if (flow.assetId) {
            document.getElementById('flowAsset').value = flow.assetId;
        }
    }
    
    document.getElementById('flowModal').classList.add('active');
}

// 删除流水记录
function deleteFlow(index) {
    if (confirm('确定要删除这条记录吗？')) {
        flows.splice(index, 1);
        saveFlows();
        renderFlowTable();
        updateFlowStats();
        showToast('记录删除成功');
    }
}

// 排序流水
function sortFlow(column) {
    if (flowSortState.column === column) {
        flowSortState.direction = flowSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        flowSortState.column = column;
        flowSortState.direction = 'asc';
    }
    
    const sortedFlows = [...flows].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'amount') {
            aValue = safeNumber(aValue);
            bValue = safeNumber(bValue);
        }
        
        if (aValue < bValue) {
            return flowSortState.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return flowSortState.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    renderFlowTable(sortedFlows);
}

// 筛选流水
function filterFlow() {
    const startDate = document.getElementById('flowStartDate').value;
    const endDate = document.getElementById('flowEndDate').value;
    
    const filteredFlows = flows.filter(flow => {
        const flowDate = flow.date;
        return (!startDate || flowDate >= startDate) && (!endDate || flowDate <= endDate);
    });
    
    renderFlowTable(filteredFlows);
}

// 重置流水筛选
function resetFlowFilter() {
    const monthRange = getCurrentMonthRange();
    document.getElementById('flowStartDate').value = monthRange.start;
    document.getElementById('flowEndDate').value = monthRange.end;
    filterFlow();
}

// 绑定流水表单提交事件
document.getElementById('flowForm').addEventListener('submit', saveFlow);