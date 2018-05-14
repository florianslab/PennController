import "../controller.js";
import "../preload/preload.js";

// The instructions of each controller
var _localInstructions = [{}];

// Adds an element to another element
// If the other element is the main document, add a div first
export function _addElementTo(element, to, callback) {
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

// The Instruction class itself
export class Instruction {

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
        //console.log("Created instruction of type "+type+" with "+this.content);
        // Add instruction to the current controller
        if (!_controller.hasOwnProperty("instructions"))
            _controller.instructions = [];
        _controller.instructions.push(this);
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
    _addToPreload() {
        // If the resource has already been set, preloading is already done
        if (this.origin.resource)
            return Abort;
        if (_instructionsToPreload.indexOf(this.origin)<0)
            _instructionsToPreload.push(this.origin);
        // And add the file to the current controller
        if (!_controller.hasOwnProperty("preloadingInstructions"))
            _controller.preloadingInstructions = [];
        if (_controller.preloadingInstructions.indexOf(this.origin)<0)
            _controller.preloadingInstructions.push(this.origin);
    }

    // Method to set the resource
    // Can be AUDIO or IMAGE
    _setResource(resource) {
        // If resource already set, throw a warning and abort
        if (this.origin.resource) {
            console.log("Warning: trying to replace resource for "+this.origin.content+"; several host copies of the same file? Ignoring new resource.");
            return Abort;
        }
        // Remove the instruction('s origin) from the list
        let idx = _instructionsToPreload.indexOf(this.origin);
        if (idx >= 0)
            _instructionsToPreload.splice(idx, 1);
        // Set the resource
        this.origin.resource = resource;
    }

    // Method to fetch a resource
    // Used by AudioInstr, ImageInstr, VideoInstr (YTInstr deals differently)
    fetchResource(resource, type) {
        let ti = this;

        // If resource already set, stop here
        if (this.origin.resource)
            return Abort;

        // Priority to zipped resources: wait for everything to be unzipped first
        if (_zipPriority && _URLsToLoad.length>0 && !resource.match(/^http/i)) {
            _zipCallbacks.push(function() {
                ti.fetchResource(resource, type);
            });
            return;
        }
        let element;
        let src;
        let event = "load";
        // If resource is part of unzipped resources
        if (_unzippedResources.hasOwnProperty(resource)) {
            type = _unzippedResources[resource].type;
            src = URL.createObjectURL(_unzippedResources[resource].blob);
            // Firefox won't reach readyState 4 with blob audios (but doesn't matter since file is local)
            if (type.match(/audio/))
                event = "canplay";
        }
        // Try to load the file at the given URL
        else if (resource.match(/^http/i)) {
            let extension = resource.match(/\.([^.]+)$/);
            // Resource should have an extension
            if (!type && !extension) {
                console.log("Error: extension of resource "+file+" not recognized");
                return Abort;
            }
            // Getting the extension itself rather than the whole match
            extension = extension[1];
            // AUDIO FILE
            if (type == "audio" || extension.match(/mp3|ogg|wav/i)) {
                type = "audio/"+extension.toLowerCase().replace("mp3","mpeg").toLowerCase();
                src = resource;
                event = "canplaythrough";
            }
            // IMAGE
            else if (type == "image" || extension.match(/gif|png|jpe?g/i)) {
                type = "image/"+extension.replace(/jpg/i,"jpeg").toLowerCase();
                src = resource;
            }
            // VIDEO
            else if (type == "video" || extension.match(/mp4|ogg|webm/i)) {
                // TO DO
            }
        }
        // Else, call fetchResource with each host URL (if any)
        else if (PennController.hosts.length) {
            // Trying to fetch the image from the host url(s)
            for (let h in PennController.hosts) {
                if (typeof(PennController.hosts[h]) != "string" || !PennController.hosts[h].match(/^http/i))
                    continue;
                ti.fetchResource(PennController.hosts[h]+resource, type);
            }
        }

        // If Audio
        if (type.match(/audio/)) {
            // Add SOURCE inside AUDIO, and add 'preload=auto'
            element = $("<audio>").append($("<source>").attr({src: src, type: type}))
                                    .css("display", "none")
                                    .attr({preload: "auto"});
            // If the file was so fast to load that it can already play
            if (element.get(0).readyState > (4 - (event=="canplay")))
                ti._setResource(element);
            // Otherwise, bind a CANPLAYTHROUGH event
            else 
                element.one(event, function(){
                    // Once can play THROUGH, remove instruction from to preload
                    ti._setResource(element);
                });
        }
        // If image, add it directly (no need to preload)
        else if (type.match(/image/)) {
            element = $("<img>").attr({src: src, type: type});
            element.bind(event, function() {
                // Set resource
                ti.origin._setResource(element);
            }).bind("error", function() {
                console.log("Warning: could not find image "+resource);
            });
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
        //let source = this, instr = new this.origin.constructor(this.content);
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
        this.origin._id = name;
        return this.newMeta(function(){ this.done(); });
    }
}

// Returns an instruction in function of the argument(s) type
PennController.instruction = function(id) {
    if (typeof(id)!="string")
        return Abort;
    // If there's an instrution referenced as ARG while EXECUTING a controller
    if (_ctrlr && _localInstructions[_ctrlr.id].hasOwnProperty(arg))
        return _localInstructions[_ctrlr.id][arg];
    // If there's an instrution referenced as ARG while CREATING a controller
    else if (!_ctrlr && _localInstructions[_localInstructions.length-1].hasOwnProperty(arg))
        return _localInstructions[_localInstructions.length-1][arg];
};