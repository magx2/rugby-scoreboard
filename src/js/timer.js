/************************************************************
 * Timer Module
 ************************************************************/

let timer = 1;              // Timer value (in seconds or minutes)
let timerInterval = null;   // Holds the setInterval reference
let isRunning = false;      // Tracks whether the timer is running

// Update timer display with a two-digit format (e.g., 00, 01, etc.)
function updateTimerDisplay(data) {
    // Only proceed if 'data' is provided and is an object
    if (data && typeof data === 'object') {
        // Safely update 'timer' if 'elapsedMins' is defined
        if (typeof data.elapsedMins === 'number') {
            timer = data.elapsedMins;
        }
        // Safely update 'isRunning' if it's a boolean
        if (typeof data.isRunning === 'boolean') {
            isRunning = data.isRunning;
        }
    }
    const timerDisplay = document.getElementById('timer-display');
    if (isRunning || timer > 1) {
        timerDisplay.textContent = timer.toString().padStart(2, '0');
    } else {
        timerDisplay.textContent = "??"
    }
    const timePicker = document.getElementById('time-picker');
    timePicker.value = timer;
}

function setStartFrom(time) {
    const timePicker = document.getElementById('time-picker');
    timePicker.value = time;
}

/************************************************************
 * Network Calls (to /time endpoints)
 ************************************************************/

async function startTimerRequest(startFrom) {
    if (typeof startFrom !== 'number') {
        startFrom = 1;
    }
    try {
        const response = await fetch('/time/start', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({startFrom: startFrom})
        });
        if (!response.ok) {
            throw new Error(`Failed to start timer: ${response.statusText}`);
        }
        const data = await response.json();
        updateTimerDisplay(data);
    } catch (error) {
        console.error(error);
    }
}

async function pauseTimerRequest() {
    try {
        const response = await fetch('/time/pause', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
            // body: ...
        });
        if (!response.ok) {
            throw new Error(`Failed to pause timer: ${response.statusText}`);
        }
        const data = await response.json();
        updateTimerDisplay(data);
    } catch (error) {
        console.error(error);
    }
}

async function stopTimerRequest() {
    try {
        const response = await fetch('/time/stop', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
            // body: ...
        });
        if (!response.ok) {
            throw new Error(`Failed to stop timer: ${response.statusText}`);
        }
        const data = await response.json();
        updateTimerDisplay(data);
    } catch (error) {
        console.error(error);
    }
}

async function statusRequest() {
    try {
        // Send a GET request to retrieve current time status
        const response = await fetch('/time/status');
        if (!response.ok) {
            throw new Error(`Failed to retrieve time status: ${response.statusText}`);
        }
        const data = await response.json();

        // Update our local timer state & display with server data
        updateTimerDisplay(data);
    } catch (error) {
        console.error(error);
    }
}

/************************************************************
 * Timer Control Functions
 ************************************************************/

/**
 * Toggles the timer between Play and Pause.
 * - If timer is running, pause it and do a POST to /time/pause
 * - If timer is paused, start it and do a POST to /time/start
 */
async function togglePlayPause() {
    const toggleButton = document.getElementById('toggle-play-pause');

    if (isRunning) {
        // Pause
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
        toggleButton.innerText = '▶️ Play';
        document.getElementById("stop-button").disabled = true;
        document.getElementById("first-half").disabled = false;
        document.getElementById("second-half").disabled = false;

        // REST request to pause timer
        await pauseTimerRequest();
    } else {
        const timePicker = document.getElementById('time-picker');
        const userValue = parseInt(timePicker.value, 10);

        if (!isNaN(userValue) && userValue >= 0) {
            timer = userValue;
            updateTimerDisplay();
        }

        // Play
        startTimerInterval();

        isRunning = true;
        toggleButton.innerText = '⏸️ Pause';
        document.getElementById("stop-button").disabled = false;
        document.getElementById("first-half").disabled = true;
        document.getElementById("second-half").disabled = true;

        // REST request to start timer
        await startTimerRequest(userValue);
    }
    updateTimerDisplay();
}

/**
 * Stops the timer completely and resets it to 00.
 * - Also do a POST to /time/stop
 */
async function stopTimer() {
    // Stop if running
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    // Reset time
    timer = 1;
    updateTimerDisplay();

    // Update toggle button text
    const toggleButton = document.getElementById('toggle-play-pause');
    toggleButton.innerText = '▶️ Play';

    document.getElementById("stop-button").disabled = true;
    document.getElementById("first-half").disabled = false;
    document.getElementById("second-half").disabled = false;

    // REST request to stop timer
    await stopTimerRequest();
}

/************************************************************
 * Initialization
 ************************************************************/
function startTimerInterval() {
    timerInterval = setInterval(async () => {
        timer++;
        updateTimerDisplay();
        await statusRequest();
    }, 60 * 1000);
}

document.addEventListener('DOMContentLoaded', async () => {
    updateTimerDisplay(null);
    try {
        // Send a GET request to retrieve current time status
        const response = await fetch('/time/status');
        if (!response.ok) {
            throw new Error(`Failed to retrieve time status: ${response.statusText}`);
        }
        const data = await response.json();

        // Update our local timer state & display with server data
        updateTimerDisplay(data);

        // If server indicates the timer is running, resume local interval
        if (isRunning) {
            const toggleButton = document.getElementById('toggle-play-pause');
            toggleButton.innerText = '⏸️ Pause';
            document.getElementById("stop-button").disabled = false;
            document.getElementById("first-half").disabled = true;
            document.getElementById("second-half").disabled = true;

            startTimerInterval();
        } else {
            document.getElementById("stop-button").disabled = true;
            document.getElementById("first-half").disabled = false;
            document.getElementById("second-half").disabled = false;
        }
    } catch (error) {
        console.error('Error fetching /time/status:', error);
        // Fallback: ensure we display something (e.g., "00")
    }
});
