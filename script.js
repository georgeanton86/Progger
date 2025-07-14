async function askProgno() {
  const input = document.getElementById("input").value;
  const output = document.getElementById("output");
  output.textContent = "Loading...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input })
    });

    const data = await res.json();
    output.textContent = data.reply || "No reply.";
  } catch (err) {
    output.textContent = "Error: " + err.message;
  }
}