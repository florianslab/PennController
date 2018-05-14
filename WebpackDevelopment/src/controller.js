//  =========================================
//
//      GENERAL INTERNAL VARIABLES
//
//  =========================================

// Dummy object, ABORT keyword
// used in the instructions' EXTEND method to abort chain of execution
export var Abort = new Object;

// Making sure that MutationObserver is defined across browsers
export const MutationObserver =
    window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


// CONTROLLERS
//
// The current controller (upon execution)
export var _ctrlr = null;

// The current controller (under construction)
export var _controller = {};

// The list of controller created with PennController
export var _listOfControllers = [];


//  =========================================
//
//      PENNCONTROLLER OBJECT
//
//  =========================================

// Returns an object with the instructions passed as arguments
// The object will be given to the actual controller
export var PennController = function() {
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