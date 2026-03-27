// ==================== 基金管理 ====================

// 从本地存储加载基金数据
function loadFromLocalStorage() {
    const savedFunds = DataManager.getAllFunds();
    // 数据迁移：确保所有基金都有正确的数值类型和id
    funds = savedFunds.map(f => ({
        id: f.id || generateId(),
        ...f,
        costNav: safeNumber(f.costNav),
        shares: safeNumber(f.shares),
        costAmount: safeNumber(f.costAmount),
        currentNav: safeNumber(f.currentNav),
        sellNav: safeNumber(f.sellNav),
        sellShares: safeNumber(f.sellShares)
    }));
    // 保存更新后的数据（确保所有基金都有id）
    if (funds.length > 0) {
        originalFunds = [...funds];
        saveToLocalStorage();
    } else {
        originalFunds = [];
    }
}

// 基金分页状态
let fundPaginationState = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0
};

// 保存基金数据到本地存储
function saveToLocalStorage() {
    DataManager.setLocalStorage(DataManager.STORAGE_KEYS.FUNDS, originalFunds);
}

// 渲染基金表格
function renderTable(filteredFunds = null) {
    const tableBody = document.getElementById('fundTableBody');
    const paginationContainer = document.getElementById('fundPagination');
    const displayFunds = filteredFunds || funds;
    
    // 更新分页状态
    fundPaginationState.totalItems = displayFunds.length;
    
    if (displayFunds.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-state">
                    <div class="empty-icon"><i class="fas fa-chart-bar"></i></div>
                    <div>暂无基金数据，请导入Excel或手动添加</div>
                </td>
            </tr>
        `;
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }
    
    // 计算分页数据
    const totalPages = Math.ceil(fundPaginationState.totalItems / fundPaginationState.pageSize);
    const startIndex = (fundPaginationState.currentPage - 1) * fundPaginationState.pageSize;
    const endIndex = startIndex + fundPaginationState.pageSize;
    const paginatedFunds = displayFunds.slice(startIndex, endIndex);
    
    let html = '';
    paginatedFunds.forEach((fund, index) => {
        const returnAmount = calculateReturn(fund);
        const returnRate = calculateReturnRate(fund);
        
        html += `
            <tr>
                <td>
                    <div class="fund-name">${fund.name}</div>
                    <div class="fund-code">${fund.code}</div>
                </td>
                <td>
                    <span class="badge ${fund.isFixed ? 'badge-fixed' : 'badge-regular'}">
                        ${fund.isFixed ? '定投' : '普通'}
                    </span>
                </td>
                <td>${fund.type || '混合型'}</td>
                <td>${safeNumber(fund.costNav).toFixed(4)}</td>
                <td>${safeNumber(fund.shares).toFixed(2)}</td>
                <td>¥${safeNumber(fund.costAmount).toFixed(2)}</td>
                <td>${safeNumber(fund.currentNav).toFixed(4)}</td>
                <td>${safeNumber(fund.sellNav).toFixed(4)}</td>
                <td>${safeNumber(fund.sellShares).toFixed(2)}</td>
                <td class="${returnAmount >= 0 ? 'return-positive' : 'return-negative'}">
                    ${returnAmount >= 0 ? '+' : ''}¥${Math.abs(returnAmount).toFixed(2)}
                </td>
                <td class="${returnRate >= 0 ? 'return-positive' : 'return-negative'}">
                    ${returnRate >= 0 ? '+' : ''}${Math.abs(returnRate).toFixed(2)}%
                </td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn edit-btn" onclick="editFundById('${fund.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" onclick="deleteFundById('${fund.id}')" title="删除"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // 渲染分页控件
    if (paginationContainer) {
        renderFundPagination(totalPages);
    }
}

// 渲染基金分页控件
function renderFundPagination(totalPages) {
    const paginationContainer = document.getElementById('fundPagination');
    if (!paginationContainer) return;
    
    let paginationHtml = `
        <div class="pagination-controls">
            <div class="pagination-info">
                共 ${fundPaginationState.totalItems} 条记录，每页显示 ${fundPaginationState.pageSize} 条
            </div>
            <div class="pagination-buttons">
                <button class="pagination-btn" onclick="changeFundPage(${Math.max(1, fundPaginationState.currentPage - 1)})" ${fundPaginationState.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
    `;
    
    // 生成页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, fundPaginationState.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button class="pagination-btn ${i === fundPaginationState.currentPage ? 'active' : ''}" onclick="changeFundPage(${i})">
                ${i}
            </button>
        `;
    }
    
    paginationHtml += `
                <button class="pagination-btn" onclick="changeFundPage(${Math.min(totalPages, fundPaginationState.currentPage + 1)})" ${fundPaginationState.currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="pagination-size">
                <label>每页显示：</label>
                <select onchange="changeFundPageSize(this.value)">
                    <option value="5" ${fundPaginationState.pageSize === 5 ? 'selected' : ''}>5</option>
                    <option value="10" ${fundPaginationState.pageSize === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${fundPaginationState.pageSize === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${fundPaginationState.pageSize === 50 ? 'selected' : ''}>50</option>
                </select>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
}

// 切换基金页码
function changeFundPage(page) {
    if (page < 1 || page > Math.ceil(fundPaginationState.totalItems / fundPaginationState.pageSize)) {
        return;
    }
    fundPaginationState.currentPage = page;
    renderTable();
}

// 切换基金每页显示数量
function changeFundPageSize(size) {
    fundPaginationState.pageSize = parseInt(size);
    fundPaginationState.currentPage = 1;
    renderTable();
}

// 计算收益
function calculateReturn(fund) {
    const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
    const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
    const totalValue = currentValue + sellValue;
    return totalValue - safeNumber(fund.costAmount);
}

// 计算收益率
function calculateReturnRate(fund) {
    const costAmount = safeNumber(fund.costAmount);
    if (costAmount === 0) return 0;
    const returnAmount = calculateReturn(fund);
    return (returnAmount / costAmount) * 100;
}

// 更新统计信息
function updateStats() {
    const totalCost = funds.reduce((sum, fund) => sum + safeNumber(fund.costAmount), 0);
    const totalValue = funds.reduce((sum, fund) => {
        const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
        const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
        return sum + currentValue + sellValue;
    }, 0);
    const totalReturn = totalValue - totalCost;
    const returnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    
    document.getElementById('totalCost').textContent = `¥${totalCost.toFixed(2)}`;
    document.getElementById('totalValue').textContent = `¥${totalValue.toFixed(2)}`;
    
    // 累计收益 - 红涨绿跌
    const returnEl = document.getElementById('totalReturn');
    returnEl.textContent = `${totalReturn >= 0 ? '+' : ''}¥${totalReturn.toFixed(2)}`;
    returnEl.style.color = totalReturn >= 0 ? '#f56565' : '#48bb78';
    
    // 收益率 - 红涨绿跌
    const returnRateEl = document.getElementById('returnRate');
    returnRateEl.textContent = `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`;
    returnRateEl.style.color = returnRate >= 0 ? '#f56565' : '#48bb78';
    returnRateEl.style.fontWeight = 'bold';
    
    document.getElementById('fundCount').textContent = funds.length;
}

// 打开基金模态框
function openModal() {
    document.getElementById('modalTitle').textContent = '新增基金';
    document.getElementById('editIndex').value = '-1';
    document.getElementById('fundName').value = '';
    document.getElementById('fundCode').value = '';
    document.getElementById('fundTypeSelect').value = '混合型';
    document.getElementById('isFixed').checked = false;
    document.getElementById('costNav').value = '';
    document.getElementById('shares').value = '';
    document.getElementById('currentNav').value = '';
    document.getElementById('sellNav').value = '';
    document.getElementById('sellShares').value = '';
    document.getElementById('costAmount').value = '';
    document.getElementById('fundLinkageInfo').style.display = 'block';
    document.getElementById('fundPaymentSourceGroup').style.display = 'block';
    document.getElementById('fundDeductionPreview').style.display = 'none';
    updatePaymentSourceSelect('fundPaymentSource');
    document.getElementById('fundModal').classList.add('active');
}

// 关闭基金模态框
function closeModal() {
    document.getElementById('fundModal').classList.remove('active');
}

// 编辑基金（按ID）
function editFundById(id) {
    const fund = funds.find(f => f.id === id);
    if (!fund) {
        showToast('基金不存在');
        return;
    }
    document.getElementById('modalTitle').textContent = '编辑基金';
    document.getElementById('editIndex').value = funds.findIndex(f => f.id === id);
    document.getElementById('fundName').value = fund.name;
    document.getElementById('fundCode').value = fund.code;
    document.getElementById('fundTypeSelect').value = fund.type || '混合型';
    document.getElementById('isFixed').checked = fund.isFixed || false;
    document.getElementById('costNav').value = fund.costNav;
    document.getElementById('shares').value = fund.shares;
    document.getElementById('currentNav').value = fund.currentNav;
    document.getElementById('sellNav').value = fund.sellNav;
    document.getElementById('sellShares').value = fund.sellShares;
    document.getElementById('costAmount').value = fund.costAmount;
    document.getElementById('fundLinkageInfo').style.display = 'none';
    document.getElementById('fundPaymentSourceGroup').style.display = 'none';
    document.getElementById('fundDeductionPreview').style.display = 'none';
    document.getElementById('fundModal').classList.add('active');
}

// 编辑基金（兼容旧版本）
function editFund(index) {
    if (typeof index === 'number') {
        const fund = funds[index];
        if (!fund) {
            showToast('基金不存在');
            return;
        }
        editFundById(fund.id);
    }
}

// 删除基金（按ID）
function deleteFundById(id) {
    if (confirm('确定要删除这个基金吗？')) {
        const fundIndex = funds.findIndex(f => f.id === id);
        if (fundIndex === -1) {
            showToast('基金不存在');
            return;
        }
        const fundToDelete = funds[fundIndex];
        funds.splice(fundIndex, 1);
        // 同时从 originalFunds 中删除
        const originalIndex = originalFunds.findIndex(f => f.id === fundToDelete.id);
        if (originalIndex !== -1) {
            originalFunds.splice(originalIndex, 1);
        }
        saveToLocalStorage();
        renderTable();
        updateStats();
        showToast('基金删除成功');
    }
}

// 删除基金（兼容旧版本）
function deleteFund(index) {
    if (typeof index === 'number') {
        const fund = funds[index];
        if (!fund) {
            showToast('基金不存在');
            return;
        }
        deleteFundById(fund.id);
    }
}

// 计算成本金额
function calculateCost() {
    const costNav = safeNumber(document.getElementById('costNav').value);
    const shares = safeNumber(document.getElementById('shares').value);
    const costAmount = costNav * shares;
    document.getElementById('costAmount').value = costAmount.toFixed(2);
}

// 更新基金扣款预览
function updateFundDeductionPreview() {
    const costAmount = safeNumber(document.getElementById('costAmount').value);
    const paymentSource = document.getElementById('fundPaymentSource').value;
    
    if (costAmount > 0 && paymentSource && paymentSource !== 'keep') {
        const sourceAsset = assets.find(a => a.id === paymentSource);
        
        if (sourceAsset) {
            document.getElementById('fundDeductionSource').textContent = sourceAsset.name;
            document.getElementById('fundDeductionAmount').textContent = `¥${costAmount.toFixed(2)}`;
            document.getElementById('fundDeductionPreview').style.display = 'block';
        }
    } else {
        document.getElementById('fundDeductionPreview').style.display = 'none';
    }
}

// 保存基金
function saveFund(e) {
    e.preventDefault();
    
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const fundName = document.getElementById('fundName').value;
    const fundCode = document.getElementById('fundCode').value;
    const fundType = document.getElementById('fundTypeSelect').value;
    const isFixed = document.getElementById('isFixed').checked;
    const costNav = safeNumber(document.getElementById('costNav').value);
    const shares = safeNumber(document.getElementById('shares').value);
    const currentNav = safeNumber(document.getElementById('currentNav').value);
    const sellNav = safeNumber(document.getElementById('sellNav').value);
    const sellShares = safeNumber(document.getElementById('sellShares').value);
    const costAmount = safeNumber(document.getElementById('costAmount').value);
    const fundPaymentSource = document.getElementById('fundPaymentSource').value;
    
    if (!fundName || !fundCode || costAmount <= 0) {
        showToast('请填写完整信息');
        return;
    }
    
    const fund = {
        id: generateId(),
        name: fundName,
        code: fundCode,
        type: fundType,
        isFixed: isFixed,
        costNav: costNav,
        shares: shares,
        costAmount: costAmount,
        currentNav: currentNav,
        sellNav: sellNav,
        sellShares: sellShares
    };
    
    // 处理联动扣款
    if (editIndex === -1 && fundPaymentSource && fundPaymentSource !== 'keep') {
        const sourceAsset = assets.find(a => a.id === fundPaymentSource);
        if (sourceAsset) {
            if (safeNumber(sourceAsset.value) < costAmount) {
                showToast('扣款账户余额不足');
                return;
            }
            // 扣除账户余额
            sourceAsset.value = safeNumber(sourceAsset.value) - costAmount;
            saveAssets();
        }
    }
    
    if (editIndex === -1) {
        funds.push(fund);
        originalFunds.push(fund);
        showToast('基金添加成功');
    } else {
        const oldFund = funds[editIndex];
        funds[editIndex] = fund;
        // 同时更新 originalFunds
        const originalIndex = originalFunds.findIndex(f => f.id === oldFund.id);
        if (originalIndex !== -1) {
            originalFunds[originalIndex] = fund;
        } else {
            originalFunds.push(fund);
        }
        showToast('基金更新成功');
    }
    
    saveToLocalStorage();
    renderTable();
    updateStats();
    closeModal();
}

// 排序表格
function sortTable(column) {
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }
    
    // 更新排序指示器
    resetSortIndicators();
    const thElement = document.querySelector(`th[onclick="sortTable('${column}')"]`);
    if (thElement) {
        const sortIndicator = thElement.querySelector('.sort-indicator');
        if (sortIndicator) {
            const upElement = sortIndicator.querySelector('.up');
            const downElement = sortIndicator.querySelector('.down');
            if (upElement && downElement) {
                if (sortState.direction === 'asc') {
                    upElement.classList.add('active');
                } else {
                    downElement.classList.add('active');
                }
            }
        }
    }
    
    const sortedFunds = [...funds].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'returnAmount') {
            aValue = calculateReturn(a);
            bValue = calculateReturn(b);
        } else if (column === 'returnRate') {
            aValue = calculateReturnRate(a);
            bValue = calculateReturnRate(b);
        } else {
            aValue = safeNumber(aValue);
            bValue = safeNumber(bValue);
        }
        
        if (aValue < bValue) {
            return sortState.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortState.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    renderTable(sortedFunds);
}

// 应用筛选
function applyFilters() {
    const fixedFilter = document.getElementById('fixedFilter').value;
    filterState.fixed = fixedFilter;
    sortState.column = '';
    sortState.direction = 'asc';
    resetSortIndicators();
    
    if (fixedFilter === 'all') {
        funds = [...originalFunds];
    } else if (fixedFilter === 'fixed') {
        funds = originalFunds.filter(fund => fund.isFixed);
    } else if (fixedFilter === 'non-fixed') {
        funds = originalFunds.filter(fund => !fund.isFixed);
    }
    
    renderTable();
    updateStats();
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        pendingImportData = jsonData;
        openImportModal();
    };
    reader.readAsArrayBuffer(file);
}

// 打开导入模态框
function openImportModal() {
    document.getElementById('optionAppend').classList.remove('selected');
    document.getElementById('optionReplace').classList.remove('selected');
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importWarning').style.display = 'none';
    document.getElementById('confirmImportBtn').disabled = true;
    selectedImportMode = null;
    updatePaymentSourceSelect('importPaymentSource');
    document.getElementById('importModal').classList.add('active');
    
    // 预览数据
    if (pendingImportData) {
        const previewTableBody = document.getElementById('previewTableBody');
        let html = '';
        const previewData = pendingImportData.slice(0, 5);
        
        previewData.forEach(item => {
            html += `
                <tr>
                    <td>${item['名称'] || ''}</td>
                    <td>${item['基金号'] || item['代码'] || ''}</td>
                    <td>${item['基金类型'] || ''}</td>
                    <td>${item['持有份额'] || item['份额'] || ''}</td>
                    <td>${item['成本金额'] || item['金额'] || ''}</td>
                </tr>
            `;
        });
        
        previewTableBody.innerHTML = html;
        document.getElementById('importPreview').style.display = 'block';
    }
}

// 关闭导入模态框
function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
    pendingImportData = null;
    selectedImportMode = null;
}

// 选择导入模式
function selectImportMode(mode) {
    selectedImportMode = mode;
    document.getElementById('optionAppend').classList.toggle('selected', mode === 'append');
    document.getElementById('optionReplace').classList.toggle('selected', mode === 'replace');
    
    // 显示警告
    if (mode === 'replace') {
        document.getElementById('existingCount').textContent = funds.length;
        document.getElementById('newCount').textContent = pendingImportData ? pendingImportData.length : 0;
        document.getElementById('importWarning').style.display = 'block';
    } else {
        document.getElementById('importWarning').style.display = 'none';
    }
    
    document.getElementById('confirmImportBtn').disabled = false;
}

// 确认导入
function confirmImport() {
    if (!selectedImportMode || !pendingImportData) return;
    
    const importPaymentSource = document.getElementById('importPaymentSource').value;
    if (!importPaymentSource) {
        showToast('请选择扣款账户');
        return;
    }
    
    // 处理联动扣款
    const totalCost = pendingImportData.reduce((sum, item) => {
        return sum + safeNumber(item['成本金额'] || item['金额'] || 0);
    }, 0);
    
    const sourceAsset = assets.find(a => a.id === importPaymentSource);
    if (sourceAsset) {
        if (safeNumber(sourceAsset.value) < totalCost) {
            showToast('扣款账户余额不足');
            return;
        }
        // 扣除账户余额
        sourceAsset.value = safeNumber(sourceAsset.value) - totalCost;
        saveAssets();
    }
    
    // 导入数据
    if (selectedImportMode === 'replace') {
        funds = [];
        originalFunds = [];
    }
    
    pendingImportData.forEach(item => {
        const fund = {
            id: generateId(),
            name: item['名称'] || '',
            code: item['基金号'] || item['代码'] || '',
            type: item['基金类型'] || '混合型',
            isFixed: false,
            costNav: safeNumber(item['成本净值'] || 0),
            shares: safeNumber(item['持有份额'] || item['份额'] || 0),
            costAmount: safeNumber(item['成本金额'] || item['金额'] || 0),
            currentNav: safeNumber(item['当前净值'] || 0),
            sellNav: safeNumber(item['卖出净值'] || 0),
            sellShares: safeNumber(item['卖出份额'] || 0)
        };
        funds.push(fund);
        originalFunds.push(fund);
    });
    
    saveToLocalStorage();
    renderTable();
    updateStats();
    closeImportModal();
    showToast(`成功导入 ${pendingImportData.length} 条基金记录`);
}

// 导出Excel
function exportExcel() {
    if (funds.length === 0) {
        showToast('暂无数据可导出');
        return;
    }
    
    const data = funds.map(fund => {
        return {
            '名称': fund.name,
            '基金号': fund.code,
            '基金类型': fund.type,
            '定投': fund.isFixed ? '是' : '否',
            '成本净值': fund.costNav,
            '持有份额': fund.shares,
            '成本金额': fund.costAmount,
            '当前净值': fund.currentNav,
            '卖出净值': fund.sellNav,
            '卖出份额': fund.sellShares,
            '收益': calculateReturn(fund),
            '收益率': calculateReturnRate(fund)
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '基金数据');
    XLSX.writeFile(workbook, '基金数据.xlsx');
    showToast('导出成功');
}

async function fetchFundNav(fundCode) {
    try {
        const response = await axios.get(`http://127.0.0.1:8080/api/fund/nav?code=${fundCode}`);
        if (response.data.status === 'success') {
            const fundData = response.data.data;
            if (fundData && fundData.nav) {
                const nav = safeNumber(fundData.nav);
                const originalFund = originalFunds.find(f => f.code === fundCode);
                if (originalFund) {
                    originalFund.currentNav = nav;
                    originalFund.name = fundData.name || originalFund.name;
                    originalFund.updateDate = fundData.date;
                }
                
                const fund = funds.find(f => f.code === fundCode);
                if (fund) {
                    fund.currentNav = nav;
                    fund.name = fundData.name || fund.name;
                    fund.updateDate = fundData.date;
                }
                
                saveToLocalStorage();
                renderTable();
                updateStats();
                showToast(`已更新 ${fundCode} 净值: ${nav} (${fundData.date})`);
            }
        }
    } catch (error) {
        console.error(`获取${fundCode}基金净值失败:`, error);
        showToast(`获取${fundCode}净值失败，请检查后端服务`, 'error');
    }
}

function updateAllNetValues() {
    if (originalFunds.length === 0) {
        showToast('暂无基金数据', 'error');
        return;
    }

    showToast('正在更新净值...');
    let updated = 0, failed = 0;
    
    const promises = originalFunds.map(async (fund) => {
        if (fund.code) {
            try {
                await fetchFundNav(fund.code);
                updated++;
            } catch (e) {
                failed++;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    });
    
    Promise.all(promises).then(() => {
        if (filterState.fixed !== 'all') {
            applyFilters();
        } else {
            funds = [...originalFunds];
            renderTable();
            updateStats();
        }
        showToast(`更新完成：成功${updated}只 | 失败${failed}只`);
    });
}

// 绑定基金表单提交事件
document.getElementById('fundForm').addEventListener('submit', saveFund);

// 初始化加载基金数据
loadFromLocalStorage();