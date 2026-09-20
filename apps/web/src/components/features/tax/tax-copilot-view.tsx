'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAskCopilotMutation } from '@/services/tax-copilot.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Send, 
  User, 
  Cpu, 
  HelpCircle,
  Loader2,
  Trash2,
  TrendingUp,
  Landmark,
  FileText,
  Square
} from 'lucide-react';

import { useTranslation } from '@/lib/use-translation';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function TaxCopilotView({ companyId }: { companyId: string }) {
  const { t, locale } = useTranslation();
  
  const quickPrompts = [
    {
      icon: TrendingUp,
      label: t('copilot.quickPrompts.revenue'),
      text: t('copilot.quickPrompts.revenueText'),
    },
    {
      icon: Landmark,
      label: t('copilot.quickPrompts.banks'),
      text: t('copilot.quickPrompts.banksText'),
    },
    {
      icon: FileText,
      label: t('copilot.quickPrompts.withholding'),
      text: t('copilot.quickPrompts.withholdingText'),
    },
    {
      icon: HelpCircle,
      label: t('copilot.quickPrompts.rst'),
      text: t('copilot.quickPrompts.rstText'),
    },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: t('copilot.welcome'),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<any>(null);
  
  const [askCopilot, { isLoading }] = useAskCopilotMutation();

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].sender === 'assistant') {
        return [{ ...prev[0], text: t('copilot.welcome') }];
      }
      return prev;
    });
  }, [locale, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage(textToSend: string) {
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsgText = textToSend;

    // 1. Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userMsgText,
        timestamp: new Date(),
      },
    ]);
    setInput('');

    try {
      // 2. Call backend Copilot API with locale & abort handle
      const query = askCopilot({ companyId, question: userMsgText, locale });
      activeQueryRef.current = query;
      const res = await query.unwrap();
      activeQueryRef.current = null;

      // 3. Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      activeQueryRef.current = null;
      if (err?.name === 'AbortError' || err?.status === 'FETCH_ERROR') {
        setMessages((prev) => [
          ...prev,
          {
            id: `abort-${Date.now()}`,
            sender: 'assistant',
            text: locale === 'en' ? '⏹️ *Response generation stopped by user.*' : '⏹️ *Generación de respuesta detenida por el usuario.*',
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: locale === 'en' ? '⚠️ An error occurred while processing your question. Please check your connection or try again.' : '⚠️ Ocurrió un error al procesar tu pregunta. Por favor verifica que tu clave de Gemini esté activa o intenta de nuevo.',
            timestamp: new Date(),
          },
        ]);
      }
    }
  }

  function handleStopGenerating() {
    if (activeQueryRef.current) {
      activeQueryRef.current.abort();
      activeQueryRef.current = null;
    }
  }

  function handleClearChat() {
    if (confirm(t('copilot.clearConfirm'))) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: t('copilot.welcome'),
          timestamp: new Date(),
        },
      ]);
    }
  }

  return (
    <Card className="border border-border shadow-md bg-card max-w-4xl mx-auto h-[600px] flex flex-col overflow-hidden">
      <CardHeader className="bg-card border-b py-3 px-4 flex flex-row justify-between items-center shrink-0">
        <div>
          <CardTitle className="text-md font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            {t('copilot.title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('copilot.subtitle')}
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearChat}
          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 gap-1.5"
          title={t('copilot.clearHistory')}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('common.close')}
        </Button>
      </CardHeader>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-semibold ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-card text-indigo-600 dark:text-indigo-400 border-border shadow-2xs'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>
            <div
              className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-xs shadow-2xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-card border text-card-foreground rounded-tl-none prose dark:prose-invert max-w-none'
              }`}
            >
              {msg.sender === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-card text-indigo-600 dark:text-indigo-400 border border-border flex items-center justify-center shrink-0 shadow-2xs">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span>{t('copilot.analyzing')}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-card border-t shrink-0 space-y-3">
        {messages.length === 1 && (
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              {locale === 'en' ? 'Quick Suggestions:' : 'Sugerencias rápidas:'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickPrompts.map((prompt, idx) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt.text)}
                    disabled={isLoading}
                    className="flex items-center gap-2.5 p-2 rounded-lg border bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left text-xs disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded bg-indigo-100/50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{prompt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('copilot.placeholder')}
            disabled={isLoading}
            className="flex-1 text-xs h-9 bg-slate-50 dark:bg-slate-900 focus-visible:ring-indigo-600"
          />
          {isLoading ? (
            <Button 
              type="button" 
              onClick={handleStopGenerating}
              className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-4 text-xs gap-1.5 shadow-2xs font-semibold animate-in fade-in"
              title={t('copilot.stop')}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              {t('copilot.stop')}
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={!input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-xs gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {t('common.query')}
            </Button>
          )}
        </form>
      </div>
    </Card>
  );
}
