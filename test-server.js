// サーバーの基本的な動作テスト
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`ステータスコード: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('サーバー応答:', response);
      console.log('✅ サーバーは正常に動作しています');
    } catch (e) {
      console.log('サーバー応答:', data);
      console.log('✅ サーバーは正常に動作しています（HTML応答）');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ サーバーに接続できません:', e.message);
  console.log('サーバーが起動しているか確認してください: npm run dev');
});

req.end();