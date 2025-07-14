async function askProgno() {
    const input = document.getElementById("input").value;
    const output = document.getElementById("output");
    output.innerText = "Loading...";

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY // Vercel should inject this env var
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: input }]
            })
        });

        if (!response.ok) {
            throw new Error("OpenAI API returned an error: " + response.statusText);
        }

        const data = await response.json();
        const message = data.choices[0].message.content;
        output.innerText = message;
    } catch (error) {
        output.innerText = "Error: " + error.message;
    }
}