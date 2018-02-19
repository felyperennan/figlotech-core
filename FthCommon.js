if(require.main === module) {
    console.error('This file isn\'t an executable, just a module.')
    return
}

const tty = require('tty')
const consoleRedirected = !tty.isatty(process.stdout.fd)
const https = require('https')
const http = require('http')
const fs = require('fs')

class FthCommon {
    get opt_verbose () { return process.argv.indexOf('-v') > -1 }

    constructor() {
        this.args = {}
        this.helpObj = []
        this.description = ''
    }

    get isInputPiped () { return process.stdin.isTTY; }
    get isOutputPiped () { return process.stdout.isTTY; }

    log (msg) {
        process.stderr.write(new Buffer(msg))
    }
 
    async readStream(stream) {
        return await new Promise((resolve, reject) => {
            let chunks = []
            stream.on('data',(chunk)=> {
                chunks.push(chunk)
            })
            
            stream.on('end', ()=> {
                resolve(Buffer.concat(chunks))
            })
        })
    }

    async readFileToBuffer(filePath) {
        let file = fs.createReadStream(filePath)
        return await this.readStream(file);
    }

    requireArgs(argList) {
        let retv = true;
        argList.forEach(arg=>{
            if(!this.help.find(h=> h.long == arg)) {
                console.error(`PROGRAMMING ERROR: Argument ${arg} is not in the arguments definition`)
            }
            if(!this.args[arg]) {
                console.error(`ERROR: Argument --${arg} is not optional`);
                retv = false;
            }
        });
        return retv;
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

    verboseLog (msg) {
        if(this.opt_verbose) {
            process.stderr.write(new Buffer(msg))
        }
    }

    setDescription(text) {
        this.description = text;
    }

    range(a, b) {
        let retv = []
        if(!b) {
            for(let i = 0; i < a; i++) {
                retv.push(i);
            }
        } else {
            for(let i = a; i < b; i++) {
                retv.push(i);
            }
        }
        return retv;
    }

    setupArgs(args) {
        if(!args) {
            return
        }
        args.forEach(i => {
            this.args[i.long] = this.getArgvShort(i.short) || this.getArgvLong(i.long)
            if(!this.args[i.long]) {
                this.args[i.long] = this.hasArgvShort(i.short) || this.hasArgvLong(i.long) ? true : false
            } 
            this.helpObj.push(i)
        })
    }

    parseClArgs(defaults) {
        this.setupArgs(defaults)
        for(let i = 1; i < process.argv.length; i++) {
            if(process.argv[i].startsWith('--')) {
                let argn = process.argv[i].substring(2);
                if(!this.args[argn]) {
                    this.args[argn] = i < process.argv.length-1 && !process.argv[i+1].startsWith('-') ? process.argv[i+1] : true;
                }
            }
        }
    }

    showHelp() {
        console.log(this.description)
        this.helpObj.forEach(e=> {
            console.log(`-${e.short}\n\t--${e.long}\n\t\t${e.help}`)
        })
    }

    hasArgvShort(arg) {
        return process.argv.indexOf(`-${arg}`) > -1
    }
    hasArgvLong(arg) {
        return process.argv.indexOf(`--${arg}`) > -1
    }
    getArgvShort(arg) {
        return this.getArgv(`-${arg}`)
    }
    getArgvLong(arg) {
        return this.getArgv(`--${arg}`)
    }
    getArgv(arg) {
        let idx = process.argv.indexOf(arg)
        if(idx > -1) {
            let val = process.argv.length > idx + 1 ? process.argv[idx+1] : undefined
            return val
        }
        return undefined
    }
}

const singleton = new FthCommon()
module.exports = singleton

