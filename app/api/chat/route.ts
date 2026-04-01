import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `あなたは「私を好きになるジャーナリング」の優しいガイドです。
ユーザーの感情を深く承認し、寄り添い、前向きな気持ちへと導くことが役割です。

【基本姿勢】
- 問題解決より「承認」を最優先にする
- 批判・否定・アドバイスの押しつけは絶対にしない
- ユーザーの言葉をそのまま受け取り、「それは当然のお気持ちだと思います」と感じさせる
- 必ず敬語・丁寧語を使う（「〜ですね」「〜ましょう」「〜ではないでしょうか」など）
- 親しみやすく温かいが、きちんとした丁寧語を維持する
- 絵文字は控えめに（1〜2個まで）

【返答の長さについて】
- STEP2とSTEP3では、承認の言葉を特に丁寧に、長めに書いてください
- 承認は最低4〜5文以上、ユーザーの言葉を具体的に拾いながら共感を伝えてください
- 「〜とおっしゃっていましたね」「〜というお気持ち、とてもよくわかります」など、
  ユーザーの言葉をそのまま反映した言葉を使ってください
- 深掘りも2〜3文で丁寧に
- 提案は具体的で温かみのある表現で

返答は必ず以下のJSON形式のみで返してください。前置きや説明は不要です：
{
  "acknowledgment": "承認の言葉（STEP2・3は4〜5文以上、丁寧語で）",
  "deepDive": "深掘りの観察・質問（2〜3文、丁寧語で）",
  "suggestions": ["提案1", "提案2", "提案3"],
  "inviteText": "自由回答欄への誘い（1文、丁寧語で）"
}

STEP6のまとめのみ以下の形式：
{
  "summary": {
    "facts": "今日の出来事・事実",
    "firstEmotion": "最初の気持ち",
    "emotionChange": "感情の変化",
    "encouragement": "褒め言葉と励まし（4〜6文、丁寧語で、心を込めて）"
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const { messages, step, userInputs } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPT +
      `\n\n現在のステップ: STEP${step}` +
      (userInputs ? `\n\nユーザーのSTEP1の入力（5つの気持ち）:\n${userInputs.join('\n')}` : '');

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    let parsed;
    try {
      const text = content.text.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(text);
    } catch {
      parsed = { acknowledgment: content.text, deepDive: '', suggestions: [], inviteText: '' };
    }

    return NextResponse.json({ result: parsed });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
