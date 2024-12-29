/************************************************************
 * Network Calls (to /time endpoints)
 ************************************************************/
async function startTimerRequest(startFrom) {
    if (typeof startFrom !== 'number') {
        startFrom = 1;
    }
    const response = await fetch('/time/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({startFrom: startFrom - 1})
    });
    if (!response.ok) {
        throw new Error(`Failed to start timer: ${response.statusText}`);
    }
    return await response.json();
}

async function stopTimerRequest() {
    const response = await fetch('/time/stop', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
        // body: ...
    });
    if (!response.ok) {
        throw new Error(`Failed to stop timer: ${response.statusText}`);
    }
    return await response.json();
}

async function statusRequest() {
    try {
        // Send a GET request to retrieve current time status
        const response = await fetch('/time/status');
        if (!response.ok) {
            throw new Error(`Failed to retrieve time status: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

// Finite State Machine Implementation
class FiniteStateMachine {
    constructor() {
        this.state = 'stop';
        this.transitions = {};
        this.timer = 1; // Timer field
        this.timerInterval = null; // Timer interval field
        this.eventHandlers = {}; // Event handlers for state transitions
        this.exitHandlers = {}; // Event handlers for state exits
    }

    // Add a transition between states
    addTransition(state, event) {
        if (!this.transitions[state]) {
            this.transitions[state] = {};
        }
        this.transitions[state][event] = event;
    }

    // Register an event handler for a state
    onStateEnter(state, handler) {
        if (!this.eventHandlers[state]) {
            this.eventHandlers[state] = [];
        }
        this.eventHandlers[state].push(handler);
    }

    // Register an exit handler for a state
    onStateExit(state, handler) {
        if (!this.exitHandlers[state]) {
            this.exitHandlers[state] = [];
        }
        this.exitHandlers[state].push(handler);
    }

    // Trigger an event to transition to the next state
    transition(event) {
        const currentStateTransitions = this.transitions[this.state];
        if (currentStateTransitions && currentStateTransitions[event]) {
            // Trigger exit handlers for the current state
            if (this.exitHandlers[this.state]) {
                this.exitHandlers[this.state].forEach((handler) => handler());
            }

            this.state = currentStateTransitions[event];
            console.log(`Transitioned to state: ${this.state}`);

            // Trigger event handlers for the new state
            if (this.eventHandlers[this.state]) {
                this.eventHandlers[this.state].forEach((handler) => handler());
            }
        } else {
            console.error(`Invalid transition from state '${this.state}' using event '${event}'`);
        }
    }

    async refreshData(data) {
        // if data was not passed, fall back to `statusRequest()`
        if (!(data && typeof data === 'object')) {
            data = await statusRequest();
            if (!(data && typeof data === 'object')) {
                // update display before returning
                fsm.updateTimerDisplay();
                return;
            }
        }

        if (typeof data.elapsedMins === 'number') {
            this.timer = data.elapsedMins;
            this.updateTimerDisplay();
        }
        if (typeof data.isRunning === 'boolean') {
            const serverRunning = data.isRunning;
            if (serverRunning && !this.isRunning()) {
                this.transition("play");
            } else if (!serverRunning && this.isRunning()) {
                this.transition("stop")
            }
        }
    }

    isRunning() {
        return this.state === "play"
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        let timePicker = this.timer;
        if (this.isRunning() || this.timer > 1) {
            timerDisplay.textContent = this.timer.toString().padStart(2, '0');
        } else {
            timerDisplay.textContent = "??";
            timePicker = 1;
        }
        document.getElementById('time-picker').value = timePicker;
    }

    // Get the current state
    getState() {
        return this.state;
    }
}

const fsm = new FiniteStateMachine();
// available transitions
fsm.addTransition("stop", "play");
fsm.addTransition("play", "stop");

// Add event handlers for states
fsm.onStateEnter("play", () => {
    console.log("Entering play state: Timer started");

    const timePicker = document.getElementById('time-picker');
    let startFrom = parseInt(timePicker.value, 10);
    if (!isNaN(startFrom) && startFrom >= 1) {
        fsm.timer = startFrom;
    } else {
        startFrom = 1;
    }
    startTimerRequest(startFrom).then(data => fsm.refreshData(data))
        .catch(error => {
            console.error("Error in startTimerRequest:", error);
            fsm.updateTimerDisplay();
        });

    // buttons
    document.getElementById('toggle-play-pause').innerText = '⏸️ Pause';
    document.getElementById("stop-button").innerText = '⏹️️ Stop';
    document.getElementById("time-picker").disabled = true;
    document.getElementById("first-half").disabled = true;
    document.getElementById("second-half").disabled = true;

    fsm.timerInterval = setInterval(async () => {
        fsm.timer++;
        fsm.updateTimerDisplay();
        await fsm.refreshData();
    }, 60 * 1000);
});
fsm.onStateExit("play", () => {
    clearInterval(this.timerInterval);
    fsm.timerInterval = null
})
fsm.onStateEnter("stop", () => {
    console.log("Entering stop state: Timer reset");

    stopTimerRequest().then(data => fsm.refreshData(data))
        .catch(error => {
            console.error("Error in startTimerRequest:", error);
            fsm.updateTimerDisplay();
        });

    // buttons
    document.getElementById('toggle-play-pause').innerText = '▶️ Play';
    document.getElementById("stop-button").innerText = '⏹️️ Reset';
    document.getElementById("time-picker").disabled = false;
    document.getElementById("first-half").disabled = false;
    document.getElementById("second-half").disabled = false;
});

/************************************************************
 * Timer Module
 ************************************************************/
function togglePlayPause() {
    let state = fsm.getState();
    if (state === 'play') {
        fsm.transition('stop')
    } else {
        fsm.transition('play')
    }
}

function stopTimer() {
    fsm.timer = 0
    setStartFrom(1);

    let state = fsm.getState();
    if (state === 'play') {
        fsm.transition('stop');
    }

    fsm.updateTimerDisplay();
}

function setStartFrom(time) {
    const timePicker = document.getElementById('time-picker');
    timePicker.value = time;
}

/************************************************************
 * Initialization
 ************************************************************/
document.addEventListener('DOMContentLoaded', async () => {
    await fsm.refreshData();
});
