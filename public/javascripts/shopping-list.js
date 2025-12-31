// Handle Add Form
document.getElementById('shoppingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new URLSearchParams(new FormData(form));

    const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.ok) {
        window.location.replace('/shopping-list');
    } else {
        alert('Error adding item. Please check your input.');
    }
});

// Handle Delete Forms
document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new URLSearchParams();
        formData.append('id', e.submitter.value);

        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.ok) {
            window.location.replace('/shopping-list');
        } else {
            alert('Error deleting item.');
        }
    });
});
