const segmentsOn = [4, 2, 5, 5, 4, 5, 6, 3, 7, 6];
const amperPerSegment = 2 / 3; // full color takes 2 A, but if only 1 color is used, then it should be 1/3 of all

function amperPerDigit(digit) {
    return amperPerSegment * segmentsOn[digit];
}

function amperPerNumber(number) {
    const left = number < 10 ? 0 : Math.floor(number / 10);
    const right = number % 10;
    return amperPerDigit(left) + amperPerDigit(right);
}

function readNumber(id) {
    const homeScoreElement = document.getElementById(id);
    const scoreText = homeScoreElement.textContent;
    const homeScore = parseInt(scoreText, 10);
    if (!isNaN(homeScore)) {
        return homeScore;
    } else {
        return null;
    }
}

function totalAmper() {
    const home = readNumber("home-score");
    const away = readNumber("away-score");
    const timer = readNumber("timer-display");

    let homeAmper = Math.round(home !== null ? amperPerNumber(home) : 0);
    let awayAmper = Math.round(away !== null ? amperPerNumber(away) : 0);
    let timerAmper = Math.round(timer !== null ? amperPerNumber(timer) : 0);
    return [homeAmper + awayAmper + timerAmper, homeAmper, awayAmper, timerAmper];
}

function updateTotalAmper() {
    let amper = totalAmper();
    document.getElementById('totalAmper').textContent = amper[0];
    document.getElementById('homeAmper').textContent = amper[1];
    document.getElementById('awayAmper').textContent = amper[2];
    document.getElementById('timerAmper').textContent = amper[3];
}

document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateTotalAmper, 1000);
});
