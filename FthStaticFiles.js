
const FthApp = require('./FthApp')
const fs = require('fs')
const path = require('path')
const _mimeMap = require('./MimeMap')

let _reqIdGen = 0
class FthStaticFiles extends FthApp {
    constructor(args) {
        super()
        this.init
        this.folder = args[0]
        this.allowExtensions = args[1]
        this.request
        this.response
    }

    getExtOf(file) {
        if(file.indexOf('.') > -1) {
            return file.substring(file.lastIndexOf('.') + 1).toLowerCase()
        } else {
            return ''
        }
    }

    extensionMatches(ext) {
        return this.allowExtensions.map(i=> i.toLowerCase()).lastIndexOf(ext.toLowerCase()) > -1
    }

    async _flowIn(flowCtrl) {
	    let cwd = this.baseDir
        let filePath = path.join(cwd, this.folder, flowCtrl.relevantUrl);
        let ext = this.getExtOf(filePath);
        if(fs.existsSync(filePath)) {
            if(this.extensionMatches(ext)) {
                flowCtrl.interrupt()
                this.response.writeHead(200, { 
                    'Content-Type': _mimeMap[ext]||'application/octet-stream',
                    'Content-Length': sz,
                    'Cache-Control': `max-age=${1 * 60 * 60 * 24 * 7 }`
                    // That's 7 days
                    // This will be changed in the future.
                });
                await this.sendFile(filePath)
            }
        }
    }

    _handle(err) {

    }

    _flowOut() {
        
    }

    _main(args) {
        console.error("This is a middleware not meant to be ran as a httpExec or shellExec")
    }

}

FthApp.register(module, FthStaticFiles)
