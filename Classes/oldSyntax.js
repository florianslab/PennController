var shuffleSequence = seq("testItem");


// I have some image files there
PennController.AddHost("http://files.lab.florianschwarz.net/ibexfiles/Pictures/");
// I have some audio files there
PennController.AddHost("http://files.lab.florianschwarz.net/ibexfiles/");


var istr = PennController.instruction;

var items = [
    ["testItem", "PennController", PennController(
        // Creates a shows text on the screen
        istr.text("Welcome. Please press space to play a sound, and then click on the appropriate picture within 5&nbsp;seconds.")
            .id("txtWelcome")
        ,
        // Waits for a keypress on Space
        istr.key(" ")
        ,
        // Removes the 'welcome' text from the screen
        istr("txtWelcome").remove()
        ,
        // Creates both a 250x250 canvas and the images it contains, and place them on the screen
        istr.canvas(250, 250)
            .put(  istr.image("apple.png",  100, 100).id("imgApple")   ,   0,   0  )
            .put(  istr.image("orange.png", 100, 100).id("imgOrange")  , 150,   0  )
            .put(  istr.image("banana.png", 100, 100).id("imgBanana")  ,  75, 150  )
        ,
        // Makes it possible to click on the images, and records any click on them
        istr.selector( istr("imgApple") , istr("imgOrange") , istr("imgBanana") )
            .id("slcFruit")
            .logEvents()
        ,
        // Plays the file
        istr.audio("yellowFruit.wav")
            .id("audYellow")
            .wait()
            .logEvents()
        ,
        // The text is shown on the screen and hidden and colored in red right after
        istr.text("Please select a fruit first.")
            .id("txtWarning")
            .hide()
            .css("color", "red")
        ,
        // Runs a 5s timer and executes the sub-series of instructions when it's over
        istr.timer( 5000, istr(
                                istr("slcFruit").enable(false)
                                ,
                                istr.if(
                                         istr("slcFruit").selected(istr("imgApple"))    // not clear that it's a test(?)
                                         ,
                                         istr("txtWarning").hide()
                                         ,
                                         istr("txtWarning").text("Warning: you failed to select a fruit within 5 seconds.")
                                                           .hide(false)
                                       )
                              )
                  )
            .id("tmrNoSelect")
        ,
        istr.text("Click here to continue.")
            .id("txtClickContinue")
            .click()                    // Both makes the text clickable and wait for a click before proceeding to next instruction
        ,
        istr("txtWarning").hide(false)  // Counterintuitive, should be 'show' or 'visible'
        ,
        // Sub-series of instructions executed in parallel, but the main instruction only puts on hold because of 'validation'
        istr( istr("tmrNoSelect").wait() , istr("slcFruit").wait() ).validation("any")
        ,
        istr.if(
                 istr("slcFruit").selected()
                 ,
                 istr("txtWarning").hide()
               )
        ,
        istr("txtClickContinue").remove()
        ,
        istr.text("Press space to validate your participation.")
        ,
        istr.key(" ")
    )]
];