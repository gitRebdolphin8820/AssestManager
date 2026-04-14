<template>
  <div id="transactionPage" class="page-content active">
    <h1 class="page-title">交易管理</h1>
    <p class="page-subtitle">管理所有资金交易，掌握资金流向</p>
    
    <div class="transaction-summary">
      <div class="transaction-card income">
        <div class="stat-label">本月收入</div>
        <div class="stat-amount">{{ formatCurrency(monthlyIncome) }}</div>
      </div>
      <div class="transaction-card expense">
        <div class="stat-label">本月支出</div>
        <div class="stat-amount">{{ formatCurrency(monthlyExpense) }}</div>
      </div>
      <div class="transaction-card balance">
        <div class="stat-label">本月结余</div>
        <div class="stat-amount">{{ formatCurrency(monthlyNet) }}</div>
      </div>
      <div class="transaction-card income">
        <div class="stat-label">本年收入</div>
        <div class="stat-amount">{{ formatCurrency(yearlyIncome) }}</div>
      </div>
      <div class="transaction-card expense">
        <div class="stat-label">本年支出</div>
        <div class="stat-amount">{{ formatCurrency(yearlyExpense) }}</div>
      </div>
      <div class="transaction-card balance">
        <div class="stat-label">本年结余</div>
        <div class="stat-amount">{{ formatCurrency(yearlyNet) }}</div>
      </div>
    </div>
    
    <div class="transaction-controls">
      <button class="btn btn-success" @click="openIncomeModal">
        <i class="fas fa-arrow-down"></i> 添加收入
      </button>
      <button class="btn btn-danger" @click="openExpenseModal">
        <i class="fas fa-arrow-up"></i> 添加支出
      </button>
      <div class="view-toggle">
        <button 
          class="view-toggle-btn" 
          :class="{ active: transactionView === 'card' }"
          @click="switchTransactionView('card')"
        >
          <i class="fas fa-th-large"></i> 卡片视图
        </button>
        <button 
          class="view-toggle-btn" 
          :class="{ active: transactionView === 'table' }"
          @click="switchTransactionView('table')"
        >
          <i class="fas fa-table"></i> 表格视图
        </button>
      </div>
    </div>
    
    <!-- 表格视图筛选器 -->
    <div id="tableFilter" class="filter-container" v-if="transactionView === 'table'">
      <div class="date-filter">
        <label class="filter-label">开始日期：</label>
        <input type="date" v-model="filterStartDate">
        <label class="filter-label">结束日期：</label>
        <input type="date" v-model="filterEndDate">
        <button class="btn btn-secondary" @click="filterTransactions">
          <i class="fas fa-filter"></i> 筛选
        </button>
        <button class="btn btn-secondary" @click="resetTransactionFilter">
          <i class="fas fa-sync-alt"></i> 重置
        </button>
      </div>
    </div>
    
    <!-- 卡片视图 -->
    <div id="transactionCardView" class="transaction-list" v-if="transactionView === 'card'">
      <div 
        v-for="transaction in filteredTransactions" 
        :key="transaction.id"
        class="transaction-card"
        :class="transaction.type === 'income' ? 'income' : 'expense'"
      >
        <div class="transaction-header">
          <div class="transaction-type">{{ transaction.type === 'income' ? '收入' : '支出' }}</div>
          <div class="transaction-date">{{ formatDate(transaction.datetime) }}</div>
        </div>
        <div class="transaction-amount">{{ formatCurrency(transaction.amount) }}</div>
        <div class="transaction-category">{{ transaction.category }}</div>
        <div class="transaction-description">{{ transaction.description || '无' }}</div>
        <div class="transaction-actions">
          <button class="btn btn-sm btn-primary" @click="editTransaction(transaction)">
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteTransaction(transaction.id)">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
      </div>
      <div v-if="filteredTransactions.length === 0" class="empty-state">
        <div class="empty-icon"><i class="fas fa-exchange-alt"></i></div>
        <div>暂无交易记录</div>
      </div>
    </div>
    
    <!-- 表格视图 -->
    <div id="transactionTableView" v-if="transactionView === 'table'" style="overflow-x: auto;">
      <table id="transactionTable">
        <thead>
          <tr>
            <th @click="sortTransactions('datetime')">
              日期时间
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'datetime' && sortState.direction === 'asc' }">▲</span>
                <span class="down" :class="{ active: sortState.column === 'datetime' && sortState.direction === 'desc' }">▼</span>
              </span>
            </th>
            <th @click="sortTransactions('type')">
              类型
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'type' && sortState.direction === 'asc' }">▲</span>
                <span class="down" :class="{ active: sortState.column === 'type' && sortState.direction === 'desc' }">▼</span>
              </span>
            </th>
            <th @click="sortTransactions('category')">
              分类
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'category' && sortState.direction === 'asc' }">▲</span>
                <span class="down" :class="{ active: sortState.column === 'category' && sortState.direction === 'desc' }">▼</span>
              </span>
            </th>
            <th @click="sortTransactions('amount')">
              金额
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'amount' && sortState.direction === 'asc' }">▲</span>
                <span class="down" :class="{ active: sortState.column === 'amount' && sortState.direction === 'desc' }">▼</span>
              </span>
            </th>
            <th @click="sortTransactions('description')">
              描述
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'description' && sortState.direction === 'asc' }">▲</span>
                <span class="down" :class="{ active: sortState.column === 'description' && sortState.direction === 'desc' }">▼</span>
              </span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="transaction in filteredTransactions" :key="transaction.id">
            <td>{{ formatDate(transaction.datetime) }}</td>
            <td>{{ transaction.type === 'income' ? '收入' : '支出' }}</td>
            <td>{{ transaction.category }}</td>
            <td :class="transaction.type === 'income' ? 'income' : 'expense'">
              {{ formatCurrency(transaction.amount) }}
            </td>
            <td>{{ transaction.description || '无' }}</td>
            <td>
              <button class="btn btn-sm btn-primary" @click="editTransaction(transaction)">
                <i class="fas fa-edit"></i> 编辑
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteTransaction(transaction.id)">
                <i class="fas fa-trash"></i> 删除
              </button>
            </td>
          </tr>
          <tr v-if="filteredTransactions.length === 0">
            <td colspan="6" class="empty-state">
              <div class="empty-icon"><i class="fas fa-exchange-alt"></i></div>
              <div>暂无交易记录</div>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- 分页控件 -->
      <div id="transactionPagination" class="transaction-pagination" v-if="filteredTransactions.length > 0">
        <!-- 分页逻辑待实现 -->
      </div>
    </div>

    <!-- 收入弹窗 -->
    <div class="modal" :class="{ active: showIncomeModal }" @click.self="closeIncomeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">添加收入</h3>
          <p style="color: #718096; font-size: 13px;">记录您的收入情况</p>
        </div>
        <form @submit.prevent="saveIncome">
          <div class="form-row">
            <div class="form-group">
              <label>日期 *</label>
              <input type="date" v-model="formData.date" required>
            </div>
            <div class="form-group">
              <label>分类 *</label>
              <select v-model="formData.category" required>
                <option v-for="category in incomeCategories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>金额 *</label>
              <input type="number" v-model.number="formData.amount" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label>账户 *</label>
              <select v-model="formData.accountId" required>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="formData.description" placeholder="可选填，如：工资收入、奖金等"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeIncomeModal">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 支出弹窗 -->
    <div class="modal" :class="{ active: showExpenseModal }" @click.self="closeExpenseModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">添加支出</h3>
          <p style="color: #718096; font-size: 13px;">记录您的支出情况</p>
        </div>
        <form @submit.prevent="saveExpense">
          <div class="form-row">
            <div class="form-group">
              <label>日期 *</label>
              <input type="date" v-model="formData.date" required>
            </div>
            <div class="form-group">
              <label>分类 *</label>
              <select v-model="formData.category" required>
                <option v-for="category in expenseCategories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>金额 *</label>
              <input type="number" v-model.number="formData.amount" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
              <label>账户 *</label>
              <select v-model="formData.accountId" required>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="formData.description" placeholder="可选填，如：餐饮消费、交通费用等"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeExpenseModal">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  getAllTransactions,
  saveTransaction,
  deleteTransaction as deleteTransactionFromService,
  getAllAssets,
  getAllAccounts,
  executeTransaction,
  generateId
} from '../services/dataService';

// 状态管理
const transactions = ref([]);
const accounts = ref([]);
const assets = ref([]);
const transactionView = ref('card');
const sortState = ref({ column: '', direction: 'asc' });
const filterStartDate = ref('');
const filterEndDate = ref('');

// 弹窗状态
const showIncomeModal = ref(false);
const showExpenseModal = ref(false);
const formData = ref({
  date: new Date().toISOString().split('T')[0],
  category: '',
  amount: 0,
  accountId: '',
  description: ''
});

// 收支分类
const incomeCategories = [
  '工资', '奖金', '投资收益', '兼职', '红包', '报销', '其他收入'
];

const expenseCategories = [
  '餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '人情', '其他支出'
];

// 计算属性
const filteredTransactions = computed(() => {
  let result = [...transactions.value];
  
  // 应用日期筛选
  if (filterStartDate.value) {
    result = result.filter(t => t.datetime >= filterStartDate.value);
  }
  if (filterEndDate.value) {
    result = result.filter(t => t.datetime <= filterEndDate.value);
  }
  
  // 应用排序
  if (sortState.value.column) {
    result.sort((a, b) => {
      let aVal = a[sortState.value.column];
      let bVal = b[sortState.value.column];
      
      // 处理金额排序
      if (sortState.value.column === 'amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (aVal < bVal) return sortState.value.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortState.value.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  return result;
});

// 统计数据
const monthlyIncome = computed(() => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions.value
    .filter(t => t.type === 'income' && new Date(t.datetime) >= startOfMonth)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
});

const monthlyExpense = computed(() => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions.value
    .filter(t => t.type === 'expense' && new Date(t.datetime) >= startOfMonth)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
});

const monthlyNet = computed(() => monthlyIncome.value - monthlyExpense.value);

const yearlyIncome = computed(() => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return transactions.value
    .filter(t => t.type === 'income' && new Date(t.datetime) >= startOfYear)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
});

const yearlyExpense = computed(() => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return transactions.value
    .filter(t => t.type === 'expense' && new Date(t.datetime) >= startOfYear)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
});

const yearlyNet = computed(() => yearlyIncome.value - yearlyExpense.value);

// 方法
async function loadData() {
  try {
    transactions.value = await getAllTransactions();
    accounts.value = await getAllAccounts();
    assets.value = await getAllAssets();
  } catch (error) {
    console.error('加载交易数据失败:', error);
    // 确保数据为数组，避免后续操作出错
    transactions.value = [];
    accounts.value = [];
    assets.value = [];
  }
}

function switchTransactionView(view) {
  transactionView.value = view;
}

function sortTransactions(column) {
  if (sortState.value.column === column) {
    sortState.value.direction = sortState.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.value.column = column;
    sortState.value.direction = 'asc';
  }
}

function filterTransactions() {
  // 筛选逻辑已在computed中处理
}

function resetTransactionFilter() {
  filterStartDate.value = '';
  filterEndDate.value = '';
}

function openIncomeModal() {
  formData.value = {
    date: new Date().toISOString().split('T')[0],
    category: incomeCategories[0],
    amount: 0,
    accountId: accounts.value[0]?.id || '',
    description: ''
  };
  showIncomeModal.value = true;
}

function closeIncomeModal() {
  showIncomeModal.value = false;
}

function openExpenseModal() {
  formData.value = {
    date: new Date().toISOString().split('T')[0],
    category: expenseCategories[0],
    amount: 0,
    accountId: accounts.value[0]?.id || '',
    description: ''
  };
  showExpenseModal.value = true;
}

function closeExpenseModal() {
  showExpenseModal.value = false;
}

function saveIncome() {
  const transaction = {
    id: generateId(),
    type: 'income',
    category: formData.value.category,
    amount: formData.value.amount,
    datetime: formData.value.date,
    description: formData.value.description,
    toAssetId: formData.value.accountId,
    createdAt: new Date().toISOString()
  };
  
  executeTransaction(transaction);
  loadData();
  closeIncomeModal();
}

function saveExpense() {
  const transaction = {
    id: generateId(),
    type: 'expense',
    category: formData.value.category,
    amount: formData.value.amount,
    datetime: formData.value.date,
    description: formData.value.description,
    fromAssetId: formData.value.accountId,
    createdAt: new Date().toISOString()
  };
  
  executeTransaction(transaction);
  loadData();
  closeExpenseModal();
}

function editTransaction(transaction) {
  // 编辑功能待实现
  console.log('编辑交易:', transaction);
}

function deleteTransaction(transactionId) {
  if (confirm('确定要删除这条交易记录吗？')) {
    deleteTransactionFromService(transactionId);
    loadData();
  }
}

// 工具函数
function formatCurrency(amount) {
  return '¥' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 生命周期
onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 组件样式已在全局style.css中定义 */
</style>