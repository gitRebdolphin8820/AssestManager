const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'asset_manager',
    password: '328814',
    port: 5432,
});

async function checkAsset() {
    try {
        const result = await pool.query('SELECT * FROM assets WHERE id = $1', ['id_1776132336413_u1bsg5oux']);
        console.log('查询结果:', result.rows);
    } catch (err) {
        console.error('查询错误:', err);
    } finally {
        pool.end();
    }
}

checkAsset();
