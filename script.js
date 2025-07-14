async function askProgno() {
  const input = document.getElementById("input").value;
  const output = document.getElementById("output");
  output.innerText = "Loading...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input })
    });

    const data = await res.json();
    output.innerText = data.reply || "No response.";
  } catch (err) {
    output.innerText = "Error: " + err.message;
  }
}
