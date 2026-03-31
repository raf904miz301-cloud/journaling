export default async function handler(req, res) {
  // POSTメソッド以外は拒否する設定
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // 鍵が設定されていない場合のエラー
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not set in Vercel' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: req.body.message }]
      })
    });

    const data = await response.json();

    // Claudeからエラーが返ってきた場合、その内容を表示させる
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
