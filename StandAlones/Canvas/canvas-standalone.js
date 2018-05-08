/* This software is licensed under a BSD license; see the LICENSE file for details. */

//  ========================================= 
//
//      CANVAS
//
//  This is a stand-alone version of the 
//  Canvas and Image instructions from
//  PennController.
//  Use it to generate place images
//  on a canvas surface.
//  See http://files.lab.florianschwarz.net/ibexfiles/CanvasCreation/
//  for a visual editor that generates compatible code.
//
//  =========================================

var canvas, image;

(function(){

    function Error(message) {
        alert("ERROR: "+message);
        return false;
    }

    function Canvas(w, h) {

        this.width = w;
        this.height = h;
        this.element = $("<div>").css({position: "relative", width: w, height: h});
        this.children = [];

        this.put = function(content, x, y, z) {
            if (typeof(x) != "number" || typeof(y) != "number") {
                return Error("X and Y must be numbers [put]");
            }
            switch (typeof(content)) {
                case "string":
                    if (content.match(/^<img [^<>]+>(\s*<\/img>)?$/i))
                        content = $(content);
                    else
                        content = $("<img>").attr("src", content);
                    break;
                case "Object":
                    if (content instanceof HTMLImageElement)
                        content = $(content);
                    else if (!(content instanceof jQuery))
                        return Error ("Invalid format for content [put]");
                    break;
            }
            content.css({position: "absolute", left: x, top: y, "z-index": z});
            this.element.append(content);
            this.children.push(content);

            return this;
        }

        this.html = function(){
            return $("<a>").append(this.element).html();
        }

        return this;
    }

    canvas = function(w,h) {
        return new Canvas(w,h);
    }

    image = function(path, w, h) {
        if (!(typeof(path) == "string"))
            return Error("The image function's parameter must be a string corresponding to an image filename");
        if (typeof(w)=="number" && typeof(h)=="number" && w>=0 && h>=0)
            return "<img src='"+path+"' style='width:"+w+"; height:"+h+"'></img>";
        else
            return "<img src='"+path+"'></img>";
    }

}());