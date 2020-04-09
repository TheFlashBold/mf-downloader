const {Application, Module, Modules: {Promise, readdirp, request}} = require('mf-lib');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const DownloadPipeline = require('./DownlodPipeline');
const puppeteer = require('puppeteer-extra');
const MiniSearch = require('minisearch');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

/**
 * @type DownloaderModule
 */
class DownloaderModule extends Module {
    _pipelines = {};
    _downloads = [];

    async init() {
        const modelPath = path.join(Application.dirname, 'downloader');
        if (!fs.existsSync(modelPath)) {
            return;
        }

        for await (const {fullPath, path: fileName} of readdirp(modelPath, {fileFilter: '*.js'})) {
            try {
                this._pipelines[fileName.replace('.js', '')] = require(fullPath);
            } catch (e) {
                this.log.error('failed to load pipeline', fileName, e);
            }
        }
    }

    async postInit() {
        const telegramModule = this.app.getModule('telegram');
        if (!telegramModule) {
            return;
        }
        const bot = telegramModule.getBot();
        if (bot) {
            bot.on('message', this.onTelegramMessage.bind(this, bot));
        }
    }

    async onTelegramMessage(bot, ctx) {
        const {text} = ctx.message;

        if (/\/search .*/.test(text)) {
            /*const [, query] = /\/search (.*)/.exec(text);
            const results = await this.search(query);
            for (let {pipeline, results: downloads} of results) {
                if (downloads.length === 0) {
                    continue;
                }
                const buttons = downloads.map(({query}) =>
                    Markup.callbackButton('/download ' + pipeline + ' ' + query, '')
                );
                const keyboard = Markup.keyboard(buttons, {columns: 1}).oneTime().extra();
                ctx.reply('Found in ' + pipeline, keyboard);
            }*/

        } else if (/\/download .*/.test(text)) {
            const [, pipeline, query] = /\/download ([^ ]*?) (.*)/.exec(text);
            const downloader = this.prepareDownload(pipeline, query);
            const chat_id = (await ctx.getChat()).id;
            let message_id = null;
            downloader.onStatus.push(async (text, forceNew) => {
                if (forceNew || !message_id) {
                    message_id = (await Telegram.sendMessage(chat_id, text)).message_id;
                    if (forceNew) {
                        message_id = null;
                    }
                } else {
                    await Telegram.editMessage(chat_id, message_id, text);
                }
            });
            await downloader.start();
        }
    }

    async search(query) {
        return Promise.map(Object.entries(this._pipelines), async ([name, pipelineClass]) => {
            const pipeline = new pipelineClass();
            await pipeline.init();
            return {
                pipeline: name,
                results: await pipeline.search(query)
            };
        });
    }

    prepareDownload(pipelineName, query) {
        const pipelineClass = this._pipelines[pipelineName];

        if (!pipelineClass) {
            throw new Error(`Pipline ${pipelineName} not found`);
        }

        const pipelineConfig = this.config.get('downloader.' + pipelineName, {folder: Application.dirname + '/downloads'});
        const pipeline = new pipelineClass(pipelineConfig);
        const originalDownload = pipeline.download.bind(pipeline);
        pipeline.start = async () => {
            originalDownload(query);
        };
        return pipeline;
    }
}

module.exports = DownloaderModule;
module.exports.DownloadPipeline = DownloadPipeline;
module.exports.MiniSearch = MiniSearch;
module.exports.puppeteer = puppeteer;
