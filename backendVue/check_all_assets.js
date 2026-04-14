const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'asset_manager',
    password: '328814',
    port: 5432,
});

async function checkAssets() {
    try {
        const result = await pool.query('SELECT id, name, type, sub_type, value FROM assets');
        console.log('所有资产:');
        result.rows.forEach(row => {
            console.log(row);
        });
    } catch (err) {
        console.error('查询错误:', err);
    } finally {
        pool.end();
    }
}

checkAssets();
