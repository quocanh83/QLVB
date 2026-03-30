const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/api', '/media'],
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      // Tăng thời gian chờ lên 5 phút (300,000ms) để xử lý các file PDF dài
      proxyTimeout: 300000,
      timeout: 300000,
      // Đảm bảo không gặp lỗi SSL/TLS nếu sau này chuyển sang HTTPS dev
      secure: false
    })
  );
};

