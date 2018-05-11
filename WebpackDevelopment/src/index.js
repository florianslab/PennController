// TODOs
//
//  - PRIORITY NOTES:                                                               [ Not happened in a while... ]
//      >   Conflict between AUDIO and IFRAME??? > Sometimes
//              >> MAYBE NOT DUE TO IFRAME, BUT PROBLEM MORE GENERALLY...?
//
//  DEVELOPMENT:
//
//      PennController.AddInstruction({
//          name: "VoiceRecorder",
//          _init: function(Instruction, Abort) {
//              class VoiceRecorder extends Instruction {
//                  constructor(time){
//                      if (super(time)==Abort)
//                          return Abort;
//                      this.time = time;
//                  }
//                  run(){
//                      if (super.run()==Abort)
//                          return Abort;
//                      mediaRecorder.start();
//                  }
//              }
//              let caller = function(time) { 
//                  return new VoiceRecorder(time); 
//              };
//              return caller;
//          }
//      });
//
//
//  IDEA FOR RESTRUCTURING INSTRUCTIONS
//      >   Creating/Retrieving instructions: PennController.newText("text", id), PennController.newImage("file", w, h, id), ...
//      >   Setting:    PennController.text(id).settings.text("text"), PennController.image(id).settings.file("file")
//                      PennController.audio(id).settings.record(), PennController.key(id).settings.keys("FJ")
//                      PennController.text(id).settings.click(), PennController.image(id).settings.preload()
//      >   Action:     PennController.text(id).show(), PennController.audio(id).play()
//      >   Test:       PennController.audio(id).test.finished(), PennController.selector(id).test.selected()
//
     // PennController( 
     //         // ====     Settings     ====
     //         //
     //         PennController.newText("Please wait...", "please")
     //                       .settings.clickable()
     //                       .settings.recordClicks()
     //         ,
     //         PennController.newImage("alien1.png", 50, 100, "target")
     //         ,
     //         PennController.newImage("alien2.png", 50, 100, "distractor")
     //         ,
     //         PennController.newSelector( PennController.image("target"), PennController.image("distractor") , "images")
     //                       .settings.once()
     //                       .settings.record()
     //         ,
     //         // ====       Flow       ====
     //         //
     //         PennController.text("please")
     //                       .show()
     //         ,
     //         PennController.selector("images")
     //                       .show()
     //                       .wait()
     //         ,
     //         PennController.if(
     //                         PennController.selector("images")
     //                                       .test.selected( PennController.image("target") )
     //                         ,
     //                         PennController.newTimer(100)
     //                                       .start()
     //                                       .wait()
     //         )
     //         PennController.newText("Good, now let's proceed.")
     //                       .show()
     //         ,
     //         PennController.newTimer("beforeNextPage", 1000)
     //                       .start()
     //                       .wait()
     // )

//  - Add a drag'n'drop function (and record the associated events)
//
//  - Fix what happens when no host and no zip provided
//
//  - Add a VIDEO Instruction
//
//  - Add a Tooltip Instruction
//
//  - Add a VoiceRecorder Instruction
//
//  - Mouse
//      > Save mouse location on click events
//      > Make it possible to save any click < in Mouse instruction?
//      PennController.mouse
//                    .settings.record("clickLocation", "clickInstruction", "hoverLocation", "hoverInstruction")
//      PennController.mouse
//                    .waitHover( PennController.image("imgMyImage") )
//                    .waitClick( PennController.image("imgMyImage") )
//      PennController.mouse
//                    .test.hover( PennController.image("imgMyImage") )
//
//  - Add a .background method for Canvas, to specify color/image background
//
//  - Add a .smartResize method for Canvas that updates the coordinates and sizes of the elements it contains?
//
//  - Add some way to LOOP instructions
//      > In particular, trigger an instruction EACH TIME a key is pressed (t.key("FJ").whenever( t("imgBeach").hide() )
//
//  - Add PLAY and PAUSE/STOP for Audio instructions (revise auto play then? Same for YT?)
//
//  - Revise the SHOW method for Audio
//      > currently changes property AFTER creation = no effect
//
//  - Add 'controls' for YT (and Audio?)
//
//  - Write the Screen Instruction to prevent added elements from showing up
//      > play with the _addElementTo function
//
//  - Add a MOUSE Instruction?
//          > record position
//
//  - Add support for HTML files to the t() function (chunk_includes)
//
//  - Integrate an instruction equivalent to the DashedSentence controller?
//
//  - Add parameters to the WAIT function of AUDIO
//      on playstart or playend or stop < ?
//
//
//
//
//
//  IN PROGRESS
//  - Add a SHUFFLE method to ComplexInstr (already implemented in selector)        < not sure it's needed
//      can pass indexes/instructions as parameters
//      e.g.    t( t("image1.png").id("i1"), t("image2.png").id("i2"),   t("<br>"),   t("image3.png").id("i3"), t("image4.png").id("i4") ).shuffle(t("i1"),t("i2"),t("i3"),t("i4"))
//      >> also add a SAVE method to save the order of each instruction?
//
//
//
//  MAYBE
//  - Add a general 'TIMEOUT: DELAY' settings
//      Each instruction is done after DELAY after it was run (if not already done)
//
//  - Add a first trial that measures latencies?
//
//
//
//  DONE
//  - Create one copy of preloaded element PER INSTRUCTION
//
//  DONE
//  - Rewrite ComplexInstr to add its instructions UPON RUNNING, and only if they're not already part of #bod
//  [but not done]        > Maybe rename it GroupInstr?
//
//  DONE
//  - Save the timestamps of the first display of the page (handle preload) < preload = only thing not done yet (though first run)
//      and the validation of the trial (finishedCallback)
//
// DONE
//  - Make it possible to check for a subset of preloads (item-label-based)
//      > also revise the preloading strategy:
//                       right now, callback instructions (for instance) don't add their resources to 'toPreload'
//                          (use controller's id instead)
//      > How to you prelaod a subset?
//              ["label", "PennController", CheckPreload("label1", "label2", ...)]
//                      or
//              CheckPreload("label1", "label2", ...)       +    shuffleSeq = seq("preload-label1", "label1", "preload-label2", "label2")
//
//  DONE
//  - Make compatible with GetItemsFrom / Rewrite GetItemsFrom as PennController.FeedItems
//      [ var table = new PennController.Table("data.csv"[, "\t", "\"", fileringFunction]); ]
//      [ table.setItem("Item"); ]      < extra-optional, smart detection
//      [ table.setGroup("Group"); ]    < extra-optional, smart detection
//      [ table.setLabel("Label"); ]    < extra-optional, smart detection
//      PennController.FeedItems([table, ]
//          (row) => PennController(
//              p(row.question)
//              ,
//              p(row.delay)
//              ,
//              p.selector( p.image(row.target) , p.image(row.competitor) )
//                  .shuffle()
//                  .keys("F", "J")
//          )
//      );
//      > FUNCTION BECAUSE NEED TO DELAY INSTRUCTION'S CREATION
//
//    > Use chunk_includes to upload CSV table, then smart recognition of separator/quotations marks (if not specified)
//    > let lines = CHUNK_DICT[file].split('\n'); header = lines[0]; table = {};
//       for (let h in header) table[h] = []; for (let l in lines) let row = lines[l].split;
//       for (let cell in row) table[header[cell]].push(row[cell])
//       > Add an if (lines[l].match("\t")) to exlude last, empty line
//    > CAN MAKE RECOGNITION AUTOMATIC (probe CHUNK_DICT for an entry that resembles a table)
//
// DONE
//  - Add a Finish/Done/End/… Instruction to (prematurely) go to the next trial/to the end?
//
//  DONE: simply used Canvas
//  - Implement graphic module (Raphael? Outdated... > AllCharts' graphics?)
//      add a 'draggable' option (events for drop?)     >> OR SIMPLY USE CANVAS? cf HTML5
//
//  DONE:   now only records the actual start
//  - Add something to check the ACTUAL start-playing of audio/video
//
//  DONE
//  - Add a t.selector instruction
//      [DONE] can click on each instruction's element or use a key (how should the keys be set?)
//      [DONE] can be just once or as many times
//      [DONE] function to enable/disable
//      [DONE] callback function with instruction?
//      [DONE] t.selector( t("image1.png").id("i1") , t("image2.png").id("i2") ).key( "F", "J" ).save("first image", "second image")
//
//  DONE
//  - Add a way to identify the selected answer in SELECTOR, when shuffled
//          > isn't it already the case?     < YES, and now also with ID
//
//  DONE
//  - Check .center() for ComplexInstr
//
//  DONE
//  - Rewrite AUDIOs so they behave the same as RADIOs
//      they should record every event for themselves and user decides which to store with the SAVE method
//
//  DONE
//      >   Re-appending audios to HTML recreates them(?) and FIRES CANPLAYTHROUGH AGAIN!   < Not anymore??
//  Now bind with 'one' rather than 'bind' (fired only once)
//
//  DONE
//  - Something weird with ComplexInst and wait
//  - YT: do something about the iframe element
//
//  DONE
//  - Preloading
//      DONE(?)     look deeper than the surface folder level for zips
//      DONE        (re)append resources to HTML node before finishedCallback
//
//  DONE(?)
//  - Add specifics for MOVE (e.g. ComplexInstr > table)
//
//  DONE
//  - Add _ in front of 'private' methods
//
//  DONE
//  - Add a CLEAR instruction (removes all visible elements from page)
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
//  DONE
//  - Add the t.if function
//
//
// NOTES
//
//  - The 'class' keyword is not recognized by early versions of browsers (e.g. my Safari)
//      create a copy of the file with other methods?
//  - Unpredictible bugs when same variable name used multiple times (e.g. YT video playback starts)
//

//  =========================================
//
//      PENNCONTROLLER OBJECT
//
//  =========================================

// Returns an object with the instructions passed as arguments
// The object will be given to the actual controller
var PennController = function() {
    let id = _listOfControllers.length, sequence = arguments;
    // Add the controller under construction to the list
    _controller.id = id;
    _controller.sequence = sequence;
    _listOfControllers.push(_controller);
    // Resetting _controller for next one
    _controller = {};
    // ID is _instructions' length minus 2: we just pushed for NEXT controller
    return {instructions: sequence, id: id};
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

PennController.AddHost = function() {
    if (!PennController.hasOwnProperty("hosts"))
        PennController.hosts = [];
    for (let a = 0; a < arguments.length; a++) {
        if (typeof(arguments[a])=="string" && arguments[a].match(/^https?:\/\//i))
            PennController.hosts.push(arguments[a]);
        else
            console.log("Warning: host #"+a+" is not a valid URL.", arguments[a]);
    }
}


//  =========================================
//
//      GENERAL INTERNAL VARIABLES
//
//  =========================================

// Dummy object, ABORT keyword
// used in the instructions' EXTEND method to abort chain of execution
var Abort = new Object;


// CONTROLLERS
//
// The current controller (upon execution)
var _ctrlr = null;

// The current controller (under construction)
var _controller = {};

// The list of controller created with PennController
var _listOfControllers = [];

// INSTRUCTIONS
//
// The instructions of each controller
var _localInstructions = [{}];

// PRELOADING
//
// All the resources that require preloading
var _instructionsToPreload = [];

// All the image and audio files
var _preloadedFiles = {};


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

// Youtube videos to load
var _youtubeVideos = {};

// The elements being appended
var _elementsToAppend = [];

// The instructions of each controller
var _pennControllerResources = {};

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


// Start to download the zip files as soon as the document is ready
$(document).ready(function(){
    // Preload any zip file
    _preloadZip();
});


// Export PennController
window.PennController = PennController;