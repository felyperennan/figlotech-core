
var fs = require("fs")
const fth = require('./FthCommon')
const stream = require('stream')
const url = require('url')
const http = require('http')
const https = require('https')
const path = require('path')

class FthApp {

	constructor(context) {
        this.input = process.stdin
        this.output = process.stdout
        this.isShellExec = false
        this.isHttpExec = false
        this._fthapp_basetypetoken = true
    }

    get _inputArguments () { return [] }

    get doc() {
        return ''
    }

    get baseDir() {
        return path.dirname(pr
ocess.mainModule.filename);
    }

    async readInputToString() {
        return await new Promise((resolve, reject) => {
            let chunks = []
            this.input.on('data',(chunk)=> {
                chunks.push(chunk)
            })
            
            this.input.on('end', ()=> {
                resolve(Buffer.concat(chunks))
            })
        })
    }

    printf(stuff) {
        this.output.write(new Buffer(stuff))
    }

    async requireArgs(list) {
        if(!fth.requireArgs(list)) {
            process.abort()
        }
    }

    async readInputToObject() {
        return JSON.parse(await this.readInputToString());
    }

    sendFile(path) {
        let fout = fs.createReadStream(path)
        fout.pipe(this.output)
    }
    
    async get(url) {
        return new Promise((resolve, reject)=> {
            let reqModule = url.startsWith('https://') ? https : http;
            reqModule.get(url, (resp) => {
                resolve(resp);
            }).on("error", (err) => {
                reject(err);
            });
        })
    }

    async post(url, data) {
        return new Promise((resolve, reject)=> {
            let reqModule = url.startsWith('https://') ? https : http;
            reqModule.post(url, data, (resp) => {
                resolve(resp);
            }).on("error", (err) => {
                reject(err);
            });
        })
    }

    async tunnelTo(url) {
        (await this.get(url)).pipe(this.output)
    }

    _main(args) {
        throw "MAIN NOT IMPLEMENTED FOR THIS XTAPP"
    }

    static async processRequest(instance, args, request, response) {
        instance.isHttpExec = true
        instance.input = request
        instance.output = response
        await instance._main(args);
    }

    static register(mod, app) {
        mod.exports = app
        if (require.main === mod) {
            let instance = new app()
            instance.isShellExec = true
            let inputArgs = instance._inputArguments;
            if(!inputArgs || !inputArgs.push) {
                console.warn(`Warning: ${app} Implementation of _inputArguments was supposed to return a list of objects following the example: {long:'help', short:'?', help:'Displays this help text'} `)
            }
            inputArgs.push([
                { long: 'help', short: '?', help: '[FthApp] Displays Help' },
                { long: 'file-input', short: 'in', help: '[FthApp] Uses file for input instead of stdin' },
                { long: 'file-output', short: 'out', help: '[FthApp] Uses file for output instead of stdout' },
            ])
            fth.parseClArgs(inputArgs);
            fth.setDescription(instance.doc)
            if(fth.args['help']) {
                fth.showHelp()
                return;
            }
            instance.input = fth.args['file-input'] ? fs.createReadStream(fth.args['file-input']) : process.stdin
            instance.output = fth.args['file-output'] ? fs.createReadStream(fth.args['file-output']) : process.stdout
            instance._main(fth.args)
        }
    }

}

module.exports = FthApp
