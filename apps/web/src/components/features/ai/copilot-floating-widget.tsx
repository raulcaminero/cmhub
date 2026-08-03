'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAskCopilotMutation } from '@/services/tax-copilot.api';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Send, 
  User, 
  Loader2,
  Trash2,
  TrendingUp,
  Landmark,
  FileText,
  HelpCircle,
  X,
  Bot,
  Maximize2,
  Minimize2
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

export function CopilotFloatingWidget() {
  const activeCompany = useAppSelector((state) => state.company.active);
  const companyId = activeCompany?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Soy tu **Asistente Fiscal y Financiero**. Puedo ayudarte a responder dudas sobre retenciones e impuestos dominicanos (DGII) o darte un resumen financiero de tu negocio en tiempo real. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [askCopilot, { isLoading }] = useAskCopilotMutation();

  // Listen for custom global event to toggle Copilot widget (e.g. from Header button)
  useEffect(() => {
    function handleToggleEvent() {
      setIsOpen((prev) => !prev);
    }
    window.addEventListener('toggle-copilot-widget', handleToggleEvent);
    return () => window.removeEventListener('toggle-copilot-widget', handleToggleEvent);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  async function handleSendMessage(textToSend: string) {
    if (!textToSend.trim() || isLoading || !companyId) return;

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
          text: '⚠️ **Ocurrió un error al consultar al Asistente.** Por favor verifica tu conexión o intenta nuevamente.',
          timestamp: new Date(),
        },
      ]);
    }
  }

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Historial reiniciado. ¿En qué más puedo ayudarte?',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border shadow-lg text-xs font-semibold text-foreground animate-in fade-in slide-in-from-right-2 duration-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>Asistente IA</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Asistente IA"
          className={`w-13 h-13 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 outline-none ${
            isOpen 
              ? 'bg-slate-800 text-white rotate-90 dark:bg-slate-700' 
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white ring-4 ring-indigo-500/20'
          }`}
          style={{ width: '52px', height: '52px' }}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Sparkles className="w-6 h-6 animate-pulse" />
          )}
        </button>
      </div>

      {/* Floating Drawer/Card Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 bg-card text-card-foreground border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isMaximized 
              ? 'inset-3 sm:inset-6 max-w-5xl mx-auto h-[calc(100vh-3rem)] rounded-2xl' 
              : 'bottom-22 right-6 w-[calc(100vw-3rem)] sm:w-[440px] h-[590px] max-h-[calc(100vh-7rem)] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5 text-white">
                  Asistente Fiscal & Financiero
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-full border border-indigo-400/20 font-medium">IA</span>
                </h3>
                <p className="text-[11px] text-indigo-200/80">Leyes DGII + Datos de tu negocio en tiempo real</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restaurar tamaño" : "Pantalla completa"}
                className="p-1.5 text-indigo-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClearHistory}
                title="Limpiar conversación"
                className="p-1.5 text-indigo-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Cerrar"
                className="p-1.5 text-indigo-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!companyId ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Por favor selecciona una empresa activa para consultar al Asistente IA.
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-slate-50/50 dark:bg-slate-950/40">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-sm">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-primary text-primary-foreground rounded-br-none shadow-sm'
                            : 'bg-card border text-card-foreground rounded-bl-none shadow-sm'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        )}
                        <span className={`block text-[10px] mt-1.5 opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-card border rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      Analizando leyes DGII y datos financieros...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Pills */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 border-t bg-card flex gap-1.5 overflow-x-auto scrollbar-none">
                  {QUICK_PROMPTS.map((prompt, idx) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt.text)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-muted text-[11px] font-medium whitespace-nowrap transition-colors text-foreground shrink-0"
                      >
                        <Icon className="w-3 h-3 text-indigo-500" />
                        {prompt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t bg-card shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Haz una pregunta financiera o fiscal..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="text-xs h-10 rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="w-10 h-10 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
