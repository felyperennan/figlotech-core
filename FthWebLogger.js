
const FthApp = require('./FthApp')

let _reqIdGen = 0
class FthWebLogger extends FthApp {
    constructor() {
        super()
        this.id = ++_reqIdGen
        this.request
        this.response
    }

    _flowIn() {
        console.warn(`[Request:${this.id}] ${this.request.method} ${this.request.url}`)
    }

    _handleError(err) {
        return false;
    }

    _flowOut() {
        console.warn(`[Response:${this.id}] ${response.statusCode} `)
    }

    _main(args) {
        console.error("This is a middleware not meant to be ran as a httpExec or shellExec")
    }

}

FthApp.register(module, FthWebLogger)