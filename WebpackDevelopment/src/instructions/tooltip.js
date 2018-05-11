// To be implemented
import "./instruction.js";

class TooltipInstr extends Instruction {

}

PennController.instruction.tooltip = function(text){ return new TooltipInstr(text); };