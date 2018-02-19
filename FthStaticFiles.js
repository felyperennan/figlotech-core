
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
            return file.substring(file.indexOf('.') + 1).toLowerCase()
        } else {
            return ''
        }
    }

    extensionMatches(ext) {
        return this.allowExtensions.map(i=> i.toLowerCase()).indexOf(ext.toLowerCase()) > -1
    }

    async _flowIn(flowCtrl) {
	    let cwd = this.baseDir
        let filePath = path.join(cwd, this.folder, this.request.url);
        let ext = this.getExtOf(filePath);
        if(fs.existsSync(filePath)) {
            if(this.extensionMatches(ext)) {
                console.warn(`[StaticFiles] Sending ${filePath}`)
                flowCtrl.interrupt()
                this.response.writeHead(200, { 
                    'Content-Type': _mimeMap[ext]||'application/octet-stream',
                    'Content-Length': await fs.statSync(filePath).size
                });
                console.warn(`[Static files] Serving  ${filePath.substring(cwd.length)} statically`)
                this.sendFile(filePath)
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
