<template>
  <div class="container">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <div class="system-title">
        <i class="fas fa-wallet"></i> 个人资产管理系统
      </div>
      <div class="nav-tabs">
        <button 
          class="nav-tab" 
          :class="{ active: currentTab === 'transaction' }"
          @click="switchTab('transaction')"
        >
          <i class="fas fa-exchange-alt"></i> 交易管理
        </button>
        <button 
          class="nav-tab" 
          :class="{ active: currentTab === 'asset' }"
          @click="switchTab('asset')"
        >
          <i class="fas fa-gem"></i> 资产负债
        </button>
        <button 
          class="nav-tab" 
          :class="{ active: currentTab === 'fund' }"
          @click="switchTab('fund')"
        >
          <i class="fas fa-chart-bar"></i> 基金情况
        </button>
      </div>
    </div>

    <!-- 页面内容 -->
    <TransactionPage v-if="currentTab === 'transaction'" class="page-content active" />
    <AssetPage v-else-if="currentTab === 'asset'" class="page-content active" />
    <FundPage v-else-if="currentTab === 'fund'" class="page-content active" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TransactionPage from './components/TransactionPage.vue';
import AssetPage from './components/AssetPage.vue';
import FundPage from './components/FundPage.vue';
import { initData } from './services/dataService';

const currentTab = ref('transaction');

function switchTab(tab) {
  currentTab.value = tab;
}

onMounted(() => {
  // 初始化数据
  initData();
});
</script>

<style>
/* 全局样式已经在style.css中引入 */
</style>