// Handle Add Form
document.getElementById('shoppingForm').addEventListener('submit', async (e) => {
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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.ok) {
            window.location.replace('/shopping-list');
        } else {
            const data = await response.json();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            if (data.errors && data.errors.length > 0) {
                errorDiv.textContent = data.errors.map(err => err.msg).join(', ');
            } else {
                errorDiv.textContent = 'Error adding item. Please check your input.';
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

// Handle Delete Forms
document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.submitter;
        const formData = new URLSearchParams(new FormData(form));
        formData.set('id', e.submitter.value);

        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Deleting...';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (response.ok) {
                window.location.replace('/shopping-list');
            } else {
                const data = await response.json();
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                if (data.errors && data.errors.length > 0) {
                    errorDiv.textContent = data.errors.map(err => err.msg).join(', ');
                } else {
                    errorDiv.textContent = 'Error deleting item.';
                }
                form.insertBefore(errorDiv, form.firstChild);
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        } catch (error) {
            alert('Network error. Please try again.');
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
});
