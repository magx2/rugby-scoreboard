const toggle = document.getElementById('toggle-add-remove');
let homeScore = 0;
let awayScore = 0;

// Function to initialize the scoreboard by fetching the current score
async function initializeScoreboard() {
    try {
        const response = await fetch('/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        homeScore = data.home ?? 0;
        awayScore = data.away ?? 0;

        // Update the UI with the fetched scores
        document.getElementById('home-score').innerText = homeScore;
        document.getElementById('away-score').innerText = awayScore;
    } catch (error) {
        console.error('Failed to fetch initial score:', error);

        // Show "?" for scores if fetching fails
        document.getElementById('home-score').innerText = '?';
        document.getElementById('away-score').innerText = '?';
    }
}

// Function to update the score dynamically
async function updateScore(team, points) {
    // Adjust points based on toggle
    const addPoints = toggle.checked ? points : -points;

    // Send request to REST endpoint
    try {
        const response = await fetch(`/score/${team}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: addPoints }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        // Update score locally
        if (team === 'home') {
            homeScore += addPoints;
            document.getElementById('home-score').innerText = homeScore;
        } else if (team === 'away') {
            awayScore += addPoints;
            document.getElementById('away-score').innerText = awayScore;
        }
    } catch (error) {
        console.error('Failed to update score:', error);
    }
}

// Initialize the scoreboard when the page loads
document.addEventListener('DOMContentLoaded', initializeScoreboard);
