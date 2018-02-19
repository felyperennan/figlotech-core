
const FthApp = require('./FthApp')
const http = require('http')
const url = require('url')
const FthStaticFiles = require('./FthStaticFiles')
const FthWebMiddleware = require('./FthWebMiddleware')
const fs = require('fs')
const path = require('path')

class FlowCtrl {
    constructor(id) {
        this.isFlowing = true
        this.id = id
    }

    async letItFlow(caller, request, response, pipeline) {

        if (!pipeline || !pipeline.length)
            return
        for (let i = 0; i < pipeline.length; i++) {
            await pipeline[i].apply(caller, [request, response, this]);
            if (!this.isFlowing) {
                return;
            }
        }
    }

    interrupt() {
        this.isFlowing = false
    }
}

/**
 * FthWebHost
 * It's bad.
 * It's ugly.
 * But it's mine.
 * And its yours too.
 * Its communitary I'd say.
 */

class FthWebHost extends FthApp {
    constructor() {
        super()
        this.server
        this.handlers = []
        this.middlewares = []
        this._fthwebhost_basetypetoken = true;
    }

    _inputArguments() {
        return [
            { long: 'port', short: 'p', help: 'Sets the port to listen on' }
        ]
    }

    loadModulesIn(folder, probeFn) {
        let retv = []
        fs.readdir(folder, (err, files) => {
            if(err) {
                console.error(err);
            }
            files.forEach(
                file => {
                    let baseDir = path.dirname(process.mainModule.filename);
                    let realFile = path.join(baseDir, folder, file);
                    if(!fs.existsSync(realFile))
                        return
                    if(realFile.endsWith('.js')) {
                        try {
                            let nodeModule = require(`${realFile.replace('\\', '/')}`);
                            if(typeof nodeModule === 'function') {
                                //Ironic how I have to filter FthWebHost out, because it's technically also
                                // a Fth App
                                let probeInstance = new nodeModule();
                                if(probeFn(probeInstance)) {
                                    if(probeInstance.noAutoLoad) {
                                        return;
                                    }
                                    let rx = probeInstance.regex || new RegExp('^\/' + file.substring(0, file.indexOf('.')))
                                    retv.push({
                                        methods: probeInstance.acceptMethods || ['GET', 'POST'],
                                        app: nodeModule,
                                        regex: rx
                                    })
                                    console.warn(`Added ${realFile.substring(baseDir.length)} to handlers as ${rx}`)
                                }
                            }
                        } catch(err) {
                            console.error(`Failed to load ${realFile.substring(baseDir.length)}`, err)
                        }
                    }
                    if(fs.statSync(realFile).isDirectory()) {
                        let moar = this.loadModulesIn(file)
                        retv.push(moar)
                    }
                }
            );
        })
        return retv
    }


    get _inputArguments() {
        return [
            { long: 'serve-folder', short: 'sf', help: 'Serve files in a folder statically. Don\'t serve your server files though, that\'d be dumb.' },
            { long: 'serve-types', short: 'st', help: 'Set the file extensions to serve, separated by comma' },
        ]
    }

    autoImport(baseDir) {
        let handlers = this.loadModulesIn(baseDir, 
            (a) => a._fthapp_basetypetoken &&
            !a._fthwebmiddleware_basetypetoken &&
            !a._fthwebhost_basetypetoken
        )
        let middlewares = this.loadModulesIn(baseDir, 
            (a) => a._fthwebmiddleware_basetypetoken
        )
        this.setupHandlers(handlers)
        this.setupMiddleWares(middlewares)
    }
    addStaticHandler(dir, types) {
        if(!types)
            types = 'js,css,jpg,jpeg,png,bmp,gif,tiff,ttf,xls,xlsx,pdf,woff,woff2'
        types = types.split(',')
        this.middlewares.push({
            app: FthStaticFiles,
            args: [dir, [ types ]]
        })
    }

    _main(args) {
        autoLoadModules('./')
        if(args['serve-folder']) {
            this.addStaticHandler(args['serve-folder'], args['serve-types'])
        }
        this.start(args['port'] || 3000)
    }

    /**
     * @param handlerConfigs
     * A list of Handler Configurations
     * The model for 'handlerConfig' is { methods: <http-methods>, regex: <regExp>, app: <FthApp implementation> } 
     * During the Handle flow phase, the Request URL will be tested against the regexp
     * of all handlers, the first handler to match will be executed. Testing is interrupted on match.
     */
    setupHandlers(handlerConfigs) {
        if (!handlerConfigs || !handlerConfigs.push)
            throw "Cannot setup routes with something that isn't a list of routes, please fix."
        this.handlers = handlerConfigs;
    }

    /**
     * @param middlewares
     * A list of Middleware configurationn
     * The model for 'middlewareconfig' is { app: <FthApp implementation>, args: <list of stuff to pass to its constructor> }
     * Middlewares are instanced during the FlowIn phase, their instance will live on during the request
     * If an uncaught error happens during the handle phase, the _handle() method will be executed 
     * back to front on the list of instanced middlewares.
     * If a middleware returns true on this function, they'll notify the host that they were able to handle
     * said problem, no other middlewares will run _handle() if this is the case and the server will consider
     * the request as "Solved, ok, whatevs"
     * If everything goes well with handling, then all instanced middlewares will be called again during .
     * the FlowOut phase. After the request is over, everyone is disposed and the server will treat 
     * the request as adequately handled. Even though he as a server knows nothing that happened down there.
     * He's just doing his thing
     * PS Don't use Middlewares as singletons, for fucks sake
     */
    setupMiddleWares(middlewareConfigs) {
        if (!middlewareConfigs || !middlewareConfigs.push)
            throw "Cannot setup middlewares with stuff that isn't a middleware list, please fix."
        this.middlewares = middlewareConfigs
    }

    /**
     * flowIn
     * THIS IS AN INTERNAL FUNCTION
     * The flow-in phase instantiates all Middlewares and executes their flow-in phases
     * synchronously, one by one. If any Middleware happen to interrupt the flow, then 
     * the server will be happy to end this request assuming that said middleware handled it.
     * ... And life goes on.
     * Otherwise, these Middlewares will be kept loaded and will run _handleError() or _flowOut according
     * to the outcome of the handle() phase.
     */
    async flowIn(request, response, flowCtrl) {
        flowCtrl.middlewares = [];
        for (let i = 0; i < this.middlewares.length; i++) {
            let mw = new this.middlewares[i].app(this.middlewares[i].args);
            flowCtrl.middlewares.push(mw);
            mw.input = request
            mw.output = response
            mw.request = request
            mw.response = response
            await mw._flowIn(request, response, flowCtrl);
            if (!flowCtrl.isFlowing)
                response.end()
            return;
        }
    }

    /**
     * handle
     * THIS IS AN INTERNAL FUNCTION
     * The handle phase selects an app to execute from the handlers list
     * executes it (or not)
     * If an error happens, it will run each middleware trying to resolve the error
     */
    async handle(request, response, flowCtrl) {
        let matchedApp
        try {
            let cut = (s) => s.indexOf('?') > -1 ? s.substring(0, s.indexOf('?')) : s
            let importantPartOfUrl = cut(flowCtrl.requestedUrl);
            for (let i = 0; i < this.handlers.length; i++) {
                let handler = this.handlers[i]
                let method = request.method
                if(!handler || !handler.methods || !handler.regex || !handler.app ) {
                    continue;
                }
                let methodMatches = handler.methods.map(i=> i.toUpperCase()).indexOf(request.method.toUpperCase()) > -1;
                let urlMatches = importantPartOfUrl.match(handler.regex)
                if (methodMatches && urlMatches) {
                    let args = url.parse(request.url, true)
                    matchedApp = new handler.app()
                    await FthApp.processRequest(matchedApp, args, request, response)
                    flowCtrl.handled = true
                    return;
                }
            }
        } catch (err) {
            // If an error occours in the process, middlewares are then called to handle
            // the error
            console.trace(err);
            flowCtrl.interrupt()
            response.statusCode = 500
            for (let i = flowCtrl.middlewares.length; i >= 0; i--) {
                let mw = flowCtrl.middlewares[i];
                try {
                    let couldThisBoyHandleIt = await mw._handleError(err, matchedApp, flowCtrl);
                    if (couldThisBoyHandleIt) {
                        // well then call it a go
                        response.end();
                        return;
                    }
                } catch(err) {
                    // Lol no, this boi can't even handle his own problems
                    console.error(`Middleware ${mw.app} failed miserably to handle error from ${matchedApp} with error:`, err)
                    // this is the only callback allowed to error without crashing the request
                }
            }

            // If no one could handle this shit then we're sorry but to tell the user
            // That ERROR 500: Shit happens
            response.end()
        }
    }

    async flowOut(request, response, flowCtrl) {
        // Third flow runs flow out of all middlewares back to front
        for (let i = flowCtrl.middlewares.length - 1; i >= 0; i--) {
            let mw = flowCtrl.middlewares[i];
            try {
                await mw._flowOut(flowCtrl);
            } catch(err) {                    
                console.error(`Middleware ${mw.app} has thrown an error during Flow-Out phase:`, err)
                throw err
            }
        }
    }

    start(usePort) {
        let reqId = 0;
        this.server = http.createServer(async (request, response) => {
            let t0 = new Date().getTime();
            try {
                if(!request)
                    return;
                let reqUrl = request.url
                let flowCtrl = new FlowCtrl(++reqId)
                flowCtrl.requestedUrl = reqUrl
                //First flow takes middlewares and execute them
                let req = request
                let res = response
                await flowCtrl.letItFlow(this, req, res, [
                    this.flowIn,
                    this.handle,
                    this.flowOut
                ])
                if (!flowCtrl.handled) {
                    response.statusCode = 404;
                }
                response.end()
                let t1 = new Date().getTime()-t0;
                this.printf(`[${flowCtrl.id}] ${request.method} ${flowCtrl.requestedUrl} | ${response.statusCode} | ${t1}ms`);
            } catch(err) {
                console.trace(err);
            }
        });

        this.server.listen(usePort, () => {
            this.output.write(`Listening on port ${usePort}\n`)
        });
    }

}

process.on('unhandledRejection', error => {
    console.trace('unhandledRejection', error.message);
});

FthApp.register(module, FthWebHost)