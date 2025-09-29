/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Configure Turbopack root to this app directory to avoid wrong workspace detection
  turbopack: {
    root: path.resolve(__dirname)
  }
}

module.exports = nextConfig
