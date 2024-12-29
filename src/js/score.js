const toggle = document.getElementById('toggle-add-remove');
let homeScore = 0;
let awayScore = 0;

// Function to initialize the scoreboard by fetching the current score
async function initializeScoreboard() {
    const data = await xfetch('/score', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
    });
    if (data) {
        internalUpdate(data);
    }
}

// Function to update the score dynamically
async function updateScore(team, points) {
    // Adjust points based on toggle
    const addPoints = toggle.checked ? points : -points;
    const data = await xfetch(`/score/${team}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({points: addPoints}),
    });

    if (data) {
        internalUpdate(data);
    }
}

function internalUpdate(data) {
    homeScore = data.home ?? 0;
    awayScore = data.away ?? 0;

    // Update the UI with the fetched scores
    document.getElementById('home-score').innerText = homeScore;
    document.getElementById('away-score').innerText = awayScore;
}

async function cleanScore() {
    const data = await xfetch(`/score/clean`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
    });

    if (data) {
        internalUpdate(data);
    }
}

// Initialize the scoreboard when the page loads
document.addEventListener('DOMContentLoaded', initializeScoreboard);
