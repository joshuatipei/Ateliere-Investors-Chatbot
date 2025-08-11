// web/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge'; // fast on Vercel

const system = `
You are Ateliere's investor assistant. Answer ONLY from the user's question and common business knowledge.
Ateliere is a cloud media supply-chain / media technology company, NOT a fashion brand.
If a question isn't about Ateliere investors or media tech, say briefly that you don't have that context yet.
Keep answers under 6 sentences and neutral in tone.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as {
      messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    };

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';
    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
