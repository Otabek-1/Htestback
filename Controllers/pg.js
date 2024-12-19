const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xqbhpmfdckbdssepvdlp:10010512111111497@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: {
    rejectUnauthorized: false // SSL ulanishi uchun talab
  }
});

// Ulanishni tekshirish
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Ulanishda xatolik:', err.stack);
  }
  console.log('Supabase PostgreSQL maʼlumotlar bazasiga muvaffaqiyatli ulandi!');
  release();
});


module.exports = pool;
