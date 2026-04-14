<template>
  <div class="fund-page">
    <h1 class="page-title"><i class="fas fa-chart-bar"></i> 基金管理系统</h1>
    <p class="page-subtitle">智能管理您的基金投资组合</p>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="file-input-wrapper">
        <button class="btn btn-secondary" @click="triggerFileInput">
          <i class="fas fa-file-import"></i> 导入Excel
        </button>
        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".xlsx,.xls" 
          @change="handleFileSelect"
          style="display: none;"
        >
      </div>
      
      <button class="btn btn-success" @click="openModal">
        <i class="fas fa-plus"></i> 新增基金
      </button>
      
      <button class="btn btn-primary" @click="updateAllNetValues">
        <i class="fas fa-sync-alt"></i> 更新净值
      </button>
      
      <button class="btn btn-secondary" @click="exportExcel">
        <i class="fas fa-file-export"></i> 导出Excel
      </button>
      
      <button class="btn btn-info" @click="openGroupModal">
        <i class="fas fa-folder"></i> 管理分组
      </button>
      
      <span class="sync-status">
        <span class="sync-dot"></span>
        自动同步准备就绪
      </span>
    </div>
    
    <!-- 视图切换 -->
    <div class="view-toggle">
      <span class="view-label">视图模式：</span>
      <button 
        class="view-btn" 
        :class="{ active: viewMode === 'table' }"
        @click="viewMode = 'table'"
      >
        <i class="fas fa-table"></i> 表格视图
      </button>
      <button 
        class="view-btn" 
        :class="{ active: viewMode === 'group' }"
        @click="viewMode = 'group'"
      >
        <i class="fas fa-folder-open"></i> 分组视图
      </button>
    </div>
    
    <!-- 筛选器 -->
    <div class="filter-container">
      <span class="filter-label">定投筛选：</span>
      <select id="fixedFilter" class="filter-select" @change="applyFilters">
        <option value="all">全部</option>
        <option value="fixed">定投</option>
        <option value="non-fixed">非定投</option>
      </select>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-cards" id="statsCards">
      <div class="stat-card">
        <div class="stat-label">总成本</div>
        <div class="stat-value" id="totalCost">¥{{ formatCurrency(totalCost) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">当前市值</div>
        <div class="stat-value" id="totalValue">¥{{ formatCurrency(totalValue) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">累计收益</div>
        <div class="stat-value" id="totalReturn" :class="{ 'return-positive': totalReturn > 0, 'return-negative': totalReturn < 0 }">
          ¥{{ totalReturn >= 0 ? '+' : '' }}{{ formatCurrency(totalReturn) }}
        </div>
        <div class="stat-change" id="returnRate" :class="{ 'return-positive': returnRate > 0, 'return-negative': returnRate < 0 }">
          {{ returnRate >= 0 ? '+' : '' }}{{ returnRate.toFixed(2) }}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">持有基金数</div>
        <div class="stat-value" id="fundCount">{{ funds.length }}</div>
      </div>
    </div>
    
    <!-- 基金表格 -->
    <div v-if="viewMode === 'table'" style="overflow-x: auto;">
      <table id="fundTable">
        <thead>
          <tr>
            <th>名称</th>
            <th>定投</th>
            <th>基金类型</th>
            <th @click="sortTable('costNav')">
              成本净值
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'costNav' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'costNav' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('shares')">
              持有份额
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'shares' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'shares' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('costAmount')">
              成本金额
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'costAmount' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'costAmount' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('currentNav')">
              当前净值
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'currentNav' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'currentNav' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('sellNav')">
              卖出净值
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'sellNav' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'sellNav' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('sellShares')">
              卖出份额
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'sellShares' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'sellShares' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('returnAmount')">
              收益
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'returnAmount' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'returnAmount' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th @click="sortTable('returnRate')">
              收益率
              <span class="sort-indicator">
                <span class="up" :class="{ active: sortState.column === 'returnRate' && sortState.direction === 'asc' }">&#9650;</span>
                <span class="down" :class="{ active: sortState.column === 'returnRate' && sortState.direction === 'desc' }">&#9660;</span>
              </span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
      <tbody id="fundTableBody">
        <tr v-if="displayFunds.length === 0">
          <td colspan="13" class="empty-state">
            <div class="empty-icon"><i class="fas fa-chart-bar"></i></div>
            <div>暂无基金数据，请导入Excel或手动添加</div>
          </td>
        </tr>
        <tr v-for="fund in displayFunds" :key="fund.id">
          <td>
            <div class="fund-name">{{ fund.name }}</div>
            <div class="fund-code">{{ fund.code }}</div>
          </td>
          <td>
            <span :class="['badge', fund.isFixed ? 'badge-fixed' : 'badge-regular']">
              {{ fund.isFixed ? '定投' : '普通' }}
            </span>
          </td>
          <td>{{ fund.type || '混合型' }}</td>
          <td>{{ safeNumber(fund.costNav).toFixed(4) }}</td>
          <td>{{ safeNumber(fund.shares).toFixed(2) }}</td>
          <td>¥{{ safeNumber(fund.costAmount).toFixed(2) }}</td>
          <td>{{ safeNumber(fund.currentNav).toFixed(4) }}</td>
          <td>{{ safeNumber(fund.sellNav).toFixed(4) }}</td>
          <td>{{ safeNumber(fund.sellShares).toFixed(2) }}</td>
          <td :class="calculateReturn(fund) >= 0 ? 'return-positive' : 'return-negative'">
            {{ calculateReturn(fund) >= 0 ? '+' : '' }}¥{{ Math.abs(calculateReturn(fund)).toFixed(2) }}
          </td>
          <td :class="calculateReturnRate(fund) >= 0 ? 'return-positive' : 'return-negative'">
            {{ calculateReturnRate(fund) >= 0 ? '+' : '' }}{{ Math.abs(calculateReturnRate(fund)).toFixed(2) }}%
          </td>
          <td>
            <div class="action-btns">
              <button class="icon-btn edit-btn" @click="editFundById(fund.id)" title="编辑"><i class="fas fa-edit"></i></button>
              <button class="icon-btn delete-btn" @click="deleteFundById(fund.id)" title="删除"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      </tbody>
      </table>
    </div>
    
    <!-- 分页控件 -->
    <div class="pagination-controls" v-if="displayFunds.length > 0 && viewMode === 'table'">
      <div class="pagination-info">
        共 {{ funds.length }} 条记录，当前第 {{ currentPage }} 页，共 {{ pageCount }} 页
      </div>
      <div class="pagination-buttons">
        <button class="pagination-btn" @click="changePage(currentPage - 1)" :disabled="currentPage === 1">上一页</button>
        <button class="pagination-btn" @click="changePage(currentPage + 1)" :disabled="currentPage === pageCount">下一页</button>
        <div class="pagination-size">
          <span>每页显示：</span>
          <select @change="changePageSize($event.target.value)">
            <option value="5" :selected="pageSize === 5">5条</option>
            <option value="10" :selected="pageSize === 10">10条</option>
            <option value="20" :selected="pageSize === 20">20条</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- 分组视图 -->
    <div v-if="viewMode === 'group'" class="group-view">
      <div v-for="group in groupedFunds" :key="group.id" class="fund-group">
        <div class="group-header" @click="toggleGroup(group.id)">
          <div class="group-title">
            <span class="group-color" :style="{ backgroundColor: group.color }"></span>
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">({{ group.funds.length }}只)</span>
          </div>
          <div class="group-stats">
            <span class="group-cost">成本: ¥{{ formatCurrency(group.totalCost) }}</span>
            <span class="group-value">市值: ¥{{ formatCurrency(group.totalValue) }}</span>
            <span :class="['group-return', group.totalReturn >= 0 ? 'return-positive' : 'return-negative']">
              收益: {{ group.totalReturn >= 0 ? '+' : '' }}¥{{ formatCurrency(group.totalReturn) }}
            </span>
            <i class="fas" :class="group.collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          </div>
        </div>
        <div v-show="!group.collapsed" class="group-content">
          <table class="group-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>成本金额</th>
                <th>当前市值</th>
                <th>收益</th>
                <th>收益率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fund in group.funds" :key="fund.id">
                <td>
                  <div class="fund-name">{{ fund.name }}</div>
                  <div class="fund-code">{{ fund.code }}</div>
                </td>
                <td>¥{{ safeNumber(fund.costAmount).toFixed(2) }}</td>
                <td>¥{{ (safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares))).toFixed(2) }}</td>
                <td :class="calculateReturn(fund) >= 0 ? 'return-positive' : 'return-negative'">
                  {{ calculateReturn(fund) >= 0 ? '+' : '' }}¥{{ Math.abs(calculateReturn(fund)).toFixed(2) }}
                </td>
                <td :class="calculateReturnRate(fund) >= 0 ? 'return-positive' : 'return-negative'">
                  {{ calculateReturnRate(fund) >= 0 ? '+' : '' }}{{ Math.abs(calculateReturnRate(fund)).toFixed(2) }}%
                </td>
                <td>
                  <div class="action-btns">
                    <select class="group-select" @change="moveFundToGroup(fund.id, $event.target.value)">
                      <option value="">移动到...</option>
                      <option v-for="g in fundGroups" :key="g.id" :value="g.id" :selected="fund.groupId === g.id">
                        {{ g.name }}
                      </option>
                      <option value="">未分组</option>
                    </select>
                    <button class="icon-btn edit-btn" @click="editFundById(fund.id)" title="编辑"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete-btn" @click="deleteFundById(fund.id)" title="删除"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 基金模态框 -->
    <div class="modal" id="fundModal" :class="{ active: fundModalVisible }" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-chart-line"></i> {{ isEditing ? '编辑基金' : '新增基金' }}</h3>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveFund">
          <input type="hidden" v-model="editIndex">
          
          <!-- 联动扣款信息提示 -->
          <div class="linkage-info" id="fundLinkageInfo" v-if="!isEditing">
            <div class="linkage-info-icon"><i class="fas fa-lightbulb"></i></div>
            <div class="linkage-info-text">
              系统将自动从选中的支付账户扣除购买基金的费用，无需手动修改银行卡余额
            </div>
          </div>
          
          <div class="form-group">
            <label>基金名称 *</label>
            <input type="text" v-model="fundForm.name" required placeholder="例如：易方达蓝筹精选">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>基金代码 *</label>
              <input type="text" v-model="fundForm.code" required placeholder="例如：005827">
            </div>
            <div class="form-group">
              <label>基金类型</label>
              <select v-model="fundForm.type">
                <option value="混合型">混合型</option>
                <option value="股票型">股票型</option>
                <option value="债券型">债券型</option>
                <option value="指数型">指数型</option>
                <option value="QDII">QDII</option>
                <option value="货币型">货币型</option>
                <option value="FOF">FOF</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="isFixed" v-model="fundForm.isFixed">
              <label for="isFixed" style="margin-bottom: 0;">定投基金</label>
            </div>
          </div>
          
          <!-- 支付账户选择（仅新增时显示） -->
          <div class="form-group" id="fundPaymentSourceGroup" v-if="!isEditing">
            <label>扣款账户 *</label>
            <select v-model="fundForm.paymentSource" class="payment-source-select" required @change="updateFundDeductionPreview">
              <option value="">-- 选择支付账户 --</option>
              <option v-for="asset in assets" :key="asset.id" :value="asset.id">
                {{ asset.name }} (¥{{ formatCurrency(asset.value) }})
              </option>
            </select>
            <small style="color: #718096; font-size: 12px;">购买基金的费用将自动从此账户扣除</small>
          </div>
          
          <!-- 扣款预览 -->
          <div class="deduction-preview" id="fundDeductionPreview" v-if="!isEditing && fundForm.paymentSource && safeNumber(fundForm.costAmount) > 0">
            将从 <span id="fundDeductionSource">{{ getAssetName(fundForm.paymentSource) }}</span> 扣除 
            <span class="deduction-amount" id="fundDeductionAmount">¥{{ safeNumber(fundForm.costAmount).toFixed(2) }}</span>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>成本净值</label>
              <input type="number" v-model="fundForm.costNav" step="0.0001" placeholder="0.0000" @input="calculateCost">
            </div>
            <div class="form-group">
              <label>持有份额</label>
              <input type="number" v-model="fundForm.shares" step="0.01" placeholder="0.00" @input="calculateCost">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>当前净值</label>
              <input type="number" v-model="fundForm.currentNav" step="0.0001" placeholder="自动获取">
            </div>
            <div class="form-group">
              <label>卖出净值</label>
              <input type="number" v-model="fundForm.sellNav" step="0.0001" placeholder="0.0000">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>卖出份额</label>
              <input type="number" v-model="fundForm.sellShares" step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
              <label>成本金额</label>
              <input type="number" v-model="fundForm.costAmount" step="0.01" placeholder="自动计算" @input="updateFundDeductionPreview">
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 保存</button>
          </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- 基金导入选择模态框 -->
    <div class="modal" id="importModal" :class="{ active: importModalVisible }" @click.self="closeImportModal">
      <div class="modal-content large">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-file-import"></i> 导入基金数据</h3>
          <span class="close" @click="closeImportModal">&times;</span>
        </div>
        
        <div class="modal-body">
          <div class="import-options">
            <div class="import-option-title">选择导入模式</div>
            <div class="import-option-cards">
              <div class="import-option-card" id="optionAppend" :class="{ selected: selectedImportMode === 'append' }" @click="selectImportMode('append')">
                <div class="icon"><i class="fas fa-plus-circle"></i></div>
                <div class="title">追加导入</div>
                <div class="desc">保留现有基金，将新数据添加到已有持仓中</div>
              </div>
              <div class="import-option-card" id="optionReplace" :class="{ selected: selectedImportMode === 'replace' }" @click="selectImportMode('replace')">
                <div class="icon"><i class="fas fa-sync-alt"></i></div>
                <div class="title">覆盖导入</div>
                <div class="desc">清空现有基金，完全使用新数据替换</div>
              </div>
            </div>
          </div>
          
          <!-- 导入时选择扣款账户 -->
          <div class="form-group" id="importPaymentSourceGroup" style="margin-top: 20px;">
            <label>扣款账户（导入时将从该账户扣除总成本）*</label>
            <select v-model="importPaymentSource" class="payment-source-select" required>
              <option value="">-- 选择支付账户 --</option>
              <option v-for="asset in assets" :key="asset.id" :value="asset.id">
                {{ asset.name }} (¥{{ formatCurrency(asset.value) }})
              </option>
            </select>
            <small style="color: #718096; font-size: 12px;">导入基金的总成本将自动从此账户扣除</small>
          </div>
          
          <div class="import-preview" id="importPreview" v-if="pendingImportData">
            <div class="import-preview-title">数据预览（前5条）</div>
            <table class="import-preview-table" id="previewTable">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>代码</th>
                  <th>类型</th>
                  <th>份额</th>
                  <th>成本金额</th>
                </tr>
              </thead>
              <tbody id="previewTableBody">
                <tr v-for="(item, index) in previewData" :key="index">
                  <td>{{ item['名称'] || '' }}</td>
                  <td>{{ item['基金号'] || item['代码'] || '' }}</td>
                  <td>{{ item['基金类型'] || '' }}</td>
                  <td>{{ item['持有份额'] || item['份额'] || '' }}</td>
                  <td>{{ item['成本金额'] || item['金额'] || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="import-warning" id="importWarning" v-if="selectedImportMode === 'replace'">
            <div class="import-warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="import-warning-text">
              <strong>警告：</strong>您选择了<strong id="warningMode">覆盖</strong>模式，
              这将<strong id="warningAction">删除</strong>现有的 <strong id="existingCount">{{ funds.length }}</strong> 条基金记录，
              并导入 <strong id="newCount">{{ pendingImportData ? pendingImportData.length : 0 }}</strong> 条新记录。此操作不可恢复，请确认！
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeImportModal">取消</button>
          <button type="button" class="btn btn-primary" id="confirmImportBtn" @click="confirmImport" :disabled="!selectedImportMode">
            <i class="fas fa-check"></i> 确认导入
          </button>
        </div>
      </div>
    </div>
    
    <!-- 分组管理模态框 -->
    <div class="modal" id="groupModal" :class="{ active: groupModalVisible }" @click.self="closeGroupModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-folder"></i> 管理分组</h3>
        </div>
        
        <div class="modal-body">
          <!-- 分组列表 -->
          <div class="group-list">
            <div v-for="group in fundGroups" :key="group.id" class="group-item">
              <div class="group-item-info">
                <input type="color" v-model="group.color" class="group-color-picker" @change="updateGroup(group)">
                <span class="group-item-name">{{ group.name }}</span>
              </div>
              <div class="group-item-actions">
                <button class="icon-btn edit-btn" @click="editGroup(group)" title="编辑"><i class="fas fa-edit"></i></button>
                <button class="icon-btn delete-btn" @click="deleteGroupById(group.id)" title="删除"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div v-if="fundGroups.length === 0" class="empty-groups">
              暂无分组，请添加新分组
            </div>
          </div>
          
          <!-- 添加/编辑分组表单 -->
          <div class="group-form">
            <h4>{{ isEditingGroup ? '编辑分组' : '添加分组' }}</h4>
            <div class="form-row">
              <div class="form-group">
                <label>分组名称</label>
                <input type="text" v-model="groupForm.name" placeholder="输入分组名称">
              </div>
              <div class="form-group">
                <label>分组颜色</label>
                <input type="color" v-model="groupForm.color">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-secondary" @click="resetGroupForm">重置</button>
              <button class="btn btn-primary" @click="saveGroup">{{ isEditingGroup ? '保存' : '添加' }}</button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeGroupModal">关闭</button>
        </div>
      </div>
    </div>
    
    <!-- Toast 通知 -->
    <div id="toast" class="toast"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  getAllFunds,
  saveFund as saveFundFromService,
  deleteFund as deleteFundFromService,
  generateId,
  getAllAssets,
  saveAsset as saveAssetFromService,
  getAllFundGroups,
  saveFundGroup,
  deleteFundGroup,
  updateFundGroup
} from '../services/dataService';

// 基金数据
const funds = ref([]);
const originalFunds = ref([]);
const assets = ref([]);
const fundGroups = ref([]);

// 模态框状态
const fundModalVisible = ref(false);
const importModalVisible = ref(false);
const groupModalVisible = ref(false);
const isEditing = ref(false);
const isEditingGroup = ref(false);
const editIndex = ref(-1);

// 分组表单
const groupForm = ref({
  id: '',
  name: '',
  color: '#667eea',
  sortOrder: 0
});

// 视图模式
const viewMode = ref('table'); // 'table' | 'group'

// 表单数据
const fundForm = ref({
  name: '',
  code: '',
  type: '混合型',
  isFixed: false,
  costNav: '',
  shares: '',
  currentNav: '',
  sellNav: '',
  sellShares: '',
  costAmount: '',
  paymentSource: ''
});

// 导入相关
const pendingImportData = ref(null);
const selectedImportMode = ref(null);
const importPaymentSource = ref('');

// 排序和筛选
const sortState = ref({ column: '', direction: 'asc' });
const filterState = ref({ fixed: 'all' });

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// 文件输入
const fileInputRef = ref(null);

// Toast 通知
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

// 计算属性
const totalCost = computed(() => {
  return funds.value.reduce((sum, fund) => sum + safeNumber(fund.costAmount), 0);
});

const totalValue = computed(() => {
  return funds.value.reduce((sum, fund) => {
    const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
    const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
    return sum + currentValue + sellValue;
  }, 0);
});

const totalReturn = computed(() => {
  return totalValue.value - totalCost.value;
});

const returnRate = computed(() => {
  return totalCost.value > 0 ? (totalReturn.value / totalCost.value) * 100 : 0;
});

const pageCount = computed(() => {
  return Math.ceil(funds.value.length / pageSize.value);
});

const displayFunds = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return funds.value.slice(startIndex, endIndex);
});

const previewData = computed(() => {
  if (!pendingImportData.value) return [];
  return pendingImportData.value.slice(0, 5);
});

// 分组折叠状态
const groupCollapseState = ref({});

// 切换分组折叠状态
function toggleGroup(groupId) {
  groupCollapseState.value[groupId] = !groupCollapseState.value[groupId];
}

// 分组视图数据
const groupedFunds = computed(() => {
  const groups = [];
  
  // 先添加有分组的数据
  fundGroups.value.forEach(group => {
    const groupFunds = funds.value.filter(f => f.groupId === group.id);
    const totalCost = groupFunds.reduce((sum, f) => sum + safeNumber(f.costAmount), 0);
    const totalValue = groupFunds.reduce((sum, f) => {
      return sum + safeNumber(f.currentNav) * (safeNumber(f.shares) - safeNumber(f.sellShares));
    }, 0);
    
    groups.push({
      ...group,
      funds: groupFunds,
      totalCost,
      totalValue,
      totalReturn: totalValue - totalCost,
      collapsed: groupCollapseState.value[group.id] || false
    });
  });
  
  // 添加未分组的数据
  const ungroupedFunds = funds.value.filter(f => !f.groupId);
  if (ungroupedFunds.length > 0) {
    const totalCost = ungroupedFunds.reduce((sum, f) => sum + safeNumber(f.costAmount), 0);
    const totalValue = ungroupedFunds.reduce((sum, f) => {
      return sum + safeNumber(f.currentNav) * (safeNumber(f.shares) - safeNumber(f.sellShares));
    }, 0);
    
    groups.push({
      id: 'ungrouped',
      name: '未分组',
      color: '#a0aec0',
      funds: ungroupedFunds,
      totalCost,
      totalValue,
      totalReturn: totalValue - totalCost,
      collapsed: groupCollapseState.value['ungrouped'] || false
    });
  }
  
  return groups;
});

// 方法
async function loadData() {
  console.log('开始加载基金数据');
  try {
    funds.value = await getAllFunds();
    console.log('加载基金数据成功:', funds.value.length);
    originalFunds.value = [...funds.value];
    assets.value = await getAllAssets();
    console.log('加载资产数据成功:', assets.value.length);
    fundGroups.value = await getAllFundGroups();
    console.log('加载分组数据成功:', fundGroups.value.length);
  } catch (error) {
    console.error('加载数据失败:', error);
    // 即使加载失败，也要确保数据为数组，避免后续操作出错
    funds.value = [];
    originalFunds.value = [];
    assets.value = [];
    fundGroups.value = [];
  }
}

function formatCurrency(value) {
  return parseFloat(value).toFixed(2);
}

function safeNumber(value) {
  return parseFloat(value) || 0;
}

function calculateReturn(fund) {
  const currentValue = safeNumber(fund.currentNav) * (safeNumber(fund.shares) - safeNumber(fund.sellShares));
  const sellValue = safeNumber(fund.sellNav) * safeNumber(fund.sellShares);
  const totalValue = currentValue + sellValue;
  return totalValue - safeNumber(fund.costAmount);
}

function calculateReturnRate(fund) {
  const costAmount = safeNumber(fund.costAmount);
  if (costAmount === 0) return 0;
  const returnAmount = calculateReturn(fund);
  return (returnAmount / costAmount) * 100;
}

function openModal() {
  console.log('打开基金弹窗');
  isEditing.value = false;
  editIndex.value = -1;
  fundForm.value = {
    name: '',
    code: '',
    type: '混合型',
    isFixed: false,
    costNav: '',
    shares: '',
    currentNav: '',
    sellNav: '',
    sellShares: '',
    costAmount: '',
    paymentSource: ''
  };
  fundModalVisible.value = true;
  console.log('弹窗状态:', fundModalVisible.value);
}

function closeModal() {
  fundModalVisible.value = false;
}

function editFundById(id) {
  const fund = funds.value.find(f => f.id === id);
  if (!fund) {
    alert('基金不存在');
    return;
  }
  isEditing.value = true;
  editIndex.value = funds.value.findIndex(f => f.id === id);
  fundForm.value = {
    name: fund.name,
    code: fund.code,
    type: fund.type || '混合型',
    isFixed: fund.isFixed || false,
    costNav: fund.costNav,
    shares: fund.shares,
    currentNav: fund.currentNav,
    sellNav: fund.sellNav,
    sellShares: fund.sellShares,
    costAmount: fund.costAmount,
    paymentSource: ''
  };
  fundModalVisible.value = true;
}

async function deleteFundById(id) {
  if (confirm('确定要删除这个基金吗？')) {
    await deleteFundFromService(id);
    await loadData();
    showToast('基金删除成功');
  }
}

function calculateCost() {
  const costNav = safeNumber(fundForm.value.costNav);
  const shares = safeNumber(fundForm.value.shares);
  fundForm.value.costAmount = (costNav * shares).toFixed(2);
  updateFundDeductionPreview();
}

function updateFundDeductionPreview() {
  // 扣款预览逻辑已在模板中处理
}

function getAssetName(assetId) {
  const asset = assets.value.find(a => a.id === assetId);
  return asset ? asset.name : '--';
}

async function saveFund() {
  if (!fundForm.value.name || !fundForm.value.code || safeNumber(fundForm.value.costAmount) <= 0) {
    showToast('请填写完整信息', 'error');
    return;
  }

  const fund = {
    id: generateId(),
    name: fundForm.value.name,
    code: fundForm.value.code,
    type: fundForm.value.type,
    isFixed: fundForm.value.isFixed,
    costNav: safeNumber(fundForm.value.costNav),
    shares: safeNumber(fundForm.value.shares),
    costAmount: safeNumber(fundForm.value.costAmount),
    currentNav: safeNumber(fundForm.value.currentNav),
    sellNav: safeNumber(fundForm.value.sellNav),
    sellShares: safeNumber(fundForm.value.sellShares)
  };

  // 处理联动扣款
  if (!isEditing.value && fundForm.value.paymentSource) {
    const sourceAsset = assets.value.find(a => a.id === fundForm.value.paymentSource);
    if (sourceAsset) {
      if (safeNumber(sourceAsset.value) < safeNumber(fundForm.value.costAmount)) {
        showToast('扣款账户余额不足', 'error');
        return;
      }
      // 扣除账户余额
      sourceAsset.value = safeNumber(sourceAsset.value) - safeNumber(fundForm.value.costAmount);
      await saveAssetFromService(sourceAsset);
    }
  }

  if (!isEditing.value) {
    await saveFundFromService(fund, false);
    showToast('基金添加成功');
  } else {
    const oldFund = funds.value[editIndex.value];
    fund.id = oldFund.id;
    await saveFundFromService(fund, true);
    showToast('基金更新成功');
  }

  await loadData();
  closeModal();
}

function sortTable(column) {
  if (sortState.value.column === column) {
    sortState.value.direction = sortState.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.value.column = column;
    sortState.value.direction = 'asc';
  }

  funds.value = [...funds.value].sort((a, b) => {
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
      return sortState.value.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortState.value.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  currentPage.value = 1;
}

function applyFilters() {
  const fixedFilter = document.getElementById('fixedFilter').value;
  filterState.value.fixed = fixedFilter;
  sortState.value.column = '';
  sortState.value.direction = 'asc';

  if (fixedFilter === 'all') {
    funds.value = [...originalFunds.value];
  } else if (fixedFilter === 'fixed') {
    funds.value = originalFunds.value.filter(fund => fund.isFixed);
  } else if (fixedFilter === 'non-fixed') {
    funds.value = originalFunds.value.filter(fund => !fund.isFixed);
  }

  currentPage.value = 1;
}

function triggerFileInput() {
  fileInputRef.value.click();
}

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

    pendingImportData.value = jsonData;
    openImportModal();
  };
  reader.readAsArrayBuffer(file);
}

function openImportModal() {
  console.log('打开导入弹窗');
  selectedImportMode.value = null;
  importPaymentSource.value = '';
  importModalVisible.value = true;
  console.log('弹窗状态:', importModalVisible.value);
}

function closeImportModal() {
  importModalVisible.value = false;
  pendingImportData.value = null;
  selectedImportMode.value = null;
}

function selectImportMode(mode) {
  selectedImportMode.value = mode;
}

async function confirmImport() {
  if (!selectedImportMode.value || !pendingImportData.value) return;

  if (!importPaymentSource.value) {
    showToast('请选择扣款账户', 'error');
    return;
  }

  // 处理联动扣款
  const totalCost = pendingImportData.value.reduce((sum, item) => {
    return sum + safeNumber(item['成本金额'] || item['金额'] || 0);
  }, 0);

  const sourceAsset = assets.value.find(a => a.id === importPaymentSource.value);
  if (sourceAsset) {
    if (safeNumber(sourceAsset.value) < totalCost) {
      showToast('扣款账户余额不足', 'error');
      return;
    }
    // 扣除账户余额
    sourceAsset.value = safeNumber(sourceAsset.value) - totalCost;
    await saveAssetFromService(sourceAsset);
  }

  // 导入数据
  if (selectedImportMode.value === 'replace') {
    // 清空现有基金
    for (const fund of funds.value) {
      await deleteFundFromService(fund.id);
    }
  }

  for (const item of pendingImportData.value) {
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
    await saveFundFromService(fund, false);
  }

  await loadData();
  closeImportModal();
  showToast(`成功导入 ${pendingImportData.value.length} 条基金记录`);
}

function exportExcel() {
  if (funds.value.length === 0) {
    showToast('暂无数据可导出', 'error');
    return;
  }

  const data = funds.value.map(fund => {
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
    // 改为调用 Node 后端（端口 3000），通过代理转发
    const response = await axios.get(`/api/fund/nav?code=${fundCode}`);
    if (response.data.status === 'success') {
      const fundData = response.data.data;
      if (fundData && fundData.nav) {
        const nav = safeNumber(fundData.nav);
        
        // 查找并更新基金数据
        const fund = funds.value.find(f => f.code === fundCode);
        if (fund) {
          fund.currentNav = nav;
          fund.name = fundData.name || fund.name;
          fund.updateDate = fundData.date;
          saveFundFromService(fund);
          
          // 显示更新通知
          showToast(`已更新 ${fundCode} 净值: ${nav} (${fundData.date})`);
        }
        
        return true;
      }
    }
  } catch (error) {
    console.error(`获取${fundCode}基金净值失败:`, error);
    showToast(`获取${fundCode}净值失败，请检查后端服务`, 'error');
    return false;
  }
  return false;
}

async function updateAllNetValues() {
  if (funds.value.length === 0) {
    showToast('暂无基金数据', 'error');
    return;
  }

  showToast('正在更新净值...');
  let updated = 0, failed = 0;
  
  const promises = funds.value.map(async (fund) => {
    if (fund.code) {
      try {
        const success = await fetchFundNav(fund.code);
        if (success) {
          updated++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      failed++;
    }
  });
  
  await Promise.all(promises);
  // 重新加载数据
  await loadData();
  
  // 显示更新结果
  showToast(`更新完成：成功${updated}只 | 失败${failed}只`);
  console.log('所有基金净值更新完成');
}

function changePage(page) {
  if (page < 1 || page > pageCount.value) {
    return;
  }
  currentPage.value = page;
}

function changePageSize(size) {
  pageSize.value = parseInt(size);
  currentPage.value = 1;
}

// 分组管理方法
function openGroupModal() {
  groupModalVisible.value = true;
  resetGroupForm();
}

function closeGroupModal() {
  groupModalVisible.value = false;
  resetGroupForm();
}

function resetGroupForm() {
  isEditingGroup.value = false;
  groupForm.value = {
    id: '',
    name: '',
    color: '#667eea',
    sortOrder: 0
  };
}

function editGroup(group) {
  isEditingGroup.value = true;
  groupForm.value = { ...group };
}

async function saveGroup() {
  if (!groupForm.value.name.trim()) {
    showToast('请输入分组名称', 'error');
    return;
  }
  
  try {
    console.log('保存分组:', { isEditing: isEditingGroup.value, form: groupForm.value });
    
    await saveFundGroup({
      id: groupForm.value.id,
      name: groupForm.value.name.trim(),
      color: groupForm.value.color,
      sortOrder: groupForm.value.sortOrder
    }, isEditingGroup.value);
    
    showToast(isEditingGroup.value ? '分组更新成功' : '分组创建成功');
    await loadData();
    
    // 如果是新增模式，关闭弹窗；如果是编辑模式，保持打开继续编辑
    if (!isEditingGroup.value) {
      closeGroupModal();
    } else {
      resetGroupForm();
    }
  } catch (error) {
    console.error('保存分组失败:', error);
    showToast('保存分组失败: ' + (error.message || '未知错误'), 'error');
  }
}

async function updateGroup(group) {
  try {
    await saveFundGroup(group);
    showToast('分组颜色已更新');
  } catch (error) {
    console.error('更新分组失败:', error);
    showToast('更新分组失败', 'error');
  }
}

async function deleteGroupById(groupId) {
  if (!confirm('确定要删除这个分组吗？该分组下的基金将变为未分组状态。')) {
    return;
  }
  
  try {
    await deleteFundGroup(groupId);
    showToast('分组删除成功');
    await loadData();
  } catch (error) {
    console.error('删除分组失败:', error);
    showToast('删除分组失败', 'error');
  }
}

async function moveFundToGroup(fundId, groupId) {
  try {
    await updateFundGroup(fundId, groupId || null);
    showToast('基金分组已更新');
    await loadData();
  } catch (error) {
    console.error('移动基金分组失败:', error);
    showToast('移动基金分组失败', 'error');
  }
}

// 初始化
onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 复用全局样式 */
.fund-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-title {
  font-size: 28px;
  color: #2d3748;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-subtitle {
  color: #718096;
  margin-bottom: 25px;
  font-size: 14px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 5px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: #48bb78;
  color: white;
}

.btn-success:hover {
  background: #38a169;
}

.btn-info {
  background: #4299e1;
  color: white;
}

.btn-info:hover {
  background: #3182ce;
}

.btn-outline {
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.file-input-wrapper {
  position: relative;
  overflow: hidden;
  display: inline-block;
}

.file-input-wrapper input[type=file] {
  position: absolute;
  left: -9999px;
}

/* 筛选器 */
.filter-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.filter-select {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  max-width: 150px;
}

/* 表格 */
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

th {
  background: #f7fafc;
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  font-size: 13px;
  border-bottom: 2px solid #e2e8f0;
  cursor: pointer;
  position: relative;
  user-select: none;
}

th:hover {
  background: #f0f4f8;
}

.sort-indicator {
  display: inline-block;
  margin-left: 8px;
  font-size: 10px;
  color: #a0aec0;
}

.sort-indicator .active {
  color: #667eea;
  font-weight: bold;
}

td {
  padding: 15px 12px;
  border-bottom: 1px solid #edf2f7;
  font-size: 14px;
  color: #2d3748;
}

tr:hover {
  background: #f7fafc;
}

/* 基金专用样式 */
.fund-name {
  font-weight: 600;
  color: #2d3748;
}

.fund-code {
  font-size: 12px;
  color: #718096;
  background: #edf2f7;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 4px;
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.badge-fixed {
  background: #c6f6d5;
  color: #22543d;
}

.badge-regular {
  background: #bee3f8;
  color: #2c5282;
}

.return-negative {
  color: #48bb78;
}

.return-positive {
  color: #f56565;
}

.action-btns {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.edit-btn {
  background: #ebf8ff;
  color: #3182ce;
}

.edit-btn:hover {
  background: #bee3f8;
}

.delete-btn {
  background: #fed7d7;
  color: #c53030;
}

.delete-btn:hover {
  background: #feb2b2;
}

/* 分页 */
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 0;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #718096;
  font-size: 14px;
}

.pagination-buttons {
  display: flex;
  gap: 5px;
  align-items: center;
}

.pagination-btn {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.pagination-btn:hover {
  background-color: #f7fafc;
  border-color: #cbd5e0;
}

.pagination-btn.active {
  background-color: #667eea;
  color: #ffffff;
  border-color: #667eea;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-size {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #718096;
}

.pagination-size select {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background-color: #ffffff;
  font-size: 14px;
}

/* 模态框 */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-content.large {
  max-width: 600px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  margin-bottom: 20px;
}

.modal-title {
  font-size: 20px;
  color: #2d3748;
  margin-bottom: 5px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-wrapper input {
  width: auto;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 25px;
}

.btn-secondary {
  background: #edf2f7;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* 导入选项 */
.import-options {
  background: #f7fafc;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.import-option-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.import-option-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.import-option-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.import-option-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.import-option-card.selected {
  border-color: #667eea;
  background: #ebf8ff;
}

.import-option-card .icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.import-option-card .title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 5px;
}

.import-option-card .desc {
  font-size: 13px;
  color: #718096;
}

/* 导入预览 */
.import-preview {
  background: #f7fafc;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.import-preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 10px;
}

.import-preview-table {
  width: 100%;
  font-size: 13px;
}

.import-preview-table th,
.import-preview-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.import-preview-table th {
  background: #edf2f7;
  font-weight: 600;
}

/* 导入警告 */
.import-warning {
  background: #fffaf0;
  border: 1px solid #fbd38d;
  border-radius: 8px;
  padding: 12px;
  margin-top: 15px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.import-warning-icon {
  font-size: 20px;
}

.import-warning-text {
  font-size: 13px;
  color: #744210;
  line-height: 1.5;
}

.import-warning-text strong {
  color: #975a16;
}

/* 联动扣款 */
.linkage-info {
  background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
  border: 1px solid #81e6d9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.linkage-info-icon {
  font-size: 20px;
}

.linkage-info-text {
  font-size: 13px;
  color: #234e52;
  line-height: 1.5;
}

.payment-source-select {
  background: #f0fff4;
  border: 2px solid #9ae6b4;
}

.deduction-preview {
  background: #fffaf0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
  font-size: 13px;
  color: #744210;
}

.deduction-amount {
  font-weight: bold;
  color: #c53030;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Toast 通知样式 */
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: #2d3748;
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: none;
  z-index: 2000;
}

.toast.show {
  display: block;
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .import-option-cards {
    grid-template-columns: 1fr;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .pagination-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .toast {
    left: 20px;
    right: 20px;
    transform: translateY(-100px);
    max-width: none;
  }
  
  .toast.show {
    transform: translateY(0);
  }
}
/* 视图切换 */
.view-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.view-label {
  font-weight: 600;
  color: #4a5568;
}

.view-btn {
  padding: 8px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #4a5568;
}

.view-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.view-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

/* 分组视图 */
.group-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fund-group {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid transparent;
}

.group-header:hover {
  background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.group-count {
  font-size: 13px;
  color: #718096;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.group-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: #4a5568;
}

.group-cost, .group-value {
  font-weight: 500;
}

.group-return {
  font-weight: 600;
}

.group-content {
  padding: 16px 20px;
}

.group-table {
  width: 100%;
  border-collapse: collapse;
}

.group-table th {
  text-align: left;
  padding: 10px;
  font-size: 12px;
  color: #718096;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.group-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #edf2f7;
  font-size: 14px;
}

.group-select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: white;
}

.group-select:focus {
  outline: none;
  border-color: #667eea;
}

/* 分组管理弹窗 */
.group-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7fafc;
  border-radius: 8px;
  margin-bottom: 8px;
}

.group-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-color-picker {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
}

.group-item-name {
  font-weight: 500;
  color: #2d3748;
}

.group-item-actions {
  display: flex;
  gap: 8px;
}

.empty-groups {
  text-align: center;
  padding: 40px;
  color: #a0aec0;
  font-size: 14px;
}

.group-form {
  background: #f7fafc;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
}

.group-form h4 {
  margin: 0 0 16px 0;
  color: #2d3748;
  font-size: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-row input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-row input[type="color"] {
  width: 60px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>