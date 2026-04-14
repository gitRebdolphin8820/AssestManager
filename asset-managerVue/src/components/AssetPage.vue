<template>
  <div id="assetPage" class="page-content">
    <h1 class="page-title">资产负债总览</h1>
    <p class="page-subtitle">全方位掌握您的资产配置与负债情况，科学规划财务</p>
    
    <!-- 资产负债对比 -->
    <div class="balance-section">
      <div class="balance-header">
        <div class="balance-title"><i class="fas fa-chart-pie"></i> 资产负债概览</div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <span class="gold-price-display">
            <i class="fas fa-coins"></i> 当前金价: <span class="price">{{ formatCurrency(currentGoldPrice) }}/克</span>
          </span>
          <span id="debtRatioBadge" class="badge" :style="{ background: debtRatioColor, color: debtRatioTextColor }">
            资产负债率: {{ debtRatio }}%
          </span>
        </div>
      </div>
      <div class="balance-grid">
        <div class="balance-item">
          <div class="balance-item-label"><i class="fas fa-coins"></i> 总资产</div>
          <div class="balance-item-value assets">{{ formatCurrency(totalAssets) }}</div>
        </div>
        <div class="balance-item">
          <div class="balance-item-label"><i class="fas fa-credit-card"></i> 总负债</div>
          <div class="balance-item-value debts">{{ formatCurrency(totalDebts) }}</div>
        </div>
        <div class="balance-item">
          <div class="balance-item-label"><i class="fas fa-gem"></i> 净资产</div>
          <div class="balance-item-value net">{{ formatCurrency(netWorth) }}</div>
        </div>
      </div>
    </div>
    
    <!-- 资产统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card net-worth-card">
        <div class="stat-label"><i class="fas fa-gem"></i> 净资产</div>
        <div class="stat-value">{{ formatCurrency(netWorth) }}</div>
        <div class="stat-change">净资产统计</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><i class="fas fa-coins"></i> 总资产</div>
        <div class="stat-value">{{ formatCurrency(totalAssets) }}</div>
        <div class="stat-change">总资产统计</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
        <div class="stat-label"><i class="fas fa-university"></i> 银行存款</div>
        <div class="stat-value">{{ formatCurrency(bankAssets) }}</div>
        <div class="stat-change">流动性资产</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #7d85af 0%, #8087ca 100%);">
        <div class="stat-label"><i class="fas fa-chart-line"></i> 基金投资</div>
        <div class="stat-value">{{ formatCurrency(fundAssets) }}</div>
        <div class="stat-change" :class="{ 'return-positive': fundReturnRate > 0, 'return-negative': fundReturnRate < 0 }">
          {{ fundReturnRate >= 0 ? '+' : '' }}{{ fundReturnRate.toFixed(2) }}%
        </div>
      </div>
    </div>

    <!-- 负债统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" style="background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);">
        <div class="stat-label"><i class="fas fa-credit-card"></i> 总负债</div>
        <div class="stat-value">{{ formatCurrency(totalDebts) }}</div>
        <div class="stat-change">需偿还债务</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);">
        <div class="stat-label"><i class="fas fa-home"></i> 房贷</div>
        <div class="stat-value">{{ formatCurrency(mortgageDebt) }}</div>
        <div class="stat-change">长期负债</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
        <div class="stat-label"><i class="fas fa-car"></i> 车贷</div>
        <div class="stat-value">{{ formatCurrency(carDebt) }}</div>
        <div class="stat-change">车辆贷款</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #ecc94b 0%, #d69e2e 100%);">
        <div class="stat-label"><i class="fas fa-credit-card"></i> 信用卡/其他</div>
        <div class="stat-value">{{ formatCurrency(otherDebt) }}</div>
        <div class="stat-change">短期负债</div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="chart-container">
        <canvas id="assetChart"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="debtChart"></canvas>
      </div>
    </div>

    <!-- 视图切换工具栏 -->
    <div class="toolbar" style="justify-content: space-between; align-items: center;">
      <div style="display: flex; gap: 10px; align-items: center;">
        <button class="btn btn-primary" @click="openAccountModal">
          <i class="fas fa-university"></i> 创建账户
        </button>
        <button class="btn btn-success" @click="openAssetModal">
          <i class="fas fa-plus"></i> 新增资产
        </button>
        <button class="btn btn-warning" @click="openDebtModal">
          <i class="fas fa-plus"></i> 新增负债
        </button>
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="color: #718096; font-size: 14px;">展示方式：</span>
        <div class="view-toggle">
          <button 
            class="view-toggle-btn" 
            :class="{ active: currentAssetView === 'type' }"
            @click="switchAssetView('type')"
          >
            <i class="fas fa-layer-group"></i> 按资产类型
          </button>
          <button 
            class="view-toggle-btn" 
            :class="{ active: currentAssetView === 'account' }"
            @click="switchAssetView('account')"
          >
            <i class="fas fa-university"></i> 按账户
          </button>
        </div>
        <button class="btn btn-primary" @click="loadData">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </div>
    </div>

    <!-- 按资产类型视图 -->
    <div id="assetViewByType" class="asset-view" v-if="currentAssetView === 'type'">
      <div class="asset-grid" id="assetList">
        <!-- 按类型分组显示资产 -->
        <div 
          v-for="(items, type) in groupedAssets" 
          :key="type"
          class="asset-card"
          :style="{ borderLeftColor: typeColors[type] }"
        >
          <div class="asset-card-title">
            <span v-html="typeNames[type]"></span>
            <span style="margin-left: auto; font-size: 14px; color: #718096;">
              {{ formatCurrency(typeTotals[type]) }}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: typePercents[type] + '%', opacity: 0.7 }"></div>
          </div>
          <div style="font-size: 12px; color: #a0aec0; margin-top: 5px; text-align: right;">
            占比 {{ typePercents[type] }}%
          </div>
          
          <!-- 资产项 -->
          <div 
            v-for="item in items" 
            :key="item.id"
            class="asset-item"
          >
            <div>
              <span class="asset-item-label">{{ item.name }} {{ item.code ? `(${item.code})` : '' }}</span>
              <span v-if="item.subType && assetSubTypes[item.subType]?.name" style="font-size: 11px; color: #667eea; margin-left: 5px;">
                [{{ assetSubTypes[item.subType].name }}]
              </span>
              <div v-if="item.quantity && item.costPrice" style="font-size: 11px; color: #a0aec0;">
                {{ item.quantity }}股 × {{ formatCurrency(item.costPrice) }}
              </div>
              <div v-if="item.remark" style="font-size: 11px; color: #a0aec0;">{{ item.remark }}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="asset-item-value">{{ formatCurrency(item.value || (item.quantity * item.costPrice)) }}</span>
              <button class="icon-btn edit-btn" @click="editAsset(item)" title="编辑"><i class="fas fa-edit"></i></button>
              <button class="icon-btn delete-btn" @click="deleteAsset(item.id)" title="删除"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
        
        <!-- 黄金资产卡片 -->
        <div v-if="goldAssets.length > 0" class="asset-card gold-card">
          <div class="asset-card-title">
            <i class="fas fa-coins"></i> 黄金资产
            <span style="margin-left: auto; font-size: 14px; color: #975a16;">
              {{ formatCurrency(goldTotal) }}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: goldPercent + '%', opacity: 0.7 }"></div>
          </div>
          <div style="font-size: 12px; color: #a0aec0; margin-top: 5px; text-align: right;">
            占比 {{ goldPercent }}% | 共 {{ goldGrams }} 克
          </div>
          
          <!-- 黄金资产项 -->
          <div 
            v-for="gold in goldAssets" 
            :key="gold.id"
            class="asset-item"
          >
            <div>
              <span class="asset-item-label">{{ gold.name }}</span>
              <span class="gold-gram">{{ gold.grams }} 克</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="asset-item-value">{{ formatCurrency(gold.grams * currentGoldPrice) }}</span>
              <button class="icon-btn edit-btn" @click="editGoldAsset(gold)" title="编辑"><i class="fas fa-edit"></i></button>
              <button class="icon-btn delete-btn" @click="deleteGoldAsset(gold.id)" title="删除"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
        
        <div v-if="Object.keys(groupedAssets).length === 0 && goldAssets.length === 0" class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon"><i class="fas fa-gem"></i></div>
          <div>暂无资产记录，点击"新增资产"、"新增黄金"开始记录</div>
        </div>
      </div>
    </div>

    <!-- 按账户视图 -->
    <div id="assetViewByAccount" class="asset-view" v-if="currentAssetView === 'account'">
      <div id="accountList">
        <div 
          v-for="account in accountGroups" 
          :key="account.id"
          class="account-card"
        >
          <div class="account-header" :class="account.typeConfig.headerClass">
            <div class="account-title">
              <i :class="'fas ' + account.typeConfig.icon"></i>
              <span :id="'account-name-' + account.id" class="account-name-display">{{ account.name }}</span>
              <button class="icon-btn edit-btn" @click="editAccountName(account.id)" title="编辑账户名"><i class="fas fa-edit"></i></button>
              <span :class="'account-badge badge-' + account.type">{{ account.typeConfig.name }}</span>
            </div>
            <div class="account-total">{{ formatCurrency(account.totalValue) }}</div>
          </div>
          <div class="account-body">
            <!-- 按子类型分组显示资产 -->
            <div 
              v-for="(subTypeAssets, subType) in account.subTypeGroups" 
              :key="subType"
              class="sub-asset-category"
            >
              <div class="sub-asset-header">
                <div class="sub-asset-title">
                  <i class="fas fa-folder"></i>
                  {{ assetSubTypes[subType]?.name || '其他' }}
                  <span :class="'sub-asset-tag ' + (assetSubTypes[subType]?.tagClass || '')">
                    {{ assetSubTypes[subType]?.tag || '其他' }}
                  </span>
                </div>
                <div class="sub-asset-amount">{{ formatCurrency(subTypeAssets.reduce((sum, a) => sum + parseFloat(a.value || 0), 0)) }}</div>
              </div>
              
              <!-- 子类型资产项 -->
              <div 
                v-for="asset in subTypeAssets" 
                :key="asset.id"
                class="sub-asset-item"
              >
                <div>
                  <div class="sub-asset-name">{{ asset.name }}</div>
                  <div v-if="asset.rate" style="font-size: 11px; color: #a0aec0;">利率: {{ asset.rate }}%</div>
                  <div v-if="asset.remark" style="font-size: 11px; color: #a0aec0;">{{ asset.remark }}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="sub-asset-value">{{ formatCurrency(asset.value) }}</div>
                  <button class="icon-btn edit-btn" @click="editAsset(asset)" title="编辑"><i class="fas fa-edit"></i></button>
                  <button class="icon-btn delete-btn" @click="deleteAsset(asset.id)" title="删除"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
            
            <!-- 黄金资产 -->
            <div v-if="account.goldAssets.length > 0" class="sub-asset-category">
              <div class="sub-asset-header">
                <div class="sub-asset-title">
                  <i class="fas fa-coins"></i>
                  黄金资产
                  <span class="sub-asset-tag tag-gold">黄金</span>
                </div>
                <div class="sub-asset-amount">{{ formatCurrency(account.goldValue) }}</div>
              </div>
              
              <!-- 黄金资产项 -->
              <div 
                v-for="gold in account.goldAssets" 
                :key="gold.id"
                class="sub-asset-item"
              >
                <div>
                  <div class="sub-asset-name">{{ gold.name }}</div>
                  <div style="font-size: 11px; color: #a0aec0;">{{ gold.grams }} 克</div>
                  <div v-if="gold.remark" style="font-size: 11px; color: #a0aec0;">{{ gold.remark }}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div class="sub-asset-value">{{ formatCurrency(gold.grams * currentGoldPrice) }}</div>
                  <button class="icon-btn edit-btn" @click="editGoldAsset(gold)" title="编辑"><i class="fas fa-edit"></i></button>
                  <button class="icon-btn delete-btn" @click="deleteGoldAsset(gold.id)" title="删除"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="accountGroups.length === 0" class="empty-state" style="background: white; border-radius: 12px; padding: 60px;">
          <div class="empty-icon"><i class="fas fa-university"></i></div>
          <div>暂无账户记录，点击"新增资产"开始记录</div>
          <div style="margin-top: 15px; color: #a0aec0; font-size: 14px;">
            您可以添加银行卡、微信钱包、支付宝等账户
          </div>
        </div>
      </div>
    </div>
    
    <h2 style="margin-top: 30px; margin-bottom: 20px; color: #2d3748; font-size: 20px;"><i class="fas fa-list"></i> 负债明细</h2>
    <div class="asset-grid" id="debtList">
      <div 
        v-for="debt in debts" 
        :key="debt.id"
        class="debt-card"
      >
        <div class="debt-header">
          <div class="debt-name">{{ debt.name }}</div>
          <div class="debt-type">{{ getDebtTypeName(debt.type) }}</div>
        </div>
        <div class="debt-amount">{{ formatCurrency(debt.amount) }}</div>
        <div class="debt-details">
          <div v-if="debt.rate" class="debt-detail-item">
            <span class="detail-label">年利率:</span>
            <span class="detail-value">{{ debt.rate }}%</span>
          </div>
          <div v-if="debt.term" class="debt-detail-item">
            <span class="detail-label">剩余期限:</span>
            <span class="detail-value">{{ debt.term }}个月</span>
          </div>
          <div v-if="debt.monthly" class="debt-detail-item">
            <span class="detail-label">每月还款:</span>
            <span class="detail-value">{{ formatCurrency(debt.monthly) }}</span>
          </div>
          <div v-if="debt.remark" class="debt-detail-item">
            <span class="detail-label">备注:</span>
            <span class="detail-value">{{ debt.remark }}</span>
          </div>
        </div>
        <div class="debt-actions">
          <button class="btn btn-sm btn-primary" @click="editDebt(debt)">
            <i class="fas fa-edit"></i> 编辑
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteDebt(debt.id)">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>
      </div>
      
      <div v-if="debts.length === 0" class="empty-state">
        <div class="empty-icon"><i class="fas fa-credit-card"></i></div>
        <div>暂无负债数据</div>
      </div>
    </div>

    <!-- 创建账户弹窗 -->
    <div class="modal" :class="{ active: showAccountModal }" @click.self="closeAccountModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-university"></i> 创建账户</h3>
          <p style="color: #718096; font-size: 13px;">创建银行卡、微信钱包、支付宝等账户</p>
        </div>
        <form @submit.prevent="saveAccount">
          <div class="form-group">
            <label>账户类型 *</label>
            <select v-model="accountForm.type" required>
              <option value="bank">银行卡</option>
              <option value="wechat">微信钱包</option>
              <option value="alipay">支付宝</option>
            </select>
          </div>
          <div class="form-group">
            <label>账户名称 *</label>
            <input type="text" v-model="accountForm.name" required placeholder="例如：招商银行、微信零钱">
          </div>
          <div class="form-group">
            <label>初始余额 *</label>
            <input type="number" v-model.number="accountForm.balance" step="0.01" required placeholder="0.00">
          </div>
          <div class="form-group">
            <label>备注</label>
            <input type="text" v-model="accountForm.remark" placeholder="可选填">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeAccountModal">取消</button>
            <button type="submit" class="btn btn-primary">创建账户</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 新增资产弹窗 -->
    <div class="modal" :class="{ active: showAssetModal }" @click.self="closeAssetModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditingAsset ? '编辑资产' : '新增资产' }}</h3>
          <p style="color: #718096; font-size: 13px;">记录您的各类资产</p>
        </div>
        <form @submit.prevent="saveAsset">
          <input type="hidden" v-model="assetForm.id">
          <div class="form-group">
            <label>资产类型 *</label>
            <select v-model="assetForm.subType" required>
              <option value="current">活期存款</option>
              <option value="fixed">定期存款</option>
              <option value="fund">基金</option>
              <option value="money_market">货币基金</option>
              <option value="yuebao">余额宝</option>
              <option value="lingqianbao">零钱宝</option>
              <option value="wealth_mgmt">理财产品</option>
              <option value="stock">股票</option>
              <option value="bond">债券</option>
              <option value="insurance">保险</option>
              <option value="gold">黄金</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>所属账户 *</label>
            <select v-model="assetForm.accountId" required>
              <option value="">-- 选择账户 --</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>资产名称 *</label>
            <input type="text" v-model="assetForm.name" required placeholder="例如：定期存款、余额宝等">
          </div>
          
          <!-- 扣款账户（投资类资产显示） -->
          <div class="form-group" v-if="['fund', 'stock', 'bond', 'insurance', 'gold'].includes(assetForm.subType)">
            <label>扣款账户 *</label>
            <select v-model="assetForm.paymentSource">
              <option value="">-- 选择扣款账户 --</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </option>
            </select>
            <p style="color: #718096; font-size: 12px; margin-top: 5px;">购买资金将从此账户扣除</p>
          </div>
          
          <div class="form-row">
            <div class="form-group" v-if="assetForm.subType !== 'gold'">
              <label>当前价值 *</label>
              <input type="number" v-model.number="assetForm.value" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group" v-else>
              <label>持有克数 *</label>
              <input type="number" v-model.number="assetForm.grams" step="0.01" placeholder="0.00">
            </div>
          </div>
          
          <!-- 黄金资产特殊字段 -->
          <div class="form-row" v-if="assetForm.subType === 'gold'">
            <div class="form-group">
              <label>当前金价 (元/克)</label>
              <input type="number" v-model.number="currentGoldPrice" step="0.01" style="background: #fffbeb; color: #b45309; font-weight: 600;">
            </div>
            <div class="form-group">
              <label>预估价值</label>
              <input type="text" :value="formatCurrency(assetForm.grams * currentGoldPrice)" readonly style="background: #f7fafc;">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>利率/收益率 (%)</label>
              <input type="number" v-model.number="assetForm.rate" step="0.01" placeholder="例如：3.5">
            </div>
            <div class="form-group">
              <label>到期日期</label>
              <input type="date" v-model="assetForm.maturityDate">
            </div>
          </div>
          <div class="form-group">
            <label>备注</label>
            <input type="text" v-model="assetForm.remark" placeholder="可选填">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeAssetModal">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 新增负债弹窗 -->
    <div class="modal" :class="{ active: showDebtModal }" @click.self="closeDebtModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-credit-card"></i> {{ isEditingDebt ? '编辑负债' : '新增负债' }}</h3>
          <p style="color: #718096; font-size: 13px;">记录您的各类负债（贷款、信用卡等）</p>
        </div>
        <form @submit.prevent="saveDebt">
          <input type="hidden" v-model="debtForm.id">
          <div class="form-group">
            <label>负债名称 *</label>
            <input type="text" v-model="debtForm.name" required placeholder="例如：招商银行房贷">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>负债类型 *</label>
              <select v-model="debtForm.type" required>
                <option value="mortgage"><i class="fas fa-home"></i> 房贷</option>
                <option value="car_loan"><i class="fas fa-car"></i> 车贷</option>
                <option value="credit_card"><i class="fas fa-credit-card"></i> 信用卡</option>
                <option value="consumer_loan"><i class="fas fa-shopping-bag"></i> 消费贷</option>
                <option value="student_loan"><i class="fas fa-graduation-cap"></i> 助学贷款</option>
                <option value="personal_loan"><i class="fas fa-user"></i> 个人借款</option>
                <option value="other"><i class="fas fa-file-alt"></i> 其他负债</option>
              </select>
            </div>
            <div class="form-group">
              <label>负债金额 *</label>
              <input type="number" v-model.number="debtForm.amount" step="0.01" required placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>年利率 (%)</label>
              <input type="number" v-model.number="debtForm.rate" step="0.01" placeholder="例如：4.9">
            </div>
            <div class="form-group">
              <label>剩余期限（月）</label>
              <input type="number" v-model.number="debtForm.term" placeholder="例如：120">
            </div>
          </div>
          <div class="form-group">
            <label>每月还款额</label>
            <input type="number" v-model.number="debtForm.monthly" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>备注</label>
            <input type="text" v-model="debtForm.remark" placeholder="可选填，如：还款日每月15号">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeDebtModal">取消</button>
            <button type="submit" class="btn btn-warning"><i class="fas fa-save"></i> 保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import {
  getAllAssets,
  saveAsset as saveAssetFromService,
  deleteAsset as deleteAssetFromService,
  getAllGoldAssets,
  saveGoldAsset as saveGoldAssetFromService,
  deleteGoldAsset as deleteGoldAssetFromService,
  getAllDebts,
  saveDebt as saveDebtFromService,
  deleteDebt as deleteDebtFromService,
  getAllAccounts,
  saveAccount as saveAccountFromService,
  getAllFunds,
  generateId
} from '../services/dataService';

// 状态管理
const assets = ref([]);
const goldAssets = ref([]);
const debts = ref([]);
const accounts = ref([]);
const funds = ref([]);
const currentAssetView = ref('type');
const currentGoldPrice = ref(1000);

// 图表实例
let assetChart = null;
let debtChart = null;

// 弹窗状态
const showAccountModal = ref(false);
const showAssetModal = ref(false);
const showDebtModal = ref(false);
const isEditingAsset = ref(false);
const isEditingDebt = ref(false);

// 表单数据
const accountForm = ref({
  name: '',
  type: 'bank',
  balance: 0,
  remark: ''
});

const assetForm = ref({
  id: '',
  name: '',
  subType: 'current',
  accountId: '',
  value: 0,
  rate: '',
  maturityDate: '',
  remark: ''
});

const debtForm = ref({
  id: '',
  name: '',
  type: 'mortgage',
  amount: 0,
  rate: '',
  term: '',
  monthly: '',
  remark: ''
});

// 资产类型配置
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

// 资产类型名称
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

// 资产类型颜色
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

// 账户类型配置
const accountTypes = {
  bank: { name: '银行卡', icon: 'fa-university', color: '#667eea', headerClass: '' },
  wechat: { name: '微信钱包', icon: 'fa-comment', color: '#07c160', headerClass: 'wechat' },
  alipay: { name: '支付宝', icon: 'fa-alipay', color: '#1677ff', headerClass: 'alipay' }
};

// 负债类型配置
const debtTypes = {
  mortgage: '房贷',
  car_loan: '车贷',
  credit_card: '信用卡',
  consumer_loan: '消费贷',
  student_loan: '助学贷款',
  personal_loan: '个人借款',
  other: '其他负债'
};

// 计算属性
const totalAssets = computed(() => {
  const assetValue = assets.value.reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
  const goldValue = goldAssets.value.reduce((sum, gold) => sum + (gold.grams * currentGoldPrice.value), 0);

  // funds 表中的基金市值
  const fundsMarketValue = funds.value.reduce((sum, fund) => {
    const shares = parseFloat(fund.shares || 0);
    const currentNav = parseFloat(fund.currentNav || 0);
    const sellShares = parseFloat(fund.sellShares || 0);
    return sum + (currentNav * (shares - sellShares));
  }, 0);

  return assetValue + goldValue + fundsMarketValue;
});

const totalDebts = computed(() => {
  return debts.value.reduce((sum, debt) => sum + parseFloat(debt.amount || 0), 0);
});

const netWorth = computed(() => totalAssets.value - totalDebts.value);

const debtRatio = computed(() => {
  if (totalAssets.value === 0) return 0;
  return Math.round((totalDebts.value / totalAssets.value) * 100);
});

const debtRatioColor = computed(() => {
  if (debtRatio.value < 30) return '#c6f6d5';
  if (debtRatio.value < 60) return '#feebc8';
  return '#fed7d7';
});

const debtRatioTextColor = computed(() => {
  if (debtRatio.value < 30) return '#22543d';
  if (debtRatio.value < 60) return '#c05621';
  return '#742a2a';
});

const bankAssets = computed(() => {
  return assets.value
    .filter(asset => asset.subType === 'current' || asset.subType === 'fixed')
    .reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
});

// 基金投资（包括 assets 表中的基金 + funds 表中的基金）
const fundAssets = computed(() => {
  // 1. assets 表中的基金
  const assetsFund = assets.value
    .filter(asset => asset.subType === 'fund' || asset.subType === 'money_market' || asset.subType === 'yuebao' || asset.subType === 'lingqianbao')
    .reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);

  // 2. funds 表中的基金市值
  const fundsMarketValue = funds.value.reduce((sum, fund) => {
    const shares = parseFloat(fund.shares || 0);
    const currentNav = parseFloat(fund.currentNav || 0);
    const sellShares = parseFloat(fund.sellShares || 0);
    return sum + (currentNav * (shares - sellShares));
  }, 0);

  return assetsFund + fundsMarketValue;
});

// 基金成本（用于计算收益率）
const fundCost = computed(() => {
  // 1. assets 表中的基金成本
  const assetsFundCost = assets.value
    .filter(asset => asset.subType === 'fund' || asset.subType === 'money_market' || asset.subType === 'yuebao' || asset.subType === 'lingqianbao')
    .reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);

  // 2. funds 表中的基金成本
  const fundsCost = funds.value.reduce((sum, fund) => {
    return sum + parseFloat(fund.costAmount || 0);
  }, 0);

  return assetsFundCost + fundsCost;
});

// 基金收益率
const fundReturnRate = computed(() => {
  const cost = fundCost.value;
  const marketValue = fundAssets.value;
  if (cost === 0) return 0;
  return ((marketValue - cost) / cost) * 100;
});

// 黄金资产价值
const goldAssetValue = computed(() => {
  return goldAssets.value.reduce((sum, gold) => sum + (gold.grams * currentGoldPrice.value), 0);
});

// 其他资产（非银行、非基金类）
const otherAssets = computed(() => {
  return assets.value
    .filter(asset => asset.subType !== 'current' && asset.subType !== 'fixed' && 
                    asset.subType !== 'fund' && asset.subType !== 'money_market' && 
                    asset.subType !== 'yuebao' && asset.subType !== 'lingqianbao')
    .reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
});

const mortgageDebt = computed(() => {
  return debts.value
    .filter(debt => debt.type === 'mortgage')
    .reduce((sum, debt) => sum + parseFloat(debt.amount || 0), 0);
});

const carDebt = computed(() => {
  return debts.value
    .filter(debt => debt.type === 'car_loan')
    .reduce((sum, debt) => sum + parseFloat(debt.amount || 0), 0);
});

const otherDebt = computed(() => {
  return debts.value
    .filter(debt => debt.type !== 'mortgage' && debt.type !== 'car_loan')
    .reduce((sum, debt) => sum + parseFloat(debt.amount || 0), 0);
});

// 计算总资产价值（包含黄金）
const totalAssetsValue = computed(() => {
  const assetValue = assets.value.reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
  const goldValue = goldAssets.value.reduce((sum, gold) => sum + (gold.grams * currentGoldPrice.value), 0);
  return assetValue + goldValue;
});

// 按类型分组的资产
const groupedAssets = computed(() => {
  const grouped = {};
  
  assets.value.forEach(asset => {
    let type = 'other';
    const accountType = asset.accountType || 'bank';
    const subType = asset.subType || 'current';
    
    // 根据账户类型和资产子类型进行分类
    const isRealTime = ['current', 'yuebao', 'lingqianbao'].includes(subType) || 
                      (subType === 'wealth_mgmt' && asset.remark && asset.remark.includes('实时'));
    
    if (accountType === 'bank') {
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
    } else {
      // 其他类型资产
      switch (subType) {
        case 'fund':
          type = 'fund';
          break;
        case 'stock':
          type = 'stock';
          break;
        case 'bond':
          type = 'bond';
          break;
        case 'insurance':
          type = 'insurance';
          break;
        case 'real_estate':
          type = 'real_estate';
          break;
        case 'vehicle':
          type = 'vehicle';
          break;
        default:
          type = 'other';
      }
    }
    
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(asset);
  });
  
  return grouped;
});

// 各类型资产的总价值
const typeTotals = computed(() => {
  const totals = {};
  
  Object.entries(groupedAssets.value).forEach(([type, items]) => {
    totals[type] = items.reduce((sum, item) => {
      if (item.type === 'stock') {
        return sum + (parseFloat(item.value) || (parseFloat(item.quantity) * parseFloat(item.costPrice)));
      }
      return sum + parseFloat(item.value || 0);
    }, 0);
  });
  
  return totals;
});

// 各类型资产的占比
const typePercents = computed(() => {
  const percents = {};
  const total = totalAssetsValue.value;
  
  Object.entries(typeTotals.value).forEach(([type, value]) => {
    percents[type] = total > 0 ? (value / total * 100).toFixed(1) : 0;
  });
  
  return percents;
});

// 黄金资产总价值
const goldTotal = computed(() => {
  return goldAssets.value.reduce((sum, gold) => sum + (gold.grams * currentGoldPrice.value), 0);
});

// 黄金资产总克数
const goldGrams = computed(() => {
  return goldAssets.value.reduce((sum, gold) => sum + parseFloat(gold.grams || 0), 0).toFixed(2);
});

// 黄金资产占比
const goldPercent = computed(() => {
  const total = totalAssetsValue.value;
  return total > 0 ? (goldTotal.value / total * 100).toFixed(1) : 0;
});

// 按账户分组的资产
const accountGroups = computed(() => {
  const groups = [];
  const accountMap = new Map();
  
  // 首先处理账户数据
  accounts.value.forEach(account => {
    accountMap.set(account.id, {
      id: account.id,
      name: account.name,
      type: account.type,
      typeConfig: accountTypes[account.type] || accountTypes.bank,
      assets: [],
      goldAssets: [],
      subTypeGroups: {}
    });
  });
  
  // 处理普通资产
  assets.value.forEach(asset => {
    const accountId = asset.accountId || asset.id;
    
    // 如果资产没有关联账户，创建一个新的账户条目
    if (!accountMap.has(accountId)) {
      const accountType = asset.accountType || 'bank';
      accountMap.set(accountId, {
        id: accountId,
        name: asset.accountName || asset.name,
        type: accountType,
        typeConfig: accountTypes[accountType] || accountTypes.bank,
        assets: [],
        goldAssets: [],
        subTypeGroups: {}
      });
    }
    
    const account = accountMap.get(accountId);
    account.assets.push(asset);
    
    // 按子类型分组
    const subType = asset.subType || 'current';
    if (!account.subTypeGroups[subType]) {
      account.subTypeGroups[subType] = [];
    }
    account.subTypeGroups[subType].push(asset);
  });
  
  // 处理黄金资产
  goldAssets.value.forEach(gold => {
    const accountId = gold.accountId || null;
    
    if (accountId && accountMap.has(accountId)) {
      accountMap.get(accountId).goldAssets.push(gold);
    }
  });
  
  // 计算每个账户的总价值
  accountMap.forEach(account => {
    // 先从账户本身获取余额
    const accountBalance = accounts.value.find(a => a.id === account.id)?.balance || 0;
    
    // 再加上资产价值
    const assetsValue = account.assets.reduce((sum, a) => sum + parseFloat(a.value || 0), 0) + parseFloat(accountBalance || 0);
    const goldValue = account.goldAssets.reduce((sum, g) => sum + (g.grams * currentGoldPrice.value), 0);
    
    account.assetsValue = assetsValue;
    account.goldValue = goldValue;
    account.totalValue = assetsValue + goldValue;
    
    groups.push(account);
  });
  
  return groups;
});

// 方法
async function loadData() {
  console.log('开始加载数据');
  try {
    assets.value = await getAllAssets();
    console.log('加载资产数据成功:', assets.value.length);
    goldAssets.value = await getAllGoldAssets();
    console.log('加载黄金资产数据成功:', goldAssets.value.length);
    debts.value = await getAllDebts();
    console.log('加载负债数据成功:', debts.value.length);
    accounts.value = await getAllAccounts();
    console.log('加载账户数据成功:', accounts.value.length);
    funds.value = await getAllFunds();
    console.log('加载基金数据成功:', funds.value.length);

    // 等待DOM更新后渲染图表
    await nextTick();
    renderAssetChart();
    renderDebtChart();
  } catch (error) {
    console.error('加载数据失败:', error);
    // 即使加载失败，也要确保数据为数组，避免后续操作出错
    assets.value = [];
    goldAssets.value = [];
    debts.value = [];
    accounts.value = [];
    funds.value = [];
  }
}

// 渲染资产饼图
function renderAssetChart() {
  const canvas = document.getElementById('assetChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 计算资产数据
  const assetData = [];
  const assetLabels = [];
  const assetColors = [];
  
  // 银行存款
  const bankTotal = bankAssets.value;
  if (bankTotal > 0) {
    assetLabels.push('银行存款');
    assetData.push(bankTotal);
    assetColors.push('#48bb78');
  }
  
  // 基金投资
  const fundTotal = fundAssets.value;
  if (fundTotal > 0) {
    assetLabels.push('基金投资');
    assetData.push(fundTotal);
    assetColors.push('#ed8936');
  }
  
  // 黄金资产
  const goldTotal = goldAssetValue.value;
  if (goldTotal > 0) {
    assetLabels.push('黄金资产');
    assetData.push(goldTotal);
    assetColors.push('#ecc94b');
  }
  
  // 其他资产（非银行、非基金的资产）
  const otherTotal = otherAssets.value;
  if (otherTotal > 0) {
    assetLabels.push('其他资产');
    assetData.push(otherTotal);
    assetColors.push('#4299e1');
  }
  
  // 如果没有数据，显示空状态
  if (assetData.length === 0) {
    assetLabels.push('暂无资产');
    assetData.push(1);
    assetColors.push('#e2e8f0');
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
          position: 'bottom'
        },
        title: {
          display: true,
          text: '资产分布'
        }
      }
    }
  });
}

// 渲染负债饼图
function renderDebtChart() {
  const canvas = document.getElementById('debtChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 计算负债数据
  const debtData = [];
  const debtLabels = [];
  const debtColors = [];
  
  // 房贷
  const mortgageTotal = mortgageDebt.value;
  if (mortgageTotal > 0) {
    debtLabels.push('房贷');
    debtData.push(mortgageTotal);
    debtColors.push('#9f7aea');
  }
  
  // 车贷
  const carTotal = carDebt.value;
  if (carTotal > 0) {
    debtLabels.push('车贷');
    debtData.push(carTotal);
    debtColors.push('#4299e1');
  }
  
  // 信用卡
  const creditCardTotal = debts.value
    .filter(d => d.type === 'credit_card')
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  if (creditCardTotal > 0) {
    debtLabels.push('信用卡');
    debtData.push(creditCardTotal);
    debtColors.push('#ecc94b');
  }
  
  // 其他负债
  const otherTotal = debts.value
    .filter(d => d.type !== 'mortgage' && d.type !== 'car_loan' && d.type !== 'credit_card')
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  if (otherTotal > 0) {
    debtLabels.push('其他负债');
    debtData.push(otherTotal);
    debtColors.push('#f56565');
  }
  
  // 如果没有数据，显示空状态
  if (debtData.length === 0) {
    debtLabels.push('暂无负债');
    debtData.push(1);
    debtColors.push('#e2e8f0');
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

function switchAssetView(view) {
  currentAssetView.value = view;
}

function getAssetTypeName(subType) {
  return assetSubTypes[subType]?.name || '其他';
}

function getAccountTypeName(type) {
  return accountTypes[type]?.name || '其他';
}

function getDebtTypeName(type) {
  return debtTypes[type] || '其他';
}

function getAccountAssets(accountId) {
  return assets.value.filter(asset => asset.accountId === accountId);
}

// 账户管理
function openAccountModal() {
  console.log('打开账户弹窗');
  accountForm.value = {
    name: '',
    type: 'bank',
    balance: 0,
    remark: ''
  };
  showAccountModal.value = true;
  console.log('弹窗状态:', showAccountModal.value);
}

function closeAccountModal() {
  showAccountModal.value = false;
}

async function saveAccount() {
  const account = {
    id: generateId(),
    name: accountForm.value.name,
    type: accountForm.value.type,
    balance: accountForm.value.balance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remark: accountForm.value.remark
  };
  
  await saveAccountFromService(account);
  
  // 同时创建对应的资产记录，这样账户余额就能显示在资产列表中
  const asset = {
    id: generateId(),
    name: accountForm.value.name,
    type: 'account',
    subType: 'current',
    accountId: account.id,
    accountName: accountForm.value.name,
    accountType: accountForm.value.type,
    value: accountForm.value.balance,
    rate: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remark: accountForm.value.remark
  };
  
  await saveAssetFromService(asset);
  await loadData();
  closeAccountModal();
}

// 资产管理
function openAssetModal() {
  console.log('打开资产弹窗');
  isEditingAsset.value = false;
  const defaultAccount = accounts.value[0];
  assetForm.value = {
    id: '',
    name: '',
    type: '',
    subType: 'current',
    accountId: defaultAccount?.id || '',
    accountName: defaultAccount?.name || '',
    accountType: defaultAccount?.type || '',
    value: 0,
    grams: 0,
    paymentSource: '',
    rate: '',
    maturityDate: '',
    remark: ''
  };
  showAssetModal.value = true;
  console.log('弹窗状态:', showAssetModal.value);
}

function closeAssetModal() {
  showAssetModal.value = false;
}

function editAsset(asset) {
  isEditingAsset.value = true;
  console.log('编辑资产，原始数据:', asset);
  assetForm.value = {
    id: asset.id || '',
    name: asset.name || '',
    type: asset.type || '',
    subType: asset.subType || 'current',
    accountId: asset.accountId || '',
    accountName: asset.accountName || '',
    accountType: asset.accountType || '',
    value: asset.value || 0,
    rate: asset.rate || '',
    maturityDate: asset.maturityDate || '',
    remark: asset.remark || '',
    grams: asset.grams || 0,
    paymentSource: asset.paymentSource || ''
  };
  console.log('编辑资产，表单数据:', assetForm.value);
  showAssetModal.value = true;
}

async function saveAsset() {
  const asset = {
    ...assetForm.value,
    updatedAt: new Date().toISOString()
  };
  
  console.log('保存资产，isEditingAsset:', isEditingAsset.value);
  console.log('保存资产，asset.id:', asset.id);
  
  // 只有在新增模式下且id为空时才生成新ID
  if (!isEditingAsset.value && (!asset.id || asset.id === '')) {
    asset.id = generateId();
    asset.createdAt = new Date().toISOString();
    console.log('生成新ID:', asset.id);
  }
  
  // 处理黄金资产
  if (asset.subType === 'gold') {
    asset.value = asset.grams * currentGoldPrice.value;
    await saveGoldAssetFromService(asset, isEditingAsset.value);
  } else {
    await saveAssetFromService(asset, isEditingAsset.value);
  }
  
  await loadData();
  closeAssetModal();
}

async function deleteAsset(assetId) {
  if (confirm('确定要删除这个资产吗？')) {
    // 先尝试删除普通资产
    await deleteAssetFromService(assetId);
    // 再尝试删除黄金资产
    await deleteGoldAssetFromService(assetId);
    await loadData();
  }
}

// 黄金资产管理
function editGoldAsset(goldAsset) {
  isEditingAsset.value = true;
  assetForm.value = {
    ...goldAsset,
    subType: 'gold',
    grams: goldAsset.grams || 0,
    paymentSource: goldAsset.paymentSource || ''
  };
  showAssetModal.value = true;
}

async function deleteGoldAsset(goldId) {
  if (confirm('确定要删除这个黄金资产吗？')) {
    await deleteGoldAssetFromService(goldId);
    await loadData();
  }
}

// 负债管理
function openDebtModal() {
  console.log('打开负债弹窗');
  isEditingDebt.value = false;
  debtForm.value = {
    id: '',
    name: '',
    type: 'mortgage',
    amount: 0,
    rate: '',
    term: '',
    monthly: '',
    remark: ''
  };
  showDebtModal.value = true;
  console.log('弹窗状态:', showDebtModal.value);
}

function closeDebtModal() {
  showDebtModal.value = false;
}

function editDebt(debt) {
  isEditingDebt.value = true;
  debtForm.value = { ...debt };
  showDebtModal.value = true;
}

async function saveDebt() {
  const debt = {
    ...debtForm.value,
    updatedAt: new Date().toISOString()
  };
  
  if (!debt.id) {
    debt.id = generateId();
    debt.createdAt = new Date().toISOString();
  }
  
  await saveDebtFromService(debt);
  await loadData();
  closeDebtModal();
}

async function deleteDebt(debtId) {
  if (confirm('确定要删除这个负债吗？')) {
    await deleteDebtFromService(debtId);
    await loadData();
  }
}

// 编辑账户名称
function editAccountName(accountId) {
  const newName = prompt('请输入新的账户名称:');
  if (newName && newName.trim()) {
    const trimmedName = newName.trim();
    
    // 更新所有属于该账户的资产的 accountName
    assets.value.forEach(asset => {
      if (asset.accountId === accountId || asset.id === accountId) {
        asset.accountName = trimmedName;
        saveAssetFromService(asset);
      }
    });
    
    // 更新黄金资产的 accountName
    goldAssets.value.forEach(gold => {
      if (gold.accountId === accountId) {
        gold.accountName = trimmedName;
        saveGoldAssetFromService(gold);
      }
    });
    
    loadData();
    alert('账户名称修改成功');
  }
}

// 工具函数
function formatCurrency(amount) {
  return '¥' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

// 生命周期
onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 组件样式已在全局style.css中定义 */
</style>