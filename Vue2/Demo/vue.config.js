const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  publicPath: './',
  chainWebpack:(config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "腾讯云即时通信 Web-IM";
      return args;
    });
  },
  transpileDependencies: true
})
