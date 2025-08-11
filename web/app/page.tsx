// web/app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Role = 'user' | 'assistant';
interface Message {
  role: Role;
  content: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;
    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const answer = (data.answer || '').trim();
      setMessages([...newMessages, { role: 'assistant', content: answer }]);
    } catch (e) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, something went wrong.' },
      ]);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Ateliere Investor Assistant</h1>
      <p className="subtitle">Ask questions about Ateliere investor updates and press releases.</p>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type your question…"
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <style jsx>{`
        .container { max-width: 820px; margin: 2rem auto; padding: 1rem; }
        .title { margin: 0 0 .5rem; font-weight: 700; }
        .subtitle { margin: 0 0 1rem; color: #666; }
        .chat-window {
          height: 420px; overflow-y: auto; border: 1px solid #ddd;
          padding: 1rem; margin-bottom: 1rem; border-radius: 6px; background: #fff;
        }
        .message { white-space: pre-wrap; line-height: 1.45; margin-bottom: .75rem; }
        .message.user { text-align: right; }
        .input-row { display: flex; }
        textarea {
          flex: 1; padding: .5rem; font-size: 1rem; border: 1px solid #ccc;
          border-radius: 4px; resize: vertical;
        }
        button {
          margin-left: .5rem; padding: .5rem 1rem; font-size: 1rem; border: none;
          border-radius: 4px; background: #0070f3; color: #fff; cursor: pointer;
        }
        button:hover { background: #005bd1; }
      `}</style>
    </div>
  );
}

