<template>
  <div class="chat-widget">
    <!-- 悬浮按钮 -->
    <div v-if="!isOpen" class="chat-float-btn" @click="toggleChat">
      <i class="fas fa-robot"></i>
      <span class="chat-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <!-- 聊天窗口 -->
    <div
      v-else
      class="chat-window"
      :style="{ right: position.right + 'px', bottom: position.bottom + 'px' }"
    >
      <!-- 头部 -->
      <div class="chat-header" @mousedown="startDrag">
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

// 拖拽相关状态
const position = ref({ right: 30, bottom: 100 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

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

// 开始拖拽
function startDrag(e) {
  // 只有左键可以拖拽
  if (e.button !== 0) return;

  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  };

  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  // 防止选中文本
  e.preventDefault();
}

// 拖拽中
function onDrag(e) {
  if (!isDragging.value) return;

  const deltaX = dragOffset.value.x - e.clientX;
  const deltaY = dragOffset.value.y - e.clientY;

  position.value.right += deltaX;
  position.value.bottom += deltaY;

  // 限制位置不能超出视窗
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const chatWidth = 380;
  const chatHeight = 500;

  position.value.right = Math.max(0, Math.min(position.value.right, windowWidth - chatWidth));
  position.value.bottom = Math.max(0, Math.min(position.value.bottom, windowHeight - chatHeight));

  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  };
}

// 停止拖拽
function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
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
  } catch (error) {
    console.error('Chat error:', error);
    messages.value.push({
      role: 'assistant',
      content: '抱歉，我暂时无法回答，请稍后再试。',
      time: new Date()
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
}

// 清空对话
function clearChat() {
  if (confirm('确定要清空对话历史吗？')) {
    messages.value = [];
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

// 格式化消息（简单的换行处理）
function formatMessage(text) {
  return text.replace(/\n/g, '<br>');
}

// 格式化时间
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// 加载历史记录（预留功能）
onMounted(() => {
  // TODO: 从 localStorage 或后端加载历史对话
  const saved = localStorage.getItem('chat_history');
  if (saved) {
    try {
      messages.value = JSON.parse(saved);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  }
});

// 保存历史记录（预留功能）
// watch(messages, (newVal) => {
//   localStorage.setItem('chat_history', JSON.stringify(newVal));
// }, { deep: true });
</script>

<style scoped>
/* 悬浮按钮 */
.chat-float-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1000;
}

.chat-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.chat-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  background: #f56565;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 聊天窗口 */
.chat-window {
  position: fixed;
  width: 380px;
  height: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

/* 头部 */
.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.chat-header:hover {
  background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
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
  background: #f7fafc;
}

.chat-welcome {
  text-align: center;
  padding: 40px 20px;
  color: #4a5568;
}

.chat-welcome i {
  font-size: 48px;
  color: #667eea;
  margin-bottom: 16px;
}

.chat-welcome p {
  margin: 8px 0;
}

.chat-hint {
  font-size: 14px;
  color: #718096;
}

.quick-questions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.quick-questions button {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-questions button:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* 消息气泡 */
.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-message.assistant .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.chat-message.user .message-avatar {
  background: #48bb78;
  color: white;
}

.message-content {
  max-width: 70%;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
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

/* 加载动画 */
.message-loading {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.message-loading span {
  width: 8px;
  height: 8px;
  background: #cbd5e0;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.message-loading span:nth-child(1) { animation-delay: -0.32s; }
.message-loading span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 输入区域 */
.chat-input-area {
  padding: 16px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input-area textarea:focus {
  border-color: #667eea;
}

.send-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
