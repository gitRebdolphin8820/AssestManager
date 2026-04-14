// ==================== 全局变量 ====================
let currentTab = 'transaction';
let currentAssetView = 'type'; // 'type' 或 'account'

// 流水数据
let flows = [];
let flowSortState = { column: '', direction: 'asc' };

// 资产数据（不含黄金）
let assets = [];
let assetChart = null;
let trendChart = null;

// 黄金资产数据（单独存储克数）
let goldAssets = [];
let currentGoldPrice = 1000;

// 负债数据
let debts = [];
let debtChart = null;

// 基金数据
let funds = [];
let originalFunds = [];
let sortState = { column: '', direction: 'asc' };
let filterState = { fixed: 'all' };
const headers = ['名称', '定投', '基金类型', '基金号', '成本净值', '持有份额', '成本金额', '当前净值', '卖出净值', '卖出份额'];

// 交易数据
let transactions = [];

// 基金排序状态重置
function resetSortIndicators() {
    document.querySelectorAll('.sort-indicator .up, .sort-indicator .down').forEach(el => {
        el.classList.remove('active');
    });
}

// 导入相关变量
let pendingImportData = null;
let selectedImportMode = null;

// 收支分类
const categories = {
    income: ['工资', '奖金', '投资收益', '兼职', '红包', '报销', '其他收入'],
    expense: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '人情', '其他支出']
};

// 账户类型配置
const accountTypes = {
    bank: { name: '银行卡', icon: 'fa-university', color: '#667eea', headerClass: '' },
    wechat: { name: '微信钱包', icon: 'fa-comment', color: '#07c160', headerClass: 'wechat' },
    alipay: { name: '支付宝', icon: 'fa-alipay', color: '#1677ff', headerClass: 'alipay' }
};

// 资产子类型配置
const assetSubTypes = {
    current: { name: '活期存款', tag: '活期', tagClass: 'tag-current' },
    fixed: { name: '定期存款', tag: '定期', tagClass: 'tag-fixed' },
    fund: { name: '基金', tag: '基金', tagClass: 'tag-fund' },
    money_market: { name: '货币基金', tag: '货基', tagClass: 'tag-money-market' },
    yuebao: { name: '余额宝', tag: '余额宝', tagClass: 'tag-money-market' },
    lingqianbao: { name: '零钱宝', tag: '零钱宝', tagClass: 'tag-money-market' },
    wealth_mgmt: { name: '理财产品', tag: '理财', tagClass: 'tag-money-market' },
    stock: { name: '股票', tag: '股票', tagClass: 'tag-stock' },
    bond: { name: '债券', tag: '债券', tagClass: 'tag-bond' },
    insurance: { name: '保险', tag: '保险', tagClass: 'tag-insurance' },
    gold: { name: '黄金', tag: '黄金', tagClass: 'tag-gold' },
    other: { name: '其他', tag: '其他', tagClass: '' }
};

// 工具函数：生成唯一ID
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 工具函数：安全数字转换
function safeNumber(value) {
    return parseFloat(value) || 0;
}

// 工具函数：格式化货币
function formatCurrency(amount) {
    return '¥' + safeNumber(amount).toFixed(2);
}

// 工具函数：获取当前月份范围
function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
}

// ==================== 页面切换 ====================
function switchTab(tab, event) {
    currentTab = tab;
    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 如果有event对象，使用event.target
    // 否则根据tab名找到对应的按钮
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // 找到对应的tab按钮并高亮
        const tabButtons = document.querySelectorAll('.nav-tab');
        for (let btn of tabButtons) {
            if (btn.textContent.includes(
                tab === 'transaction' ? '交易' : 
                tab === 'flow' ? '流水' : 
                tab === 'asset' ? '资产' : '基金'
            )) {
                btn.classList.add('active');
                break;
            }
        }
    }
    
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(tab + 'Page').classList.add('active');
    
    if (tab === 'transaction') {
        if (typeof renderTransactionPage === 'function') {
            renderTransactionPage();
        }
    } else if (tab === 'asset') {
        loadAssets();
        loadGoldAssets();
        loadDebts();
        loadFromLocalStorage(); // 加载基金数据
        renderAssetPage();
    } else if (tab === 'fund') {
        loadFromLocalStorage();
        originalFunds = [...funds];
        renderTable();
        updateStats();
    }
}

// 切换资产视图
function switchAssetView(view) {
    currentAssetView = view;
    
    // 更新按钮状态
    document.getElementById('viewByTypeBtn').classList.toggle('active', view === 'type');
    document.getElementById('viewByAccountBtn').classList.toggle('active', view === 'account');
    
    // 显示/隐藏对应视图
    document.getElementById('assetViewByType').style.display = view === 'type' ? 'block' : 'none';
    document.getElementById('assetViewByAccount').style.display = view === 'account' ? 'block' : 'none';
    
    // 重新渲染
    if (view === 'account') {
        renderAccountView();
    } else if (view === 'type') {
        renderAssetCards();
    }
}

// 处理资产账户选择变化
function updateAssetAccountType() {
    const select = document.getElementById('assetAccount');
    const value = select.value;
    const newAccountGroup = document.getElementById('newAccountNameGroup');
    
    if (value === 'new_bank' || value === 'new_wechat' || value === 'new_alipay') {
        newAccountGroup.style.display = 'block';
        document.getElementById('newAccountName').required = true;
    } else {
        newAccountGroup.style.display = 'none';
        document.getElementById('newAccountName').required = false;
    }
}

// ==================== 初始化 ====================
function init() {
    // 初始化数据管理模块
    if (typeof DataManager !== 'undefined' && DataManager.initData) {
        DataManager.initData();
    }
    
    // 初始化页面
    switchTab('transaction');
    
    // 初始化资产账户选择
    updateAssetAccountSelect();
    
    // 初始化支付账户选择
    updatePaymentSourceSelect('goldPaymentSource');
    updatePaymentSourceSelect('fundPaymentSource');
    updatePaymentSourceSelect('importPaymentSource');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    init();
    
    // 加载交易数据
    if (typeof DataManager !== 'undefined' && DataManager.getAllTransactions) {
        transactions = DataManager.getAllTransactions();
    }
    
    // 初始化交易页面
    if (typeof initTransactionPage === 'function') {
        initTransactionPage();
    }
});

// ==================== 弹窗点击外部关闭 ====================
window.addEventListener('click', function(e) {
    // 创建账户弹窗
    const accountModal = document.getElementById('accountModal');
    if (accountModal && accountModal.classList.contains('active')) {
        const accountModalContent = accountModal.querySelector('.modal-content');
        if (!accountModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openAccountModal"]')) {
            closeAccountModal();
        }
    }

    // 资产弹窗
    const assetModal = document.getElementById('assetModal');
    if (assetModal && assetModal.classList.contains('active')) {
        const assetModalContent = assetModal.querySelector('.modal-content');
        if (!assetModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openAssetModal"]') &&
            !e.target.closest('[onclick*="editAsset"]')) {
            closeAssetModal();
        }
    }
    
    // 黄金弹窗
    const goldModal = document.getElementById('goldModal');
    if (goldModal && goldModal.classList.contains('active')) {
        const goldModalContent = goldModal.querySelector('.modal-content');
        if (!goldModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openGoldModal"]') &&
            !e.target.closest('[onclick*="editGold"]') &&
            !e.target.closest('#goldAccount')) {
            closeGoldModal();
        }
    }
    
    // 负债弹窗
    const debtModal = document.getElementById('debtModal');
    if (debtModal && debtModal.classList.contains('active')) {
        const debtModalContent = debtModal.querySelector('.modal-content');
        if (!debtModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openDebtModal"]') &&
            !e.target.closest('[onclick*="editDebt"]')) {
            closeDebtModal();
        }
    }
    
    // 流水弹窗
    const flowModal = document.getElementById('flowModal');
    if (flowModal && flowModal.classList.contains('active')) {
        const flowModalContent = flowModal.querySelector('.modal-content');
        if (!flowModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openFlowModal"]') &&
            !e.target.closest('[onclick*="editFlow"]')) {
            closeFlowModal();
        }
    }
    
    // 基金弹窗
    const fundModal = document.getElementById('fundModal');
    if (fundModal && fundModal.classList.contains('active')) {
        const fundModalContent = fundModal.querySelector('.modal-content');
        if (!fundModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openModal"]') &&
            !e.target.closest('[onclick*="editFund"]')) {
            closeModal();
        }
    }
    
    // 导入弹窗
    const importModal = document.getElementById('importModal');
    if (importModal && importModal.classList.contains('active')) {
        const importModalContent = importModal.querySelector('.modal-content');
        if (!importModalContent.contains(e.target) && !e.target.closest('[onclick*="openImportModal"]')) {
            closeImportModal();
        }
    }
    
    // 收入弹窗
    const incomeModal = document.getElementById('incomeModal');
    if (incomeModal && incomeModal.style.display === 'flex') {
        const incomeModalContent = incomeModal.querySelector('.modal-content');
        if (!incomeModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openIncomeModal"]')) {
            closeIncomeModal();
        }
    }
    
    // 支出弹窗
    const expenseModal = document.getElementById('expenseModal');
    if (expenseModal && expenseModal.style.display === 'flex') {
        const expenseModalContent = expenseModal.querySelector('.modal-content');
        if (!expenseModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openExpenseModal"]')) {
            closeExpenseModal();
        }
    }
    
    // 编辑交易弹窗
    const editTransactionModal = document.getElementById('editTransactionModal');
    if (editTransactionModal && editTransactionModal.style.display === 'flex') {
        const editTransactionModalContent = editTransactionModal.querySelector('.modal-content');
        if (!editTransactionModalContent.contains(e.target) && 
            !e.target.closest('[onclick*="openEditTransactionModal"]')) {
            closeEditTransactionModal();
        }
    }
});