// TODOs
//
//  - Add a general 'TIMEOUT: DELAY' setting
//      Each instruction is done after DELAY after it was run (if not already done)
//  - Add the t.if function
//  - Add support for HTML files to the t() function (chunk_includes)
//  - Add parameters to the WAIT function of AUDIO
//      on playstart or playend or stop
//  - Preloading
//      look deeper than the surface folder level for zips
//      todo: (re)append resources to HTML node before finishedCallback
//  - Implement graphic module (Raphael? Outdated...)
//  - Add a CLEAR instruction (removes all visible elements from page)
//  - Rewrite AUDIOs so they behave the same as RADIOs
//      they should record every event for themselves and user decides which to store with the SAVE method
//
//  DONE
//  - Rethink the way that Instructions preload their resources
//      have an object whose keys are filenames/urls to (pre)load and values are arrays of Instructions/callback functions?
//      will also take care of overriding (because no origin's defined when autopreload)
//
//  DONE
//  - See how running SetElement upon Run() for Audio (and Image?) affected t().j.css() and co
//  NB: now SPAN element for both Audio and Image, appending resource upon running
//
// NOTES
//
//  - The 'class' keyword is not recognized by early versions of browsers (e.g. my Safari)
//      create a copy of the file with other methods?
//


// The only object available to the users
var PennController;


// Everything else is encapsulated
(function(){


    //  =========================================
    //
    //      PENNCONTROLLER OBJECT
    //
    //  =========================================

    // Returns an object with the instructions passed as arguments
    // The object will be given to the actual controller
    PennController = function() {
        return {instructions: arguments};
    };

    // General settings
    PennController.Configure = function(parameters){
        for (parameter in parameters){
            if (parameter.indexOf["PreloadResources","Configure"] < 0) // Don't override built-in functions/parameters
                PennController[parameter] = parameters[parameter];
        }
        /*
            baseURL: "http://.../",
            ImageURL: "http://.../",
            AudioURL: "http://.../",
            ...
        */
    };


    //  =========================================
    //
    //      GENERAL INTERNAL VARIABLES
    //
    //  =========================================

    // Dummy object, ABORT keyword
    // used in the instructions' EXTEND method to abort chain of execution
    var Abort = new Object;

    // The current controller
    var _ctrlr = null;

    // All the image and audio files
    var _preloadedFiles = {};

    // List of ZIP files
    var URLsToLoad = [];

    // Associates preloaded files with callback functions
    var _preloadCallbacks = {};

    // How long the preloader should wait before ignoring failure to preload (ms)
    var _timeoutPreload = 120000;

    // The message that should be displayed while preloading
    var _waitWhilePreloadingMessage = "Please wait while the resources are prealoding. This process may take up to 2 minutes.";

    // Whether all audio instructions should automatically preload
    var _autoPreloadAudio = true;
    
    // Whether all audio instructions should automatically preload
    var _autoPreloadImages = true;

    // Resources called by instructions
    var _resourcesInstructions = {};


    //  =========================================
    //
    //      GENERAL INTERNAL FUNCTIONS
    //
    //  =========================================

    // Adds an element to another element
    // If the other element is the main document, add a div first
    function AddElementTo(element, to) {
        if (to == null || to == _ctrlr.element)
            _ctrlr.element.append($("<div>").append(element));
        else 
            to.append(element);
    }

    // Adds a file to the preloaded files
    function AddPreloadedFile(file, element) {
        if (_preloadedFiles.hasOwnProperty(file))
            console.log("Warning (Preload): overriding duplicate file '"+file+"'");
        _preloadedFiles[file] = element;
        // Going through the instructions awaiting to fetch the file
        if (_resourcesInstructions.hasOwnProperty(file)) {
            // Set ELEMENT as their resource
            for (i in _resourcesInstructions[file])
                _resourcesInstructions[file][i].setResource(element);
        }
        // Running any 
        if (_preloadCallbacks.hasOwnProperty(file)) {
            for (let f in _preloadCallbacks[file]) {
                if (_preloadCallbacks[file][f] instanceof Function)
                    _preloadCallbacks[file][f]();
            }
        }
    }    


    //  =========================================
    //
    //      PRELOADER ENGINE
    //
    //  =========================================

    // Settings for auto preloading
    PennController.AutoPreload = function (parameter) {
        if (parameter == "images") {
            _autoPreloadAudio = false;
            _autoPreloadImages = true;
        }
        else if (parameter == "audio") {
            _autoPreloadAudio = true;
            _autoPreloadImages = false;
        }
        else if (typeof(parameter) == "object") {
            if (parameters.hasOwnProperty("images"))
                _autoPreloadImages = parameters.images;
            if (parameters.hasOwnProperty("audio"))
                _autoPreloadAudio = parameters.audio;
        }
        else {
            _autoPreloadAudio = true;
            _autoPreloadImages = true;
        }
    }

    // Loads the file at each URL passed as an argument
    // Files can be ZIP files, image files or audio files
    PennController.PreloadZip = function () {
        for (let url in arguments)
            URLsToLoad.push(arguments[url]);
    };

    // Start to download the zip files as soon as the document is ready
    $(document).ready(function(){
        if (!URLsToLoad.length) return;

        // This object will contain the list of audio files to preload
        var resourcesRepository = {};
        var numberUnzippedFiles = 0;

        var getZipFile = function(url){
          var zip = new JSZip();
          
          JSZipUtils.getBinaryContent(url, function(error, data) {
            if(error) throw error;
            // Loading the zip object with the data stream
            zip.loadAsync(data).then(function(){
                console.log("Download of "+url+" complete");
                var currentLength = 0;
                // Going through each zip file
                zip.forEach(function(path, file){
                    // Unzipping the file, and counting how far we got
                    file.async('arraybuffer').then(function(content){
                        // Incrementing now, because 'return' if the file's type doesn't match
                        currentLength++;
                        // If all the files have been unzipped
                        if (currentLength >= Object.keys(zip.files).length) {
                            console.log("All files ("+currentLength+") from "+url+" unzipped");
                            // Remove the URL from the array
                            let index = URLsToLoad.indexOf(url);
                            if (index >= 0)
                                URLsToLoad.splice(index,1);
                        }
                        var element;
                        if (path.match(/\.wav$/i)) {
                            let blob = new Blob([content], {'type': 'audio/wav'});
                            element = $("<audio>").append($("<source>").attr({src: URL.createObjectURL(blob), type: 'audio/wav'}));
                        }
                        else if (path.match(/\.mp3$/i)) {
                            let blob = new Blob([content], {'type': 'audio/mpeg'});
                            element = $("<audio>").append($("<source>").attr({src: URL.createObjectURL(blob), type: 'audio/mpeg'}));
                        }
                        else if (path.match(/\.ogg$/i)) {
                            let blob = new Blob([content], {'type': 'audio/ogg'});
                            element = $("<audio>").append($("<source>").attr({src: URL.createObjectURL(blob), type: 'audio/ogg'}));
                        }
                        else if (path.match(/\.png$/i)) {
                            let blob = new Blob([content], {'type': 'image/png'});
                            element = $("<img>").attr({src: URL.createObjectURL(blob), type: 'image/png'});
                        }
                        else if (path.match(/\.jpe?g$/i)) {
                            let blob = new Blob([content], {'type': 'image/jpeg'});
                            element = $("<img>").attr({src: URL.createObjectURL(blob), type: 'image/jpeg'});
                        }
                        else if (path.match(/\.gif$/i)) {
                            let blob = new Blob([content], {'type': 'image/gif'});
                            element = $("<img>").attr({src: URL.createObjectURL(blob), type: 'image/gif'});
                        }
                        else 
                            return;
                        // Add audios to the document so that they actually preload
                        if (element.is("audio"))
                            $("html").append(element);
                        AddPreloadedFile(path, element);
                    });
                });
            });
          });
        };
        
        //assert(typeof URLsToLoad == "object", "zipFiles should be an object of URLs");
        for (let u in URLsToLoad) {
            let url = URLsToLoad[u];
            let extension = url.match(/^https?:\/\/.+\.(zip|png|jpe?g|gif|mp3|ogg|wav)$/i);
            if (typeof(url) != "string" || !extension) {
                console.log("Warning (Preload): entry #"+u+" is not a valid URL, ignoring it");
                continue;
            }
            else if (extension[1].toLowerCase() == "zip")
                getZipFile(url);
            // else if (extension[1].match("png|jpe?g|gif"))
            // else if (extension[1].match("mp3|ogg|wav"))
        }

    });


    //  =========================================
    //
    //      INSTRUCTION CLASSES
    //
    //  =========================================

    // General Instruction class
    class Instruction {
        constructor(content, type) {
            this.type = type;
            this.content = content;
            this.hasBeenRun = false;
            this.isDone = false;
            this.parentElement = null;          // To be set by caller
            this.element = null;
            this.origin = this;
            this.itvlWhen = null;               // Used in WHEN
            this.resource = null;
            // J provides with copies of the element's methods/attributes that return instructions/conditional functions
            this.j = {}
            console.log("Created instruction of type "+type+" with "+this.content);
        }

        // Method to set the jQuery element
        // Feeds the J attribute
        setElement(element) {
            // Set the element
            this.element = element;
            let ti = this;
            // And feed J with copies of methods/attributes
            for (let property in this.origin.element) {
                // If method, function that calls the element's method and returns an instruction (done immediately)
                if (typeof(ti.origin.element[property]) == "function") {
                    ti.j[property] = function() {
                        ti.origin.element[property].apply(ti.origin.element, arguments);
                        return ti.newMeta(function(){ 
                            this.done();
                        });
                    };
                }
                // If attribute, function that returns that attribute
                else
                    ti.j[property] = function() { return ti.origin.element[property]; }
            }
        }

        // Method to set the resource
        // Can be AUDIO or IMAGE
        setResource(resource) {
            // If resource already set, throw a warning and abort
            if (this.origin.resource) {
                console.log("Warning: trying to replace resource for "+this.origin.content+"; several host copies of the same file? Ignoring new resource.");
                return Abort;
            }
            // Set the resource
            this.origin.resource = resource;
        }

        // Method to fetch a resource
        // Used by AudioInstr and ImageInstr
        fetchResource(resource) {
            // If resource has already been fetched (or is being fetched)
            if (_resourcesInstructions.hasOwnProperty(resource)) {
                // If the instruction's origin is already listed, abort
                if (this.origin in _resourcesInstructions[resource])
                    return Abort;
                // Else, add this instruction's origin to the list
                _resourcesInstructions[resource].push(this.origin);
                // Go through the instructions fecthing the resource
                for (let i in _resourcesInstructions[resource]) {
                    // If an instruction has already set its resource, use it
                    if (_resourcesInstructions[resource][i].resource) {
                        this.origin.setResource(_resourcesInstructions[resource][i].resource);
                        return;
                    }
                }
            }
            // Else, this instruction('s origin) is the first to fetch the resource
            else {
                // This function creates an AUDIO of IMG tag and set instructions' origins' resource when successful
                var createDistantResource = function (file) {
                    let extension = file.match(/\.([^.]+)$/);
                    // Resource should have an extension
                    if (!extension) {
                        console.log("Error: extension of "+file+" not recognized as image or audio");
                        return Abort;
                    }
                    // Getting the extension itself rather than the whole match
                    extension = extension[1];
                    // AUDIO FILE
                    if (extension.match(/mp3|ogg|wav/i)) {
                        // Creation of an AUDIO tag
                        let audioType = extension.toLowerCase().replace("mp3","mpeg"),
                            audio = $("<audio>").append($("<source>").attr({src: file, type: "audio/"+audioType}));
                        // Adding to the document so as to help preloading
                        $("html").append(audio.css("display","none"));
                        // If the file was so fast to load that it can already play
                        if (audio.get(0).readyState > 3) {
                            AddPreloadedFile(file, audio);
                            for (let i in _resourcesInstructions[file])
                                _resourcesInstructions[file][i].setResource(audio);
                        }
                        // Else, When can play through, set this audio to A
                        else
                            audio.bind("canplay canplaythrough", function(){ 
                            //audio.get(0).addEventListener("canplay", function(){ 
                                console.log("Can play (through?) "+file);
                                for (let i in _resourcesInstructions[file])
                                    _resourcesInstructions[file][i].setResource(audio);
                            }).bind("canplaythrough", function(){
                                // Add the file as preloaded only if can play through
                                AddPreloadedFile(file, audio);
                            });
                    }
                    // IMAGE
                    else if (extension.match(/gif|png|jpe?g/i)) {
                        let image = $("<img>").attr("src", file);
                        image.bind("load", function() {
                            // Add the file as preloaded
                            AddPreloadedFile(file, image);
                            for (let i in _resourcesInstructions[file])
                                _resourcesInstructions[file][i].setResource(image);
                        }).bind("error", function() {
                            console.log("Warning: could not find image "+image);
                        });
                    }
                }
                // Add this instruction's origin to the list of fetchers
                _resourcesInstructions[resource] = [this.origin];
                // Getting resource's extension
                let ti = this;
                // URL
                if (resource.match(/^http/)) 
                    createDistantResource(resource);
                // Else, try to add hosts in front of resource
                else {
                    // Trying to fetch the image from the host url(s)
                    for (let h in PennController.hosts) {
                        if (typeof(PennController.hosts[h]) != "string" || !PennController.hosts[h].match(/^http/i))
                            continue;
                        createDistantResource(PennController.hosts[h]+resource);
                    }
                }
            }
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        // Run once the instruction has taken effect
        done() {
            if (this.isDone || !this.hasBeenRun)
                return Abort;
            if (this.itvlWhen)
                clearInterval(this.itvlWhen);
            this.isDone = true;
            console.log(this.content+" ("+this.type+") done");
        }

        // Run by previous element (by default)
        run() {
            if (this.hasBeenRun)
                return Abort;
            this.hasBeenRun = true;
            console.log("Running "+this.type+" with "+this.content);
        }


        // ========================================
        // INTERNAL METHODS
        // ========================================

        // Returns a new function executing the one passed as argument after THIS one (chain can be aborted)
        extend(method, code) {
            console.log("Extending "+this.content+"'s "+method+" with "+code.toString());
            let ti = this, m = ti[method];
            return function(){
                console.log("Extension of "+method+" for "+ti.content+" ("+ti.type+")");
                if (m.apply(ti,arguments) == Abort)
                    return Abort;
                console.log("Extension PROCEEDS (NOT aborted)");
                return code.apply(ti,arguments);
            }
        }

        // Sets when a WHEN instruction is done
        // By default: upon click if clickable, timer otherwise
        whenToInsist(tryToValidate) {
            let ti = this;
            if (this.origin.clickable)
                this.origin.element.click(tryToValidate);
            else
                this.itvlWhen = setInterval(tryToValidate, 10);                    
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction that runs ifFailure as long as conditionalFunction is not met
        // Done when source is done and conditionalFunction is met
        when(conditionalFunction, ifFailure) {
            let instr = this.newMeta(function(){ 
                // Instruction immediately done if condition met
                if (conditionalFunction())
                    this.done();
                // Else, run ifFailure and find way to validate later
                else {
                    // If ifFailure is an instruction, run it
                    if (ifFailure instanceof Instruction)
                        ifFailure.run();
                    // If ifFailure is a function, execute it
                    else if (ifFailure instanceof Function)
                        ifFailure();
                }
            });
            let tryToValidate = function(){ 
                console.log("Trying to validate");
                if (!instr.isDone && conditionalFunction()) 
                    instr.done();
            };
            console.log(instr.whenToInsist);
            instr.whenToInsist(tryToValidate);
            return instr;
        }

        // Converts into a META instruction
        newMeta(callback, before) {
            let source = this, instr = new this.origin.constructor(this.content);
            // This will be called after source is run (actual running of this instruction)
            instr.sourceCallback = function(){
                console.log("CALLING SOURCE CALLBACK");
                if (typeof callback == "function")
                    callback.apply(instr, arguments);
                instr.hasBeenRun = true;
            };
            instr.before = function(){
                if (typeof before == "function")
                    before.apply(instr, arguments);
            };
            // Rewrite any specific DONE method
            instr.done = function(){ 
                if (instr.isDone)
                    return Abort;
                instr.isDone = true;
            };
            // Rewrite any specific RUN method
            instr.run = function(){
                console.log("Running "+instr.content+" (META)");
                instr.before();
                if (!source.hasBeenRun){
                    console.log("Source not done yet");
                    source.done = source.extend("done", function(){ instr.sourceCallback(); });
                    console.log("Before running source");
                    source.run();
                    console.log("After running source");
                }
                else {
                    console.log("Source already done");
                    instr.sourceCallback();
                }
            };
            // All other methods are left unaffected
            instr.type = "meta";
            instr.source = source;
            instr.setElement(source.element);
            instr.origin = source.origin;
            return instr;
        }

        // Returns an instruction to remove the element (if any)
        // Done immediately
        remove() {
            return this.newMeta(function(){
                console.log("Removing "+this.origin.content+" ("+this.origin.type+")");
                if (this.origin.element instanceof jQuery) {
                    this.origin.element.detach();
                }
                this.done();
            });
        }

        // Returns an instruction to move the origin's element
        move(where, options) {
            return this.newMeta(function(){
                if (where instanceof Instruction) {
                    if (options == "before")
                        this.origin.element.prependTo(where.origin.element);
                    else
                        this.origin.element.appendTo(where.origin.element);
                }
                this.done();
            })
        }

        // Returns an instruction to wait for a click on the element
        // Done upon click on the origin's element
        click(callback) {
            let instr = this.newMeta(function(){
                this.origin.clickable = true;
                this.origin.element.addClass(_ctrlr.cssPrefix + "clickable");
                this.origin.element.click(function(){
                    if (callback instanceof Instruction)
                        callback.run();
                    else if (callback instanceof Function)
                        callback();
                    instr.done();
                });
            });
            instr.parentElement = this.origin.parentElement;
            return instr;
        }
    }


    // Adds a SPAN to the parent element
    // Done immediately
    class TextInstr extends Instruction {
        constructor(text) {
            super(text, "text");
            this.setElement($("<span>").html(text));
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            AddElementTo(this.element, this.parentElement);
            this.done();
        }
    }


    // Adds an AUDIO to the parent element
    // Done immediately
    class AudioInstr extends Instruction {
        constructor(file) {
            super(file, "audio");
            if (!file.match(/\.(ogg|wav|mp3)$/i)) {
                console.log("Error: "+file+" is not a valid audio file.");
                return Abort;
            }
            this.auto = true;
            this.controls = false;
            this.ended = false;
            this.setElement($("<span>"));
            let ti = this;
            this.addToPreload = function() {
                // Do not add to preload if already added
                if (ti.origin.toPreload instanceof Array && ti.origin.toPreload.indexOf(ti.origin.content)>=0) {
                    console.log("ABORT!");
                    return Abort;
                }
                console.log("PRELOAD: adding "+file);
                // Adding the file to the list of files to preload
                if (!ti.origin.toPreload)
                    ti.origin.toPreload = [];
                if (ti.origin.toPreload.indexOf(file) < 0)
                    ti.origin.toPreload.push(file);
            }
            // Calling addToPreload immediately if settings say so 
            if (_autoPreloadAudio)
                this.origin.addToPreload();
            // Fetch the file
            this.origin.fetchResource(file);
            // ADD SET ELEMENT (SPAN)?
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            if (this.audio) {
                console.log("AUDIO EXISTS");
                console.log(this.audio);
                if (this.audio.readyState < 4 && _resourcesInstructions.hasOwnProperty(this.content))
                    _ctrlr.save("ERROR_PRELOADING_AUDIO", this.content, Date.now(), "Audio was not fully loaded");
                if (this.controls) {
                    this.audio.attr('controls',true);
                    this.audio.css("display", "inherit");
                }
                else
                    this.audio.css('display','none');
                this.element.append(this.audio);
                AddElementTo(this.element, this.parentElement);
                if (this.auto)
                    this.audio[0].play();
            }
            this.done();
        }

        // Set the AUDIO element
        setResource(audio) {
            // Abort if origin's audio's already set
            if (this.origin.audio)
                return Abort;
            console.log("Setting audio to...");
            console.log(audio);
            let ti = this;
            this.origin.audio = audio;
            this.origin.audio.bind('ended', function(){ ti.origin.ended = true; });
        }

        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to show the audio (and its controls)
        // Done immediately
        show(doShow) {
            if (typeof(doShow) == "undefined")
                doShow = true;
            return this.newMeta(function(){ 
                this.origin.controls = doShow;
                this.done();
            });
        }

        // Returns an instruction that users should click to start playing the audio
        // Done immediately
        clickToStart() {
            return this.newMeta(function(){ 
                // Making sure the controls are visible
                if (!this.origin.controls)
                    this.origin.controls = true;
                this.origin.auto = false;
                this.done();
            });
        }
        
        // Returns an instruction to wait
        // Done when origin's element has been played
        wait() {
            // If sound's already completely played back, done immediately
            if (this.origin.ended)
                return this.newMeta(function(){ this.done(); });
            // Else, done when origin's played back
            let instr = this.newMeta();
            this.origin.setResource = this.origin.extend("setResource", function(audio){
                this.origin.audio.bind('ended', function() { instr.done(); });
            })
            return instr;
        }

        // Returns an instruction to SAVE the parameters
        // Done immediately
        save(parameters, comment) {
            let o = this.origin;
            o.setAudio = o.extend("setAudio", function(audio){
                // If should record more than just start or just pause
                if (parameters != "start" && parameters != "pause") {
                    o.audio.bind('ended', function(){
                        console.log("Saving end");
                        _ctrlr.save(o.content, 'playend', Date.now(), comment);
                    });
                }
                // If should record more than just end or just pause
                if (parameters != "end" && parameters != "pause") {
                    o.audio.get(0).addEventListener('play', function(e){
                        console.log("Saving play");
                        if (e.target == o.element[0])
                            _ctrlr.save(o.content, 'playstart', Date.now(), comment);
                    }, true);
                }
            })
            return this.newMeta(function(){ this.done(); })
        }

        preload() {
            this.origin.addToPreload();
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Adds an IMG to the parent element        (to be replaced with image module)    
    // Done immediately
    class ImageInstr extends Instruction {
        constructor(image) {
            super(image, "image");
            // Adding the image in a span
            this.setElement($("<span>"));
            this.image = null;
            let ti = this;
            this.addToPreload = function() {
                // Do not add to preload if already added
                if (ti.origin.toPreload instanceof Array && ti.origin.toPreload.indexOf(image)>=0) {
                    console.log("ABORT!");
                    return Abort;
                }
                    console.log("PRELOAD: adding "+image);
                // Adding the file to the list of files to preload
                if (!ti.origin.toPreload)
                    ti.origin.toPreload = [];
                if (ti.origin.toPreload.indexOf(image) < 0)
                    ti.origin.toPreload.push(image);
            }
            // Calling addToPreload immediately if settings say so 
            if (_autoPreloadImages)
                this.origin.addToPreload();
            this.origin.fetchResource(image);

        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            // Appending the image tag first
            this.element.append(this.image.css("display","inherit"));
            AddElementTo(this.element, this.parentElement);
            this.done();
        }

        setResource(image) {
            this.image = image;
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to move the image to X,Y
        // Done immediately
        move(x,y) {
            return this.newMeta(function(){
                this.origin.element.css({left: x, top: y, position: 'absolute'});
                this.done();
            });
        }

        // Returns an instruction to resize the image to W,H
        // Done immediately
        resize(w,h) {
            return this.newMeta(function(){
                this.origin.element.css({width: w, height: h});
                this.done();
            });
        }

        // Returns an instruction that the image should be preloaded
        // Done immediately
        preload() {
            let ti = this;
            if (!this.origin.toPreload)
                this.origin.toPreload = [];
            this.origin.toPreload.push(this.origin.content);
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Binds a keypress event to the document
    // Done upon keypress
    class KeyInstr extends Instruction {
        constructor(keys) {
            super(keys, "key");
            this.setElement($("<key>"));
            this.keys = keys;
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        // Adds key press event
        run() {
            if (super.run() == Abort)
                return Abort;
            let ti = this;
            _ctrlr.safeBind($(document),"keydown",function(e){
                // Handling with JS's weird rules for keyCode
                let chrCode = e.keyCode - 48 * Math.floor(e.keyCode / 48);
                let chr = String.fromCharCode((96 <= e.keyCode) ? chrCode: e.keyCode);
                // If pressed key matches one of the keys (or any key if no string provided)
                if (typeof ti.keys != "string" || ti.keys.toUpperCase().match(chr)) {
                    ti.pressed(chr);
                }
            });
        }

        // Validate WHEN in origin's PRESSED
        whenToInsist(tryToValidate) {
            this.origin.pressed = this.origin.extend("pressed", tryToValidate);
        }

        // Called when the right (or any if unspecified) key is pressed
        pressed(key) {
            console.log("Key Pressed");
            if (!this.isDone) {
                this.key = key;
                this.time = Date.now();
                this.done();
            }
        }

        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to save the key that was pressed
        // Done immediately
        save(comment) {
            return this.newMeta(function(){
                let ti = this;
                console.log("Save key");
                _ctrlr.callbackBeforeFinish(function(){ 
                    _ctrlr.save('keypress', ti.origin.key, ti.origin.time, comment);
                });
                this.done();
            });
        }
    }


    // Runs all instructions passed as arguments
    // Done when all instructions are done (by default, but see the VALIDATION method)
    class ComplexInstr extends Instruction {
        constructor(instructions) {
            super(instructions, "complex");
            this.setElement($("<div>"));
            // The instructions still to be done (initial state: all of them)
            this.toBeDone = [];
            let ti = this;
            // Go through each instruction
            for (let i in instructions) {
                let instruction = instructions[i];
                // Add instruction to be done
                ti.toBeDone.push(instruction);
                // Indicate ELEMENT as each instruction's parent element
                function addParentElement(instr) {
                    instr.parentElement = ti.element;
                    if (instr.type == "meta" && !instr.source.parentElement)
                        addParentElement(instr.source);
                }
                addParentElement(instruction);
                // Inform ComplexInstr (call EXECUTED) when each instruction is done
                instruction.done = instruction.extend("done", function(){ ti.executed(instruction); });
            }
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            // Run each instruction
            for (let i in this.content)
                this.content[i].run();
            // Append an element (which is the parent for the instructions)
            AddElementTo(this.element, this.parentElement);
        }

        // Called when an instruction is done
        executed(instruction) {
            console.log(instruction);
            console.log(this.toBeDone);
            let index = this.toBeDone.indexOf(instruction);
            console.log("Index: "+index);
            if (index >= 0)
                this.toBeDone.splice(index, 1);
            // If there is no instruction left to be done, call done
            if (this.toBeDone.length < 1)
                this.done();
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction setting the validation method
        // Done when all OR any OR specific instruction(s) done
        validation(which) {
            let instr = this.newMeta();
            this.origin.executed = this.origin.extend("executed", function(instruction){
                // If 'any,' instruction is done as soon as one instruction is done
                if (which == "any")
                    instr.done();
                // If WHICH is an index, the complex instruction is done only when the index'th instruction is done
                else if (typeof(which) == "number" && which in this.origin.content) {
                    if (instr.origin.content[which] == instruction)
                            instr.done();
                }
                // If WHICH points to one of the instructions, complex is done when that instruction is done
                else if (which instanceof Instruction && which == instruction)
                    instr.done();
                // Otherwise, all instructions have to be done before this one's done (= origin's conditions)
                else {
                    if (instr.origin.isDone)
                        instr.done();
                }
            });
            return instr;
        }
    }


    // Adds a radio scale to the parent element
    // Done immediately
    class RadioInstr extends Instruction {
        constructor(label, length) {
            super({label: label, length: length}, "radio");
            this.label = label;
            this.length = length;
            this.values = [];
            this.times = [];
            this.setElement($("<span>"));
            for (let i = 0; i < length; i++) {
                let ti = this, input = $("<input type='radio'>").attr({name: label, value: i})
                input.click(function(){
                    ti.clicked($(this).attr("value"));
                });
                ti.element.append(input);
            }
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            AddElementTo(this.element, this.parentElement);
            this.done();
        }

        // Validate WHEN in origin's CLICKED
        whenToInsist(tryToValidate) {
            this.pressed = this.extend("clicked", tryToValidate);
        }

        // Called upon any click on an input
        clicked(value) {
            this.values.push(value);
            this.times.push(Date.now());
        }

        
        // ========================================
        // METHODS RETURNING CONDITIONAL FUNCTIONS
        // ========================================

        // Returns a function giving selected value/TRUE/TRUE value iff existent/= VALUES/among VALUES
        selected(values) {
            let o = this.origin;
            return function(){
                let lastvalue = o.values[o.values.length-1];
                if (typeof(values) == "undefined")
                    return lastvalue;
                else if (typeof(values) == "number" || typeof(values) == "string")
                    return (lastvalue == values);
                else if (values instanceof Array)
                    return (values.indexOf(lastvalue) >= 0 || values.indexOf(parseInt(lastvalue)) >= 0);
            };
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to wait for a click (on (a) specific value(s))
        // Done upon click meeting the specified conditions (if any)
        wait(values) {
            let instr = this.newMeta(), ti = this;
            this.origin.clicked = this.origin.extend("clicked", function(value){
                if (typeof values == "number") {
                    if (value == values)
                        instr.done();
                }
                else if (values instanceof Array) {
                    if (values.indexOf(value) >= 0)
                        instr.done();
                }
                else
                    instr.done();
            });
            return instr;
        }

        // Returns an instruction to save the parameters
        // Done immediately
        save(parameters, comment) {
            let o = this.origin;
            return this.newMeta(function(){ 
                // Tell controller to save value(s) before calling finishedCallback
                _ctrlr.callbackBeforeFinish(function(){
                    // If the value to be saved in only the final value (default)
                    if (typeof(parameters) != "string" || parameters == "last")
                        // Store a function to save the value at the end of the trial
                        _ctrlr.save(o.label, o.values[o.values.length-1], o.times[o.times.length-1], comment);
                    else {
                        // If only saving first selected value, call _ctrlr.SAVE on first click
                        if (parameters == "first" && o.values.length == 1)
                            _ctrlr.save(o.label, o.values[0], o.times[0], comment);
                        // If all values are to be saved, call _ctrlr.SAVE on every click
                        else if (parameters == "all") {
                            for (let n in o.values)
                                _ctrlr.save(o.label, o.values[n], o.times[n], comment);
                        }
                    }
                });
                this.done();
            });
        }
    }


    // Adds a timer
    // Done when timer has ellapsed
    class TimerInstr extends Instruction {
        constructor(delay, callback) {
            super(delay, "timer");
            this.delay = delay;
            this.setElement($("<timer>"));
            this.step = 10;
            this.callback = callback;
        }

        // ========================================
        // PROPER METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            this.left = this.delay;
            let ti = this;
            this.timer = setInterval(function(){
                ti.left -= ti.step;
                if (ti.left <= 0){
                    clearInterval(ti.timer);
                    ti.left = 0;
                    if (ti.callback instanceof Function)
                        ti.callback();
                    else if (ti.callback instanceof Instruction)
                        ti.callback.run();
                    ti.done();
                }
            }, this.step);
        }

        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction that prematurely stops the timer
        // Done immediately
        stop(done) {
            let ti = this, instr = this.newMeta(function() { ti.done });
            instr.run = function(){ 
                clearInterval(ti.origin.timer);
                // If DONE is true, the (origin) timer instruction is considered done upon stopping
                if (done)
                    ti.origin.done();
            }
            return instr;
        }

        // Returns an instruction after setting the origin's step
        // Done immediately
        step(value) {
            // (Re)set the step
            this.origin.step = value;
            // Return the instruction itself
            return this.newMeta(function(){ this.done(); });
        }    
    }


    // Executes a function
    // Done immediately
    class FunctionInstr extends Instruction {
        constructor(func) {
            super(func, "function");
            this.setElement($("<function>"));
            this.func = func;
        }

        // ========================================
        // PROPER METHODS
        // ========================================
        run() {
            if (super.run() == Abort)
                return Abort;
            this.func();
            this.done();
        }
    }


    // Adds something to the list of what is to be saved
    // Done immediately
    class SaveInstr extends Instruction {
        constructor(parameters) {
            super(parameters, "save");
            this.setElement($("<save>"));
            this.parameter = parameters[0];
            this.value = parameters[1];
            this.comment = parameters[2];
        }

        // ========================================
        // PROPER METHODS
        // ========================================
        run() {
            if (super.run() == Abort)
                return Abort;
            _ctrlr.save(this.parameter, this.value, Date.now(), this.comment);
            this.done();
        }
    }


    class ClearInstr extends Instruction {
        constructor() {
            super("clear", "clear");
        }

        run() {
            super.run();
            this.hasBeenRun = true;
            $(".PennController-PennController div").detach();
            this.done();
        }
    }

    //  =========================================
    //
    //      PENNCONTROLLER INSTRUCTION METHODS
    //
    //  =========================================

    // Returns an instruction in function of the argument(s) type
    PennController.instruction = function(arg) {
        // Create a new instruction
        switch (typeof(arg)) {
            case "string":
                if (arg.match(/\.(png|jpe?g|bmp|gif)$/i))    
                    return new ImageInstr(arg);             // Create an image instruction
                else if (arg.match(/\.(wav|ogg|mp3)$/i))
                    return new AudioInstr(arg);             // Create an audio instruction
                else 
                    return new TextInstr(arg);              // Create a text instruction
            break;
            case "number":
                return new TimerInstr(arg);                 // Create a timer instruction
            break;
            case "function":
                return new FunctionInstr(arg);              // Create a function instruction
            break;
            case "object":
                return new ComplexInstr(arguments);         // Create a complex instruction
            break;
        }
    };

    // Specific methods
    PennController.instruction.text = function(text){ return new TextInstr(text); };
    PennController.instruction.image = function(image){ return new ImageInstr(iamge); };
    PennController.instruction.audio = function(audio){ return new AudioInstr(audio); };
    PennController.instruction.key = function(keys){ return new KeyInstr(keys); };
    PennController.instruction.save = function(){ return new SaveInstr(arguments); };
    // t.tooltip = function(text){ return new TooltipInstr(text); }; // To be implemented
    // t.if = function(condition, success, failure){ return new IfInstr(condition, success, failure); };
    // t.waitUntil = function(condition){ return new WaitInstr(condition); };
    PennController.instruction.timer = function(delay, callback){ return new TimerInstr(delay, callback); };
    PennController.instruction.radioButtons = function(label, length){ return new RadioInstr(label, length); };
    PennController.instruction.clear = function(label, length){ return new ClearInstr(); };


    

    //  =========================================
    //
    //      THE CONTROLLER ITSELF
    //
    //  =========================================
    
    define_ibex_controller({
      name: "PennController",
      jqueryWidget: {    
        _init: function () {

            this.cssPrefix = this.options._cssPrefix;
            this.utils = this.options._utils;
            this.finishedCallback = this.options._finishedCallback;

            this.instructions = this.options.instructions;

            this.toSave = [];
            this.toRunBeforeFinish = [];

            var _t = this;

            //  =======================================
            //      INTERNAL FUNCTIONS
            //  =======================================

            // Adds a parameter/line to the list of things to save
            this.save = function(parameter, value, time, comment){
                _t.toSave.push([
                        ["Parameter", parameter],
                        ["Value", value],
                        ["Time", time],
                        ["Comment", comment ? comment : "NULL"]
                    ]);
            };

            // Adds a function to be executed before finishedCallBack
            this.callbackBeforeFinish = function(func) {
                console.log("Adding function before finish");
                _t.toRunBeforeFinish.push(func);
            };

            this.end = function() {
                for (f in _t.toRunBeforeFinish){
                    _t.toRunBeforeFinish[f]();
                }
                console.log(_t.toSave);
                _t.finishedCallback(_t.toSave);
            };

            // Inform that the current controller is this one
            _ctrlr = _t;

            // Make it so that each instruction runs next one
            let previous;
            for (let i in _t.instructions) {
                let next = _t.instructions[i];
                // If not an instruction, continue
                if (!(next instanceof Instruction))
                    continue;
                // Give a parent element
                next.parentElement = _t.element;
                // Run next instruction when previous is done
                if (previous instanceof Instruction) {
                    console.log(next.content+" ("+next.type+") will be triggered after "+previous.content+" ("+previous.type+")");
                    previous.done = previous.extend("done", function(){ next.run(); });
                }
                // Check if the instruction requires a preloaded resource
                if (next.origin.toPreload) {
                    // Go through each resource that next's origin has to preload
                    for (let p in next.origin.toPreload) {
                        let fileToPreload = next.origin.toPreload[p];
                        // Add the resource only if not already preloaded
                        if (!_preloadedFiles.hasOwnProperty(fileToPreload)) {
                            if (!_ctrlr.toPreload)
                                _ctrlr.toPreload = [];
                            // Add the resource only if not already listed (several instructions may share the same origin)
                            if (_ctrlr.toPreload.indexOf(fileToPreload) < 0) {
                                _ctrlr.toPreload.push(fileToPreload);
                                // Binding a function upon file having preloaded
                                if (!_preloadCallbacks.hasOwnProperty(fileToPreload))
                                    _preloadCallbacks[fileToPreload] = [];
                                _preloadCallbacks[fileToPreload].push(function(){
                                    console.log("Preload: CALLBACK for "+fileToPreload);
                                    // Remove the entry (set index here, as it may have changed by the time callback is called)
                                    let index = _ctrlr.toPreload.indexOf(fileToPreload);
                                    if (index >= 0)
                                        _ctrlr.toPreload.splice(index, 1);
                                    // If no more file to preload, run
                                    if (_ctrlr.toPreload.length <= 0) {
                                        $("#waitWhilePreloading").remove();
                                        if (!_ctrlr.instructions[0].hasBeenRun)
                                            _ctrlr.instructions[0].run();
                                    }
                                });
                                console.log("Waiting to preload "+next.origin.toPreload[p]);
                            }
                        }
                    }
                }
                previous = next;
            }
            // Now previous is the last instruction
            previous.done = previous.extend("done", function(){ _t.end(); });

            // If anything to preload and settings...
            //if (_ctrlr.toPreload && PennController.checkPreloadBeforeEachItem) {
            if (_ctrlr.toPreload) {
                // Add a preloading message
                _ctrlr.element.append($("<div id='waitWhilePreloading'>").html(_waitWhilePreloadingMessage));
                // Adding a timeout in case preloading fails
                setTimeout(function(){
                    // Abort if first instruction has been run in the meantime (e.g. preloading's done)
                    if (_ctrlr.instructions[0].hasBeenRun)
                        return Abort;
                    $("#waitWhilePreloading").remove();
                    if (!_ctrlr.instructions[0].hasBeenRun)
                        _ctrlr.instructions[0].run();
                }, _timeoutPreload);
            }
            // Else, run the first instruction already!
            else
                _t.instructions[0].run();
        }
      },

      properties: {
        obligatory: ["instructions"],
        countsForProgressBar: false,
        htmlDescription: null
      }
    });
    // END OF IBEX CONTROLLER


})();
// END OF ENCAPSULATION