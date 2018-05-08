/* This software is licensed under a BSD license; see the LICENSE file for details. */

// - Version alpha 0.3
// - Last Update:  2018, March 28
// - Changes:
//      + Added the Canvas instruction
//      + Added the Instruction.id method

// The only object available to the users
var PennController;

// The Youtube API needs global access this function
var onYouTubeIframeAPIReady;

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
        // Create a new dictionary of instructions
        _localInstructions.push({});
        // ID is _instructions' length minus 2: we just pushed for NEXT controller
        return {instructions: arguments, id: _localInstructions.length-2};
    };

    // Adds URL paths to be used for fetching resources
    PennController.AddHost = function(host) {
        if (!PennController.hasOwnProperty("hosts"))
            PennController.hosts = [];
        PennController.hosts.push(host);
    }


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
    var _URLsToLoad = [];

    // Associates preloaded files with callback functions
    var _preloadCallbacks = {};

    // How long the preloader should wait before ignoring failure to preload (ms)
    var _timeoutPreload = 120000;

    // The message that should be displayed while preloading
    var _waitWhilePreloadingMessage = "Please wait while the resources are preloading. This process may take up to 2 minutes.";

    // Whether all audio instructions should automatically preload
    var _autoPreloadAudio = true;
    
    // Whether all audio instructions should automatically preload
    var _autoPreloadImages = true;

    // Whether all video instructions should automatically preload
    var _autoPreloadVideos = true;

    // Whether ALL resources should be preloaded at once and asap
    var _globalPreload = true;

    // Resources called by instructions
    var _resourcesInstructions = {};

    // Youtube videos to load
    var _youtubeVideos = {};

    // All the resources to preload
    var _resourcesToPreload = {};

    // The elements being appended
    var _elementsToAppend = [];

    // The instructions of each controller
    var _localInstructions = [{}];

    // Making sure that MutationObserver is defined across browsers
    const MutationObserver =
        window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    //  =========================================
    //
    //      GENERAL INTERNAL FUNCTIONS
    //
    //  =========================================

    // Adds an element to another element
    // If the other element is the main document, add a div first
    function _addElementTo(element, to, callback) {
        if (to == null)
            to = _ctrlr.element;
        if (!(element instanceof jQuery) || !(to instanceof jQuery))
            return Abort;
        // If adding directly to the controller, embed in a DIV
        if (to == _ctrlr.element)
            element = $("<div>").append(element);
        // From https://stackoverflow.com/questions/38588741/having-a-reference-to-an-element-how-to-detect-once-it-appended-to-the-document
        if (callback instanceof Function && MutationObserver) {
            let observer = new MutationObserver((mutations) => {
                if (mutations[0].addedNodes.length === 0)
                    return;
                if (Array.prototype.indexOf.call(mutations[0].addedNodes, element[0]) === -1)
                    return;
                observer.disconnect();
                callback();
            });

            observer.observe(to[0], {
                childList: true
            });
        }
        to.append(element);
    }

    // Adds a file to the preloaded files
    function _addPreloadedFile(file, element) {
        if (_preloadedFiles.hasOwnProperty(file))
            console.log("Warning (Preload): overriding duplicate file '"+file+"'");
        _preloadedFiles[file] = element;
        // Going through the instructions awaiting to fetch the file
        if (_resourcesInstructions.hasOwnProperty(file)) {
            // Set ELEMENT as their resource
            for (i in _resourcesInstructions[file])
                _resourcesInstructions[file][i]._setResource(element);
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
            _autoPreloadVideos = false;
            _autoPreloadAudio = false;
            _autoPreloadImages = true;
        }
        else if (parameter == "audio") {
            _autoPreloadAudio = true;
            _autoPreloadImages = false;
            _autoPreloadVideos = false;
        }
        else if (parameters == "video") {
            _autoPreloadVideos = true;
            _autoPreloadAudio = false;
            _autoPreloadImages = false;
        }
        else if (typeof(parameter) == "object") {
            if (parameter.hasOwnProperty("images"))
                _autoPreloadImages = parameter.images;
            if (parameter.hasOwnProperty("audio"))
                _autoPreloadAudio = parameter.audio;
            if (parameter.hasOwnProperty("videos"))
                _autoPreloadVideos = parameter.videos;
        }
        else {
            _autoPreloadAudio = true;
            _autoPreloadImages = true;
            _autoPreloadVideos = true;
        }
    }

    // Loads the file at each URL passed as an argument
    // Files can be ZIP files, image files or audio files
    PennController.PreloadZip = function () {
        for (let url in arguments)
            _URLsToLoad.push(arguments[url]);
    };

    // Internal loading of the zip files
    // Will be executed when jQuery is ready
    var _preloadZip = function() {
        if (!_URLsToLoad.length) return;

        // This object will contain the list of audio files to preload
        var resourcesRepository = {};
        var numberUnzippedFiles = 0;

        var getZipFile = function(url){
          var zip = new JSZip();
          
          JSZipUtils.getBinaryContent(url, function(error, data) {
            if(error) throw error;
            // Loading the zip object with the data stream
            zip.loadAsync(data).then(function(){
                var currentLength = 0;
                // Going through each zip file
                zip.forEach(function(path, file){
                    // Unzipping the file, and counting how far we got
                    file.async('arraybuffer').then(function(content){
                        // Incrementing now, because 'return' if the file's type doesn't match
                        currentLength++;
                        // If all the files have been unzipped
                        if (currentLength >= Object.keys(zip.files).length) {
                            // Remove the URL from the array
                            let index = _URLsToLoad.indexOf(url);
                            if (index >= 0)
                                _URLsToLoad.splice(index,1);
                        }
                        // Excluding weird MACOS zip files
                        if (path.match(/__MACOS.+\/\.[^\/]+$/))
                            return;
                        // Getting rid of path, keeping just filename
                        let filename = path.replace(/^.*?([^\/]+)$/,"$1");
                        // Type will determine the type of Blob and HTML tag
                        let type = "";
                        // AUDIO
                        if (filename.match(/\.(wav|mp3|ogg)$/i))
                            type = "audio/"+filename.replace(/^.+\.([^.]+)$/,"$1").replace(/mp3/i,"mpeg").toLowerCase();
                        // IMAGE
                        else if (filename.match(/\.(png|jpe?g|gif)$/i))
                            type = "image/"+filename.replace(/^.+\.([^.]+)$/,"$1").replace(/jpg/i,"jpeg").toLowerCase();
                        // Unrecognized
                        else 
                            return;
                        // Create the BLOB object
                        let blob = new Blob([content], {type: type});
                        // SRC attribute points to the dynamic Blob object
                        let attr = {src: URL.createObjectURL(blob), type: type};
                        // If Audio
                        if (type.match(/audio/)) {
                            // Add SOURCE inside AUDIO, and add 'preload=auto'
                            let element = $("<audio>").append($("<source>").attr(attr)).css("display", "none").attr({preload: "auto"});
                            // Add audio to the document so that they actually preload
                            $("html").append(element);
                            // And bind a CANPLAY event (for some reason never fires canplayTHROUGH in Firefox, though local file...)
                            element.one("canplay", function(){ _addPreloadedFile(filename, element); });
                        }
                        // If image, add it directly (no need to preload)
                        else
                            _addPreloadedFile(filename, $("<img>").attr(attr));
                    });
                });
            });
          });
        };
        
        // Fetch the zip file
        for (let u in _URLsToLoad) {
            let url = _URLsToLoad[u];
            let extension = url.match(/^https?:\/\/.+\.(zip)$/i);
            if (typeof(url) != "string" || !extension) {
                console.log("Warning (Preload): entry #"+u+" is not a valid URL, ignoring it");
                continue;
            }
            else if (extension[1].toLowerCase() == "zip")
                getZipFile(url);
        }
    };

    // Load the Youtube API (see https://developers.google.com/youtube/iframe_api_reference)
    // Will be executed when jQuery is ready
    var _loadYTAPI = function() {
        var tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // 3. This function creates an <iframe> (and YouTube player)
        //    after the API code downloads.
        var player;
        onYouTubeIframeAPIReady = function(){
            for (y in _youtubeVideos) {
                _youtubeVideos[y].call();
            }
        }
    };

    // Start to download the zip files as soon as the document is ready
    $(document).ready(function(){
        // Preload any zip file
        _preloadZip();
        // Load the YT API
        _loadYTAPI();        
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
            this.j = {};
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

        // Adds a file to preloading
        _addToPreload(resource) {
            // Do not add to preload if already added
            if (this.origin.toPreload instanceof Array && this.origin.toPreload.indexOf(resource)>=0)
                return Abort;
            // Adding the file to the list of files to preload
            if (!this.origin.toPreload)
                this.origin.toPreload = [];
            if (this.origin.toPreload.indexOf(resource) < 0) {
                this.origin.toPreload.push(resource);
                // Also add the file to the general list of preloading
                if (!_resourcesToPreload.hasOwnProperty(resource))
                    _resourcesToPreload[resource] = {instructions: [this.origin]};
                else
                    _resourcesToPreload[resource].instructions.push(this.origin);
            }
        }

        // Method to set the resource
        // Can be AUDIO or IMAGE
        _setResource(resource) {
            // If resource already set, throw a warning and abort
            if (this.origin.resource) {
                console.log("Warning: trying to replace resource for "+this.origin.content+"; several host copies of the same file? Ignoring new resource.");
                return Abort;
            }
            // Set the resource
            this.origin.resource = resource;
        }

        // Method to fetch a resource
        // Used by AudioInstr, ImageInstr, VideoInstr (YTInstr deals differently)
        fetchResource(resource, type) {
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
                        this.origin._setResource(_resourcesInstructions[resource][i].resource);
                        return;
                    }
                }
            }
            // Else, this instruction('s origin) is the first to fetch the resource
            else {
                // This function creates an AUDIO of IMG tag and set instructions' origins' resource when successful
                var createDistantResource = function (file, host) {
                    let extension = file.match(/\.([^.]+)$/);
                    let source = file;
                    // If trying to add a host path, 'file' should remain path-less, but source has to include the host past
                    if (typeof(host) == "string")
                        source = host+file;
                    // Resource should have an extension
                    if (!extension && !type) {
                        console.log("Error: extension of "+file+" not recognized as image, audio or video");
                        return Abort;
                    }
                    // Getting the extension itself rather than the whole match
                    extension = extension[1];
                    // AUDIO FILE
                    if (type == "audio" || extension.match(/mp3|ogg|wav/i)) {
                        // Creation of an AUDIO tag
                        let audioType = extension.toLowerCase().replace("mp3","mpeg"),
                            audio = $("<audio>").append($("<source>").attr({src: source, type: "audio/"+audioType}));
                        // Adding to the document so as to help preloading
                        $("html").append(audio.css("display","none"));
                        // If the file was so fast to load that it can already play
                        if (audio.get(0).readyState > 3) {
                            _addPreloadedFile(file, audio);
                            for (let i in _resourcesInstructions[file])
                                _resourcesInstructions[file][i]._setResource(audio);
                        }
                        // Else, When can play through, set this audio to A
                        else
                            audio.one("canplay", function(){ 
                                for (let i in _resourcesInstructions[file])
                                    _resourcesInstructions[file][i]._setResource(audio);
                            }).one("canplaythrough", function(){
                                // Add the file as preloaded only if can play through
                                _addPreloadedFile(file, audio);
                            });
                        audio.attr("preload", "auto");
                    }
                    // IMAGE
                    else if (type == "image" || extension.match(/gif|png|jpe?g/i)) {
                        let image = $("<img>").attr("src", source);
                        // Adding to the document so as to help preloading
                        $("html").append(image.css("display","none"));
                        image.bind("load", function() {
                            // Add the file as preloaded
                            _addPreloadedFile(file, image);
                            for (let i in _resourcesInstructions[file])
                                _resourcesInstructions[file][i]._setResource(image);
                        }).bind("error", function() {
                            console.log("Warning: could not find image "+image);
                        });
                    }
                    // VIDEO
                    else if (type == "video" || extension.match(/mp4|ogg|webm/i)) {
                        // TO DO
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
                        createDistantResource(resource, PennController.hosts[h]);
                    }
                }
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        // Run once the instruction has taken effect
        done() {
            if (this.isDone || !this.hasBeenRun)
                return Abort;
            // Cannot be done if has a previous instruction that is not done yet
            if (this.previousInstruction instanceof Instruction && !this.previousInstruction.isDone)
                return Abort;
            // If instruction was called with WHEN clear any timeout
            if (this.itvlWhen)
                clearInterval(this.itvlWhen);
            this.isDone = true;
        }

        // Run by previous element (by default)
        run() {
            if (this.hasBeenRun)
                return Abort;
            // Cannot be run if has a previous instruction that is not done yet
            if (this.previousInstruction instanceof Instruction && !this.previousInstruction.isDone)
                return Abort;
            this.hasBeenRun = true;
        }


        // ========================================
        // INTERNAL METHODS
        // ========================================

        // Returns a new function executing the one passed as argument after THIS one (chain can be aborted)
        extend(method, code) {
            let ti = this, m = ti[method];
            return function(){
                if (m.apply(ti,arguments) == Abort)
                    return Abort;
                return code.apply(ti,arguments);
            }
        }

        // Sets when a WHEN instruction is done
        // By default: upon click if clickable, timer otherwise
        _whenToInsist(tryToValidate) {
            let ti = this;
            if (this.origin.clickable)
                this.origin.element.click(tryToValidate);
            else
                this.itvlWhen = setInterval(tryToValidate, 10);                    
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction that runs ifFailure if conditionalFunction is not met
        // Done when source is done and conditionalFunction is met
        when(conditionalFunction, ifFailure) {
            return this.newMeta(function(){ 
                console.log(conditionalFunction());
                // Instruction immediately done if condition met
                if (conditionalFunction())
                    this.done();
                // Else, run ifFailure and find way to validate later
                else {
                    // If ifFailure is an instruction, run it
                    if (ifFailure instanceof Instruction) {
                        ifFailure.parentElement = _ctrlr.element;
                        ifFailure.run();
                    }
                    // If ifFailure is a function, execute it
                    else if (ifFailure instanceof Function)
                        ifFailure();
                    // Try to insist
                    let ti = this;
                    this._whenToInsist(function(){
                        if (!ti.isDone && conditionalFunction()) 
                            ti.done();
                    });
                }
            });
        }

        // Converts into a META instruction
        newMeta(callback, before) {
            // Maybe newMeta shouldn't pass on the source's content?
            let source = this, instr = new this.origin.constructor(Abort);
            // This will be called after source is run (actual running of this instruction)
            instr.sourceCallback = function(){
                // Cannot be run if sources not done yet
                let currentInstruction = this;
                while (currentInstruction.source) {
                    if (!currentInstruction.source.isDone)
                        return Abort;
                    currentInstruction = currentInstruction.source;
                }
                instr.hasBeenRun = true;
                if (typeof callback == "function")
                    callback.apply(instr, arguments);
            };
            instr.before = function(){
                if (typeof before == "function")
                    before.apply(instr, arguments);
            };
            // Rewrite any specific DONE method
            instr.done = function(){ 
                if (Instruction.prototype.done.apply(instr) == Abort)
                    return Abort;
                // Cannot be done if sources not done yet
                let currentInstruction = this;
                while (currentInstruction.source) {
                    if (!currentInstruction.source.isDone)
                        return Abort;
                    currentInstruction = currentInstruction.source;
                }
            };
            // Rewrite any specific RUN method
            instr.run = function(){
                if (Instruction.prototype.run.apply(instr) == Abort)
                    return Abort;
                // Should not be considered run yet (only so in callback)
                instr.hasBeenRun = false;
                instr.before();
                if (!source.hasBeenRun){
                    source.done = source.extend("done", function(){ instr.sourceCallback(); });
                    source.run();
                }
                else {
                    instr.sourceCallback();
                }
            };
            // All other methods are left unaffected
            instr.type = "meta";
            instr.source = source;
            instr.setElement(source.element);
            instr.origin = source.origin;
            instr.toPreload = source.toPreload;
            return instr;
        }

        // Returns an instruction to remove the element (if any)
        // Done immediately
        remove() {
            return this.newMeta(function(){
                if (this.origin.element instanceof jQuery) {
                    this.origin.element.detach();
                }
                this.done();
            });
        }

        // Returns an instruction to move the origin's element
        // Done immediately
        move(where, options) {
            return this.newMeta(function(){
                if (where instanceof Instruction) {
                    let origin = where.origin.element;
                    while (where instanceof ComplexInstr && !origin.is("table"))
                        origin = origin.parent();
                    if (options == "before")
                        origin.before(this.origin.element);
                    else
                        origin.after(this.origin.element);
                }
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

        // Returns an instruction to center the element inside its parent
        // Done immediately
        center() {
            return this.newMeta(function(){
                this.origin.element.parent().css("text-align","center");
                this.origin.element.css("text-align","center");
                this.origin.element.css("margin","auto");
                this.done();
            });
        }

        // Returns an instruction to shift X & Y's offsets
        // Done immediately
        shift(x, y) {
            return this.newMeta(function(){
                if (this.origin.element.css("position").match(/static|relative/)) {
                    this.origin.element.css("position", "relative");
                    this.origin.element.css({left: x, top: y});
                }
                else if (this.origin.element.css("position") == "absolute") {
                    this.origin.element.css({
                        left: this.origin.element.css("left")+x,
                        top: this.origin.element.css("top")+y
                    });
                }
                this.done();
            });
        }

        // Returns an instruction to dynamically change css
        // Done immediately
        css() {
            let arg = arguments;
            return this.newMeta(function(){
                this.origin.element.css.apply(this.origin.element, arg);
                this.done();
            });
        }

        // Returns an instruction to hide the origin's element
        // Done immediately
        hide(shouldHide) {
            if (typeof(shouldHide)=="undefined")
                shouldHide = true;
            return this.newMeta(function(){
                if (shouldHide)
                    this.origin.element.css("visibility","hidden");
                else
                    this.origin.element.css("visibility","visible");
                this.done();
            });
        }

        // Returns an instruction to wait for a click on the element
        // Done upon click on the origin's element
        click(callback) {
            return this.newMeta(function(){
                this.origin.clickable = true;
                this.origin.element.addClass(_ctrlr.cssPrefix + "clickable");
                let ti = this;
                this.origin.element.click(function(){
                    if (callback instanceof Instruction) {
                        callback.parentElement = _ctrlr.element;
                        callback.run();
                    }
                    else if (callback instanceof Function)
                        callback.apply(_ctrlr.variables);
                    ti.done();
                });
            });
        }

        // Returns an instruction to assign an id to the instruction
        // Done immediately
        id(name) {
            _localInstructions[_localInstructions.length-1][name] = this.origin;
            this.origin.id = name;
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Adds a SPAN to the parent element
    // Done immediately
    class TextInstr extends Instruction {
        constructor(text) {
            super(text, "text");
            if (text != Abort) {
                this.setElement($("<span>").html(text));
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            _addElementTo(this.element, this.parentElement);
            this.done();
        }

        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Changes the content
        // Done immediately
        text(text) {
            return this.newMeta(function(){
                this.origin.content = text;
                this.origin.element.html(text);
                this.done();
            })
        }
    }


    // Adds an AUDIO to the parent element
    // Done immediately
    class AudioInstr extends Instruction {
        constructor(file) {
            super(file, "audio");
            if (file != Abort) {
                if (!file.match(/\.(ogg|wav|mp3)$/i)) {
                    console.log("Error: "+file+" is not a valid audio file.");
                    return Abort;
                }
                // Autoplay by default
                this.autoPlay = true;
                // Do not show controls by default
                this.controls = false;
                // Will be set to true when playback ends
                this.ended = false;
                // A record of the different events (play, pause, stop, seek)
                this.eventsRecord = [];
                // Whether to save plays
                this.savePlays = false;
                // Whether to save pauses
                this.savePauses = false;
                // Whether to save ends
                this.saveEnds = false;
                // Whether to save seeks
                this.saveSeeks = false;
                // Set element to SPAN (will append audio later)
                this.setElement($("<span>"));
                // Calling addToPreload immediately if settings say so 
                if (_autoPreloadAudio)
                    this.origin._addToPreload(file);
                // Fetch the file
                this.origin.fetchResource(file, "audio");
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            if (this.audio) {
                // Binding the whenEnded method (upon running because otherwise potential problems with other items' instructions)
                let ti = this;
                this.origin.audio.bind('ended', function(){ ti._whenEnded(); });
                // If audio not entirely preloaded yet, send an error signal
                if (this.audio.readyState < 4 && _resourcesInstructions.hasOwnProperty(this.content))
                    _ctrlr.save("ERROR_PRELOADING_AUDIO", this.content, Date.now(), "Audio was not fully loaded");
                // Show controls
                if (this.controls) {
                    this.audio.attr('controls',true);
                    this.audio.css("display", "inherit");
                }
                // Hide audio element
                else
                    this.audio.css('display','none');
                // Adding it to the element
                this.element.append(this.audio);
                // Adding the element to the document
                _addElementTo(this.element, this.parentElement);
                // Autoplay
                if (this.autoPlay)
                    this.audio[0].play();
            }
            this.done();
        }

        // Set the AUDIO element
        _setResource(audio) {
            // Abort if origin's audio's already set
            if (this.origin.audio)
                return Abort;
            let ti = this.origin;
            this.origin.audio = audio;
            // Record the different events
            audio.bind("play", function(){
                ti.eventsRecord.push(["play", Date.now(), audio[0].currentTime]);
            }).bind("ended", function(){
                ti.eventsRecord.push(["end", Date.now(), audio[0].currentTime]);
            }).bind("pause", function(){
                ti.eventsRecord.push(["pause", Date.now(), audio[0].currentTime]);
            }).bind("seeked", function(){
                ti.eventsRecord.push(["seek", Date.now(), audio[0].currentTime]);
            });
            if (this.origin.hasBeenRun) {
                this.origin.hasBeenRun = false;
                this.origin.run();
            }
        }

        // Called when the audio ends
        _whenEnded() {
            this.origin.ended = true;
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
            this.origin._whenEnded = this.origin.extend("_whenEnded", function(){
                instr.done();
            })
            return instr;
        }

        // Returns an instruction to SAVE the parameters
        // Done immediately
        save(parameters) {
            let o = this.origin, 
                saveFct = function(event) {
                    if (event == "play") {
                        if (o.savePlays)
                            return Abort;
                        o.savePlays = true;
                    }
                    else if (event == "pause") {
                        if (o.savePauses)
                            return Abort;
                        o.savePauses = true;
                    }
                    else if (event == "end") {
                        if (o.saveEnds)
                            return Abort;
                        o.saveEnds = true;
                    }
                    else if (event == "seek") {
                        if (o.saveSeeks)
                            return Abort;
                        o.saveSeeks = true;
                    }
                    else
                        return Abort;
                    // Adding it to done, because _ctrlr is not defined upon creation of instruction
                    o.done = o.extend("done", function(){
                        _ctrlr.callbackBeforeFinish(function(){
                            for (let r in o.eventsRecord) {
                                let record = o.eventsRecord[r];
                                if (record[0] == event)
                                    _ctrlr.save(o.content, record[0], record[1], record[2]);
                            }
                        });
                    });
                };
            // Argument is a string
            if (arguments.length == 1 && typeof(parameters) == "string")
                saveFct(parameters);
            // Multiple arguments
            else if (arguments.length > 1) {
                for (let a = 0; a < arguments.length; a++)
                    saveFct(arguments[a]);
            }
            // No argument (or unintelligible argument): save everything
            else {
                saveFct("play");
                saveFct("pause");
                saveFct("end");
                saveFct("seek");
            }
            return this.newMeta(function(){ this.done(); });
        }

        preload() {
            this.origin._addToPreload(this.origin.content);
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Adds an IMG to the parent element        (to be replaced with image module)    
    // Done immediately
    class ImageInstr extends Instruction {
        constructor(image, width, height) {
            super(image, "image");
            if (image != Abort) {
                let div = $("<div>").css("display", "inline-block");
                if (typeof(width) == "number" && typeof(height) == "number")
                    div.css({width: width, height: height});
                // A span to which the image will be appended upon running
                this.setElement(div);
                // This gets its value in _setResource
                this.image = null;
                // Calling addToPreload immediately if settings say so 
                if (_autoPreloadImages)
                    this.origin._addToPreload(image);
                this.origin.fetchResource(image, "image");
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            //this.element.append(this.image);
            _addElementTo(this.element, this.parentElement);
            this.done();
        }

        _setResource(image) {
            if (this.origin.image)
                return Abort;
            this.origin.image = image.clone();
            this.origin.element.append(this.origin.image);
            this.origin.image.css({width: "100%", height: "100%", display: "inherit"});
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

        // Returns an instruction that the image should be preloaded
        // Done immediately
        preload() {
            this.origin._addToPreload(this.origin.content);
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Binds a keypress event to the document
    // Done upon keypress
    class KeyInstr extends Instruction {
        constructor(keys, caseSensitive) {
            super(keys, "key");
            if (keys != Abort) {
                this.setElement($("<key>"));
                this.keys = [];
                // Can pass a number (useful for special keys such as shift)
                if (typeof(keys) == "number")
                    this.keys.push(keys);
                // Or a string of characters
                else if (typeof(keys) == "string") {
                    for (let k in keys) {
                        // If case sensitive, add the exact charcode
                        if (caseSensitive)
                            this.keys.push(keys.charCodeAt(k));
                        // If not, add both lower- and upper-case charcodes
                        else {
                            let upperKeys = keys.toUpperCase(),
                                lowerKeys = keys.toLowerCase();
                            this.keys.push(lowerKeys.charCodeAt(k));
                            this.keys.push(upperKeys.charCodeAt(k));
                        }
                    }
                }
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        // Adds key press event
        run() {
            if (super.run() == Abort)
                return Abort;
            let ti = this;
            _ctrlr.safeBind($(document),"keydown",function(e){
                if (ti.keys.length==0 || ti.keys.indexOf(e.keyCode)>=0)
                    ti._pressed(e.keyCode);
            });
        }

        // Validate WHEN in origin's PRESSED
        _whenToInsist(tryToValidate) {
            this.origin._pressed = this.origin.extend("_pressed", tryToValidate);
        }

        // Called when the right (or any if unspecified) key is pressed
        _pressed(key) {
            if (!this.isDone) {
                this.origin.key = String.fromCharCode(key);
                this.origin.time = Date.now();
                this.origin.done();
            }
        }

        // ========================================
        // CONDITIONAL FUNCTIONS
        // ========================================

        // Returns a function to true if the key pressed matches
        // false otherwise
        pressed(keys) {
            let ti = this.origin;
            return function(){
                let key = ti.key;
                if (!key)
                    return false;
                else if (typeof(keys) == "string")
                    return RegExp(key,'i').test(keys);
                else if (typeof(keys) == "number")
                    return keys == key.charCodeAt(0);
                else
                    return key.charCodeAt(0);
            };
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to save the key that was pressed
        // Done immediately
        save(comment) {
            return this.newMeta(function(){
                let ti = this;
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
            if (instructions != Abort) {
                this.table = $("<table>").addClass("PennController-Complex");
                // The instructions still to be done (initial state: all of them)
                this.toBeDone = [];
                // This instruction inherits all preloads of its children
                this.toPreload = [];
                let ti = this;
                let tr = $("<tr>");
                // Go through each instruction
                for (let i in instructions) {
                    let instruction = instructions[i],
                        td = $("<td>");
                    if (!(instruction instanceof Instruction))
                        continue;
                    // Add instruction to be done
                    ti.toBeDone.push(instruction);
                    // Assign each instruction to the proper parent
                    function addParentElement(instr) {
                        // If complex itself, add directly to the table
                        if (instr instanceof ComplexInstr)
                            instr.parentElement = ti.table;
                        // Else, add to the current TD
                        else
                            instr.parentElement = td;
                        // If instruction has sources, navigate
                        if (instr.type == "meta" && !instr.source.parentElement)
                            addParentElement(instr.source);
                    }
                    // Initiate parent assigment
                    addParentElement(instruction);
                    // If complex instruction, should start a new TR
                    if (instruction instanceof ComplexInstr) {
                        // Add current TR to the table if it contains children
                        if (tr.children().length)
                            ti.table.append(tr);
                        tr = $("<tr>");
                    }
                    // If not complex, simply add current TD to current TR
                    else
                        tr.append(td);
                    // Inform ComplexInstr (call EXECUTED) when the instruction is done
                    instruction.done = instruction.extend("done", function(){ ti._executed(instruction); });
                    // Add preloads
                    this.toPreload = this.toPreload.concat(instruction.origin.toPreload);
                }
                // If current TR has children, make sure to add it to table
                if (tr.children().length)
                    ti.table.append(tr);
                // If only one TR, let it be the element
                if (this.table.find("tr").length==1)
                    this.setElement(tr);
                // Else, let TABLE be the element
                else
                    this.setElement(this.table);
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            // Run each instruction
            for (let i in this.content)
                this.content[i].run();
            let ti = this;
            // If adding to a TABLE, add each TR to the table
            if (this.parentElement && this.parentElement.is("table")) {
                this.table.find("tr").each(function(){
                    _addElementTo($(this), ti.parentElement);
                });
            }
            // Else, add the table to parent element
            else {
                if (this.element.is("table"))
                    _addElementTo(this.element, this.parentElement);
                else
                    _addElementTo($("<table>").append(this.element), this.parentElement);
            }
            // If every instruction is already done, this one's done too
            if (this.toBeDone.length < 1)
                this.done();
        }

        // Called when an instruction is done
        _executed(instruction) {
            let index = this.toBeDone.indexOf(instruction);
            if (index >= 0)
                this.toBeDone.splice(index, 1);
            // If there is no instruction left to be done, call done if element already added
            if (this.toBeDone.length < 1 && $.contains(document.body, this.element[0]))
                this.done();
        }

        // Overriding newMeta, as original's content poses problems
        newMeta(callback) {
            let ct = this.origin.content;
            this.origin.content = null;
            let rtn = super.newMeta(callback);
            this.origin.content = ct;
            return rtn;
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction setting the validation method
        // Done when all OR any OR specific instruction(s) done
        validation(which) {
            let instr = this.newMeta();
            this.origin._executed = this.origin.extend("_executed", function(instruction){
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
            if (label != Abort) {
                this.label = label;
                this.length = length;
                this.values = [];
                this.times = [];
                this.setElement($("<span>"));
                for (let i = 0; i < length; i++) {
                    let ti = this, input = $("<input type='radio'>").attr({name: label, value: i})
                    input.click(function(){
                        ti._clicked($(this).attr("value"));
                    });
                    ti.element.append(input);
                }
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            _addElementTo(this.element, this.parentElement);
            this.done();
        }

        // Validate WHEN in origin's CLICKED
        _whenToInsist(tryToValidate) {
            this._clicked = this.extend("_clicked", tryToValidate);
        }

        // Called upon any click on an input
        _clicked(value) {
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
            this.origin._clicked = this.origin.extend("_clicked", function(value){
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
    // Done immediately
    class TimerInstr extends Instruction {
        constructor(delay, callback) {
            super(delay, "timer");
            if (delay != Abort){
                this.delay = delay;
                this.setElement($("<timer>"));
                this.step = 10;
                this.callback = callback;
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
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
                    ti._elapsed();
                }
            }, this.step);
            this.done();
        }

        // Called when timer has elapsed
        _elapsed() {
            if (this.callback instanceof Function)
                this.callback();
            else if (this.callback instanceof Instruction) {
                this.callback.parentElement = _ctrlr.element;
                this.callback.run();
            }
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

        // Returns an instruction to sait until the timer has elapsed
        // Done when the timer has elapsed
        wait() {
            return this.newMeta(function(){
                let ti = this;
                this.origin._elapsed = this.origin.extend("_elapsed", function(){ ti.done(); });
            });
        }
    }


    // Executes a function
    // Done immediately
    class FunctionInstr extends Instruction {
        constructor(func) {
            super(func, "function");
            if (func != Abort) {
                this.setElement($("<function>"));
                this.func = func;
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================
        run() {
            if (super.run() == Abort)
                return Abort;
            this.func.apply(_ctrlr.variables);
            this.done();
        }
    }


    // Adds something to the list of what is to be saved
    // Done immediately
    class SaveInstr extends Instruction {
        constructor(parameters) {
            super(parameters, "save");
            if (parameters != Abort) {
                this.setElement($("<save>"));
                this.parameter = parameters[0];
                this.value = parameters[1];
                this.comment = parameters[2];
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================
        run() {
            if (super.run() == Abort)
                return Abort;
            _ctrlr.save(this.parameter, this.value, Date.now(), this.comment);
            this.done();
        }
    }


    // Detaches any preceding DOM element
    // Done immediately
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


    // Groups instruction's elements in a 'select' form
    // Done immediately (+WAIT method: upon selection)
    class SelectorInstr extends Instruction {
        constructor(arg) {
            super(arg, "selector");
            if (arg != Abort) {
                this.instructions = arg;
                this.shuffledInstructions = arg;
                this.enabled = true;
                this.canClick = true;
                this.keyList = [];
                this.shuffledKeyList = [];
                this.selectedElement = null;
                this.selectedInstruction = null;
                this.callbackFunction = null;
                this.setElement($("<div>"));
                this.toPreload = [];
                this.selections = [];
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            let ti = this;
            // Go through each instruction
            for (let i in this.instructions) {
                let instruction = this.instructions[i];
                if (instruction instanceof Instruction) {
                    // If instruction's origin has not been run, then selector creates it: should be its parent
                    if (!instruction.origin.hasBeenRun)
                        instruction.origin.parentElement = this.element;
                    // If instruction's not been run yet, run it
                    if (!instruction.hasBeenRun)
                        instruction.run();
                    // Bind clicks
                    instruction.origin.element.bind("click", function(){
                        if (!ti.canClick)
                            return;
                        // SELECT is a method that returns an instruction
                        ti._select(instruction);
                    });
                }
                else {
                    console.log("Warning: selector's entry #"+i+" is not a proper instruction.");
                }
            }
            // Binding a keydown event
            _ctrlr.safeBind($(document), "keydown", function(e){
                // Triggering only if keys were specified
                if (!ti.keyList.length)
                    return Abort;
                for (let k in ti.shuffledKeyList){
                    if ((typeof(ti.shuffledKeyList[k])=="number" && ti.shuffledKeyList[k] == e.keyCode) ||
                        (ti.shuffledKeyList[k] instanceof Array && ti.shuffledKeyList[k].indexOf(e.keyCode)>=0))
                        ti._select(ti.shuffledInstructions[k]);
                }
            });
            // Add the div to the parent element
            _addElementTo(this.element, this.parentElement);
            // Done immediately
            this.done();
        }

        // Selects an instruction
        _select(instruction) {
            if (!this.enabled)
                return Abort;
            let ti = this.origin;
            // Select an instruction
            if (instruction instanceof Instruction) {
                ti.selectedElement = instruction.origin.element;
                ti.selectedInstruction = instruction.origin;
                // Add the 'selected' class to the element
                instruction.origin.element.addClass("PennController-selected");
                // Go through the other instructions' elements and remove the class
                for (let i in ti.instructions) {
                    // If this is the selected instruction, inform to be able to save later
                    if (ti.instructions[i].origin == instruction.origin) {
                        // If the instruction has an ID, save it
                        if (instruction.origin.id)
                            ti.selections.push([instruction.origin.id, Date.now()]);
                        // Else, save its index in the list
                        else
                            ti.selections.push([i, Date.now()]);
                    }
                    // If not the selected instruction, make sure it's not tagged as selected
                    else if (ti.instructions[i].origin.element != instruction.element)
                        ti.instructions[i].origin.element.removeClass("PennController-selected");
                }
                if (ti.callbackFunction instanceof Function)
                    ti.callbackFunction(instruction);
            }
        }

        // ========================================
        // CONDITIONAL FUNCTIONS
        // ========================================

        // Returns a conditional function as whether a (specific) instrution is selected
        selected(instruction) {
            let selectedInstruction = this.origin.selectedInstruction;
            return function(){
                // If more than one instruction
                if (arguments.hasOwnProperty("1")) {
                    for (a in arguments) {
                        if (arguments[a] instanceof Instruction && arguments[a].origin == selectedInstruction)
                            return true;
                    }
                    return false;
                }
                else if (instruction instanceof Instruction) {
                    return (instruction.origin == selectedInstruction);
                }
                else
                    return selectedInstruction;
            }
        }

        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to select an instruction
        // Done immediately
        select(instruction) {
            return this.newMeta(function(){
                this.origin._select(instruction);
                this.done();
            });
        }

        // Returns an instruction that sets whether selector is clickable
        // Done immediately
        clickable(canClick) {
            return this.newMeta(function(){ 
                this.origin.canClick = canClick;
                this.done();
            });
        }

        // Returns an instruction to execute callback upon selection
        // Done immediately
        callback(instrOrFunc) {
            return this.newMeta(function(){
                this.origin._select = this.origin.extend("_select", function(){
                    if (instrOrFunc instanceof Instruction)
                        instrOrFunc.run();
                    else if (instrOrFunc instanceof Function)
                        instrOrFunc.apply(_ctrlr.variables, [this.origin.selectedInstruction]);
                });
                this.done();
            });
        }


        // Returns an instruction that associates instructions with keys
        // Done immediately
        keys() {
            let keys = arguments;
            return this.newMeta(function(){
                if (keys.hasOwnProperty("0")) {
                    if (typeof(keys[0]) == "string") {
                        let caseSensitive = keys.hasOwnProperty("1");
                        for (let i = 0; i < keys[0].length; i++){
                            if (this.origin.instructions.hasOwnProperty(i)){
                                if (caseSensitive)
                                    this.origin.keyList.push(keys[0].charCodeAt(i));
                                else
                                    this.origin.keyList.push([keys[0].toUpperCase().charCodeAt(i),
                                                           keys[0].toLowerCase().charCodeAt(i)]);
                            }
                        }
                    }
                    if (typeof(keys[0]) == "number") {
                        for (let k in keys) {
                            if (typeof(keys[k]))
                                console.log("Warning: invalid key code for selector instruction #"+k+", not attaching keys to it.");
                            else
                                this.origin.keyList.push(keys[k]);
                        }
                    }
                }
                this.origin.shuffledKeyList = this.origin.keyList;
                this.done();
            });
        }

        // Returns an instruction to shuffle the presentation of the instructions
        // Done immediately
        // NOTE: if KEYS is called before, keys are shuffled, if called after, they are not
        shuffle(arg) {
            let ti = this.origin;
            return this.newMeta(function(){
                let instructionIndices = [];
                // If no argument, just add every instruction's index
                if (typeof(arg)=="undefined") {
                    for (let i in ti.instructions)
                        instructionIndices.push(i);
                }
                // Else, first feed instructionIndices
                else {
                    // Go through each argument
                    for (let i in arguments) {
                        let instruction = arguments[i];
                        // NUMBER: check there is an instruction at index
                        if (typeof(instruction)=="number" && 
                            ti.instructions.hasOwnProperty(instruction) &&
                            instructionIndices.indexOf(instruction)<0)
                                instructionIndices.push(instruction);
                        // INSTRUCTION: check that instruction is contained
                        else if (instruction instanceof Instruction) {
                            for (let i2 in this.origin.instructions) {
                                if (ti.instructions[i2].origin==instruction.origin && instructionIndices.indexOf(i2)<0)
                                    instructionIndices.push(i2);
                            }
                        }
                    }
                }
                // Now, shuffle the indices
                fisherYates(instructionIndices);
                // Reset the lists
                ti.shuffledInstructions = {};
                ti.shuffledKeyList = [];
                // Go through each index now
                for (let i in instructionIndices) {
                    let index = instructionIndices[i], 
                        origin = ti.instructions[index].origin;
                    ti.shuffledInstructions[i] = ti.instructions[index];
                    if (i < ti.keyList.length)
                        ti.shuffledKeyList.push(ti.keyList[index]);
                    // Add a SHUFFLE tag with the proper index before each instruction
                    origin.element.before($("<shuffle>").attr("id", i));
                }
                // Go through each shuffle tag
                $("shuffle").each(function(){
                    let index = $(this).attr('id');
                    // Add the element of the INDEX instruction there
                    $(this).after(ti.instructions[index].origin.element);
                })
                // And now remove every SHUFFLE tag
                $("shuffle").remove();
                this.done();
            });
        }

        // Returns an instruction to disable the selector right after first selection
        // Done immediately
        once() {
            let ti = this.origin;
            ti._select = ti.extend("_select", function(){ ti.enabled = false; });
            return this.newMeta(function(){
                this.done();
            });
        }

        // Returns an instruction to enable/disable the selector
        // Done immediately
        enable(active) {
            if (typeof(active)=="undefined")
                active = true;
            return this.newMeta(function(){
                this.origin.enabled = active;
                this.done();
            });
        }

        // Returns an instruction to save the selection(s)
        // Done immediately
        save(parameters) {
            return this.newMeta(function(){
                let o = this.origin;
                _ctrlr.callbackBeforeFinish(function(){ 
                    if (!o.selections.length)
                        return Abort;
                    if (typeof(parameters) == "string") {
                        if (parameters == "first")
                            _ctrlr.save("selection", o.selections[0][0], o.selections[0][1], "NULL");
                        else if (parameters == "last")
                            _ctrlr.save("selection", o.selections[o.selections.length-1][0], o.selections[o.selections.length-1][1], "NULL");
                        else {
                            for (let s in o.selections)
                                _ctrlr.save("selection", o.selections[s][0], o.selections[s][1], "NULL");
                        }
                    }
                    else {
                        for (let s in o.selections)
                                _ctrlr.save("selection", o.selections[s][0], o.selections[s][1], "NULL");
                    }
                });
                this.done();
            });
        }

        // Returns an instruction to wait for something to be selected
        // Done upon selection
        wait() {
            let instr = this.newMeta();
            this.origin._select = this.origin.extend("_select", function(){ instr.done(); });
            return instr;
        }
    }


    // Conditionally runs one or another instruction
    // Done when executed instruction is done
    class IfInstr extends Instruction {
        constructor(condition, success, failure) {
            super(arguments, "if");
            if (condition != Abort) {
                this.setElement($("<div>").addClass(this.cssPrefix+"condition"));
                this.condition = condition;
                this.success = success;
                this.failure = failure;
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            if (!this.success instanceof Instruction)
                return Abort;
            if (!this.condition instanceof Function)
                return Abort;
            let ti = this;
            if (this.condition()) {
                this.success.origin.parentElement = this.element;
                this.success.done = this.success.extend("done", function(){ ti.done(); });
                this.success.run();
            }
            else if (this.failure instanceof Instruction) {
                this.failure.origin.parentElement = this.element;
                this.failure.done = this.failure.extend("done", function(){ ti.done(); });
                this.failure.run();
            }
            else {
                this.done();
            }
        }
    }


    // Adds a Youtube video
    // Done immediately
    class YTInstr extends Instruction {
        constructor(code) {
            super(code, "youtube");
            if (code != Abort){
                let ti = this;
                // This function creates a player through the YT API
                let createPlayer = function() {
                    ti.origin.player = new YT.Player(code, {
                        videoId: code,
                        events: {
                            'onReady': function(event){ ti.origin._ready(event); },
                            'onStateChange': function(event){ 
                                if (event.data == YT.PlayerState.ENDED) ti.origin._ended(event);
                                else if (event.data == YT.PlayerState.BUFFERING) ti.origin._buffering(event);
                                else if (event.data == YT.PlayerState.PLAYING) ti.origin._playing(event);
                                else if (event.data == YT.PlayerState.CUED) ti.origin._canPlay(event);
                                else if (event.data == YT.PlayerState.PAUSED) ti.origin._paused(event);
                            }
                        }
                    });
                };
                // IFRAME
                // Not loaded at first
                this.iframeLoaded = false;
                // Creating the iframe element (TODO: check preloaded files, no need to recreate each time)
                this.iframe = $("<iframe>");
                this.iframe.attr({src: "https://www.youtube-nocookie.com/embed/"+code+"?enablejsapi=1", id: code, frameborder: 0})
                           .bind("load", function(){ ti.origin.iframeLoaded = true; }); // Signal loading
                // Add the frame to html (invisible)
                $("html").append(this.iframe.css({display: "none", position: "absolute"}));
                // The instruction's element is a DIV, because iframe needs to be global (appending it would RECREATE it)
                this.setElement($("<div>"));
                // If the player has not already been created
                if (!_youtubeVideos.hasOwnProperty(code)) {
                    // Add a player to be created when the YT API is ready (see above in PRELOADER ENGINE)
                    _youtubeVideos[code] = function(){
                        // If the iframe is not ready yet, wait before creating the player
                        if (!ti.origin.iframeLoaded)
                            ti.origin.iframe.bind("load", createPlayer);
                        // If it is ready, create the player already
                        else
                            createPlayer();
                    };
                }
                // Visual information
                this.visual = {
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0
                };
                // Autoplay by default
                this.autoPlay = true;
                // Asynchronous commands: need to keep track
                this.commandsQueue = [];
                // Not played yet
                this.hasPlayed = false;
                // Calling addToPreload immediately if settings say so 
                if (_autoPreloadVideos)
                    this.origin._addToPreload(code+".yt");
            }
        }

        // ========================================
        // PRIVATE & INTRINSIC METHODS
        // ========================================
        run() {
            if (super.run() == Abort)
                return Abort;
            let ti = this.origin;
            // Bind any mutation to the div element to the iframe
            let observer = new MutationObserver(function(mutations) {
                // Check that the element is in the DOM and visible
                if ($.contains(document.body, ti.element[0]) && ti.element[0].offsetParent) {
                    let w = ti.element.width(), h = ti.element.height();
                    if (w != ti.visual.width || h != ti.visual.height) {
                        ti.iframe.css({width: w, height: h, display: "block"});
                        ti.visual.width = w;
                        ti.visual.height = h;
                    }
                    let o = ti.element.offset(), x = o.left, y = o.top;
                    if (x != ti.visual.left || y != ti.visual.top) {
                        ti.iframe.css({left: x, top: y, display: "block"});
                        ti.visual.left = x;
                        ti.visual.top = y;
                    }

                }
            });
            // Listen to any modification that might affect the display of the div
            observer.observe(document.body, { childList : true, attributes : true, subtree : true });
            // Add the div element to the document (any mutation is listened)
            _addElementTo(this.element, this.parentElement);
            // If player exists, start playback
            if (ti.origin.player && ti.origin.autoPlay)
                ti._play();
            // Stop playing the video when the trial is over
            _ctrlr.callbackBeforeFinish(function(){
                ti._forcePause();
            });
        }

        // Force playing because playVideo sometimes simply has no effect at all
        _forcePlay() {
            let ti = this.origin, i = 0, ivl = setInterval(function(){
                if (ti.player.getPlayerState() == YT.PlayerState.PLAYING || i >= 5000)
                    clearInterval(ivl);
                else
                    ti.player.playVideo();
                i++;
            }, 1);
        }

        // Force pause because pauseVideo sometimes simply has no effect at all
        _forcePause() {
            let ti = this.origin, i = 0, ivl = setInterval(function(){
                if (ti.player.getPlayerState() == YT.PlayerState.PAUSED || ti.player.getPlayerState() == YT.PlayerState.ENDED || i >= 5000)
                    clearInterval(ivl);
                else
                    ti.player.pauseVideo();
                i++;
            }, 1);
        }

        _play() {
            if (!this.origin.player)
                return;
            this.origin.commandsQueue.push("play");
            // Force playing because it sometimes simply has no effect at all
            this._forcePlay();
        }

        _pause() {
            if (!this.origin.player)
                return;
            this.origin.commandsQueue.push("pause");
            this._forcePause();
        }

        _paused(event) {
            // If the currently pending command is PAUSE, remove it
            if (this.origin.commandsQueue.indexOf("pause") == 0)
                this.origin.commandsQueue.splice(0, 1);
            // If the next pending command is PLAY, play the video
            if (this.origin.commandsQueue.length > 0 && this.origin.commandsQueue[0] == "play")
                this._forcePlay();
        }

        _playing(event) {
            // If the currently pending command is PLAY, remove it
            if (this.origin.commandsQueue.indexOf("play") == 0)
                this.origin.commandsQueue.splice(0, 1);
            // If the next pending command is PAUSE, pause the video
            if (this.origin.commandsQueue.length > 0 && this.origin.commandsQueue[0] == "pause")
                this.origin.player.pauseVideo();

            // If not loaded yet, change that: it's now playing
            if (!this.origin.loaded) {
                this.origin.loaded = true;
                // Signal that it can play
                if (this.origin.buffering && !this.origin.canPlay)
                    this.origin._canPlay(event);
            }
            // Signal it's no longer buffering
            if (this.origin.buffering)
                this.origin.buffering = false;
            // If origin has been run but is not done yet, change that
            if (this.origin.hasBeenRun && !this.origin.isDone)
                this.origin.done();
        }

        _buffering(event) {
            // Signal it's buffering
            if (!this.origin.buffering)
                this.origin.buffering = true;
        }

        // Triggered when the video has first started playing
        _canPlay(event) {
            if (!this.origin.canPlay) {
                this.origin.canPlay = true;
                // Listing the YT video as preloaded
                _addPreloadedFile(this.content+".yt", this.iframe);
                // If video not played yet, play it
                if (this.hasBeenRun && event.target.getPlayerState() != YT.PlayerState.PLAYING)
                    this._play();
                // If video already playing but not run yet, pause
                else if (!this.hasBeenRun && event.target.getPlayerState() == YT.PlayerState.PLAYING)
                    this._pause();
            }

        }

        _ended(event) {
            this.hasPlayed = true;
        }

        _ready(event) {
            // Starting to play, to start buffering
            this._play();            
        }

        // ========================================
        // METHODS THAT RETURN NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to wait for the end of the video
        // Done when the video has been entirely played
        wait() {
            if (this.origin.hasPlayed)
                return this.newMeta(function(){ this.done(); });
            let instr = this.newMeta();
            this.origin._ended = this.origin.extend("_ended", function(){ instr.done(); });
            return instr;
        }

        // Returns an instruction to pause the video
        // Done immediately
        pause() {
            return this.newMeta(function(){
                this._pause();
                this.done();
            });
        }

        // Returns an instruction to play the video
        // Done immediately
        play() {
            return this.newMeta(function(){
                this._play();
                this.done();
            });
        }

        // Returns an instruction to preload the video
        // Done immediately
        preload() {
            this.origin._addToPreload(this.origin.content+".yt");
            return this.newMeta(function(){ this.done(); });
        }
    }


    // Adds a Canvas where you can place multiple instructions
    // Done immediately
    class CanvasInstr extends Instruction {
        constructor(w,h) {
            super({width: w, height: h}, "canvas");
            if (w != Abort) {
                if (typeof(w) != "number" || typeof(h) != "number" || w < 0 || h < 0)
                    return Abort;
                let element = $("<div>").css({width: w, height: h, position: "relative"}).addClass("PennController-Canvas");
                this.setElement(element);
                this.objects = [];
            }
        }

        // ========================================
        // PRIVATE AND INSTRINSIC METHODS
        // ========================================

        run() {
            if (super.run() == Abort)
                return Abort;
            for (let o in this.objects) {
                let object = this.objects[o],
                    origin = object[0];
                if (!(origin instanceof Instruction)) {
                    console.log("Warning: element #"+o+" of canvas is not a proper instruction; ignoring it.");
                    continue;
                }
                // If instruction has not been run yet, run it
                if (!origin.hasBeenRun) {
                    origin.run();
                    origin.done = origin.extend("done", function(){
                        origin.element.css({position: "absolute", left: object[1], top: object[2], "z-index": object[3]});
                    });
                }
            }
            _addElementTo(this.element, this.parentElement);
            this.done();
        }

        // Adds an object onto the canvas at (X,Y) on the Z-index level
        _addObject(instruction, x, y, z) {
            if (typeof(x) != "number" || typeof(y) != "number")
                return Abort;
            if (!(instruction instanceof Instruction))
                return Abort;
            let origin = instruction.origin;
            let alreadyIn = false;
            for (let o in this.origin.objects) {
                let object = this.origin.objects[o];
                // If instruction already contained, update the parameters
                if (object[0] == origin) {
                    object[1] = x;
                    object[2] = y;
                    if (typeof(z) == "number")
                        object[3] = z;
                    alreadyIn = true;
                }
            }
            // If instruction is newly added, just push OBJECTS
            if (!alreadyIn)
                this.origin.objects.push([origin, x, y, (typeof(z)=="number" ? z : this.origin.objects.length)]);
            // Redefined parentElement in any case
            origin.parentElement = this.origin.element;
            // If instruction has already been run and is already done, re-append its element
            if (instruction.hasBeenRun && instruction.isDone) {
                origin.element.appendTo(this.origin.element);
                origin.element.css({position: "absolute", left: x, top: y, "z-index": z});
            }
            // If instruction has not been run yet, but if CANVAS has been run: run instruction
            else if (this.origin.hasBeenRun) {
                origin.done = origin.extend("done", function(){
                    origin.element.css({position: "absolute", left: x, top: y, "z-index": z});
                });
                instruction.run();
            }
        }


        // ========================================
        // METHODS RETURNING NEW INSTRUCTIONS
        // ========================================

        // Returns an instruction to add/update an instruction on the canvas at (X,Y)
        // Done immediately
        put(instruction, x, y, z) {
            return this.newMeta(function(){
                this.origin._addObject(instruction, x, y, z);
                this.done();
            });
        }
    }


    /*class ScreenInstr extend Instruction {
        constructor(command) {
            super(command, "screen");
        }

        run() {
            if (command == "hold")
                _ctrlr.hold = true;
            else if (command == "release") {
                _ctrlr.hold = false;
                if (!_elementsToAppend.length)
                    _ctrlr.release();
            }
        }
    }*/

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
                // If there's an instrution referenced as ARG while EXECUTING a controller
                if (_ctrlr && _localInstructions[_ctrlr.id].hasOwnProperty(arg))
                    return _localInstructions[_ctrlr.id][arg];
                // If there's an instrution referenced as ARG while CREATING a controller
                else if (!_ctrlr && _localInstructions[_localInstructions.length-1].hasOwnProperty(arg))
                    return _localInstructions[_localInstructions.length-1][arg];
                // Else, just create an instruction
                else if (arg.match(/\.(png|jpe?g|bmp|gif)$/i))    
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
    PennController.instruction.image = function(image, width, height){ return new ImageInstr(image, width, height); };
    PennController.instruction.audio = function(audio){ return new AudioInstr(audio); };
    PennController.instruction.yt = function(code){ return new YTInstr(code); };
    PennController.instruction.key = function(keys){ return new KeyInstr(keys); };
    PennController.instruction.save = function(){ return new SaveInstr(arguments); };
    PennController.instruction.if = function(condition, success, failure){ return new IfInstr(condition, success, failure); };
    PennController.instruction.timer = function(delay, callback){ return new TimerInstr(delay, callback); };
    PennController.instruction.radioButtons = function(label, length){ return new RadioInstr(label, length); };
    PennController.instruction.clear = function(){ return new ClearInstr(); };
    PennController.instruction.selector = function(){ return new SelectorInstr(arguments); };
    PennController.instruction.canvas = function(width, height){ return new CanvasInstr(width, height); };
    

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
            this.id = this.options.id;

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
                _t.toRunBeforeFinish.push(func);
            };

            // Called when controller ends
            // Runs finishedCallback
            this.end = function() {
                for (f in _t.toRunBeforeFinish){
                    _t.toRunBeforeFinish[f]();
                }
                // Re-appending preloaded resources to the HTML node
                for (let f in _preloadedFiles) {
                    if (!_preloadedFiles[f].parent().is("html")) {
                        _preloadedFiles[f].css("display","none");
                        _preloadedFiles[f].appendTo($("html"));
                    }
                }
                // Hide all iframes
                $("iframe").css("display","none");
                // Stop playing all audios
                $("audio").each(function(){ 
                    this.pause();
                    this.currentTime = 0;
                });
                _t.finishedCallback(_t.toSave);
            };

            // Adds a resource that must be preloaded before the sequence starts
            this.addToPreload = function(resource) {
                // Add the resource if defined and only if not already preloaded
                if (resource && !_preloadedFiles.hasOwnProperty(resource)) {
                    if (!_t.toPreload)
                        _t.toPreload = [];
                    // Add the resource only if not already listed (several instructions may share the same origin)
                    if (_t.toPreload.indexOf(resource) < 0) {
                        _t.toPreload.push(resource);
                        if (!_preloadCallbacks.hasOwnProperty(resource))
                            _preloadCallbacks[resource] = [];
                        // Binding a function upon file's preloading
                        _preloadCallbacks[resource].push(function(){
                            // Remove the entry (set index here, as it may have changed by the time callback is called)
                            let index = _t.toPreload.indexOf(resource);
                            if (index >= 0)
                                _t.toPreload.splice(index, 1);
                            // If no more file to preload, run
                            if (_t.toPreload.length <= 0) {
                                $("#waitWhilePreloading").remove();
                                if (!_t.instructions[0].hasBeenRun)
                                    _t.instructions[0].run();
                            }
                        });
                    }
                }
            }

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
                    previous.done = previous.extend("done", function(){ next.run(); });
                    // Inform of previous instruction
                    next.previousInstruction = previous;
                }
                // #########################
                // PRELOADING PART 1
                //
                // Check if the instruction requires a preloaded resource
                if (!_globalPreload && next.origin.toPreload) {
                    // Go through each resource that next's origin has to preload
                    for (let p in next.origin.toPreload)
                        // Add resource
                        _t.addToPreload(next.origin.toPreload[p]);
                }
                // 
                // END OF PRELOADING PART 1
                // #########################
                previous = next;
            }
            // Now previous is the last instruction
            previous.done = previous.extend("done", function(){ _t.end(); });


            // Inform that the current controller is this one
            _ctrlr = _t;

            // Create local variables (see FuncInstr)
            _ctrlr.variables = {};


            // #########################
            // PRELOADING PART 2
            //
            // If ALL resources should be preloaded at once (and if there are resources to preload to start with)
            if (_globalPreload && Object.keys(_resourcesToPreload).length) {
                // Add each of them
                for (let p in _resourcesToPreload)
                    _t.addToPreload(p);
            }
            // If anything to preload
            if (_t.toPreload) {
                // Add a preloading message
                _t.element.append($("<div id='waitWhilePreloading'>").html(_waitWhilePreloadingMessage));
                // Adding a timeout in case preloading fails
                setTimeout(function(){
                    // Abort if first instruction has been run in the meantime (e.g. preloading's done)
                    if (_t.instructions[0].hasBeenRun)
                        return Abort;
                    $("#waitWhilePreloading").remove();
                    if (!_t.instructions[0].hasBeenRun)
                        _t.instructions[0].run();
                }, _timeoutPreload);
            }
            //
            // END OF PRELOADING PART 2
            // #########################
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