const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'asset_manager',
    password: '328814',
    port: 5432,
});

async function checkTable() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'funds'
            ORDER BY ordinal_position
        `);
        console.log('funds 表结构:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
    } catch (err) {
        console.error('查询错误:', err);
    } finally {
        pool.end();
    }
}

checkTable();
