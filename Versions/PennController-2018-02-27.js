var PennController;

// Encapsulation
(function(){

    // Dummy object creating the ABORT keyword
    // used to abort the execution of chained functions (see EXTEND method)
    var Abort = new Object;

    // The current contr`oller
    var _ctrlr = null;

    // Adds an element to another element
    // If the other element is the main document, add a div first
    function AddElementTo(element, to) {
        if (to == null || to == _ctrlr.element)
            _ctrlr.element.append($("<div>").append(element));
        else 
            to.append(element);
    }


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
                        console.log(ti.origin.constructor);
                        return ti.newMeta(function(){ this.done(); });
                    };
                }
                // If attribute, function that returns that attribute
                else
                    ti.j[property] = function() { return ti.origin.element[property]; }
            }
        }

        // Run once the instruction has taken effect
        done() {
            if (this.isDone)
                return Abort;
            this.isDone = true;
            console.log(this.content+" ("+this.type+") done");
        }

        // Run by previous element (by default)
        run() {
            this.hasBeenRun = true;
            console.log("Running "+this.type+" with "+this.content);
        }

        // Returns a new function executing the one passed as argument after THIS one (chain can be aborted)
        extend(method, code) {
            let ti = this, m = ti[method];
            return function(){
                console.log("Extension of "+method+" for "+ti.content+" ("+ti.type+")");
                if (m.apply(ti) == Abort)
                    return Abort;
                console.log("Extension PROCEEDS (NOT aborted)");
                return code.apply(ti);
            }
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
                    source.run();
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

        // Returns an instruction to wait for a click on the element
        // Done upon click on the origin's element
        click(callback) {
            let instr = this.newMeta();
            this.origin.clickable = true;
            this.origin.element.addClass("clickable");
            if (callback instanceof Instruction)
                this.origin.element.click(function(){ callback.run(); instr.done(); });
            else
                this.origin.element.click(function(){ callback(); instr.done(); });
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

        run() {
            super.run();
            AddElementTo(this.element, this.parentElement);
            this.done();
        }
    }



    // Adds an AUDIO to the parent element
    // Done immediately
    class AudioInstr extends Instruction {
        constructor(file) {
            super(file, "audio");
            this.setElement($("<audio>").append($("<source>").attr('src', file)));
            this.auto = true;
            this.controls = false;
            this.ended = false;
            let ti = this;
            this.element.bind('ended', function(){ ti.ended = true; });
        }

        run() {
            super.run();
            if (this.controls)
                this.element.attr('controls',true);
            else
                this.element.css('display','none');
            if (this.auto)
                this.element.attr('autoplay',true);
            AddElementTo(this.element, this.parentElement);
            this.done();
        }

        // ========================================
        // Methods returning INSTRUCTIONS
        
        // Returns an instruction to wait
        // Done when origin's element has been played
        wait() {
            return this.newMeta(function(){
                let ti = this;
                // If sound's already completely played back, done immediately
                if (this.origin.ended)
                    this.done();
                // Else, done when origin's played back
                else
                    this.origin.element.bind('ended', function() { ti.done(); });
            });
        }

        // Returns a 'dummy' instruction, and adds a SAVE command to DONE
        // Done when source (this) is done
        save(parameters, comment) {
            let o = this.origin;
            // If should record more than just start or just pause
            if (parameters != "start" && parameters != "pause") {
                o.element.bind('ended', function(){
                    console.log("Saving end");
                    _ctrlr.save(o.content, 'playend', Date.now(), comment);
                });
            }
            // If should record more than just end or just pause
            if (parameters != "end" && parameters != "pause") {
                document.addEventListener('play', function(e){
                    console.log("Saving play");
                    if (e.target == o.element[0])
                        _ctrlr.save(o.content, 'playstart', Date.now(), comment);
                }, true);
            }

            return this;
        }
    }



    // Adds an IMG to the parent element        (to be replaced with image module)    
    // Done immediately
    class ImageInstr extends Instruction {
        constructor(imageURL) {
            super(imageURL, "image");
            this.setElement($("<img>").attr('src', imageURL));
        }

        run() {
            super.run();
            AddElementTo(this.element, this.parentElement);
            this.done();
        }


        // ========================================
        // Methods returning INSTRUCTIONS

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
    }



    // Binds a keypress event to the document
    // Done upon keypress
    class KeyInstr extends Instruction {
        constructor(keys) {
            super(keys, "key");
            this.setElement($("<key>"));
            this.keys = keys;
        }

        // Called when the right (or any if unspecified) key is pressed
        pressed(key) {
            this.key = key;
            this.time = Date.now();
            this.done();
        }

        // Adds key press event
        run() {
            super.run();
            let ti = this;
            _ctrlr.safeBind($(document),"keydown",function(e){
                // Stop here if instruction is done
                if (ti.isDone) return;
                // Handling with JS's weird rules for keyCode
                let chrCode = e.keyCode - 48 * Math.floor(e.keyCode / 48);
                let chr = String.fromCharCode((96 <= e.keyCode) ? chrCode: e.keyCode);
                // If pressed key matches one of the keys (or any key if no string provided)
                if (typeof ti.keys != "string" || ti.keys.toUpperCase().match(chr)) {
                    ti.pressed(chr);
                }
            });
        }


        // ========================================
        // Methods returning INSTRUCTIONS

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

        run() {
            super.run();
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
        // Methods returning INSTRUCTIONS

        // Returns the instruction itself after setting its validation conditions
        validation(which) {
            let ti = this;
            // If 'any,' complex is done as soon as one instruction is done
            if (which == "any")
                this.executed = this.done;
            // If WHICH is an index, the complex is done only when the index'th instruction is done
            else if (typeof(which) == "number" && which >= 0 && which < this.origin.content.length)
                this.executed = function(instruction){
                    if (ti.origin.content.indexOf(instruction) == which)
                        ti.done();
                }
            return this;
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

        // Called upon any click on an input
        clicked(value) {
            this.values.push(value);
            this.times.push(Date.now());
        }

        run() {
            super.run();
            AddElementTo(this.element, this.parentElement);
            this.done();
        }

        // ========================================
        // Methods returning CONDITIONAL FUNCTIONS

        // Returns a function giving selected value/TRUE/TRUE value iff existent/= VALUES/among VALUES
        selected(values) {
            let o = this.origin;
            return function(){
                if (typeof(values) == "undefined") {
                    if (o.values.length < 1)
                        return false;
                    else
                        return o.values[o.values.length-1];
                }
                else if (typeof(values) == "number" || typeof(values) == "string")
                    return (o.values[o.values.length-1] == values);
                else if (values instanceof Array)
                    return (values.indexOf(o.values[o.values.length-1]) >= 0);
            };
        }


        // ========================================
        // Methods returning INSTRUCTIONS

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
        constructor(delay) {
            super(delay, "timer");
            this.delay = delay;
            this.setElement($("<timer>"));
            this.step = 10;
        }

        run() {
            super.run();
            this.left = this.delay;
            let ti = this;
            this.timer = setInterval(function(){
                ti.left -= ti.step;
                if (ti.left <= 0){
                    ti.left = 0;
                    ti.done();
                }
            }, this.step);
        }


        // ========================================
        // Methods returning INSTRUCTIONS

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
        
        // Returns the same instruction after setting the timer's step
        // Done immediately (same instruction)
        step(value) {
            // (Re)set the step
            this.origin.step = value;
            // Return the instruction itself
            return this;
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

        run() {
            super.run();
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

        run() {
            super.run();
            _ctrlr.save(this.parameter, this.value, Date.now(), this.comment);
            this.done();
        }
    }



    PennController = function() {
        return {instructions: arguments};
    };

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

    PennController.instruction.text = function(text){ return new TextInstr(text); };
    PennController.instruction.image = function(image){ return new ImageInstr(iamge); };
    PennController.instruction.audio = function(audio){ return new AudioInstr(audio); };
    PennController.instruction.key = function(keys){ return new KeyInstr(keys); };
    PennController.instruction.save = function(){ return new SaveInstr(arguments); };
    // t.tooltip = function(text){ return new TooltipInstr(text); }; // To be implemented
    // t.if = function(condition, success, failure){ return new IfInstr(condition, success, failure); };
    // t.waitUntil = function(condition){ return new WaitInstr(condition); };
    PennController.instruction.radioButtons = function(label, length){ return new RadioInstr(label, length); };


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

    PennController.Preloader = {
        Load: function(urls){
                    switch (typeof(urls)) {
                        case "string":
                            // load files from urls
                        break;
                        case "Object":
                            if (urls instanceof Array){
                                for (url in urls){
                                    // load files from urls[url]
                                }
                            }
                        break;
                    }
                    return "Success";
            },
        Resources: {
            Images: null,
            Audio: null
        }
    };
                                                        //////////

//                                                     
//                                                      NEXT: IF
//
                                                        //////////

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
                previous = next;
            }
            // Now previous is the last instruction
            previous.done = previous.extend("done", function(){ _t.end(); });

            // Now run the first instruction!
            _t.instructions[0].run();

            // Now run the first instruction!
            let e = $("<div>");
            _t.element.append(e);
            _t.instructions[0].parentElement = e;
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