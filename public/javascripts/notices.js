document.getElementById('noticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new URLSearchParams(new FormData(form));

    const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (response.ok) {
        window.location.replace('/notices');
    } else {
        // Ideally we would parse response.json() and show specific errors
        alert('Error submitting notice. Please check your input.');
    }
});
