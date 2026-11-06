'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRoom } from '@/context/RoomContext';

function formatMessageTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function RoomChatPanel() {
  const { messages, sendMessage, currentMember, members, room } = useRoom();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');
    try {
      await sendMessage(text);
    } catch (err) {
      console.warn('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e);
    }
  };

  return (
    <div className="bg-[#121212] border border-[#242424] rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Chat Header */}
      <div className="p-4 border-b border-[#222222] flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>Room Chat</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <p className="text-[11px] text-[#666666] mt-0.5">
            {members.length} {members.length === 1 ? 'member' : 'members'} listening
          </p>
        </div>
        <span className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">
          Live
        </span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-8">
            <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#282828] flex items-center justify-center text-[#555555]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-white">No messages yet</p>
            <p className="text-[11px] text-[#666666] max-w-[200px]">
              Say hello or chat about the current song with everyone in the room!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentMember && msg.userId === currentMember.id;
            const isHost = room && room.host_id === msg.userId;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar / Initial */}
                <div className="shrink-0 mt-0.5">
                  {msg.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.avatar}
                      alt={msg.userName}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#242424] text-white flex items-center justify-center text-[10px] font-bold ring-1 ring-white/10">
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Bubble & Metadata */}
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name + Badges + Timestamp */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#777777]">
                    <span className="font-semibold text-[#aaaaaa] truncate max-w-[120px]">
                      {isMe ? 'You' : msg.userName}
                    </span>
                    {isHost && (
                      <span className="bg-[#242424] text-[#b3b3b3] border border-[#333333] px-1.5 py-0.2 rounded text-[9px] font-semibold">
                        Host
                      </span>
                    )}
                    <span>•</span>
                    <span className="font-mono">{formatMessageTime(msg.timestamp)}</span>
                  </div>

                  {/* Message Content */}
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs break-words leading-relaxed ${
                      isMe
                        ? 'bg-[#2a2a2a] text-white rounded-tr-xs border border-[#383838]'
                        : 'bg-[#181818] text-[#dddddd] rounded-tl-xs border border-[#252525]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#202020] bg-[#141414] flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message room..."
          maxLength={300}
          className="flex-1 bg-[#1a1a1a] hover:bg-[#202020] focus:bg-[#202020] border border-[#2c2c2c] focus:border-white/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#666666] outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            inputText.trim() && !isSending
              ? 'bg-white text-black hover:scale-105 active:scale-95 shadow'
              : 'bg-[#202020] text-[#555555] cursor-not-allowed'
          }`}
          title="Send message"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

