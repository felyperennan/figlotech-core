# figlotech-core
A simple framework for building micro-apps that serve both as command line tools and as web handlers at the same time, using the exact same code

This is a simple framework based (but not entirely) on the Unix philosophy.
The framework consists on writing implementations of FthApp.
An FthApp is the concept of a very basic simple application that is able to do its deeds with an argument array, an input stream and an output stream
With this skeleton, the same FthApp can be executed both on the command line directly or as a route handler within a WebHost and it should work perfectly fine on both scenarios

# To run the WebHost
```js
const fi = require('figlotech-core')
const FthWebHost = fi.FthWebHost

let server = new FthWebHost()
server.autoImport('./app')
server.addStaticHandler('./public')

server.start(3000)
// autoImport will load all FthApps recursively on the given folder and use as handlers or middlewares
// addStaticHandler adds built-in static files middleware and serves given folder as static
```

# To write a basic FthApp
```js
const fi = require('figlotech-core')
const FthApp = fi.FthApp

class MyBasicApp extends FthApp {
    constructor() {
        super()
    }
    
    _main(args) {
        this.output.write(`Hi ${args['name']}, how's it going?`)
    }
}
FthApp.register(module, MyBasicApp)
// this function both exports this class for require()
// and executes this app if its called directly
```
If you call it directly with 
```node ./MyBasicApp.js --name figloalds``` 
this will output 
"Hi Figloalds, how's it going?"

If you call it from a webhost with 
```path.to:3000/MyBasicApp?name=figloalds``` this will output the same
"Hi Figloalds, how's it going?"

# The In-depth Anatomy of an FthApp
An FthApp represents a simple executable "thing" that doesn't care about the rest of the application, all it cares are it's arguments, it's input stream and it's output stream
And the FthApp doesn't even care where these arguments, inputStream and outputStream  are coming from, it just does what it does.
Dependency Injection is a Work-in-Progress 
```js
const FthApp = require('figlotech-core').FthApp

class CsvToJson extends FthApp {

    constructor() {
        super()
        this.acceptMethods = ['POST']
    }
    
    get doc() {
        return 'Converts a CSV file input to JSON using the first line as headers'
    }

    get _inputArguments() {
        return [
            { long: 'separator', short: 's', help: 'Character separator' }
        ]
    }

    _main(args) {
        let inputText = this.readInputToString()
        let brokenInput = inputText.split('\n')
        if(brokenInput && brokenInput.length) {
            let separator
            let startIndex = 0
            if(brokenInput[0].startsWith('sep=')) {
                separator = brokenInput[0].substring(4,1)
                startIndex = 1
            } else {
                separator = args['separator'] || ','
            }
            // could make argument mandatory with
            // this.requireArgs(['separator'])
            let headers = brokenInput[startIndex].split(separator)
            this.output.write('[')
            for(let i = startIndex+1; i < brokenInput.length; i++) {
                let vals = brokenInput[i].split(separator)
                let obj = {}
                for(let j = 0; j < headers.length; j++) {
                    obj[headers[j]] = vals[j]
                }
                this.output.write(JSON.stringify(obj))
                this.output.write(i < brokenInput.length-1 ? ',' : '')
            }
            this.output.write(']')
            this.output.end()
        }
    }
}

FthApp.register(module, CsvToJson)

/**
USAGES
    - POST http://somewhere.to/subfolder/CsvToJson?separator=,
    - cat file.csv | node CsvToJson > file.json
    - node CsvToJson -f file.csv -o file.json 
NOTE
    When called via command line, the -f and -o options are automatically added to redirect iostreams to filestreams

  FthApp 101: 
    this.input | An input stream
    this.output | An output stream
    args (in main) | An object containing the arguments you received.
    get _inputArguments | (getter in class) Allows you to specify simple console input arguments, like so:
    Eg:
    get _inputArguments() {
        return [
            { long: 'name', short: 'n', help: 'The name to be gret' } 
            // Passing --name Figloalds or -n Figloalds will feed args['name']
            // The http-get variable name will also be fed into args['name']
        ]
    }
    
    Utils from base class:
    sendFile(fileName) | Write the contents of a file to this.output
    async tunnelTo(url) | Pipes a HTTP-GET request to this.output
    async get(url) | Just suggar syntax for http get request, retv is a stream
    async post(url, data) | More suggar syntax, don't mind it
    async readInputToString() | Reads this.input and writes it to a string. Retv is said string
    async readInputToObject() | Same as the previous one but wrapped in a JSON.parse. retv is an object. Or a bigass error 
    
*/
```

# How can FthApp be executed
1 - By directly executing its javascript file. Eg ```node ./MyBasicApp.js```
  - The FthApp basics will execute the _main() function
    - Args will come from the command line
    - The input stream is defaulted to stdin, unless -in/--input is specified
    - The output stream is defaulted to stdout, unless -out/--output is specified
2 - By using this FthApp as a WebHandler in FthWebHost
  - The WebHost class will call _main() on FthApp
    - The args will come from HTTP-GET variables
    - The input stream will be set to the Request body
    - The output stream will be set to the Response
    
# in conclusion
figlotech-core is a simple framework for building mixed micro-services that can serve as excellent command line tools and http handlers at the same time, changing not a single line of code.
