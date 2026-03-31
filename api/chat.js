export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { system, message } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
        system: system,
        messages: [{ role: "user", content: message }]
      })
    });
    const data = await response.json();
    res.status(200).json({ text: data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: "API通信に失敗しました" });
  }
}