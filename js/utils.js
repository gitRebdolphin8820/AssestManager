// ==================== 工具函数：安全数值转换 ====================
function safeNumber(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
        return defaultValue;
    }
    return parseFloat(value) || defaultValue;
}

// ==================== 工具函数：获取可扣款账户 ====================
function getPaymentSources(accountId = null) {
    // 返回银行存款类资产作为可选支付账户
    // 包括父账户和子资产（只要有余额的都可以扣款）
    // 如果指定了accountId，只返回该账户下的资产
    return assets.filter(a => {
        const isBank = a.accountType === 'bank' || a.type === 'bank' || (!a.accountType && !a.type);
        const hasValue = safeNumber(a.value) > 0;
        const matchAccount = !accountId || a.accountId === accountId || a.id === accountId;
        return isBank && hasValue && matchAccount;
    });
}

function updatePaymentSourceSelect(selectId, excludeIds = [], accountId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const sources = getPaymentSources(accountId);
    const currentValue = select.value;
    
    // 保存当前选项（如果是编辑模式）
    let editOption = '';
    if (selectId === 'goldPaymentSource' && document.getElementById('goldEditId').value) {
        editOption = '<option value="keep">-- 保持原账户不变 --</option>';
    } else if (selectId === 'fundPaymentSource' && document.getElementById('editIndex').value !== '-1') {
        editOption = '<option value="keep">-- 保持原账户不变 --</option>';
    }
    
    let html = '<option value="">-- 选择支付账户 --</option>' + editOption;
    
    if (sources.length === 0) {
        html += '<option value="" disabled>暂无可用账户，请先添加银行存款</option>';
    } else {
        sources.forEach(source => {
            html += `<option value="${source.id}">${source.accountName || source.name} (余额: ¥${safeNumber(source.value).toFixed(2)})</option>`;
        });
    }
    
    select.innerHTML = html;
    select.value = currentValue || '';
}

// 更新资产模态框中的账户列表
function updateAssetAccountSelect() {
    const select = document.getElementById('assetAccount');
    const existingGroup = document.getElementById('existingAccountsGroup');
    
    // 获取所有已存在的账户
    const accounts = getAllAccounts();
    
    let html = '';
    accounts.forEach(acc => {
        const typeConfig = accountTypes[acc.accountType] || accountTypes.bank;
        html += `<option value="${acc.id}">${acc.name} [${typeConfig.name}]</option>`;
    });
    
    existingGroup.innerHTML = html;
}

// 获取所有账户（按账户ID分组）
function getAllAccounts() {
    const accountMap = new Map();
    
    assets.forEach(asset => {
        const accountId = asset.accountId || asset.id;
        if (!accountMap.has(accountId)) {
            accountMap.set(accountId, {
                id: accountId,
                name: asset.accountName || asset.name,
                accountType: asset.accountType || 'bank'
            });
        }
    });
    
    return Array.from(accountMap.values());
}

// 获取指定账户的信息
function getAccountById(accountId) {
    const accounts = getAllAccounts();
    return accounts.find(acc => String(acc.id) === String(accountId));
}

// 显示提示信息
let toastTimeout = null;
let isToastVisible = false;
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    
    // 清除之前的定时器
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#f56565' : '#2d3748';
    
    // 如果toast已经可见，直接更新内容，不重新触发动画
    if (!isToastVisible) {
        toast.classList.add('show');
        isToastVisible = true;
    }
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        isToastVisible = false;
        toastTimeout = null;
    }, duration);
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 格式化日期
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

// 格式化金额
function formatCurrency(amount) {
    return '¥' + safeNumber(amount).toFixed(2);
}

// 计算百分比
function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return (part / total) * 100;
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 深拷贝
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 验证邮箱
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 验证手机号
function validatePhone(phone) {
    const re = /^1[3-9]\d{9}$/;
    return re.test(phone);
}

// 验证身份证号
function validateIdCard(idCard) {
    const re = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
    return re.test(idCard);
}

// 计算两个日期之间的天数
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

// 获取当前月份的第一天和最后一天
function getCurrentMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

// 获取当前年份的第一天和最后一天
function getCurrentYearRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

// 生成随机颜色
function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 生成渐变色
function generateGradient(startColor, endColor) {
    return `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;
}

// 检测是否为移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 检测是否为IE浏览器
function isIE() {
    return navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > -1;
}

// 检测是否支持localStorage
function isLocalStorageSupported() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// 安全地获取localStorage数据
function getLocalStorage(key, defaultValue = null) {
    if (!isLocalStorageSupported()) return defaultValue;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

// 安全地设置localStorage数据
function setLocalStorage(key, value) {
    if (!isLocalStorageSupported()) return false;
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

// 安全地删除localStorage数据
function removeLocalStorage(key) {
    if (!isLocalStorageSupported()) return false;
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}

// 清空localStorage
function clearLocalStorage() {
    if (!isLocalStorageSupported()) return false;
    try {
        localStorage.clear();
        return true;
    } catch (e) {
        return false;
    }
}