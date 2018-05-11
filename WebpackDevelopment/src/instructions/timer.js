import "./instruction.js";

// Adds a timer
// Done immediately
class TimerInstr extends Instruction {
    constructor(delay, callback) {
        super(delay, "timer");
        if (delay != Abort){
            this.delay = delay;
            this.setElement($("<timer>"));
            this.step = 10;
            this.callback = callback;
        }
    }

    // ========================================
    // PRIVATE & INTRINSIC METHODS
    // ========================================

    run() {
        if (super.run() == Abort)
            return Abort;
        this.left = this.delay;
        let ti = this;
        /*this.timer = setInterval(function(){
            ti.left -= ti.step;
            if (ti.left <= 0){
                clearInterval(ti.timer);
                ti.left = 0;
                ti._elapsed();
            }
        }, this.step);*/
        this.timer = setTimeout(function(){ ti._elapsed(); }, this.delay);
        _ctrlr.timers.push(this.timer);
        this.done();
    }

    // Called when timer has elapsed
    _elapsed() {
        if (this.callback instanceof Function)
            this.callback();
        else if (this.callback instanceof Instruction) {
            this.callback.parentElement = _ctrlr.element;
            this.callback.run();
        }
    }

    // ========================================
    // METHODS RETURNING NEW INSTRUCTIONS
    // ========================================

    // Returns an instruction that prematurely stops the timer
    // Done immediately
    stop(done) {
        let ti = this, instr = this.newMeta(function() { ti.done });
        instr.run = function(){ 
            clearInterval(ti.origin.timer);
            // If DONE is true, the (origin) timer instruction is considered done upon stopping
            if (done)
                ti.origin.done();
        }
        return instr;
    }

    // Returns an instruction after setting the origin's step
    // Done immediately
    step(value) {
        // (Re)set the step
        this.origin.step = value;
        // Return the instruction itself
        return this.newMeta(function(){ this.done(); });
    }

    // Returns an instruction to sait until the timer has elapsed
    // Done when the timer has elapsed
    wait(callback) {
        return this.newMeta(function(){
            let ti = this;
            this.origin._elapsed = this.origin.extend("_elapsed", function(){ 
                if (callback instanceof Instruction && !callback.hasBeenRun)
                    callback.run()
                ti.done();
            });
        });
    }
}

PennController.instruction.timer = function(delay, callback){ return new TimerInstr(delay, callback); };