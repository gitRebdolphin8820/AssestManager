// ==================== 黄金资产管理 ====================

// 加载黄金资产数据
function loadGoldAssets() {
    goldAssets = DataManager.getAllGoldAssets();
}

// 保存黄金资产数据
function saveGoldAssets() {
    goldAssets.forEach(gold => DataManager.saveGoldAsset(gold));
}

// 更新黄金账户选择列表
function updateGoldAccountSelect() {
    const select = document.getElementById('goldAccount');
    if (!select) return;
    
    const accounts = DataManager.getAllAccounts();
    let html = '<option value="">-- 选择所属账户 --</option>';
    
    accounts.forEach(acc => {
        html += `<option value="${acc.id}">${acc.name}</option>`;
    });
    
    select.innerHTML = html;
}

// 打开黄金资产模态框
function openGoldModal(goldId = null) {
    document.getElementById('goldEditId').value = '';
    document.getElementById('goldName').value = '';
    document.getElementById('goldGrams').value = '';
    document.getElementById('goldPrice').value = currentGoldPrice;
    document.getElementById('goldPaymentSource').value = '';
    document.getElementById('goldRemark').value = '';
    document.getElementById('goldValueDisplay').value = '';
    
    if (goldId) {
        const gold = goldAssets.find(g => String(g.id) === String(goldId));
        if (gold) {
            document.getElementById('goldModalTitle').textContent = '编辑黄金资产';
            document.getElementById('goldEditId').value = gold.id;
            document.getElementById('goldName').value = gold.name;
            document.getElementById('goldGrams').value = gold.grams;
            document.getElementById('goldRemark').value = gold.remark || '';
            document.getElementById('goldLinkageInfo').style.display = 'none';
            document.getElementById('goldPaymentSourceGroup').style.display = 'none';
            document.getElementById('goldDeductionPreview').style.display = 'none';
            // 显示账户选择
            document.getElementById('goldAccountGroup').style.display = 'block';
            updateGoldAccountSelect();
            document.getElementById('goldAccount').value = gold.accountId || '';
            calculateGoldValue();
        }
    } else {
        document.getElementById('goldModalTitle').textContent = '新增黄金资产';
        document.getElementById('goldLinkageInfo').style.display = 'block';
        document.getElementById('goldPaymentSourceGroup').style.display = 'block';
        // 显示账户选择
        document.getElementById('goldAccountGroup').style.display = 'block';
        updateGoldAccountSelect();
        // 初始化扣款账户（默认空）
        document.getElementById('goldPaymentSource').value = '';
    }
    
    // 添加所属账户变化事件监听
    const goldAccountSelect = document.getElementById('goldAccount');
    if (goldAccountSelect) {
        goldAccountSelect.onchange = function() {
            const selectedAccountId = this.value;
            // 根据选择的所属账户更新扣款账户列表
            updatePaymentSourceSelect('goldPaymentSource', [], selectedAccountId);
        };
    }
    
    document.getElementById('goldModal').classList.add('active');
}

// 编辑黄金资产
function editGold(id) {
    openGoldModal(id);
}

// 删除黄金资产
function deleteGold(id) {
    if (confirm('确定要删除这项黄金资产吗？')) {
        goldAssets = goldAssets.filter(g => String(g.id) !== String(id));
        DataManager.deleteGoldAsset(id);
        renderAssetPage();
        showToast('删除成功');
    }
}

// 关闭黄金资产模态框
function closeGoldModal() {
    document.getElementById('goldModal').classList.remove('active');
}

// 计算黄金价值
function calculateGoldValue() {
    const grams = safeNumber(document.getElementById('goldGrams').value);
    const price = safeNumber(document.getElementById('goldPrice').value);
    const value = grams * price;
    document.getElementById('goldValueDisplay').value = `¥${value.toFixed(2)}`;
}

// 更新黄金扣款预览
function updateGoldDeductionPreview() {
    const grams = safeNumber(document.getElementById('goldGrams').value);
    const price = safeNumber(document.getElementById('goldPrice').value);
    const paymentSource = document.getElementById('goldPaymentSource').value;
    
    if (grams > 0 && paymentSource && paymentSource !== 'keep') {
        const totalAmount = grams * price;
        const sourceAsset = assets.find(a => a.id === paymentSource);
        
        if (sourceAsset) {
            document.getElementById('goldDeductionSource').textContent = sourceAsset.name;
            document.getElementById('goldDeductionAmount').textContent = `¥${totalAmount.toFixed(2)}`;
            document.getElementById('goldDeductionPreview').style.display = 'block';
        }
    } else {
        document.getElementById('goldDeductionPreview').style.display = 'none';
    }
}

// 保存黄金资产
function saveGold(e) {
    e.preventDefault();
    
    const editId = document.getElementById('goldEditId').value;
    const goldName = document.getElementById('goldName').value;
    const goldGrams = safeNumber(document.getElementById('goldGrams').value);
    const goldPrice = safeNumber(document.getElementById('goldPrice').value);
    const goldPaymentSource = document.getElementById('goldPaymentSource').value;
    const goldRemark = document.getElementById('goldRemark').value;
    
    if (!goldName || goldGrams <= 0) {
        showToast('请填写完整信息');
        return;
    }
    
    // 新增模式下验证扣款账户
    if (!editId && !goldPaymentSource) {
        showToast('请选择扣款账户');
        return;
    }
    
    // 获取账户信息
    let accountId = '';
    let accountName = '';
    
    if (editId) {
        // 编辑模式：从选择器获取账户
        const selectedAccountId = document.getElementById('goldAccount').value;
        if (selectedAccountId) {
            const sourceAsset = assets.find(a => String(a.id) === String(selectedAccountId));
            if (sourceAsset) {
                accountId = sourceAsset.id;
                accountName = sourceAsset.accountName || sourceAsset.name;
            }
        } else {
            // 如果没有选择新账户，保留原来的账户信息
            const existingGold = goldAssets.find(g => String(g.id) === String(editId));
            if (existingGold) {
                accountId = existingGold.accountId || '';
                accountName = existingGold.accountName || '';
            }
        }
    } else {
        // 新增模式：从所属账户选择框获取
        const selectedAccountId = document.getElementById('goldAccount').value;
        if (selectedAccountId) {
            const sourceAsset = assets.find(a => String(a.id) === String(selectedAccountId));
            if (sourceAsset) {
                accountId = sourceAsset.id;
                accountName = sourceAsset.accountName || sourceAsset.name;
            }
        } else if (goldPaymentSource && goldPaymentSource !== 'keep') {
            // 如果没有选择所属账户，从扣款账户获取
            const sourceAsset = assets.find(a => String(a.id) === String(goldPaymentSource));
            if (sourceAsset) {
                // 使用父账户的accountId（如果sourceAsset是子资产，则使用它的accountId；如果是父账户，则使用它的id）
                accountId = sourceAsset.accountId || sourceAsset.id;
                accountName = sourceAsset.accountName || sourceAsset.name;
            }
        }
    }
    
    const goldAsset = {
        id: editId || generateId(),
        name: goldName,
        grams: goldGrams,
        price: goldPrice,
        remark: goldRemark,
        accountId: accountId,
        accountName: accountName
    };
    
    // 处理联动扣款
    if (!editId && goldPaymentSource && goldPaymentSource !== 'keep') {
        const sourceAsset = assets.find(a => a.id === goldPaymentSource);
        if (sourceAsset) {
            const totalAmount = goldGrams * goldPrice;
            if (safeNumber(sourceAsset.value) < totalAmount) {
                showToast('扣款账户余额不足');
                return;
            }
            // 扣除账户余额
            sourceAsset.value = safeNumber(sourceAsset.value) - totalAmount;
            saveAssets();
        }
    }
    
    if (editId) {
        const index = goldAssets.findIndex(g => String(g.id) === String(editId));
        if (index !== -1) {
            goldAssets[index] = goldAsset;
            showToast('黄金资产更新成功');
        }
    } else {
        goldAssets.push(goldAsset);
        showToast('黄金资产添加成功');
    }
    
    saveGoldAssets();
    renderAssetPage();
    closeGoldModal();
}

// 绑定黄金资产表单提交事件
document.getElementById('goldForm').addEventListener('submit', saveGold);