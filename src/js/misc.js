function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Hide and remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => container.removeChild(notification), 300);
    }, 3000);
}

async function xfetch(url, data) {
    showSpinner();
    try {
        const response = await fetch(url, data);

        let responseJson;
        try {
            responseJson = await response.json();
        } catch {
            showNotification(response.statusText || 'Failed to parse response', 'error');
            return;
        }

        if (!response.ok) {
            if (responseJson && responseJson.error) {
                showNotification(responseJson.error, 'error');
            } else {
                showNotification(response.statusText || 'Request failed', 'error');
            }
            return;
        }

        return responseJson;
    } catch (error) {
        console.error(`Error occurred with request. URL: ${url}, Data: ${JSON.stringify(data)}`, error);
        showNotification(`Network error: ${error.message}`, 'error');
    } finally {
        hideSpinner();
    }
}

const spinnerOverlay = document.getElementById('spinner-overlay');

function showSpinner() {
    spinnerOverlay?.classList.add('active');
}

function hideSpinner() {
    spinnerOverlay?.classList.remove('active');
}
