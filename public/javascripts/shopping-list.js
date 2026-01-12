// Handle Checkbox Toggle
document.querySelectorAll('.item-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const csrfToken = e.target.dataset.csrf;
        const listItem = e.target.closest('.shopping-item');

        try {
            const response = await fetch('/shopping-list/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ id, _csrf: csrfToken })
            });

            if (response.ok) {
                listItem.classList.toggle('checked');
            } else {
                const data = await response.json();
                alert(data.error || 'Error updating item');
                e.target.checked = !e.target.checked;
            }
        } catch (error) {
            alert('Network error. Please try again.');
            e.target.checked = !e.target.checked;
        }
    });
});

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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
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
                errorDiv.textContent = data.error || 'Error adding item. Please try again.';
            }
            form.insertBefore(errorDiv, form.firstChild);
            submitButton.disabled = false;
            spinner.remove();
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = error.message || 'Network error. Please try again.';
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
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
