document.getElementById('noticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new URLSearchParams(new FormData(form));

    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    submitButton.disabled = true;
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    submitButton.appendChild(spinner);

    try {
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
            const data = await response.json();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            if (data.errors && data.errors.length > 0) {
                errorDiv.textContent = data.errors.map(err => err.msg).join(', ');
            } else {
                errorDiv.textContent = 'Error submitting notice. Please check your input.';
            }
            form.insertBefore(errorDiv, form.firstChild);
            submitButton.disabled = false;
            spinner.remove();
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Network error. Please try again.';
        form.insertBefore(errorDiv, form.firstChild);
        submitButton.disabled = false;
        spinner.remove();
    }
});
