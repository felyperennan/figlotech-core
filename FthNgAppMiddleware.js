
const FthApp = require('./FthApp')
const fs = require('fs')
const path = require('path')
const FthCommon = require('./FthCommon')
const promisify = require('util').promisify
fs.existsAsync = promisify(fs.exists);
fs.statAsync = promisify(fs.stat)
const _mimeMap = require('./MimeMap')

const theBuffersSingleton = {}

let ngAppGen = 0
class FthNgAppMiddleware extends FthApp {
    constructor(args) {
        super()
        this.init
        this.folder = args[0]
        this.baseUrl = args[1] || ('/' + this.folder.replace(/\.\.\//g, '').replace(/\.\//g, ''))
        if(!this.baseUrl.endsWith('/'))
            this.baseUrl += '/'
        this.request
        this.response
        this.htmlPromise 
        this.candidateForSendHtml = false;
        // This is meant to be awaited at sendIndex()
        this.htmlPath = path.join(this.baseDir, this.folder, 'index.html')
        this.htmlPromise = this.bufferedHtmlPromise() 
    }

    async bufferedHtmlPromise() {
        let retv = theBuffersSingleton[`NG${this.baseUrl}@${this.folder}`]
        if(!retv) {
            if(!await fs.existsAsync(this.htmlPath)) {
                // We don't want to reject promise here, just play along.
                return null; 
            }
            
            let htmlIn = fs.createReadStream(this.htmlPath)
            let html = (await FthCommon.readStream(htmlIn)).toString()
            theBuffersSingleton[`NG${this.baseUrl}@${this.folder}`] = html.replace(/\<base\s+href=["']([^'"]*)["']\>/g, `<base href="${this.baseUrl}">`)
            retv = theBuffersSingleton[`NG${this.baseUrl}@${this.folder}`]
        }

        return retv;
    }

    getExtOf(file) {
        if(file.indexOf('.') > -1) {
            return file.substring(file.lastIndexOf('.') + 1).toLowerCase()
        } else {
            return ''
        }
    }

    // K kids, remember we can only await this.htmlPromise exactly ONCE    
    async _flowIn(flowCtrl) {
        let itMatches = flowCtrl.relevantUrl.startsWith(this.baseUrl)
        if(!itMatches)
            return
	    let cwd = this.baseDir
        let filePath = path.join(cwd, this.folder, flowCtrl.relevantUrl.substring(this.baseUrl.length));
        if(flowCtrl.relevantUrl.indexOf('.') > -1) {
            flowCtrl.handled = true
            if(await fs.existsAsync(filePath)) {
                let stat = await fs.statAsync(filePath)
                let sz = stat.size
                let ext = this.getExtOf(filePath)
                flowCtrl.interrupt()
                this.response.writeHead(200, { 
                    'Content-Type': _mimeMap[ext]||'application/octet-stream',
                    'Content-Length': sz,
                    'Cache-Control': `max-age=${1 * 60 * 60 * 24 * 7 }`
                    // That's 7 days
                    // This will be changed in the future.
                });
                await this.sendFile(filePath)
            } else {
                flowCtrl.interrupt()
                flowCtrl.handled = true
                this.response.writeHead(404, { 
                    'Content-Length': 0,
                    'Cache-Control': `max-age=${1 * 60 * 60 * 24 * 7 }`
                    // That's 7 days
                    // This will be changed in the future.
                });
                
                await FthApp.awful(this.response.end)
            }
        } else {
            // We want to send Index.html to handle this route
            // but we need to let the rest of the application run too.
            // So, if this baseUrl is /, postpone sendHtml to flowOut phase
            // else, if we have a baseUrl just for us, then just send index.html
            if(this.baseDir != '' && this.baseDir != '/') {
                flowCtrl.interrupt()
                return await this.sendIndex()
            } else {
                this.candidateForSendHtml = true
            }
        }
    }

    async sendIndex() {
        return await new Promise(async (resolve, reject)=> {
            let bufferedHtml = await this.htmlPromise
            if(!bufferedHtml) {
                this.response.statusCode = 404
                resolve(false)
            }
            this.response.writeHead(200, { 
                'Content-Type': 'text/html',
                'Content-Length': (await fs.statAsync(this.htmlPath)).size,
                'Cache-Control': `max-age=${1 * 60 * 60 * 24 * 7 }`
            });
            this.output.write(bufferedHtml);
            this.output.end((a) => {
                resolve(true)
            })
        })
    }

    async _handle(err, buggedStuffThatCrashed, flowCtrl) {
        // "I don't care, carry on folks", said this Middleware
    }

    async _flowOut(flowCtrl) {
        if(this.candidateForSendIndex) {
            flowCtrl.interrupt()
            return await this.sendIndex()
        }
    }

    _main(args) {
        console.error("This is a middleware not meant to be ran as a httpExec or shellExec")
    }

}

FthApp.register(module, FthNgAppMiddleware)
