// server.js
// 引入必要的依赖
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

// 加载环境变量（如果存在 .env 文件）
try {
    require('dotenv').config();
} catch (e) {
    console.log('未安装 dotenv，使用系统环境变量');
}

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());           // 允许前端跨域访问
app.use(express.json());   // 解析JSON数据

// 连接PostgreSQL数据库
const pool = new Pool({
    user: 'postgres',           // 数据库用户名
    host: 'localhost',          // 数据库主机地址
    database: 'asset_manager',  // 数据库名称
    password: '123789',         // 数据库密码
    port: 5432,                 // 数据库端口
});

// 工具函数：将驼峰命名转换为蛇形命名（用于数据库操作）
function camelToSnake(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => camelToSnake(item));
    }
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            result[snakeKey] = camelToSnake(obj[key]);
        }
    }
    return result;
}

// 工具函数：将蛇形命名转换为驼峰命名（用于返回给前端）
function snakeToCamel(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => snakeToCamel(item));
    }
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return result;
}

// 检查并创建数据库表结构
async function checkAndCreateTables() {
    const client = await pool.connect();
    try {
        // 1. 创建账户表
        await client.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id VARCHAR(50) PRIMARY KEY,              -- 账户ID
                name VARCHAR(100) NOT NULL,              -- 账户名称
                type VARCHAR(50) NOT NULL,              -- 账户类型（bank, wallet等）
                balance DECIMAL(15,2) DEFAULT 0,         -- 账户余额
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
                remark TEXT                              -- 备注
            )
        `);

        // 2. 创建资产表
        await client.query(`
            CREATE TABLE IF NOT EXISTS assets (
                id VARCHAR(50) PRIMARY KEY,              -- 资产ID
                name VARCHAR(100) NOT NULL,              -- 资产名称
                type VARCHAR(50) NOT NULL,              -- 资产类型
                sub_type VARCHAR(50),                    -- 资产子类型
                value DECIMAL(15,2) DEFAULT 0,           -- 资产价值
                account_id VARCHAR(50) REFERENCES accounts(id),  -- 所属账户ID
                account_name VARCHAR(100),               -- 所属账户名称
                account_type VARCHAR(50),                -- 所属账户类型
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
                remark TEXT                              -- 备注
            )
        `);

        // 3. 创建交易表
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(50) PRIMARY KEY,              -- 交易ID
                type VARCHAR(50) NOT NULL,              -- 交易类型（income, expense等）
                amount DECIMAL(15,2) NOT NULL,           -- 交易金额
                from_asset_id VARCHAR(50) REFERENCES assets(id),  -- 来源资产ID
                to_asset_id VARCHAR(50) REFERENCES assets(id),    -- 目标资产ID
                category VARCHAR(100),                   -- 交易分类
                description TEXT,                        -- 交易描述
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- 更新时间
            )
        `);

        // 4. 创建黄金资产表
        await client.query(`
            CREATE TABLE IF NOT EXISTS gold_assets (
                id VARCHAR(50) PRIMARY KEY,              -- 黄金资产ID
                name VARCHAR(100) NOT NULL,              -- 黄金资产名称
                grams DECIMAL(10,2) NOT NULL,            -- 黄金克数
                purity DECIMAL(5,2) DEFAULT 99.99,       -- 黄金纯度
                account_id VARCHAR(50) REFERENCES accounts(id),  -- 所属账户ID
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
                remark TEXT                              -- 备注
            )
        `);

        // 5. 创建负债表
        await client.query(`
            CREATE TABLE IF NOT EXISTS debts (
                id VARCHAR(50) PRIMARY KEY,              -- 负债ID
                name VARCHAR(100) NOT NULL,              -- 负债名称
                amount DECIMAL(15,2) NOT NULL,           -- 负债金额
                type VARCHAR(50),                        -- 负债类型（mortgage, car_loan等）
                due_date DATE,                           -- 到期日期
                interest_rate DECIMAL(5,2),              -- 利率
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
                remark TEXT                              -- 备注
            )
        `);

        // 6. 创建基金表
        await client.query(`
            CREATE TABLE IF NOT EXISTS funds (
                id VARCHAR(50) PRIMARY KEY,              -- 基金ID
                name VARCHAR(100) NOT NULL,              -- 基金名称
                code VARCHAR(20) NOT NULL,               -- 基金代码
                type VARCHAR(50),                        -- 基金类型
                is_fixed BOOLEAN DEFAULT false,          -- 是否固定收益
                cost_nav DECIMAL(10,4) DEFAULT 0,        -- 成本净值
                shares DECIMAL(10,4) DEFAULT 0,          -- 持有份额
                cost_amount DECIMAL(15,2) DEFAULT 0,     -- 成本金额
                current_nav DECIMAL(10,4) DEFAULT 0,     -- 当前净值
                sell_nav DECIMAL(10,4) DEFAULT 0,        -- 卖出净值
                sell_shares DECIMAL(10,4) DEFAULT 0,     -- 卖出份额
                update_date DATE,                        -- 更新日期
                remark TEXT,                             -- 备注
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- 更新时间
            )
        `);

        // 6.1 检查并添加 funds 表的 remark 字段（兼容旧表）
        try {
            await client.query(`
                ALTER TABLE funds ADD COLUMN IF NOT EXISTS remark TEXT
            `);
            console.log('funds 表 remark 字段检查完成');
        } catch (err) {
            console.log('funds 表 remark 字段已存在或无需添加');
        }

        // 6.2 创建基金分组表
        await client.query(`
            CREATE TABLE IF NOT EXISTS fund_groups (
                id VARCHAR(50) PRIMARY KEY,              -- 分组ID
                name VARCHAR(100) NOT NULL,              -- 分组名称
                color VARCHAR(20) DEFAULT '#667eea',     -- 分组颜色
                sort_order INTEGER DEFAULT 0,            -- 排序顺序
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 6.3 检查并添加 funds 表的 group_id 字段（兼容旧表）
        try {
            await client.query(`
                ALTER TABLE funds ADD COLUMN IF NOT EXISTS group_id VARCHAR(50) REFERENCES fund_groups(id)
            `);
            console.log('funds 表 group_id 字段检查完成');
        } catch (err) {
            console.log('funds 表 group_id 字段已存在或无需添加');
        }

        // 7. 创建设置表
        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,                   -- 设置ID
                current_gold_price DECIMAL(10,2) DEFAULT 1000.00,  -- 当前金价
                default_account_id VARCHAR(50) REFERENCES accounts(id),  -- 默认账户ID
                currency VARCHAR(10) DEFAULT 'CNY',      -- 货币类型
                theme VARCHAR(20) DEFAULT 'light',       -- 主题
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新时间
            )
        `);

        console.log('数据库表检查和创建完成');
    } catch (err) {
        console.error('创建表失败:', err);
    } finally {
        client.release();
    }
}

// 初始化数据库表
checkAndCreateTables();

// ==================== API 接口 ====================

// 账户管理API
// 1. 获取所有账户
app.get('/api/accounts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM accounts ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新账户
app.post('/api/accounts', async (req, res) => {
    const { id, name, type, balance, remark } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO accounts (id, name, type, balance, remark) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, type, balance || 0, remark]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 更新账户信息
app.put('/api/accounts/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取账户ID
    const { name, type, balance, remark } = req.body;  // 从请求体中获取更新数据
    try {
        const result = await pool.query(
            'UPDATE accounts SET name = $1, type = $2, balance = $3, remark = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
            [name, type, balance, remark, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '账户不存在' });
        }
        
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 删除账户
app.delete('/api/accounts/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取账户ID
    try {
        await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 资产管理API
// 1. 获取所有资产
app.get('/api/assets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM assets ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新资产
app.post('/api/assets', async (req, res) => {
    const { id, name, type, subType, value, accountId, accountName, accountType, remark } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO assets (id, name, type, sub_type, value, account_id, account_name, account_type, remark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [id, name, type, subType, value || 0, accountId, accountName, accountType, remark]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 更新资产信息
app.put('/api/assets/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取资产ID
    const { name, type, subType, value, accountId, accountName, accountType, remark } = req.body;  // 从请求体中获取更新数据
    
    console.log('PUT /api/assets/' + id);
    console.log('请求体:', req.body);
    
    try {
        // 先查询现有记录
        console.log('查询现有记录...');
        const existing = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
        console.log('查询结果行数:', existing.rows.length);
        
        if (existing.rows.length === 0) {
            console.log('资产不存在');
            return res.status(404).json({ error: '资产不存在' });
        }
        
        const current = existing.rows[0];
        console.log('当前记录:', current);
        
        // 使用传入的值或保留原值
        const updateName = name !== undefined ? name : current.name;
        const updateType = type !== undefined ? type : current.type;
        const updateSubType = subType !== undefined ? subType : current.sub_type;
        const updateValue = value !== undefined ? value : current.value;
        const updateAccountId = accountId !== undefined ? accountId : current.account_id;
        const updateAccountName = accountName !== undefined ? accountName : current.account_name;
        const updateAccountType = accountType !== undefined ? accountType : current.account_type;
        const updateRemark = remark !== undefined ? remark : current.remark;
        
        console.log('更新值:', { updateName, updateType, updateSubType, updateValue, updateAccountId, updateAccountName, updateAccountType, updateRemark });
        
        const result = await pool.query(
            'UPDATE assets SET name = $1, type = $2, sub_type = $3, value = $4, account_id = $5, account_name = $6, account_type = $7, remark = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
            [updateName, updateType, updateSubType, updateValue, updateAccountId, updateAccountName, updateAccountType, updateRemark, id]
        );
        
        console.log('更新成功');
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        console.error('更新资产错误:', err);
        res.status(500).json({ error: err.message, detail: err.stack });
    }
});

// 4. 删除资产
app.delete('/api/assets/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取资产ID
    try {
        await pool.query('DELETE FROM assets WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 黄金资产管理API
// 1. 获取所有黄金资产
app.get('/api/gold-assets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gold_assets ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新黄金资产
app.post('/api/gold-assets', async (req, res) => {
    const { id, name, grams, purity, accountId, remark } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO gold_assets (id, name, grams, purity, account_id, remark) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, name, grams, purity || 99.99, accountId, remark]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 更新黄金资产信息
app.put('/api/gold-assets/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取黄金资产ID
    const { name, grams, purity, accountId, remark } = req.body;  // 从请求体中获取更新数据
    try {
        const result = await pool.query(
            'UPDATE gold_assets SET name = $1, grams = $2, purity = $3, account_id = $4, remark = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, grams, purity, accountId, remark, id]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 删除黄金资产
app.delete('/api/gold-assets/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取黄金资产ID
    try {
        await pool.query('DELETE FROM gold_assets WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 交易管理API
// 1. 获取所有交易
app.get('/api/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新交易
app.post('/api/transactions', async (req, res) => {
    const { id, type, amount, fromAssetId, toAssetId, category, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (id, type, amount, from_asset_id, to_asset_id, category, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, type, amount, fromAssetId, toAssetId, category, description]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 删除交易
app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取交易ID
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 负债管理API
// 1. 获取所有负债
app.get('/api/debts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM debts ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新负债
app.post('/api/debts', async (req, res) => {
    const { id, name, amount, type, dueDate, interestRate, remark } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO debts (id, name, amount, type, due_date, interest_rate, remark) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, name, amount, type, dueDate, interestRate, remark]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 更新负债信息
app.put('/api/debts/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取负债ID
    const { name, amount, type, dueDate, interestRate, remark } = req.body;  // 从请求体中获取更新数据
    try {
        const result = await pool.query(
            'UPDATE debts SET name = $1, amount = $2, type = $3, due_date = $4, interest_rate = $5, remark = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, amount, type, dueDate, interestRate, remark, id]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 删除负债
app.delete('/api/debts/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取负债ID
    try {
        await pool.query('DELETE FROM debts WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 基金管理API
// 1. 获取所有基金
app.get('/api/funds', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM funds ORDER BY created_at DESC');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建新基金
app.post('/api/funds', async (req, res) => {
    const { id, name, code, type, isFixed, costNav, shares, costAmount, currentNav, sellNav, sellShares, updateDate, remark } = req.body;
    
    console.log('POST /api/funds');
    console.log('请求体:', req.body);
    
    try {
        const result = await pool.query(
            'INSERT INTO funds (id, name, code, type, is_fixed, cost_nav, shares, cost_amount, current_nav, sell_nav, sell_shares, update_date, remark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [id, name, code, type, isFixed || false, costNav || 0, shares || 0, costAmount || 0, currentNav || 0, sellNav || 0, sellShares || 0, updateDate, remark]
        );
        console.log('创建基金成功');
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        console.error('创建基金错误:', err);
        res.status(500).json({ error: err.message, detail: err.stack });
    }
});

// 3. 更新基金信息
app.put('/api/funds/:id', async (req, res) => {
    const { id } = req.params;
    const { name, code, type, isFixed, costNav, shares, costAmount, currentNav, sellNav, sellShares, updateDate, remark } = req.body;
    
    console.log('PUT /api/funds/' + id);
    console.log('请求体:', req.body);
    
    try {
        // 先查询现有记录
        const existing = await pool.query('SELECT * FROM funds WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: '基金不存在' });
        }
        
        const current = existing.rows[0];
        
        // 使用传入的值或保留原值
        const updateName = name !== undefined ? name : current.name;
        const updateCode = code !== undefined ? code : current.code;
        const updateType = type !== undefined ? type : current.type;
        const updateIsFixed = isFixed !== undefined ? isFixed : current.is_fixed;
        const updateCostNav = costNav !== undefined ? costNav : current.cost_nav;
        const updateShares = shares !== undefined ? shares : current.shares;
        const updateCostAmount = costAmount !== undefined ? costAmount : current.cost_amount;
        const updateCurrentNav = currentNav !== undefined ? currentNav : current.current_nav;
        const updateSellNav = sellNav !== undefined ? sellNav : current.sell_nav;
        const updateSellShares = sellShares !== undefined ? sellShares : current.sell_shares;
        const finalUpdateDate = updateDate !== undefined ? updateDate : current.update_date;
        const updateRemark = remark !== undefined ? remark : current.remark;
        
        const result = await pool.query(
            'UPDATE funds SET name = $1, code = $2, type = $3, is_fixed = $4, cost_nav = $5, shares = $6, cost_amount = $7, current_nav = $8, sell_nav = $9, sell_shares = $10, update_date = $11, remark = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *',
            [updateName, updateCode, updateType, updateIsFixed, updateCostNav, updateShares, updateCostAmount, updateCurrentNav, updateSellNav, updateSellShares, finalUpdateDate, updateRemark, id]
        );
        
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        console.error('更新基金错误:', err);
        res.status(500).json({ error: err.message, detail: err.stack });
    }
});

// 4. 删除基金
app.delete('/api/funds/:id', async (req, res) => {
    const { id } = req.params;  // 从URL参数中获取基金ID
    try {
        await pool.query('DELETE FROM funds WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. 更新基金分组
app.put('/api/funds/:id/group', async (req, res) => {
    const { id } = req.params;
    const { groupId } = req.body;
    try {
        const result = await pool.query(
            'UPDATE funds SET group_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [groupId || null, id]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        console.error('更新基金分组错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 基金分组管理API
// 1. 获取所有分组
app.get('/api/fund-groups', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fund_groups ORDER BY sort_order, created_at');
        res.json(snakeToCamel(result.rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 创建分组
app.post('/api/fund-groups', async (req, res) => {
    const { id, name, color, sortOrder } = req.body;
    console.log('创建分组请求:', { id, name, color, sortOrder });
    try {
        const result = await pool.query(
            'INSERT INTO fund_groups (id, name, color, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, color || '#667eea', sortOrder || 0]
        );
        console.log('分组创建成功:', result.rows[0]);
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        console.error('创建分组失败:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. 更新分组
app.put('/api/fund-groups/:id', async (req, res) => {
    const { id } = req.params;
    const { name, color, sortOrder } = req.body;
    try {
        const result = await pool.query(
            'UPDATE fund_groups SET name = $1, color = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, color, sortOrder, id]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 删除分组
app.delete('/api/fund-groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 先将该分组下的基金设为未分组
        await pool.query('UPDATE funds SET group_id = NULL WHERE group_id = $1', [id]);
        // 删除分组
        await pool.query('DELETE FROM fund_groups WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 设置管理API
// 1. 获取设置（如果没有设置，会自动创建默认设置）
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        if (result.rows.length === 0) {
            // 初始化默认设置
            const defaultSettings = await pool.query(
                'INSERT INTO settings (current_gold_price, currency, theme) VALUES (1000.00, \'CNY\', \'light\') RETURNING *'
            );
            res.json(snakeToCamel(defaultSettings.rows[0]));
        } else {
            res.json(snakeToCamel(result.rows[0]));
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 更新设置
app.put('/api/settings', async (req, res) => {
    const { currentGoldPrice, defaultAccountId, currency, theme } = req.body;  // 从请求体中获取更新数据
    try {
        const result = await pool.query(
            'UPDATE settings SET current_gold_price = $1, default_account_id = $2, currency = $3, theme = $4, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1) RETURNING *',
            [currentGoldPrice, defaultAccountId, currency, theme]
        );
        res.json(snakeToCamel(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 基金净值爬取函数
async function crawlFundNav(fundCode) {
    try {
        const url = `https://fund.eastmoney.com/${fundCode}.html`;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        
        const response = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        // 提取基金名称
        const fundNameElem = $('.fundDetail-tit');
        const fundName = fundNameElem.text().split('(')[0].trim() || '未知名称';
        
        // 提取单位净值
        const dataItem = $('.dataItem01');
        if (!dataItem.length) {
            return { code: fundCode, name: fundName, nav: '-', date: '-' };
        }
        
        const netValue = dataItem.find('.ui-font-large').text().trim();
        const dateText = dataItem.find('dt').text();
        let netDate = '';
        
        // 解析日期
        const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            netDate = dateMatch[1];
        }
        
        return {
            code: fundCode,
            name: fundName,
            nav: netValue,
            date: netDate
        };
    } catch (error) {
        console.error(`爬取基金${fundCode}净值失败:`, error.message);
        return { code: fundCode, name: '爬取失败', nav: '-', date: '-' };
    }
}

// 基金净值更新API
app.get('/api/fund/nav', async (req, res) => {
    const { code } = req.query;  // 从查询参数中获取基金代码
    
    if (!code) {
        return res.status(400).json({ status: 'error', message: '请提供基金代码' });
    }
    
    try {
        // 爬取基金净值
        const fundData = await crawlFundNav(code);
        
        if (fundData.nav === '-') {
            return res.status(404).json({ 
                status: 'error', 
                message: `未找到基金${code}的净值数据` 
            });
        }
        
        // 更新数据库中的基金净值
        await pool.query(
            'UPDATE funds SET current_nav = $1, update_date = $2 WHERE code = $3',
            [fundData.nav, fundData.date, code]
        );
        
        res.json({ 
            status: 'success', 
            data: fundData
        });
    } catch (err) {
        console.error('获取基金净值错误:', err);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// ============================================
// AI 聊天接口（简单实现版本）
// ============================================

// Moonshot (Kimi) API 配置
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || '';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

// 模拟 AI 回复（当没有配置 API Key 时使用）
function getMockAIResponse(message, financialData) {
    const lowerMsg = message.toLowerCase();

    // 简单的关键词匹配
    if (lowerMsg.includes('财务状况') || lowerMsg.includes('分析')) {
        return `根据您的财务数据：\n\n` +
               `📊 总资产：${financialData.totalAssets} 元\n` +
               `💳 总负债：${financialData.totalDebts} 元\n` +
               `💎 净资产：${financialData.netWorth} 元\n` +
               `📈 资产负债率：${financialData.debtRatio}%\n\n` +
               `您的财务状况${financialData.debtRatio > 50 ? '需要关注，建议降低负债' : '较为健康'}。`;
    }

    if (lowerMsg.includes('资产配置') || lowerMsg.includes('合理')) {
        return `您的资产配置情况：\n\n` +
               `🏦 银行存款：${financialData.bankAssets} 元 (${financialData.bankPercent}%)\n` +
               `📈 基金投资：${financialData.fundAssets} 元 (${financialData.fundPercent}%)\n` +
               `🪙 黄金资产：${financialData.goldAssets} 元 (${financialData.goldPercent}%)\n\n` +
               `${financialData.fundPercent < 30 ? '建议适当增加基金投资比例，提高收益潜力。' : '基金配置比例适中。'}`;
    }

    if (lowerMsg.includes('建议') || lowerMsg.includes('理财')) {
        return `💡 理财建议：\n\n` +
               `1. 建立应急基金：保留 3-6 个月生活费在活期存款中\n` +
               `2. 分散投资：不要把所有资金放在单一资产类型\n` +
               `3. 定期复盘：每月检查一次资产配置情况\n` +
               `4. 控制负债：资产负债率建议控制在 50% 以下\n\n` +
               `需要更详细的建议，请告诉我您的具体目标（如购房、养老等）。`;
    }

    if (lowerMsg.includes('负债率') || lowerMsg.includes('负债')) {
        const ratio = financialData.debtRatio;
        let evaluation = '';
        if (ratio < 30) evaluation = '负债率较低，财务风险小。';
        else if (ratio < 50) evaluation = '负债率适中，注意控制。';
        else if (ratio < 70) evaluation = '负债率偏高，建议优先还债。';
        else evaluation = '负债率过高，需要立即调整！';

        return `您的资产负债率为 ${ratio}%。\n\n${evaluation}`;
    }

    // 默认回复
    return `您好！我是您的 AI 财务助手。\n\n` +
           `您可以问我：\n` +
           `• 分析我的财务状况\n` +
           `• 我的资产配置合理吗？\n` +
           `• 有什么理财建议？\n` +
           `• 我的负债率高吗？\n\n` +
           `当前财务概览：总资产 ${financialData.totalAssets} 元，净资产 ${financialData.netWorth} 元。`;
}

// 获取财务数据
async function getFinancialData() {
    const client = await pool.connect();
    try {
        // 1. assets 表中的资产（银行存款、定期存款等，不包括基金和黄金）
        const assetsResult = await client.query(
            "SELECT SUM(value) as total FROM assets WHERE sub_type NOT IN ('fund', 'money_market', 'yuebao', 'lingqianbao', 'gold')"
        );

        // 2. assets 表中的基金类资产
        const assetsFundResult = await client.query(
            "SELECT SUM(value) as total FROM assets WHERE sub_type IN ('fund', 'money_market', 'yuebao', 'lingqianbao')"
        );

        // 3. gold_assets 表中的黄金
        const goldResult = await client.query('SELECT SUM(grams) as total_grams FROM gold_assets');

        // 4. debts 表中的负债
        const debtsResult = await client.query('SELECT SUM(amount) as total FROM debts');

        // 5. funds 表中的基金市值 = 当前净值 * 持有份额
        const fundsResult = await client.query(
            'SELECT SUM(current_nav * (shares - sell_shares)) as total FROM funds WHERE current_nav > 0 AND shares > 0'
        );

        // 计算各类资产
        const baseAssets = parseFloat(assetsResult.rows[0].total || 0);
        const assetsFund = parseFloat(assetsFundResult.rows[0].total || 0);
        const goldGrams = parseFloat(goldResult.rows[0].total_grams || 0);
        const totalDebts = parseFloat(debtsResult.rows[0].total || 0);
        const fundsMarketValue = parseFloat(fundsResult.rows[0].total || 0);

        // 假设金价 1000 元/克计算黄金价值
        const goldPrice = 1000;
        const goldAssets = goldGrams * goldPrice;

        // 基金总资产 = assets 表中的基金 + funds 表中的基金
        const fundAssets = assetsFund + fundsMarketValue;

        // 银行存款（活期存款类型的资产）
        const bankResult = await client.query(
            "SELECT SUM(value) as total FROM assets WHERE sub_type IN ('current', 'fixed')"
        );
        const bankAssets = parseFloat(bankResult.rows[0].total || 0);

        // 总资产 = 基础资产 + 基金 + 黄金
        const totalWealth = baseAssets + fundAssets + goldAssets;
        const netWorth = totalWealth - totalDebts;
        const debtRatio = totalWealth > 0 ? ((totalDebts / totalWealth) * 100).toFixed(1) : 0;

        return {
            totalAssets: totalWealth.toFixed(2),
            totalDebts: totalDebts.toFixed(2),
            netWorth: netWorth.toFixed(2),
            debtRatio: debtRatio,
            bankAssets: bankAssets.toFixed(2),
            fundAssets: fundAssets.toFixed(2),
            goldAssets: goldAssets.toFixed(2),
            bankPercent: totalWealth > 0 ? ((bankAssets / totalWealth) * 100).toFixed(1) : 0,
            fundPercent: totalWealth > 0 ? ((fundAssets / totalWealth) * 100).toFixed(1) : 0,
            goldPercent: totalWealth > 0 ? ((goldAssets / totalWealth) * 100).toFixed(1) : 0
        };
    } catch (error) {
        console.error('获取财务数据失败:', error);
        // 返回默认值，避免接口报错
        return {
            totalAssets: '0.00',
            totalDebts: '0.00',
            netWorth: '0.00',
            debtRatio: '0',
            bankAssets: '0.00',
            fundAssets: '0.00',
            goldAssets: '0.00',
            bankPercent: '0',
            fundPercent: '0',
            goldPercent: '0'
        };
    } finally {
        client.release();
    }
}

// 调用真实 AI API（Moonshot/Kimi）
async function callMoonshotAPI(message, history, financialData) {
    // 构建系统提示词，包含用户的财务数据
    const systemPrompt = `你是专业的财务顾问，请根据用户的财务数据提供分析和建议。

用户当前财务状况：
- 总资产：${financialData.totalAssets} 元
- 总负债：${financialData.totalDebts} 元
- 净资产：${financialData.netWorth} 元
- 资产负债率：${financialData.debtRatio}%
- 银行存款：${financialData.bankAssets} 元（占比 ${financialData.bankPercent}%）
- 基金投资：${financialData.fundAssets} 元（占比 ${financialData.fundPercent}%）
- 黄金资产：${financialData.goldAssets} 元（占比 ${financialData.goldPercent}%）

请提供专业、实用的财务分析和建议，回答要简洁明了。`;

    // 构建消息历史
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
    ];

    console.log('调用 Moonshot API，消息数:', messages.length);

    try {
        // 调用 Moonshot API
        const response = await axios.post(`${MOONSHOT_BASE_URL}/chat/completions`, {
            model: 'kimi-k2.5',
            messages: messages
        }, {
            headers: {
                'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log('Moonshot API 响应:', response.data);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Moonshot API 错误详情:', error.response?.data || error.message);
        throw error;
    }
}

// AI 聊天接口
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        // 获取财务数据
        const financialData = await getFinancialData();

        let reply;

        // 如果有配置 API Key，调用真实 AI；否则使用模拟回复
        if (MOONSHOT_API_KEY && MOONSHOT_API_KEY.length > 10) {
            try {
                reply = await callMoonshotAPI(message, history, financialData);
                console.log('Moonshot AI 调用成功');
            } catch (apiError) {
                console.error('Moonshot AI 调用失败:', apiError.message);
                // API 调用失败时降级到模拟回复
                reply = getMockAIResponse(message, financialData);
                reply += '\n\n（注：AI 服务暂时不可用，已切换至本地模式）';
            }
        } else {
            // 没有配置 API Key，使用模拟回复
            reply = getMockAIResponse(message, financialData);
        }

        res.json({ reply });
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`后端服务运行在 http://localhost:${PORT}`);
});