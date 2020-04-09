const {Application, Modules: {Promise}} = require('mf-lib');
const {spawn, exec} = require("child_process");
const fs = require("fs");

class DownloadPipeline {
    app = null;
    config = {};
    log = {};
    statusBase = "";
    onStatus = [];

    constructor(config, app) {
        this.app = app;
        this.config = config;
        this.log = Application.getLogger(this.constructor.name);
    }

    async init() {

    }

    async destroy() {

    }

    async find(query) {

    }

    async download(query) {

    }

    async wait(seconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, seconds * 1000);
        });
    }

    setStatusBase(text) {
        this.statusBase = text;
    }

    async setStatus(msg, forceNew = false) {
        const text = this.statusBase + ": " + msg;
        this.log.info(text);
        await Promise.map(this.onStatus, (cb) => cb(text, forceNew).catch(console.error));
    }

    formatNumber(number, length = 2, filler = "0") {
        return String(number).padStart(length, filler);
    }

    async downloadFile(url, filename, folder = null) {
        folder = this.config.folder + (folder ? "/" + folder : "");

        if (folder) {
            await new Promise((resolve, reject) => {
                return exec(`mkdir -p "${folder}"`, {}, (err) => err ? reject(err) : resolve());
            });
        }

        if (fs.existsSync(path.join(folder, filename + ".mp4"))) {
            this.log.info("File already exists.");
            return true;
        }

        const child = spawn(
            "youtube-dl",
            [
                url,
                "--external-downloader aria2c",
                "--external-downloader-args \"-x 16 -s 16\"",
                url.indexOf("vivo.sx") === -1 ? `-o "${filename}.%(ext)s"` : `-o "${filename}.mp4"`
            ],
            {
                cwd: folder,
                shell: true
            }
        );

        let stdout = '';
        const parseStdout = async () => {
            let progress = null;

            for (let line of stdout.split("\n")) {
                if (/NOTICE/.test(line)) {
                    return;
                }
                if (/([\d\.]+)%/gmi.test(line)) {
                    progress = parseFloat(/([\d\.]+)%/gmi.exec(line));
                }
            }

            if (progress) {
                await this.setStatus(`${progress}%`);
            }
            stdout = '';
        };

        const parseInterval = setInterval(parseStdout.bind(this), 60 * 1000);

        child.stderr.on('data', (chunk) => {
            // console.log('ERROR', chunk.toString());
        });
        child.stdout.on('data', (chunk) => {
            // console.log(String(chunk));
            stdout += String(chunk);
        });

        return new Promise((resolve) => {
            child.on('close', (code) => {
                clearInterval(parseInterval);
                resolve(code === 0);
            });
        });
    }
}

module.exports = DownloadPipeline;
