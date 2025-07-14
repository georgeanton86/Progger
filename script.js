
async function askProgno() {
    const input = document.getElementById('input').value;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: input }]
        })
    });

    const result = await response.json();
    document.getElementById('output').innerText = result.choices?.[0]?.message?.content || 'Error';
}
