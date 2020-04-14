const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const DownloaderModule = require('./lib/DownloaderModule');
const DownloadPipeline = require('./lib/DownlodPipeline');
const puppeteer = require('puppeteer-extra');
const MiniSearch = require('minisearch');

puppeteer.use(StealthPlugin());

module.exports = {
    module: DownloaderModule,
    DownloadPipeline: DownloadPipeline,
    MiniSearch: MiniSearch,
    puppeteer: puppeteer
};
