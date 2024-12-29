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
