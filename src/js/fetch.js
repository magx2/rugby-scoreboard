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

function showSpinner() {
    spinnerOverlay?.classList.add('active');
}

function hideSpinner() {
    spinnerOverlay?.classList.remove('active');
}
