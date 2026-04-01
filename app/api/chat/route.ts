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
- ユーザーの言葉をそのまま受け取り、「それで当然だよ」と感じさせる
- 温かく、親友のような口調
- 絵文字は控えめに（1〜2個まで）

返答は必ず以下のJSON形式のみで返してください。前置きや説明は不要です：
{
  "acknowledgment": "承認の言葉（2〜3文）",
  "deepDive": "深掘りの観察・質問（1〜2文）",
  "suggestions": ["提案1", "提案2", "提案3"],
  "inviteText": "自由回答欄への誘い（1文）"
}

STEP6のまとめのみ以下の形式：
{
  "summary": {
    "facts": "今日の出来事・事実",
    "firstEmotion": "最初の気持ち",
    "emotionChange": "感情の変化",
    "encouragement": "褒め言葉と励まし（3〜5文）"
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
      max_tokens: 1024,
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
