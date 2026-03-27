// ==================== 资产管理 ====================

// 加载资产数据
function loadAssets() {
    assets = DataManager.getAllAssets();
}

// 保存资产数据
function saveAssets() {
    // 资产数据通过 DataManager.saveAsset 逐个保存
    assets.forEach(asset => DataManager.saveAsset(asset));
}

// 渲染资产页面
function renderAssetPage() {
    // 根据当前视图渲染资产
    if (currentAssetView === 'type') {
        renderAssetCards();
    } else {
        renderAccountView();
    }
    renderAssetChart();
    renderDebtChart();
    renderDebtList();
    updateAssetStats();
    updateAssetAccountSelect();
}

// 渲染资产卡片（按类型视图）
function renderAssetCards() {
    const assetList = document.getElementById('assetList');
    
    // 计算总资产（用于占比计算）
    const totalAssetsValue = assets.reduce((sum, asset) => sum + safeNumber(asset.value), 0) +
        goldAssets.reduce((sum, gold) => sum + safeNumber(gold.grams) * currentGoldPrice, 0) +
        funds.reduce((sum, fund) => {
            const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
            const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
            return sum + currentValue + sellValue;
        }, 0);
    
    const typeNames = {
        bank_realtime: '<i class="fas fa-university"></i> 银行实时可用',
        bank_non_realtime: '<i class="fas fa-university"></i> 银行非实时',
        wallet_realtime: '<i class="fas fa-wallet"></i> 钱包实时可用',
        wallet_non_realtime: '<i class="fas fa-wallet"></i> 钱包非实时',
        fund: '<i class="fas fa-chart-line"></i> 基金',
        stock: '<i class="fas fa-chart-bar"></i> 股票',
        bond: '<i class="fas fa-file-contract"></i> 债券',
        insurance: '<i class="fas fa-shield-alt"></i> 保险',
        real_estate: '<i class="fas fa-home"></i> 房产',
        vehicle: '<i class="fas fa-car"></i> 车辆',
        other: '<i class="fas fa-box"></i> 其他'
    };

    const typeColors = {
        bank_realtime: '#48bb78',
        bank_non_realtime: '#38a169',
        wallet_realtime: '#07c160',
        wallet_non_realtime: '#059669',
        fund: '#ed8936',
        stock: '#9f7aea',
        bond: '#4299e1',
        insurance: '#f6ad55',
        real_estate: '#667eea',
        vehicle: '#f56565',
        other: '#a0aec0'
    };
    
    const grouped = {};
    assets.forEach(a => {
        let type = a.type || 'other';
        const accountType = a.accountType || 'bank';
        
        // 根据账户类型和资产子类型进行分类
        // 实时可用：活期存款、零钱宝类（支付宝/微信）、银行实时赎回理财
        // 非实时：定期存款、货币基金、非实时赎回理财
        
        const isRealTime = ['current', 'yuebao', 'lingqianbao'].includes(a.subType) || 
                          (a.subType === 'wealth_mgmt' && a.remark && a.remark.includes('实时'));
        
        if (type === 'bank' || accountType === 'bank') {
            // 银行类资产
            if (isRealTime) {
                type = 'bank_realtime'; // 银行实时可用
            } else {
                type = 'bank_non_realtime'; // 银行非实时
            }
        } else if (accountType === 'alipay' || accountType === 'wechat') {
            // 支付宝/微信类资产
            if (isRealTime) {
                type = 'wallet_realtime'; // 钱包实时可用
            } else {
                type = 'wallet_non_realtime'; // 钱包非实时
            }
        }
        
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(a);
    });
    
    // 添加基金投资组合到分组
    const fundTotal = funds.reduce((sum, fund) => {
        const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
        const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
        return sum + currentValue + sellValue;
    }, 0);
    
    if (funds.length > 0) {
        grouped['fund'] = [{
            name: '基金投资组合',
            value: fundTotal,
            remark: `持有${funds.length}只基金`,
            isFundSummary: true
        }];
    }
    
    let html = '';
    
    Object.keys(grouped).forEach(type => {
        const items = grouped[type];
        const typeTotal = items.reduce((sum, i) => {
            if (i.type === 'stock') {
                return sum + (safeNumber(i.value) || (safeNumber(i.quantity) * safeNumber(i.costPrice)));
            }
            return sum + safeNumber(i.value);
        }, 0);
        const percent = totalAssetsValue > 0 ? (typeTotal / totalAssetsValue * 100).toFixed(1) : 0;
        
        html += `
            <div class="asset-card" style="border-left-color: ${typeColors[type]}">
                <div class="asset-card-title">
                    ${typeNames[type] || '<i class="fas fa-box"></i> 其他'}
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
            if (item.isFundSummary) {
                html += `
                    <div class="asset-item">
                        <span class="asset-item-label">${item.name}</span>
                        <span class="asset-item-value">¥${safeNumber(item.value).toFixed(2)}</span>
                    </div>
                `;
            } else if (item.type === 'stock') {
                const stockValue = safeNumber(item.value) || (safeNumber(item.quantity) * safeNumber(item.costPrice));
                html += `
                    <div class="asset-item">
                        <div>
                            <span class="asset-item-label">${item.name} ${item.code ? `(${item.code})` : ''}</span>
                            <div style="font-size: 11px; color: #a0aec0;">${safeNumber(item.quantity)}股 × ¥${safeNumber(item.costPrice).toFixed(2)}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="asset-item-value">¥${safeNumber(stockValue).toFixed(2)}</span>
                            <button class="icon-btn edit-btn" onclick="editAsset('${item.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn delete-btn" onclick="deleteAsset('${item.id}')" title="删除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            } else {
                const subTypeLabel = item.subType ? (assetSubTypes[item.subType]?.name || item.subType) : '';
                html += `
                    <div class="asset-item">
                        <div>
                            <span class="asset-item-label">${item.name}</span>
                            ${subTypeLabel ? `<span style="font-size: 11px; color: #667eea; margin-left: 5px;">[${subTypeLabel}]</span>` : ''}
                            ${item.remark ? `<div style="font-size: 11px; color: #a0aec0;">${item.remark}</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="asset-item-value">¥${safeNumber(item.value).toFixed(2)}</span>
                            <button class="icon-btn edit-btn" onclick="editAsset('${item.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn delete-btn" onclick="deleteAsset('${item.id}')" title="删除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
    });
    
    // 添加黄金资产卡片
    if (goldAssets.length > 0) {
        const goldTotal = goldAssets.reduce((sum, g) => sum + safeNumber(g.grams) * currentGoldPrice, 0);
        const goldGrams = goldAssets.reduce((sum, g) => sum + safeNumber(g.grams), 0);
        const goldPercent = totalAssetsValue > 0 ? (goldTotal / totalAssetsValue * 100).toFixed(1) : 0;
        
        html += `
            <div class="asset-card gold-card">
                <div class="asset-card-title">
                    <i class="fas fa-coins"></i> 黄金资产
                    <span style="margin-left: auto; font-size: 14px; color: #975a16;">
                        ¥${safeNumber(goldTotal).toFixed(2)}
                    </span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goldPercent}%; opacity: 0.7;"></div>
                </div>
                <div style="font-size: 12px; color: #a0aec0; margin-top: 5px; text-align: right;">
                    占比 ${goldPercent}% | 共 ${safeNumber(goldGrams).toFixed(2)} 克
                </div>
        `;
        
        goldAssets.forEach(gold => {
            const itemValue = safeNumber(gold.grams) * safeNumber(currentGoldPrice);
            html += `
                <div class="asset-item">
                    <div>
                        <span class="asset-item-label">${gold.name}</span>
                        <span class="gold-gram">${safeNumber(gold.grams).toFixed(2)} 克</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="asset-item-value">¥${safeNumber(itemValue).toFixed(2)}</span>
                        <button class="icon-btn edit-btn" onclick="editGold('${gold.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" onclick="deleteGold('${gold.id}')" title="删除"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    assetList.innerHTML = html || 
        '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-icon"><i class="fas fa-gem"></i></div><div>暂无资产记录，点击"新增资产"、"新增黄金"开始记录</div></div>';
}

// 渲染账户视图
function renderAccountView() {
    const accountList = document.getElementById('accountList');
    
    // 按账户分组（使用字符串作为key）
    const accountGroups = new Map();
    
    // 添加普通资产到账户分组
    assets.forEach(asset => {
        const accountId = String(asset.accountId || asset.id);
        const accountType = asset.accountType || 'bank';
        
        if (!accountGroups.has(accountId)) {
            accountGroups.set(accountId, {
                id: accountId,
                name: asset.accountName || asset.name,
                type: accountType,
                assets: [],
                goldAssets: []
            });
        }
        
        accountGroups.get(accountId).assets.push(asset);
    });
    
    // 添加黄金资产到账户分组
    goldAssets.forEach(gold => {
        const accountId = gold.accountId ? String(gold.accountId) : null;
        
        if (accountId) {
            if (accountGroups.has(accountId)) {
                // 账户已存在，直接添加黄金资产
                accountGroups.get(accountId).goldAssets.push(gold);
            } else {
                // 账户不存在，查找账户信息并创建新账户
                const sourceAsset = assets.find(a => String(a.id) === accountId);
                if (sourceAsset) {
                    accountGroups.set(accountId, {
                        id: accountId,
                        name: sourceAsset.accountName || sourceAsset.name,
                        type: sourceAsset.accountType || 'bank',
                        assets: [],
                        goldAssets: [gold]
                    });
                }
            }
        }
    });
    
    if (accountGroups.size === 0) {
        accountList.innerHTML = `
            <div class="empty-state" style="background: white; border-radius: 12px; padding: 60px;">
                <div class="empty-icon"><i class="fas fa-university"></i></div>
                <div>暂无账户记录，点击"新增资产"开始记录</div>
                <div style="margin-top: 15px; color: #a0aec0; font-size: 14px;">
                    您可以添加银行卡、微信钱包、支付宝等账户
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    accountGroups.forEach((account, accountId) => {
        const typeConfig = accountTypes[account.type] || accountTypes.bank;
        const assetsValue = account.assets.reduce((sum, a) => sum + safeNumber(a.value), 0);
        const goldValue = account.goldAssets.reduce((sum, g) => sum + safeNumber(g.grams) * currentGoldPrice, 0);
        const totalValue = assetsValue + goldValue;
        
        // 按子类型分组
        const subTypeGroups = {};
        account.assets.forEach(asset => {
            const subType = asset.subType || 'current';
            if (!subTypeGroups[subType]) {
                subTypeGroups[subType] = [];
            }
            subTypeGroups[subType].push(asset);
        });
        
        html += `
            <div class="account-card">
                <div class="account-header ${typeConfig.headerClass}">
                    <div class="account-title">
                        <i class="fas ${typeConfig.icon}"></i>
                        <span class="account-name-display" id="account-name-${account.id}">${account.name}</span>
                        <button class="icon-btn edit-btn" onclick="editAccountName('${account.id}')" title="编辑账户名"><i class="fas fa-edit"></i></button>
                        <span class="account-badge badge-${account.type}">${typeConfig.name}</span>
                    </div>
                    <div class="account-total">¥${totalValue.toFixed(2)}</div>
                </div>
                <div class="account-body">
        `;
        
        // 渲染各子类型
        Object.keys(subTypeGroups).forEach(subType => {
            const subTypeConfig = assetSubTypes[subType] || assetSubTypes.other;
            const subTypeAssets = subTypeGroups[subType];
            const subTypeTotal = subTypeAssets.reduce((sum, a) => sum + safeNumber(a.value), 0);
            
            html += `
                <div class="sub-asset-category">
                    <div class="sub-asset-header">
                        <div class="sub-asset-title">
                            <i class="fas fa-folder"></i>
                            ${subTypeConfig.name}
                            <span class="sub-asset-tag ${subTypeConfig.tagClass}">${subTypeConfig.tag}</span>
                        </div>
                        <div class="sub-asset-amount">¥${subTypeTotal.toFixed(2)}</div>
                    </div>
            `;
            
            subTypeAssets.forEach(asset => {
                html += `
                    <div class="sub-asset-item">
                        <div>
                            <div class="sub-asset-name">${asset.name}</div>
                            ${asset.rate ? `<div style="font-size: 11px; color: #a0aec0;">利率: ${asset.rate}%</div>` : ''}
                            ${asset.remark ? `<div style="font-size: 11px; color: #a0aec0;">${asset.remark}</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="sub-asset-value">¥${safeNumber(asset.value).toFixed(2)}</div>
                            <button class="icon-btn edit-btn" onclick="editAsset('${asset.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn delete-btn" onclick="deleteAsset('${asset.id}')" title="删除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        // 渲染黄金资产
        if (account.goldAssets.length > 0) {
            const goldTotal = account.goldAssets.reduce((sum, g) => sum + safeNumber(g.grams) * currentGoldPrice, 0);
            const goldGrams = account.goldAssets.reduce((sum, g) => sum + safeNumber(g.grams), 0);
            
            html += `
                <div class="sub-asset-category">
                    <div class="sub-asset-header">
                        <div class="sub-asset-title">
                            <i class="fas fa-coins"></i>
                            黄金资产
                            <span class="sub-asset-tag tag-gold">黄金</span>
                        </div>
                        <div class="sub-asset-amount">¥${goldTotal.toFixed(2)}</div>
                    </div>
            `;
            
            account.goldAssets.forEach(gold => {
                const itemValue = safeNumber(gold.grams) * safeNumber(currentGoldPrice);
                html += `
                    <div class="sub-asset-item">
                        <div>
                            <div class="sub-asset-name">${gold.name}</div>
                            <div style="font-size: 11px; color: #a0aec0;">${safeNumber(gold.grams).toFixed(2)} 克</div>
                            ${gold.remark ? `<div style="font-size: 11px; color: #a0aec0;">${gold.remark}</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="sub-asset-value">¥${safeNumber(itemValue).toFixed(2)}</div>
                            <button class="icon-btn edit-btn" onclick="editGold('${gold.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn delete-btn" onclick="deleteGold('${gold.id}')" title="删除"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    accountList.innerHTML = html;
}

// 编辑账户名称
function editAccountName(accountId) {
    const accountSpan = document.getElementById(`account-name-${accountId}`);
    const currentName = accountSpan.textContent;
    
    const newName = prompt('请输入新的账户名称:', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        const trimmedName = newName.trim();
        
        // 更新所有属于该账户的资产的 accountName
        assets.forEach(asset => {
            if (String(asset.accountId) === String(accountId) || String(asset.id) === String(accountId)) {
                asset.accountName = trimmedName;
            }
        });
        
        // 更新黄金资产的 accountName
        goldAssets.forEach(gold => {
            if (String(gold.accountId) === String(accountId)) {
                gold.accountName = trimmedName;
            }
        });
        
        // 保存数据
        saveAssets();
        saveGoldAssets();
        
        // 重新渲染
        renderAssetPage();
        
        showToast('账户名称修改成功');
    }
}

// 渲染资产图表
function renderAssetChart() {
    const ctx = document.getElementById('assetChart').getContext('2d');
    
    // 计算资产数据
    const assetData = [];
    const assetLabels = [];
    const assetColors = [];
    let totalAssetsValue = 0;
    
    // 银行存款
    const bankAssetsList = assets.filter(a => a.type === 'bank' || a.accountType === 'bank');
    const bankTotal = bankAssetsList.reduce((sum, a) => sum + safeNumber(a.value), 0);
    if (bankTotal > 0) {
        assetLabels.push('银行存款');
        assetData.push(bankTotal);
        assetColors.push('#48bb78');
        totalAssetsValue += bankTotal;
    }
    
    // 基金投资（从fundData计算）
    const fundTotal = funds.reduce((sum, fund) => {
        const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
        const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
        return sum + currentValue + sellValue;
    }, 0);
    if (fundTotal > 0) {
        assetLabels.push('基金投资');
        assetData.push(fundTotal);
        assetColors.push('#ed8936');
        totalAssetsValue += fundTotal;
    }
    
    // 黄金资产
    const goldTotal = goldAssets.reduce((sum, g) => sum + safeNumber(g.grams) * currentGoldPrice, 0);
    if (goldTotal > 0) {
        assetLabels.push('黄金资产');
        assetData.push(goldTotal);
        assetColors.push('#ecc94b');
        totalAssetsValue += goldTotal;
    }
    
    // 股票资产
    const stockAssets = assets.filter(a => a.subType === 'stock');
    const stockTotal = stockAssets.reduce((sum, a) => sum + safeNumber(a.value), 0);
    if (stockTotal > 0) {
        assetLabels.push('股票');
        assetData.push(stockTotal);
        assetColors.push('#9f7aea');
        totalAssetsValue += stockTotal;
    }
    
    // 债券资产
    const bondAssets = assets.filter(a => a.subType === 'bond');
    const bondTotal = bondAssets.reduce((sum, a) => sum + safeNumber(a.value), 0);
    if (bondTotal > 0) {
        assetLabels.push('债券');
        assetData.push(bondTotal);
        assetColors.push('#4299e1');
        totalAssetsValue += bondTotal;
    }
    
    // 保险资产
    const insuranceAssets = assets.filter(a => a.subType === 'insurance');
    const insuranceTotal = insuranceAssets.reduce((sum, a) => sum + safeNumber(a.value), 0);
    if (insuranceTotal > 0) {
        assetLabels.push('保险');
        assetData.push(insuranceTotal);
        assetColors.push('#ed8936');
        totalAssetsValue += insuranceTotal;
    }
    
    // 其他资产
    const otherAssets = assets.filter(a => 
        a.subType === 'other' || 
        (!a.subType && a.type !== 'bank' && a.accountType !== 'bank')
    );
    const otherTotal = otherAssets.reduce((sum, a) => sum + safeNumber(a.value), 0);
    if (otherTotal > 0) {
        assetLabels.push('其他资产');
        assetData.push(otherTotal);
        assetColors.push('#a0aec0');
        totalAssetsValue += otherTotal;
    }
    
    // 销毁旧图表
    if (assetChart) {
        assetChart.destroy();
    }
    
    // 创建新图表
    assetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: assetLabels,
            datasets: [{
                data: assetData,
                backgroundColor: assetColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, font: { size: 12 } }
                },
                title: {
                    display: true,
                    text: '资产配置分布',
                    font: { size: 16, weight: 'bold' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percent = totalAssetsValue > 0 ? (value / totalAssetsValue * 100).toFixed(1) : 0;
                            return `${label}: ¥${safeNumber(value).toFixed(2)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染负债图表
function renderDebtChart() {
    const ctx = document.getElementById('debtChart').getContext('2d');
    
    // 计算负债数据
    const debtData = [];
    const debtLabels = [];
    const debtColors = [];
    
    // 房贷
    const mortgageDebts = debts.filter(d => d.type === 'mortgage');
    const mortgageTotal = mortgageDebts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    if (mortgageTotal > 0) {
        debtLabels.push('房贷');
        debtData.push(mortgageTotal);
        debtColors.push('#9f7aea');
    }
    
    // 车贷
    const carDebts = debts.filter(d => d.type === 'car_loan');
    const carTotal = carDebts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    if (carTotal > 0) {
        debtLabels.push('车贷');
        debtData.push(carTotal);
        debtColors.push('#4299e1');
    }
    
    // 信用卡
    const creditCardDebts = debts.filter(d => d.type === 'credit_card');
    const creditCardTotal = creditCardDebts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    if (creditCardTotal > 0) {
        debtLabels.push('信用卡');
        debtData.push(creditCardTotal);
        debtColors.push('#ecc94b');
    }
    
    // 其他负债
    const otherDebts = debts.filter(d => d.type !== 'mortgage' && d.type !== 'car_loan' && d.type !== 'credit_card');
    const otherTotal = otherDebts.reduce((sum, d) => sum + safeNumber(d.amount), 0);
    if (otherTotal > 0) {
        debtLabels.push('其他负债');
        debtData.push(otherTotal);
        debtColors.push('#f56565');
    }
    
    // 销毁旧图表
    if (debtChart) {
        debtChart.destroy();
    }
    
    // 创建新图表
    debtChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: debtLabels,
            datasets: [{
                data: debtData,
                backgroundColor: debtColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: '负债分布'
                }
            }
        }
    });
}

// 更新资产统计
function updateAssetStats() {
    // 计算基金资产（从fundData计算）
    const fundAssetsValue = funds.reduce((sum, fund) => {
        const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
        const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
        return sum + currentValue + sellValue;
    }, 0);
    
    // 计算总资产（不含基金，基金单独计算）
    const totalAssets = assets.reduce((sum, asset) => sum + safeNumber(asset.value), 0);
    
    // 计算黄金资产价值
    const goldValue = goldAssets.reduce((sum, gold) => sum + safeNumber(gold.grams) * currentGoldPrice, 0);
    
    // 计算总负债
    const totalDebts = debts.reduce((sum, debt) => sum + safeNumber(debt.amount), 0);
    
    // 计算净资产（包含基金资产）
    const netWorth = totalAssets + goldValue + fundAssetsValue - totalDebts;
    
    // 计算银行存款
    const bankAssets = assets.filter(a => a.accountType === 'bank' || a.type === 'bank')
        .reduce((sum, a) => sum + safeNumber(a.value), 0);
    
    // 计算房贷
    const mortgageDebt = debts.filter(d => d.type === 'mortgage')
        .reduce((sum, d) => sum + safeNumber(d.amount), 0);
    
    // 计算车贷
    const carDebt = debts.filter(d => d.type === 'car_loan')
        .reduce((sum, d) => sum + safeNumber(d.amount), 0);
    
    // 计算其他负债
    const otherDebt = debts.filter(d => d.type !== 'mortgage' && d.type !== 'car_loan')
        .reduce((sum, d) => sum + safeNumber(d.amount), 0);
    
    // 计算资产负债率
    const totalAllAssets = totalAssets + goldValue + fundAssetsValue;
    const debtRatio = totalAllAssets > 0 ? (totalDebts / totalAllAssets) * 100 : 0;
    
    // 计算基金成本和收益
    const fundCost = funds.reduce((sum, fund) => {
        return sum + (safeNumber(fund.costAmount) || (safeNumber(fund.costNav) * safeNumber(fund.shares)));
    }, 0);
    const fundReturn = fundAssetsValue - fundCost;
    const fundReturnRate = fundCost > 0 ? (fundReturn / fundCost * 100) : 0;
    
    // 更新DOM
    document.getElementById('totalAssets').textContent = `¥${(totalAssets + goldValue + fundAssetsValue).toFixed(2)}`;
    document.getElementById('bankAssets').textContent = `¥${bankAssets.toFixed(2)}`;
    document.getElementById('fundAssets').textContent = `¥${fundAssetsValue.toFixed(2)}`;
    
    // 更新基金收益显示
    const fundReturnEl = document.getElementById('fundReturn');
    if (fundReturnEl) {
        fundReturnEl.textContent = `${fundReturn >= 0 ? '+' : ''}¥${safeNumber(fundReturn).toFixed(2)} (${fundReturnRate >= 0 ? '+' : ''}${safeNumber(fundReturnRate).toFixed(2)}%)`;
        fundReturnEl.style.color = fundReturn >= 0 ? '#f56565' : '#48bb78';
    }
    
    document.getElementById('totalDebtAmount').textContent = `¥${totalDebts.toFixed(2)}`;
    document.getElementById('mortgageDebt').textContent = `¥${mortgageDebt.toFixed(2)}`;
    document.getElementById('carDebt').textContent = `¥${carDebt.toFixed(2)}`;
    document.getElementById('otherDebt').textContent = `¥${otherDebt.toFixed(2)}`;
    document.getElementById('netWorth').textContent = `¥${netWorth.toFixed(2)}`;
    
    // 更新资产负债概览
    document.getElementById('totalAssetsDisplay').textContent = `¥${(totalAssets + goldValue + fundAssetsValue).toFixed(2)}`;
    document.getElementById('totalDebtsDisplay').textContent = `¥${totalDebts.toFixed(2)}`;
    document.getElementById('netWorthDisplay').textContent = `¥${netWorth.toFixed(2)}`;
    
    // 更新资产负债率
    const debtRatioBadge = document.getElementById('debtRatioBadge');
    debtRatioBadge.textContent = `资产负债率: ${debtRatio.toFixed(2)}%`;
    if (debtRatio > 50) {
        debtRatioBadge.className = 'badge debt-ratio-warning';
        debtRatioBadge.style.background = '#fed7d7';
        debtRatioBadge.style.color = '#c53030';
    } else {
        debtRatioBadge.className = 'badge debt-ratio-safe';
        debtRatioBadge.style.background = '#c6f6d5';
        debtRatioBadge.style.color = '#22543d';
    }
}

// 打开资产模态框
function openAssetModal() {
    document.getElementById('assetModalTitle').textContent = '新增资产';
    document.getElementById('assetEditId').value = '';
    document.getElementById('assetAccount').value = '';
    document.getElementById('assetName').value = '';
    document.getElementById('assetSubType').value = 'current';
    document.getElementById('assetValue').value = '';
    document.getElementById('assetRate').value = '';
    document.getElementById('assetMaturityDate').value = '';
    document.getElementById('assetRemark').value = '';
    // 重置黄金字段
    document.getElementById('assetGoldGrams').value = '';
    document.getElementById('assetGoldPrice').value = currentGoldPrice;
    document.getElementById('assetGoldTotalValue').value = '¥0.00';
    // 重置扣款账户
    const paymentSelect = document.getElementById('assetPaymentSource');
    if (paymentSelect) paymentSelect.value = '';
    
    onAssetSubTypeChange(); // 更新字段显示状态
    updateAssetAccountSelect();
    
    // 添加所属账户变化事件监听
    const assetAccountSelect = document.getElementById('assetAccount');
    if (assetAccountSelect) {
        assetAccountSelect.onchange = function() {
            const subType = document.getElementById('assetSubType').value;
            const isInvestment = investmentSubTypes.includes(subType);
            if (isInvestment) {
                const selectedAccountId = this.value;
                updateAssetPaymentSourceSelect(selectedAccountId);
            }
        };
    }
    
    document.getElementById('assetModal').classList.add('active');
}

// 关闭资产模态框
function closeAssetModal() {
    document.getElementById('assetModal').classList.remove('active');
}

// ==================== 创建账户功能 ====================

// 打开创建账户模态框
function openAccountModal() {
    document.getElementById('accountModalTitle').innerHTML = '<i class="fas fa-university"></i> 创建账户';
    document.getElementById('createAccountEditId').value = '';
    document.getElementById('createAccountType').value = 'bank';
    document.getElementById('createAccountName').value = '';
    document.getElementById('createAccountBalance').value = '';
    document.getElementById('createAccountRemark').value = '';
    document.getElementById('accountModal').classList.add('active');
}

// 关闭创建账户模态框
function closeAccountModal() {
    document.getElementById('accountModal').classList.remove('active');
}

// 保存账户
function saveAccount(e) {
    e.preventDefault();
    
    const editId = document.getElementById('createAccountEditId').value;
    const accountType = document.getElementById('createAccountType').value;
    const accountName = document.getElementById('createAccountName').value;
    const accountBalance = safeNumber(document.getElementById('createAccountBalance').value);
    const accountRemark = document.getElementById('createAccountRemark').value;
    
    if (!accountName || accountBalance < 0) {
        showToast('请填写完整信息');
        return;
    }
    
    const accountId = editId || generateId();
    
    // 创建父账户资产
    const accountAsset = {
        id: accountId,
        accountId: accountId,  // 父账户的accountId等于自己的id
        accountName: accountName,
        accountType: accountType,
        name: accountName,
        subType: 'current',  // 默认为活期
        value: accountBalance,
        rate: 0,
        remark: accountRemark
    };
    
    if (editId) {
        const index = assets.findIndex(a => String(a.id) === String(editId));
        if (index !== -1) {
            assets[index] = accountAsset;
            showToast('账户更新成功');
        }
    } else {
        assets.push(accountAsset);
        showToast('账户创建成功');
    }
    
    saveAssets();
    renderAssetPage();
    closeAccountModal();
}

// 投资类资产类型（需要扣款）
const investmentSubTypes = ['fund', 'stock', 'bond', 'gold'];

// 资产子类型切换
function onAssetSubTypeChange() {
    const subType = document.getElementById('assetSubType').value;
    const isGold = subType === 'gold';
    const isInvestment = investmentSubTypes.includes(subType);
    
    // 显示/隐藏黄金相关字段
    document.getElementById('assetValueGroup').style.display = isGold ? 'none' : 'block';
    document.getElementById('assetGoldGroup').style.display = isGold ? 'block' : 'none';
    document.getElementById('goldPriceRow').style.display = isGold ? 'flex' : 'none';
    
    // 显示/隐藏扣款账户（投资类资产需要）
    const paymentGroup = document.getElementById('paymentSourceGroup');
    if (paymentGroup) {
        paymentGroup.style.display = isInvestment ? 'block' : 'none';
        document.getElementById('assetPaymentSource').required = isInvestment;
    }
    
    // 更新必填属性
    document.getElementById('assetValue').required = !isGold;
    document.getElementById('assetGoldGrams').required = isGold;
    
    // 如果是投资类资产，更新扣款账户列表
    if (isInvestment) {
        const selectedAccountId = document.getElementById('assetAccount').value;
        updateAssetPaymentSourceSelect(selectedAccountId);
    }
    
    // 如果是黄金，计算预估价值
    if (isGold) {
        calculateGoldTotalValue();
    }
}

// 更新资产页面的扣款账户选择列表
function updateAssetPaymentSourceSelect(accountId = null) {
    const select = document.getElementById('assetPaymentSource');
    if (!select) return;
    
    // 获取活期/活钱类资产作为扣款来源
    // 如果指定了accountId，只返回该账户下的资产
    const paymentSources = assets.filter(a => {
        const isCurrent = a.subType === 'current' || a.subType === 'money_market';
        const hasBalance = safeNumber(a.value) > 0;
        const matchAccount = !accountId || a.accountId === accountId || a.id === accountId;
        return isCurrent && hasBalance && matchAccount;
    });
    
    let html = '<option value="">-- 选择扣款账户 --</option>';
    
    if (paymentSources.length === 0) {
        html += '<option value="" disabled>暂无可用账户，请先创建账户并添加活期存款</option>';
    } else {
        paymentSources.forEach(source => {
            const balance = safeNumber(source.value);
            html += `<option value="${source.id}">${source.name} (余额: ¥${balance.toFixed(2)})</option>`;
        });
    }
    
    select.innerHTML = html;
}

// 计算黄金预估价值
function calculateGoldTotalValue() {
    const grams = safeNumber(document.getElementById('assetGoldGrams').value);
    const price = safeNumber(document.getElementById('assetGoldPrice').value);
    const totalValue = grams * price;
    document.getElementById('assetGoldTotalValue').value = '¥' + totalValue.toFixed(2);
}

// 监听黄金输入变化
document.addEventListener('DOMContentLoaded', function() {
    const goldGramsInput = document.getElementById('assetGoldGrams');
    const goldPriceInput = document.getElementById('assetGoldPrice');
    
    if (goldGramsInput) {
        goldGramsInput.addEventListener('input', calculateGoldTotalValue);
    }
    if (goldPriceInput) {
        goldPriceInput.addEventListener('input', calculateGoldTotalValue);
    }
});

// 编辑资产
function editAsset(id) {
    // 先在普通资产中查找
    let asset = assets.find(a => String(a.id) === String(id));
    let isGoldAsset = false;
    
    // 如果不在普通资产中，在黄金资产中查找
    if (!asset) {
        asset = goldAssets.find(g => String(g.id) === String(id));
        isGoldAsset = true;
    }
    
    if (!asset) {
        showToast('资产未找到');
        return;
    }
    
    // 先更新账户选择列表
    updateAssetAccountSelect();
    
    document.getElementById('assetModalTitle').textContent = isGoldAsset ? '编辑黄金资产' : '编辑资产';
    document.getElementById('assetEditId').value = asset.id;
    document.getElementById('assetAccount').value = asset.accountId || asset.id;
    document.getElementById('assetName').value = asset.name;
    document.getElementById('assetRemark').value = asset.remark || '';
    
    if (isGoldAsset) {
        // 黄金资产
        document.getElementById('assetSubType').value = 'gold';
        document.getElementById('assetGoldGrams').value = asset.grams;
        document.getElementById('assetGoldPrice').value = asset.price || currentGoldPrice;
        document.getElementById('assetRate').value = '';
        document.getElementById('assetMaturityDate').value = '';
    } else {
        // 普通资产
        document.getElementById('assetSubType').value = asset.subType || 'current';
        document.getElementById('assetValue').value = asset.value;
        document.getElementById('assetRate').value = asset.rate || '';
        document.getElementById('assetMaturityDate').value = asset.maturityDate || '';
    }
    
    onAssetSubTypeChange(); // 更新字段显示状态
    document.getElementById('assetModal').classList.add('active');
}

// 删除资产
function deleteAsset(id) {
    if (confirm('确定要删除这个资产吗？')) {
        // 先在普通资产中查找
        let index = assets.findIndex(a => String(a.id) === String(id));
        if (index !== -1) {
            assets.splice(index, 1);
            saveAssets();
            renderAssetPage();
            showToast('资产删除成功');
            return;
        }
        
        // 在黄金资产中查找
        index = goldAssets.findIndex(g => String(g.id) === String(id));
        if (index !== -1) {
            goldAssets.splice(index, 1);
            saveGoldAssets();
            renderAssetPage();
            showToast('黄金资产删除成功');
        }
    }
}

// 保存资产表单
function saveAssetForm(e) {
    e.preventDefault();
    
    const editId = document.getElementById('assetEditId').value;
    const accountValue = document.getElementById('assetAccount').value;
    const assetName = document.getElementById('assetName').value;
    const assetSubType = document.getElementById('assetSubType').value;
    const assetRate = safeNumber(document.getElementById('assetRate').value);
    const assetMaturityDate = document.getElementById('assetMaturityDate').value;
    const assetRemark = document.getElementById('assetRemark').value;
    
    // 判断资产类型
    const isGold = assetSubType === 'gold';
    const isInvestment = investmentSubTypes.includes(assetSubType);
    
    let assetValue;
    let goldGrams = 0;
    let goldPrice = 0;
    
    if (isGold) {
        // 黄金类型：获取克数和金价
        goldGrams = safeNumber(document.getElementById('assetGoldGrams').value);
        goldPrice = safeNumber(document.getElementById('assetGoldPrice').value);
        assetValue = goldGrams * goldPrice;
        
        if (!assetName || goldGrams <= 0) {
            showToast('请填写完整信息');
            return;
        }
    } else {
        // 普通类型：获取金额
        assetValue = safeNumber(document.getElementById('assetValue').value);
        if (!assetName || assetValue <= 0) {
            showToast('请填写完整信息');
            return;
        }
    }
    
    // 获取所属账户信息
    if (!accountValue) {
        showToast('请选择所属账户');
        return;
    }
    
    // 使用新的 getAccountById 函数获取账户信息
    const accountInfo = getAccountById(accountValue);
    
    if (!accountInfo) {
        showToast('所选账户不存在');
        return;
    }
    
    const accountId = accountInfo.id;
    const accountName = accountInfo.name;
    const accountType = accountInfo.accountType || 'bank';
    
    // 投资类资产：从扣款账户扣款
    let paymentSourceId = null;
    if (isInvestment && !editId) {
        paymentSourceId = document.getElementById('assetPaymentSource').value;
        if (!paymentSourceId) {
            showToast('请选择扣款账户');
            return;
        }
        
        const paymentSource = assets.find(a => String(a.id) === String(paymentSourceId));
        if (!paymentSource) {
            showToast('扣款账户不存在');
            return;
        }
        
        if (safeNumber(paymentSource.value) < assetValue) {
            showToast('扣款账户余额不足');
            return;
        }
        
        // 扣除款项
        paymentSource.value = safeNumber(paymentSource.value) - assetValue;
    }
    
    if (isGold) {
        // 保存到黄金资产数组
        const goldAsset = {
            id: editId || generateId(),
            accountId,
            accountName,
            name: assetName,
            grams: goldGrams,
            price: goldPrice,
            remark: assetRemark
        };
        
        if (editId) {
            const index = goldAssets.findIndex(g => String(g.id) === String(editId));
            if (index !== -1) {
                goldAssets[index] = goldAsset;
                showToast('黄金资产更新成功');
            }
        } else {
            goldAssets.push(goldAsset);
            showToast('黄金资产添加成功');
            
            // 创建交易记录
            if (paymentSourceId) {
                const transaction = {
                    id: generateId(),
                    type: 'invest_buy',
                    amount: assetValue,
                    datetime: new Date().toISOString(),
                    sourceAccountId: accountId,
                    targetAccountId: accountId,
                    sourceAssetId: paymentSourceId,
                    targetAssetId: goldAsset.id,
                    category: '黄金投资',
                    description: `购买黄金: ${assetName}`,
                    status: 'completed',
                    relatedTransactionId: null,
                    metadata: {
                        investmentType: 'gold',
                        grams: goldGrams,
                        price: goldPrice
                    }
                };
                addTransaction(transaction);
            }
        }
        
        saveGoldAssets();
    } else {
        // 根据子类型确定资产类型
        let assetType = 'other';
        if (['current', 'fixed', 'money_market', 'yuebao', 'lingqianbao', 'wealth_mgmt'].includes(assetSubType)) {
            assetType = 'bank';
        } else if (assetSubType === 'fund') {
            assetType = 'fund';
        } else if (assetSubType === 'stock') {
            assetType = 'stock';
        } else if (assetSubType === 'bond') {
            assetType = 'bond';
        } else if (assetSubType === 'insurance') {
            assetType = 'insurance';
        } else if (assetSubType === 'gold') {
            assetType = 'gold';
        }
        
        // 保存到普通资产数组
        const asset = {
            id: editId || generateId(),
            accountId,
            accountName,
            accountType,
            type: assetType,
            name: assetName,
            subType: assetSubType,
            value: assetValue,
            rate: assetRate,
            maturityDate: assetMaturityDate,
            remark: assetRemark
        };
        
        if (editId) {
            const index = assets.findIndex(a => String(a.id) === String(editId));
            if (index !== -1) {
                assets[index] = asset;
                showToast('资产更新成功');
            }
        } else {
            assets.push(asset);
            showToast('资产添加成功');
            
            // 创建交易记录
            if (isInvestment && paymentSourceId) {
                // 投资购买
                const transaction = {
                    id: generateId(),
                    type: 'invest_buy',
                    amount: assetValue,
                    datetime: new Date().toISOString(),
                    sourceAccountId: accountId,
                    targetAccountId: accountId,
                    sourceAssetId: paymentSourceId,
                    targetAssetId: asset.id,
                    category: '投资',
                    description: `购买${assetSubTypes[assetSubType]?.name || assetSubType}: ${assetName}`,
                    status: 'completed',
                    relatedTransactionId: null,
                    metadata: {
                        investmentType: assetSubType
                    }
                };
                addTransaction(transaction);
            } else if (assetSubType === 'fixed') {
                // 定期存款
                const transaction = {
                    id: generateId(),
                    type: 'deposit',
                    amount: assetValue,
                    datetime: new Date().toISOString(),
                    sourceAccountId: accountId,
                    targetAccountId: accountId,
                    sourceAssetId: paymentSourceId || asset.id, // 如果是直接添加，使用自身作为来源
                    targetAssetId: asset.id,
                    category: '定期存款',
                    description: `存入定期: ${assetName}`,
                    status: 'completed',
                    relatedTransactionId: null,
                    metadata: {
                        maturityDate: assetMaturityDate,
                        interestRate: assetRate
                    }
                };
                addTransaction(transaction);
            } else {
                // 其他资产（如活期存款）
                const transaction = {
                    id: generateId(),
                    type: 'income',
                    amount: assetValue,
                    datetime: new Date().toISOString(),
                    sourceAccountId: null,
                    targetAccountId: accountId,
                    sourceAssetId: null,
                    targetAssetId: asset.id,
                    category: '存款',
                    description: `存入${assetSubTypes[assetSubType]?.name || assetSubType}: ${assetName}`,
                    status: 'completed',
                    relatedTransactionId: null,
                    metadata: {}
                };
                addTransaction(transaction);
            }
        }
        
        saveAssets();
    }
    
    renderAssetPage();
    closeAssetModal();
}

// 刷新资产数据
function refreshAssetData() {
    loadAssets();
    loadGoldAssets();
    loadDebts();
    loadFromLocalStorage(); // 加载基金数据
    renderAssetPage();
    showToast('数据刷新成功');
}

// 绑定资产表单提交事件
document.getElementById('assetForm').addEventListener('submit', saveAssetForm);

// 绑定账户表单提交事件
document.getElementById('accountForm').addEventListener('submit', saveAccount);
