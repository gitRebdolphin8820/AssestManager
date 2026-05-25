<template>
  <div class="chat-widget">
    <!-- 悬浮按钮 -->
    <div
      v-if="!isOpen"
      class="chat-float-btn"
      @click="toggleChat"
    >
      <i class="fas fa-robot"></i>
      <span class="chat-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <!-- 遮罩层 -->
    <div
      v-if="isOpen"
      class="chat-overlay"
      @click="toggleChat"
    ></div>

    <!-- 侧边栏聊天窗口 -->
    <div
      v-if="isOpen"
      class="chat-sidebar"
      :class="{ 'is-open': isOpen }"
    >
      <!-- 头部 -->
      <div class="chat-header">
        <div class="chat-title">
          <i class="fas fa-robot"></i>
          <span>AI 财务助手</span>
        </div>
        <div class="chat-actions">
          <button class="chat-btn" @click="clearChat" title="清空对话">
            <i class="fas fa-trash"></i>
          </button>
          <button class="chat-btn" @click="toggleChat" title="关闭">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="chat-welcome">
          <i class="fas fa-robot"></i>
          <p>你好！我是你的 AI 财务助手</p>
          <p class="chat-hint">可以问我关于资产配置、理财建议等问题</p>
          <div class="quick-questions">
            <button v-for="q in quickQuestions" :key="q" @click="sendQuickMessage(q)">
              {{ q }}
            </button>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['chat-message', msg.role]"
        >
          <div class="message-avatar">
            <i :class="msg.role === 'user' ? 'fas fa-user' : 'fas fa-robot'"></i>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div class="message-time">{{ formatTime(msg.time) }}</div>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="chat-message assistant">
          <div class="message-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="message-content">
            <div class="message-loading">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input-area">
        <textarea
          v-model="inputMessage"
          placeholder="输入你的问题..."
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading"
          rows="1"
        ></textarea>
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isLoading"
        >
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';

// 状态
const isOpen = ref(false);
const inputMessage = ref('');
const messages = ref([]);
const isLoading = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref(null);

// localStorage 键名
const STORAGE_KEY = 'asset_manager_chat_history';
const MAX_MESSAGES = 100; // 最多保存 100 条消息

// 快捷问题
const quickQuestions = [
  '分析我的财务状况',
  '我的资产配置合理吗？',
  '有什么理财建议？',
  '我的负债率高吗？'
];

// 切换聊天窗口
function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    unreadCount.value = 0;
    scrollToBottom();
  }
}

// 发送快捷消息
function sendQuickMessage(text) {
  inputMessage.value = text;
  sendMessage();
}

// 发送消息
async function sendMessage() {
  const text = inputMessage.value.trim();
  if (!text || isLoading.value) return;

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text,
    time: new Date()
  });

  inputMessage.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    // 调用后端 API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history: messages.value.slice(0, -1) // 不包含刚添加的用户消息
      })
    });

    if (!response.ok) {
      throw new Error('请求失败');
    }

    const data = await response.json();

    // 添加 AI 回复
    messages.value.push({
      role: 'assistant',
      content: data.reply,
      time: new Date()
    });

    // 保存到 localStorage
    saveChatHistory();
  } catch (error) {
    console.error('Chat error:', error);
    // 添加错误消息
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我暂时无法回答。请稍后再试。',
      time: new Date()
    });

    // 保存到 localStorage
    saveChatHistory();
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
}

// 清空对话
function clearChat() {
  if (confirm('确定要清空所有对话吗？')) {
    messages.value = [];
    // 清除 localStorage
    localStorage.removeItem(STORAGE_KEY);
  }
}

// 保存对话历史到 localStorage
function saveChatHistory() {
  try {
    // 只保留最近的消息
    const messagesToSave = messages.value.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
  } catch (e) {
    console.error('保存对话历史失败:', e);
    // 如果存储失败（可能是空间不足），清除旧数据
    if (e.name === 'QuotaExceededError') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// 格式化消息（将 Markdown 转换为 HTML）
function formatMessage(text) {
  if (!text) return '';

  // 先处理表格（需要在换行之前处理）
  let html = formatMarkdownTable(text);

  html = html
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 列表项
    .replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>')
    // 换行
    .replace(/\n/g, '<br>');

  // 包裹连续的 li 元素
  html = html.replace(/(<li>.*<\/li>)(<br>)*\1/g, '<ul>$1</ul>');

  return html;
}

// 处理 Markdown 表格
function formatMarkdownTable(text) {
  // 匹配表格块（以 | 开头和结尾的行）
  const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g;

  return text.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n');
    if (lines.length < 2) return match;

    // 解析表头
    const headerCells = lines[0].split('|').filter(cell => cell.trim() !== '');

    // 跳过分隔线（第二行）
    // 解析数据行
    const dataRows = lines.slice(2).map(line => {
      return line.split('|').filter(cell => cell.trim() !== '');
    }).filter(row => row.length > 0);

    // 构建 HTML 表格
    let tableHtml = '<table class="md-table">';

    // 表头
    tableHtml += '<thead><tr>';
    headerCells.forEach(cell => {
      tableHtml += `<th>${cell.trim()}</th>`;
    });
    tableHtml += '</tr></thead>';

    // 表体
    tableHtml += '<tbody>';
    dataRows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach(cell => {
        tableHtml += `<td>${cell.trim()}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    return tableHtml;
  });
}

// 格式化时间
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// 加载历史记录
onMounted(() => {
  // 从 localStorage 加载历史对话
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // 恢复时间对象（JSON 解析后时间是字符串）
      messages.value = parsed.map(msg => ({
        ...msg,
        time: new Date(msg.time)
      }));
      console.log('已加载历史对话:', messages.value.length, '条消息');
    } catch (e) {
      console.error('加载历史记录失败:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    // 在移动设备上自动关闭
    if (window.innerWidth <= 768 && isOpen.value) {
      isOpen.value = false;
    }
  });
});
</script>

<style scoped>
.chat-widget {
  position: fixed;
  z-index: 1000;
}

/* 悬浮按钮 */
.chat-float-btn {
  position: fixed;
  right: 30px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1001;
}

.chat-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.chat-float-btn i {
  font-size: 24px;
  color: white;
}

.chat-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4757;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* 遮罩层 */
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 侧边栏聊天窗口 */
.chat-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 450px;
  height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-sidebar {
    width: 100%;
  }
}

/* 头部 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 16px;
}

.chat-title i {
  font-size: 20px;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.chat-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.chat-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 欢迎界面 */
.chat-welcome {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
}

.chat-welcome i {
  font-size: 48px;
  color: #667eea;
  margin-bottom: 16px;
}

.chat-welcome p {
  margin: 0;
  font-size: 16px;
  color: #2d3748;
  font-weight: 500;
}

.chat-hint {
  font-size: 14px !important;
  color: #718096 !important;
  margin-top: 8px !important;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}

.quick-questions button {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #4a5568;
  transition: all 0.2s;
  text-align: left;
}

.quick-questions button:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateX(4px);
}

/* 消息气泡 */
.chat-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
}

.chat-message.user .message-avatar {
  background: #48bb78;
}

.message-content {
  max-width: calc(100% - 60px);
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

.chat-message.assistant .message-text {
  background: white;
  color: #2d3748;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: #a0aec0;
  margin-top: 4px;
  text-align: right;
}

/* Markdown 样式 */
.message-text h1,
.message-text h2,
.message-text h3 {
  margin: 16px 0 10px 0;
  font-weight: 600;
  color: #2d3748;
}

.message-text h1 {
  font-size: 18px;
}

.message-text h2 {
  font-size: 16px;
}

.message-text h3 {
  font-size: 14px;
}

.message-text strong {
  font-weight: 600;
  color: #667eea;
}

.message-text ul {
  margin: 10px 0;
  padding-left: 24px;
  list-style-type: disc;
}

.message-text li {
  margin: 6px 0;
}

.message-text code {
  background: #edf2f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.message-text pre {
  background: #2d3748;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text pre code {
  background: transparent;
  padding: 0;
}

/* Markdown 表格样式 */
.message-text .md-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-text .md-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-text .md-table th,
.message-text .md-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.message-text .md-table th {
  font-weight: 600;
}

.message-text .md-table tbody tr:last-child td {
  border-bottom: none;
}

.message-text .md-table tbody tr:hover {
  background: #f7fafc;
}

/* 输入框区域 */
.chat-input-area {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: all 0.2s;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;
}

.chat-input-area textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.chat-input-area textarea:disabled {
  background: #f7fafc;
  cursor: not-allowed;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载动画 */
.message-loading {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.message-loading span {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.message-loading span:nth-child(1) {
  animation-delay: -0.32s;
}

.message-loading span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
