import "./instruction.js";

// Runs all instructions passed as arguments
// Done when all instructions are done (by default, but see the VALIDATION method)
class ComplexInstr extends Instruction {
    constructor(instructions) {
        super(instructions, "complex");
        if (instructions != Abort) {
            this.table = $("<table>").addClass("PennController-Complex");
            // The instructions still to be done (initial state: all of them)
            this.toBeDone = [];
            this.setElement(this.table);
        }
    }

    // ========================================
    // PRIVATE & INTRINSIC METHODS
    // ========================================

    run() {
        if (super.run() == Abort)
            return Abort;
        let ti = this;
        // Go through each instruction and add/run them if needed
        let tr = $("<tr>");
        for (let i in this.content) {
            let instruction = ti.content[i],
                td = $("<td>");
            if (!(instruction instanceof Instruction))
                continue;
            // If instruction already run, do nothing with it
            if (instruction.hasBeenRun)
                continue;
            // If not run, add it to instructions to listen to
            ti.toBeDone.push(instruction);                
            // Assign each instruction to the proper parent
            function addParentElement(instr) {
                // If complex itself, add directly to the table
                if (instr instanceof ComplexInstr)
                    instr.parentElement = ti.table;
                // Else, add to the current TD
                else
                    instr.parentElement = td;
                // If instruction has sources, navigate
                if (instr.type == "meta" && !instr.source.parentElement)
                    addParentElement(instr.source);
            }
            // Initiate parent assigment
            addParentElement(instruction);
            // If complex instruction, should start a new TR
            if (instruction instanceof ComplexInstr) {
                // Add current TR to the table if it contains children
                if (tr.children().length)
                    ti.table.append(tr);
                tr = $("<tr>");
            }
            // If not complex, simply add current TD to current TR
            else
                tr.append(td);
            // Inform ComplexInstr (call EXECUTED) when the instruction is done
            instruction.done = instruction.extend("done", function(){ ti._executed(instruction); });
            // Run the instruction
            instruction.run();
        }
        // If current TR has children, make sure to add it to table
        if (tr.children().length)
            ti.table.append(tr);

        // If adding Complex to a TABLE, add each of its TR to its parent table
        if (this.parentElement && this.parentElement.is("table")) {
            this.table.find("tr").each(function(){
                _addElementTo($(this), ti.parentElement);
            });
        }
        // Else, add the table to parent element
        else {
            if (this.element.is("table"))
                _addElementTo(this.element, this.parentElement);
            else
                _addElementTo($("<table>").append(this.element), this.parentElement);
        }
        // If every instruction is already done, this one's done too
        if (this.toBeDone.length < 1)
            this.done();
    }

    // Called when an instruction is done
    _executed(instruction) {
        let index = this.toBeDone.indexOf(instruction);
        if (index >= 0)
            this.toBeDone.splice(index, 1);
        // If there is no instruction left to be done, call done if element already added
        if (this.toBeDone.length < 1 && $.contains(document.body, this.element[0]))
            this.done();
    }

    // Overriding newMeta, as original's content poses problems
    newMeta(callback) {
        let ct = this.origin.content;
        this.origin.content = null;
        let rtn = super.newMeta(callback);
        this.origin.content = ct;
        return rtn;
    }


    // ========================================
    // METHODS RETURNING NEW INSTRUCTIONS
    // ========================================

    // Returns an instruction setting the validation method
    // Done when all OR any OR specific instruction(s) done
    validation(which) {
        let instr = this.newMeta();
        this.origin._executed = this.origin.extend("_executed", function(instruction){
            // If 'any,' instruction is done as soon as one instruction is done
            if (which == "any")
                instr.done();
            // If WHICH is an index, the complex instruction is done only when the index'th instruction is done
            else if (typeof(which) == "number" && which in this.origin.content) {
                if (instr.origin.content[which] == instruction)
                        instr.done();
            }
            // If WHICH points to one of the instructions, complex is done when that instruction is done
            else if (which instanceof Instruction && which == instruction)
                instr.done();
            // Otherwise, all instructions have to be done before this one's done (= origin's conditions)
            else {
                if (instr.origin.isDone)
                    instr.done();
            }
        });
        return instr;
    }
}