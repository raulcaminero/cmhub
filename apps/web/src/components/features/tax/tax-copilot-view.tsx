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
  FileText
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  {
    label: 'Ingresos de este mes',
    icon: TrendingUp,
    text: '¿Cómo van mis ingresos de este mes?',
  },
  {
    label: 'Balance de Bancos',
    icon: Landmark,
    text: '¿Cuáles son los balances actuales de mis cuentas bancarias?',
  },
  {
    label: 'Retención ITBIS Honorarios',
    icon: FileText,
    text: '¿Qué retención de ITBIS aplica a un servicio de honorarios profesionales de diseño gráfico?',
  },
  {
    label: '¿Qué es el RST?',
    icon: HelpCircle,
    text: '¿Qué requisitos y beneficios tiene el Régimen Simplificado de Tributación (RST) de la DGII?',
  },
];

export default function TaxCopilotView({ companyId }: { companyId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu **Copiloto Fiscal y Financiero**. Puedo ayudarte a responder dudas sobre retenciones e impuestos dominicanos (DGII) o darte un resumen financiero de tu negocio (ingresos, gastos y balances). ¿De qué te gustaría hablar hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [askCopilot, { isLoading }] = useAskCopilotMutation();

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
      // 2. Call backend Copilot API
      const res = await askCopilot({ companyId, question: userMsgText }).unwrap();

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
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: '⚠️ Ocurrió un error al procesar tu pregunta. Por favor verifica que tu clave de Gemini esté activa o intenta de nuevo.',
          timestamp: new Date(),
        },
      ]);
    }
  }

  function handleClearChat() {
    if (confirm('¿Deseas reiniciar la conversación?')) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Conversación reiniciada. ¿En qué te puedo asesorar ahora?',
          timestamp: new Date(),
        },
      ]);
    }
  }

  return (
    <Card className="border border-indigo-100 shadow-md bg-slate-50/20 max-w-4xl mx-auto h-[600px] flex flex-col overflow-hidden">
      <CardHeader className="bg-white border-b py-3 px-4 flex flex-row justify-between items-center shrink-0">
        <div>
          <CardTitle className="text-md font-bold flex items-center gap-2 text-indigo-950">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            Copiloto Fiscal y Financiero
          </CardTitle>
          <CardDescription className="text-xs">
            Asesor inteligente RAG con leyes de la DGII e información contable de tu negocio.
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearChat}
          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
          title="Reiniciar chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reiniciar
        </Button>
      </CardHeader>
      
      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-indigo-50/10 to-white">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4 text-indigo-700" />}
            </div>
            
            <div className={`p-3 rounded-lg text-xs shadow-sm border ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-none' 
                : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
            }`}>
              {msg.sender === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              ) : (
                <div className="prose prose-xs max-w-none text-slate-800 leading-relaxed">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-sm">
              <Cpu className="w-4 h-4 text-indigo-700 animate-spin" />
            </div>
            <div className="p-3 bg-white text-slate-800 border border-slate-100 rounded-lg rounded-tl-none text-xs flex items-center gap-2 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span>Consultando fuentes y analizando datos contables...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer controls & quick prompt cards */}
      <div className="p-4 bg-white border-t shrink-0 space-y-3">
        {messages.length === 1 && (
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Sugerencias rápidas:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((prompt, idx) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt.text)}
                    disabled={isLoading}
                    className="flex items-center gap-2.5 p-2 rounded-lg border bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left text-xs disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded bg-indigo-100/50 flex items-center justify-center text-indigo-700 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-slate-700 truncate">{prompt.label}</span>
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
            placeholder="Haz una consulta fiscal (ej: retención ITBIS) o financiera (ej: mis gastos de nómina)..."
            disabled={isLoading}
            className="flex-1 text-xs h-9 bg-slate-50 focus-visible:bg-white focus-visible:ring-indigo-600"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 text-xs gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar
          </Button>
        </form>
      </div>
    </Card>
  );
}
