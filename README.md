# figlotech-core
A simple framework for building micro-apps that serve both as command line tools and web route handlers at the same time sharing the exact same code.

This is a simple framework based (but not entirely) on the Unix philosophy.
The framework consists on writing implementations of FthApp.
An FthApp is the concept of a very basic simple application that is able to do its deeds with an argument array, an input stream and an output stream
With this skeleton, the same FthApp can be executed both on the command line directly or as a route handler within a WebHost and it should work perfectly fine on both scenarios
Ex:
```
const fi = require('figlotech-core')
const FthApp = fi.FthApp

class MyBasicApp extends FthApp {
    constructor() {
        super()
    }
    
    _main(args) {
      this.output.write(`Hi ${args['name']}, how's it going?`)
    }

    /*
      FthApp 101: 
        this.input | An input stream
        this.output | An output stream
        args (in main) | An object containing the arguments you received.
        get _inputArguments | (getter in class) Allows you to specify simple console input arguments, like so:
          Eg:
            get _inputArguments() {
              return [
                { long: 'name', short: 'n', help: 'The name to be gret' } // passing --name Figloalds or -n Figloalds will feed args['name']
              ]
            }
            
        Utils from base class:
        sendFile(fileName) | Write the contents of a file to this.output
        async tunnelTo(url) | Pipes a HTTP-GET request to this.output
        async get(url) | Just suggar syntax for http get request, retv is a stream
        async post(url, data) | More suggar syntax, don't mind it
        async readInputToString() | Reads this.input and writes it to a string. Retv is said string
        async readInputToObject() | Same as the previous one but wrapped in a JSON.parse. retv is an object. Or a bigass error 
        
        That's it. this is no Express no big FW, just fun nodely stuff.
    */

}
// Notice this FthApp.register here
FthApp.register(module, MyBasicApp)
// this function exports this class for require()
// But it also makes this module executable, so that if called with node from the command line
// the _main method will execute, stdin will be used as this.input and stdout as this.output
```
If you call it directly with 
```node ./MyBasicApp.js --name figloalds``` 
this will output 
"Hi Figloalds, how's it going?"

If you call it from a webhost with 
```path.to:3000/MyBasicApp?name=figloalds``` this will output the same
"Hi Figloalds, how's it going?"

This second option will require implementing the FthWebHost as follows:
```
const fi = require('figlotech-core')
const FthWebHost = gneat.FthWebHost

const server = new FthWebHost()
server.autoLoadModules(pathToModules)
// This will cause the server to recursively load modules in that folder
//   - by default all modules will respond to GET and POST
//     - To overwrite this, set this.allowMethods in the module class constructor
//   - by default modules will respond to their relative path as their regex
//     - overwrite this by setting this.regex in the class constructor
//   - This will load both modules and Middlewares, 
//   - FTH doesn't care about your scaffolding strategy
server.start(3000)
```


#The FthApp basics
And FthApp represents a simple executable "thing" that doesn't care about the rest of the application, all it cares are it's arguments, it's input stream and it's output stream
And the FthApp doesn't even care where these arguments, inputStream and outputStream  are coming from, it just does what it does.

The ```FthApp.register()``` method will both export your app as a valid node module, but also make an environment for your application to 
run directly on console, should it be called directly.
By being a FthApp, this exact code can be used to respond to HTTP requests using the FthWebHost
And that's where this is fun

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
gneat-ext is a simple framework for building mixed micro-services that can serve as excellent command line tools and http handlers at the same time,
changing not a single line of code.