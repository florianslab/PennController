// The items will be run in the order specified here
var shuffleSequence = seq("CoveredBox", "Youtube", "Audio");


// Preloading a zip file (containing some images)
PennController.PreloadZip("http://files.lab.florianschwarz.net/ibexfiles/PsEntAliens/Images.zip");


// Adding a URL to save from retyping it each time
PennController.AddHost("http://files.lab.florianschwarz.net/ibexfiles/Pictures/");


// Much quicker to type t than to type PennController.instruction each time
var t = PennController.instruction;



// Setting items in the standard Ibex way
var items = [

  // TWO CLICKABLE PICTURES PRESENTED SIDE BY SIDE, ONE COVERED BY A BLACK LAYER
  //    Exercise: add an instruction to click on one of the two pictures after the revealing
  ["CoveredBox", "PennController", PennController(

      // A canva of 400x200 pixels
      t.canva(400, 200)
          .put(  canvaImgBakery  = t("bakery.png"    ).resize(200,200)  ,    0, 0 ) // A 200x200 image 'bakery.png' at (0,0)
          .put(  canvaImgBeach   = t("beach.png"     ).resize(200,200)  ,  200, 0 ) // A 200x200 image 'bakery.png' at (200,0)
          .put(  canvaImgCovered = t("CoveredBox.jpg").resize(200,200)  ,  200, 0 ) // This image covers 'bakery.png'
      ,
      // Some text to be click on
      canvaMsgClickHere = 
          t("Click here to continue").click()
      ,
      // Remove the text after click
      canvaMsgClickHere.remove()
      ,
      // And hide the image that was covering
      canvaImgCovered.hide()
      ,
      // Wait for a click on Bakery or Beach (and save which one was clicked)
      t.selector( canvaImgBakery, canvaImgBeach  )
          .once()
          .save()
          .wait()
      ,
      // Allow for 500ms to see feedback on which one was chosen
      t(500).wait()

  )],


  //  TWO YOUTUBE VIDEOS PRESENTED SIDE BY SIDE, PLAYED ONE AFTER THE OTHER
  //      Exercise: reveal the labels only after the second has played
  ["Youtube", "PennController", PennController(

      t(
          // Two Youtube videos side by side
          t(   ytMcGurk1 = t.yt("aFPtc8BVdJk").resize(300,150) , ytMcGurk2 = t.yt("jUsC-psm_fI").resize(300,150)   )
          ,
          // Their labels
          t(  lblMcGurk1 = t("This one")  ,  lblMcGurk2 = t("This one")  )
      )
      ,
      // Pause the second video right away
      ytMcGurk2.pause()
      ,
      // Wait until the end of the first video
      ytMcGurk1.wait()
      ,
      // Play the second video when the first has ended
      ytMcGurk2.play()
               .wait()
      ,
      t("<p>Which video did you find more convincing?</p>")
      ,
      // Click on one of the two "This one"'s
      t.selector(  lblMcGurk1, lblMcGurk2  )
          .save()
          .wait()

  )],



  //  A SIMPLE LEXICAL DECISION TASK
  //      Exercise: add a table with 'F' and 'J' in the first row and 'word' and 'not a word' in the second
  //      Bonus: have 'word'/'not a word' appear framed after selection
  ["Audio", "PennController", PennController(

      msgPlaceIndex = t("Please place your index fingers on the F and J keys and press one of them.")
      ,
      // Key instructions automatically wait before proceeding
      t.key("FJ")
      ,
      msgPlaceIndex.remove()
      ,
      msgWnW = t("Good. You will hear a sound now. Press F is you think it is a WORD; press J if you tink it is NOT A WORD.")
      ,
      msgPressFJears = t("Press F or J when you are ready, and be all ears!")
      ,
      t.key("FJ")
      ,
      msgWnW.remove()
      ,
      msgPressFJears.remove()
      ,
      // Play the audio file and wait before proceeding
      t("http://files.lab.florianschwarz.net/ibexfiles/LucyCate/LDSF/geel.mp3").wait()
      ,
      t("Press F if you think what you heard is WORD; press J if you think it is NOT A WORD.")
      ,
      // Save which key is pressed
      t.key("FJ")
          .save()

  )]
      
];