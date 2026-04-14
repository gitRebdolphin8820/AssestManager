// API基础URL - 使用相对路径，让Vite代理处理
const API_BASE_URL = '/api';

// 通用API请求函数
async function fetchApi(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
    // 失败时返回默认值
    // 对于获取数据的请求，返回空数组
    const method = options.method || 'GET';
    // 确保GET请求返回空数组
    if (method === 'GET' || endpoint.includes('get') || !options.method) {
      return [];
    }
    return null;
  }
}

// 初始化数据（现在主要是确保后端表结构存在）
export function initData() {
  // 前端初始化不再需要创建本地存储，后端会处理表结构
  console.log('前端数据初始化完成');
}

// 账户管理
export async function getAllAccounts() {
  return await fetchApi('/accounts');
}

export async function saveAccount(account) {
  // 检查是否是新账户（通过检查id是否以'id_'开头）
  if (account.id && !account.id.startsWith('id_')) {
    // 更新现有账户
    return await fetchApi(`/accounts/${account.id}`, {
      method: 'PUT',
      body: JSON.stringify(account)
    });
  } else {
    // 创建新账户
    return await fetchApi('/accounts', {
      method: 'POST',
      body: JSON.stringify(account)
    });
  }
}

export async function deleteAccount(accountId) {
  return await fetchApi(`/accounts/${accountId}`, {
    method: 'DELETE'
  });
}

// 资产管理
export async function getAllAssets() {
  return await fetchApi('/assets');
}

export async function saveAsset(asset, isUpdate = false) {
  console.log('saveAsset called with id:', asset.id, 'isUpdate:', isUpdate);
  // 如果是更新模式，使用 PUT
  if (isUpdate && asset.id) {
    console.log('使用 PUT 更新资产:', asset.id);
    return await fetchApi(`/assets/${asset.id}`, {
      method: 'PUT',
      body: JSON.stringify(asset)
    });
  } else {
    // 创建新资产
    console.log('使用 POST 创建新资产');
    return await fetchApi('/assets', {
      method: 'POST',
      body: JSON.stringify(asset)
    });
  }
}

export async function deleteAsset(assetId) {
  return await fetchApi(`/assets/${assetId}`, {
    method: 'DELETE'
  });
}

// 黄金资产管理
export async function getAllGoldAssets() {
  return await fetchApi('/gold-assets');
}

export async function saveGoldAsset(goldAsset, isUpdate = false) {
  console.log('saveGoldAsset called with id:', goldAsset.id, 'isUpdate:', isUpdate);
  // 如果是更新模式，使用 PUT
  if (isUpdate && goldAsset.id) {
    console.log('使用 PUT 更新黄金资产:', goldAsset.id);
    return await fetchApi(`/gold-assets/${goldAsset.id}`, {
      method: 'PUT',
      body: JSON.stringify(goldAsset)
    });
  } else {
    // 创建新黄金资产
    console.log('使用 POST 创建新黄金资产');
    return await fetchApi('/gold-assets', {
      method: 'POST',
      body: JSON.stringify(goldAsset)
    });
  }
}

export async function deleteGoldAsset(goldId) {
  return await fetchApi(`/gold-assets/${goldId}`, {
    method: 'DELETE'
  });
}

// 交易管理
export async function getAllTransactions() {
  return await fetchApi('/transactions');
}

export async function saveTransaction(transaction) {
  return await fetchApi('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction)
  });
}

export async function deleteTransaction(transactionId) {
  return await fetchApi(`/transactions/${transactionId}`, {
    method: 'DELETE'
  });
}

// 负债管理
export async function getAllDebts() {
  return await fetchApi('/debts');
}

export async function saveDebt(debt) {
  // 检查是否是新负债（通过检查id是否以'id_'开头）
  if (debt.id && !debt.id.startsWith('id_')) {
    // 更新现有负债
    return await fetchApi(`/debts/${debt.id}`, {
      method: 'PUT',
      body: JSON.stringify(debt)
    });
  } else {
    // 创建新负债
    return await fetchApi('/debts', {
      method: 'POST',
      body: JSON.stringify(debt)
    });
  }
}

export async function deleteDebt(debtId) {
  return await fetchApi(`/debts/${debtId}`, {
    method: 'DELETE'
  });
}

// 基金管理
export async function getAllFunds() {
  return await fetchApi('/funds');
}

export async function saveFund(fund, isUpdate = false) {
  console.log('saveFund called with id:', fund.id, 'isUpdate:', isUpdate);
  // 如果是更新模式，使用 PUT
  if (isUpdate && fund.id) {
    console.log('使用 PUT 更新基金:', fund.id);
    return await fetchApi(`/funds/${fund.id}`, {
      method: 'PUT',
      body: JSON.stringify(fund)
    });
  } else {
    // 创建新基金
    console.log('使用 POST 创建新基金');
    return await fetchApi('/funds', {
      method: 'POST',
      body: JSON.stringify(fund)
    });
  }
}

export async function deleteFund(fundId) {
  return await fetchApi(`/funds/${fundId}`, {
    method: 'DELETE'
  });
}

// 设置管理
export async function getSettings() {
  return await fetchApi('/settings');
}

export async function saveSettings(settings) {
  return await fetchApi('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

// 基金净值更新
export async function updateFundNav(code) {
  return await fetchApi(`/fund/nav?code=${code}`);
}

// 执行交易
export async function executeTransaction(transaction) {
  return await fetchApi('/transactions/execute', {
    method: 'POST',
    body: JSON.stringify(transaction)
  });
}

// 工具函数：生成唯一ID
export function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 导出存储键值常量（保持向后兼容）
export const STORAGE_KEYS = {
  ACCOUNTS: 'accounts',
  ASSETS: 'assets',
  GOLD_ASSETS: 'goldAssets',
  TRANSACTIONS: 'transactions',
  DEBTS: 'debts',
  FUNDS: 'funds',
  SETTINGS: 'settings'
};
