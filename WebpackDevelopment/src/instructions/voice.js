import "./instruction.js";
import "../jszip";
import "../jszip-utils";

var audioStreams = [];

function createArchive() {
    var zip = new JSZip();   // Create the object representing the zip file

    for (var s in audioStreams) {
        var file = audioStreams[s];
        zip.file(file.name, file.data);
    }

    console.log('Generating compressed archive...');
    zip.generateAsync({
        compression: 'DEFLATE',
        type: 'blob'
    }).then(function(zc) {// Function called when the generation is complete
        console.log('Compression complete!');
        var fileName = 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.zip';
        // Create file object to upload
        var fileObj = new File([zc], fileName);
        console.log('File object created:', fileObj);
        var fd = new FormData();
        fd.append('fileName', fileName);
        fd.append('file', fileObj);
        fd.append('mimeType', 'application/zip');
        // POST Ajax call
        $.ajax({
            type: 'POST',
            //url: 'http://localhost/~jeremyzehr/saveAudioZip.php',
            url: 'http://files.lab.florianschwarz.net/ibexfiles/RecordingsFromIbex/saveAudioZip.php',
            data: fd,
            contentType: false,
            processData: false,
        }).done(function() {
            console.log('Ajax post successful.');
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('Ajax post failed. Status:', textStatus);
            console.log(jqXHR);
            console.log(errorThrown);
        });
    });
}

function makeXMLHttpRequest(url, data, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        }
    };
    request.open('POST', url);
    request.send(data);
}

function uploadToPHPServer(blob) {
    var file = new File([blob], 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.ogg', {
        type: 'audio/ogg'
    });

    // create FormData
    var formData = new FormData();
    formData.append('audio-filename', file.name);
    formData.append('audio-blob', file);

    //makeXMLHttpRequest('http://localhost/~jeremyzehr/save.php', formData, function(response) {
        //var downloadURL = 'http://localhost/~jeremyzehr/uploads/' + file.name;
    makeXMLHttpRequest('http://files.lab.florianschwarz.net/ibexfiles/RecordingsFromIbex/save.php', formData, function(response) {
        var downloadURL = 'http://files.lab.florianschwarz.net/ibexfiles/RecordingsFromIbex/uploads/' + file.name;
        console.log('File uploaded to this path:', downloadURL);
        console.log(response);
    });
}


// Adds an AUDIO to the parent element
// Done immediately
class VoiceRecorderInstr extends Instruction {
    constructor(arg) {
        super(arg, "voice");
        if (arg != Abort) {
            // Set element to SPAN (will append audio later)
            this.setElement($("<span>"));
        }
    }

    // ========================================
    // PRIVATE & INTRINSIC METHODS
    // ========================================

    run() {
        if (super.run() == Abort)
            return Abort;
        if (navigator.mediaDevices) {
            console.log('getUserMedia supported.');
            
            var record = document.getElementById("record");
            var stop = document.getElementById("stop");
            var deleteButton = document.getElementById("delete");
            var soundClips = document.getElementById("soundClips");
            var upload = document.getElementById("upload");
            
            console.log(record, stop, deleteButton);
            
            var constraints = { audio: true };
            var chunks = [];
            
            navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
            
                var mediaRecorder = new MediaRecorder(stream);
            
                //visualize(stream);
            
                upload.onclick = function() {
                createArchive();
                };
            
                record.onclick = function() {
                mediaRecorder.start();
                console.log(mediaRecorder.state);
                console.log("recorder started");
                record.style.background = "red";
                record.style.color = "black";
                }
            
                stop.onclick = function() {
                mediaRecorder.stop();
                console.log(mediaRecorder.state);
                console.log("recorder stopped");
                record.style.background = "";
                record.style.color = "";
                }
            
                mediaRecorder.onstop = function(e) {
                console.log("data available after MediaRecorder.stop() called.");
            
                var clipName = prompt('Enter a name for your sound clip');
            
                var clipContainer = document.createElement('article');
                var clipLabel = document.createElement('p');
                var audio = document.createElement('audio');
                var deleteButton = document.createElement('button');
                
                clipContainer.classList.add('clip');
                audio.setAttribute('controls', '');
                deleteButton.innerHTML = "Delete";
                clipLabel.innerHTML = clipName;
            
                clipContainer.appendChild(audio);
                clipContainer.appendChild(clipLabel);
                clipContainer.appendChild(deleteButton);
                soundClips.appendChild(clipContainer);
            
                audio.controls = true;
                var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
                chunks = [];
                var audioURL = URL.createObjectURL(blob);
                audio.src = audioURL;
                console.log("recorder stopped");
            
                //uploadToPHPServer(blob);
                audioStreams.push({
                    name: 'msr-' + (new Date).toISOString().replace(/:|\./g, '-') + '.ogg',
                    data: blob
                });
            
                deleteButton.onclick = function(e) {
                    evtTgt = e.target;
                    evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
                }
                };
            
                mediaRecorder.ondataavailable = function(e) {
                chunks.push(e.data);
                };
            })
            .catch(function(err) {
                console.log('The following error occurred: ' + err);
            })
        }
        this.done();
    }

    // Set the AUDIO element
    _setResource(audio) {
        // Abort if origin's audio's already set
        if (this.origin.audio)
            return Abort;
        if (super._setResource(audio)==Abort)
            return Abort;
        let ti = this.origin;
        this.origin.audio = audio;
        // Record the different events
        audio.bind("play", function(){
            // Sometimes it takes time before the audio steam actually starts playing
            let actualPlay = setInterval(function() { 
                // Check PAUSED and CURRENTIME every millisecond: then it's time to record!
                if (!audio[0].paused && audio[0].currentTime) {
                    ti.eventsRecord.push(["play", Date.now(), audio[0].currentTime]);
                    clearInterval(actualPlay);
                }
            }, 1);
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
    record(parameters) {
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
        this.origin._addToPreload();
        return this.newMeta(function(){ this.done(); });
    }
}

PennController.instruction.voiceRecorder = function(){ return new VoiceRecorderInstr(); };