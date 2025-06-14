/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 如果 Python API 路由在 Next.js 內部定義 (非獨立 Serverless Function)，可以這樣設定
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://127.0.0.1:5353/api/:path*' // 本地開發時指向 Python 開發伺服器
          : '/api/:path*', // 生產環境由 Vercel 處理
      },
    ]
  },
};

module.exports = nextConfig;