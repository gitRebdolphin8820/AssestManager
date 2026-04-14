// server.js
// 引入必要的依赖
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

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
    password: '328814',         // 数据库密码
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
        const updateDate = updateDate !== undefined ? updateDate : current.update_date;
        const updateRemark = remark !== undefined ? remark : current.remark;
        
        const result = await pool.query(
            'UPDATE funds SET name = $1, code = $2, type = $3, is_fixed = $4, cost_nav = $5, shares = $6, cost_amount = $7, current_nav = $8, sell_nav = $9, sell_shares = $10, update_date = $11, remark = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *',
            [updateName, updateCode, updateType, updateIsFixed, updateCostNav, updateShares, updateCostAmount, updateCurrentNav, updateSellNav, updateSellShares, updateDate, updateRemark, id]
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

// 启动服务
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`后端服务运行在 http://localhost:${PORT}`);
});