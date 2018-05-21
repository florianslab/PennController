var shuffleSequence = seq("testItem");

// I have some image files there
PennController.AddHost("http://files.lab.florianschwarz.net/ibexfiles/Pictures/");
// I have some audio files there
PennController.AddHost("http://files.lab.florianschwarz.net/ibexfiles/");

var istr = PennController.instruction;

var items = [
    ["testItem", "PennController", PennController(
        //
        // ====
        // Creation and settings of some elements
        // ====
        //
        // Images
        istr.newImage("apple",  "apple.png" , 100, 100)
        ,
        istr.newImage("orange", "orange.png", 100, 100)
        ,
        istr.newImage("banana", "banana.png", 100, 100)
        ,
        // Canvas
        istr.newCanvas("fruits", 250, 250)
            .settings.addElement( istr.image("apple")  ,   0,   0 )
            .settings.addElement( istr.image("orange") , 150,   0 )
            .settings.addElement( istr.image("banana") ,  75, 150 )
        ,
        // Selector
        istr.newSelector("fruits")
            .settings.addElement( istr.image("apple")  )
            .settings.addElement( istr.image("orange") )
            .settings.addElement( istr.image("banana") )
            .settings.record()
        ,
        // Key
        istr.newKey("space", " ")
            .settings.logEvents()
        ,
        // Audio
        istr.newAudio("yellowFruit", "yellowFruit.wav")
            .settings.logEvents()                              // '.keepLog'?
        // Timer
        istr.newTimer("noSelect", 5000)
            .settings.whenDone(                             // '.whenFinished'? '.whenOver'? '.whenCleared'? '.uponCompletion'?
                                istr.selector("fruit")
                                    .settings.disable()     // '.disabled()'?
                                ,
                                istr.if(    istr.selector("fruit").testNot.selected()  )
                                    .else(  istr.text("warning")
                                                .settings.text("Warning: you failed to select a fruit within 5 seconds.")
                                         )
                              )
        // Text
        //  welcome
        istr.newText("welcome", "Welcome. Please press space to play a sound, "+
                                "and then click on the appropriate picture within 5 seconds.")
        ,
        //  warning
        istr.newText("warning", "Please select a fruit first.")
            .settings.hide()
            .settings.color("red")
        ,
        //  continue
        istr.newText("click", "Click here to continue.")
            .settings.clickable()
        ,
        //
        // ====
        // Execution flow
        // ====
        //
        istr.text("welcome")
            .show()
        ,
        istr.key("space")
            .wait()
        ,
        istr.text("welcome")
            .remove()           // in .settings?
        ,
        istr.canvas("fruits")
            .show()
        ,
        istr.audio("yellowFruit")
            .play()             // 'start'? 'run'?      Alternatively 'play("block")' / 'play("hold")'?
            .wait()
        ,
        istr.timer("noSelect")
            .start()            // 'run'? 'launch'? 'trigger'?
        ,
        istr.text("warning")
            .show()
        ,
        istr.text("click")
            .wait()
        ,
        istr.text("warning")
            .settings.visible()     // Or 'show'? But 'show' already means 'place element here'
        ,
        istr.newGroupOfInstructions("selectOrWait")
            .settings.addElement( istr.timer("noSelect").wait() )   //  Omit 'wait' here?
            .settings.addElement( istr.selector("fruit").wait() )   //  Omit 'wait' here?
            .wait("any")                                            // 'validation'? 'either'?
        ,
        istr.text("click")
            .remove()  
        ,
        istr.if(    istr.selector("fruit").test.selected()  )
            .then(  istr.text("warning").settings.hide()    )
        ,
        istr.newText("validate", "Press space to validate your participation.")
            .show()
        ,
        istr.key("space")
            .wait()
    )]
];