export default async function handler(req, res) {
  // 1. 通信方法が正しいかチェック
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Claudeにお手紙（リクエスト）を送る
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Vercelに登録した鍵を使います
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: String(req.body.message) }]
      })
    });

    const data = await response.json();

    // 3. 結果をあなたのアプリに返す
    return res.status(response.status).json(data);
  } catch (error) {
    // 4. 何かトラブルがあったらエラー内容を出す
    return res.status(500).json({ error: error.message });
  }
}
