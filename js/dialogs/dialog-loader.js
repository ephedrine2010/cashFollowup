// Dialog Loader Module
// Loads all dialog HTML files and initializes them

async function loadDialogs() {
    console.log('Loading dialogs...');
    const dialogContainers = [
        { id: 'values-dialog-container', file: 'dialogs/values-dialog.html' },
        { id: 'download-dialog-container', file: 'dialogs/download-dialog.html' },
        { id: 'start-cash-count-dialog-container', file: 'dialogs/start-cash-count-dialog.html' }
    ];

    for (const container of dialogContainers) {
        try {
            console.log(`Loading ${container.file} into ${container.id}...`);
            const response = await fetch(container.file);
            if (response.ok) {
                const html = await response.text();
                const containerElement = document.getElementById(container.id);
                if (containerElement) {
                    containerElement.innerHTML = html;
                    console.log(`Loaded ${container.file} successfully`);
                    
                    // Check if values dialog was loaded
                    if (container.id === 'values-dialog-container') {
                        const dialogElement = containerElement.querySelector('#values-dialog');
                        console.log('Values dialog element found:', !!dialogElement);
                    }
                } else {
                    console.warn(`Dialog container ${container.id} not found`);
                }
            } else {
                console.error(`Failed to load ${container.file}: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error loading ${container.file}:`, error);
        }
    }

    console.log('All dialogs loaded');
}

// Initialize dialogs when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadDialogs();
});

export { loadDialogs };