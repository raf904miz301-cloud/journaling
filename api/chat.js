<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Journaling App</title>
    <style>
        body { font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; background-color: #f5f5f5; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { color: #333; font-size: 24px; text-align: center; }
        textarea { width: 100%; height: 150px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-bottom: 10px; resize: none; }
        button { width: 100%; padding: 12px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:disabled { background-color: #ccc; }
        #response { margin-top: 20px; padding: 15px; border-left: 5px solid #4CAF50; background: #f9f9f9; display: none; line-height: 1.6; }
        .loading { text-align: center; color: #666; display: none; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>ジャーナリング</h1>
        <textarea id="journalInput" placeholder="今の気持ちを書いてみましょう..."></textarea>
        <button id="sendBtn">AIに話しかける</button>
        <div id="loading" class="loading">AIが考え中...</div>
        <div id="response"></div>
    </div>

    <script>
        const input = document.getElementById('journalInput');
        const btn = document.getElementById('sendBtn');
        const responseDiv = document.getElementById('response');
        const loading = document.getElementById('loading');

        btn.addEventListener('click', async () => {
            const text = input.value.trim();
            if (!text) return;

            btn.disabled = true;
            loading.style.display = 'block';
            responseDiv.style.display = 'none';

            try {
                // フォルダが大文字の 'Api' でも動くように修正しました
                const response = await fetch('/Api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });

                const data = await response.json();

                if (response.ok) {
                    // Claudeの返信を表示（形式に合わせて抽出）
                    const reply = data.content && data.content[0] ? data.content[0].text : '返信を受け取れませんでした。';
                    responseDiv.innerText = reply;
                    responseDiv.style.display = 'block';
                } else {
                    throw new Error(data.error || '接続に失敗しました。');
                }
            } catch (err) {
                alert('エラーが発生しました: ' + err.message);
            } finally {
                btn.disabled = false;
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
