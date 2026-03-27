'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_URL } from '@/lib/api';
import StreamingResponse from '@/components/StreamingResponse/StreamingResponse';
import type { Conversation, Message, CitationInfo } from '@/types';
import styles from './ChatInterface.module.scss';

interface ConversationWithMessages {
    conversation: Conversation;
    messages: Message[];
}

interface StreamEvent {
    type: 'token' | 'citations' | 'done' | 'error';
    token?: string;
    citations?: CitationInfo[];
    conversationId?: string;
    messageId?: string;
    error?: string;
}

export default function ChatInterface() {
    const queryClient = useQueryClient();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; citations: CitationInfo[]; isStreaming?: boolean }>>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: conversationsData } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => apiFetch<{ conversations: Conversation[] }>('/conversations'),
    });

    const createConversationMutation = useMutation({
        mutationFn: () => apiFetch<{ conversation: Conversation }>('/conversations', { method: 'POST' }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setActiveConversationId(data.conversation.id);
            setMessages([]);
        },
    });

    const deleteConversationMutation = useMutation({
        mutationFn: (id: string) => apiFetch(`/conversations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setActiveConversationId(null);
            setMessages([]);
        },
    });

    const loadConversation = async (conversationId: string) => {
        setActiveConversationId(conversationId);
        const data = await apiFetch<ConversationWithMessages>(`/conversations/${conversationId}`);
        setMessages(
            data.messages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
                citations: [],
            }))
        );
        // Scroll to bottom after loading
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }, 50);
    };

    const handleNewConversation = () => {
        createConversationMutation.mutate();
    };

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        let conversationId = activeConversationId;
        if (!conversationId) {
            const data = await apiFetch<{ conversation: Conversation }>('/conversations', { method: 'POST' });
            conversationId = data.conversation.id;
            setActiveConversationId(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage, citations: [] }]);
        setMessages((prev) => [...prev, { role: 'assistant', content: '', citations: [], isStreaming: true }]);
        setIsStreaming(true);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ message: userMessage, conversationId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data: StreamEvent = JSON.parse(line.slice(6));

                        if (data.type === 'token' && data.token) {
                            setMessages((prev) => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last.role === 'assistant') {
                                    updated[updated.length - 1] = { ...last, content: last.content + data.token };
                                }
                                return updated;
                            });
                        } else if (data.type === 'citations' && data.citations) {
                            setMessages((prev) => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last.role === 'assistant') {
                                    updated[updated.length - 1] = { ...last, citations: data.citations! };
                                }
                                return updated;
                            });
                        } else if (data.type === 'done') {
                            setMessages((prev) => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last.role === 'assistant') {
                                    updated[updated.length - 1] = { ...last, isStreaming: false };
                                }
                                return updated;
                            });
                            queryClient.invalidateQueries({ queryKey: ['conversations'] });
                        } else if (data.type === 'error') {
                            throw new Error(data.error ?? 'Chat error');
                        }
                    }
                }
            }
        } catch (err) {
            setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
                        isStreaming: false,
                    };
                }
                return updated;
            });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const conversations = conversationsData?.conversations ?? [];

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <button
                    className={styles.newConvBtn}
                    onClick={handleNewConversation}
                    disabled={createConversationMutation.isPending}
                >
                    + New Conversation
                </button>
                <ul className={styles.convList}>
                    {conversations.map((conv) => (
                        <li
                            key={conv.id}
                            className={`${styles.convItem} ${conv.id === activeConversationId ? styles.convItemActive : ''}`}
                        >
                            <button
                                className={styles.convBtn}
                                onClick={() => loadConversation(conv.id)}
                            >
                                {conv.title ?? 'New conversation'}
                            </button>
                            <button
                                className={styles.convDelete}
                                onClick={() => deleteConversationMutation.mutate(conv.id)}
                                aria-label="Delete conversation"
                            >
                                &times;
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className={styles.main}>
                <div className={styles.messages}>
                    {messages.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>Start a conversation to explore your knowledge base.</p>
                            <p className={styles.emptyHint}>Make sure you have added and processed sources first.</p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                        >
                            <span className={styles.messageRole}>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                            {msg.role === 'assistant' ? (
                                <StreamingResponse
                                    text={msg.content}
                                    citations={msg.citations}
                                    isStreaming={msg.isStreaming ?? false}
                                />
                            ) : (
                                <p>{msg.content}</p>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputArea}>
                    <textarea
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your knowledge base... (Enter to send, Shift+Enter for newline)"
                        rows={3}
                        disabled={isStreaming}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSend}
                        disabled={isStreaming || !input.trim()}
                    >
                        {isStreaming ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
