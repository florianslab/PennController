// To be implemented
import "./instruction.js";

class ScreenInstr extends Instruction {
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
}

PennController.instruction.screen = function(command){ return new ScreenInstr(command); };