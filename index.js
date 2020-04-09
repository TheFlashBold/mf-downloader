const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteer = require('puppeteer-extra');

puppeteer.use(StealthPlugin());

module.exports = {
    module: require('./lib/DownloaderModule'),
    DownloadPipeline: require('./lib/DownlodPipeline'),
    MiniSearch: require('minisearch'),
    puppeteer: puppeteer
};
