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
  Minimize2,
  Square
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  {
    icon: TrendingUp,
    label: 'Resumen de Ingresos',
    text: '¿Podrías darme un resumen de los ingresos y gastos registrados en este período?',
  },
  {
    icon: Landmark,
    label: 'Bancos',
    text: '¿Cuáles son los saldos actuales en libros de nuestras cuentas de banco y caja?',
  },
  {
    icon: FileText,
    label: 'Retención ITBIS',
    text: '¿Cuál es la tasa de retención del ITBIS aplicable cuando contratamos servicios profesionales a personas físicas?',
  },
  {
    icon: HelpCircle,
    label: 'RST DGII',
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
      text: '¡Hola! Soy tu **Asistente Fiscal y Financiero de CMHub**. Puedo ayudarte a responder dudas sobre retenciones e impuestos dominicanos (DGII) o darte un resumen financiero de tu negocio en tiempo real. ¿En qué te puedo colaborar hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef<any>(null);
  
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
      // 2. Call backend Copilot API with abort handle
      const query = askCopilot({ companyId, question: userMsgText });
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
            text: '⏹️ *Generación de respuesta detenida por el usuario.*',
            timestamp: new Date(),
          },
        ]);
      } else {
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
  }

  function handleStopGenerating() {
    if (activeQueryRef.current) {
      activeQueryRef.current.abort();
      activeQueryRef.current = null;
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
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 group">
        {!isOpen && (
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl text-xs font-semibold whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600 animate-pulse" />
            <span>Asistente IA</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Asistente IA"
          className={`rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 outline-none ${
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
              ? 'inset-0 md:inset-6 max-w-5xl mx-auto h-full md:h-[calc(100vh-3rem)] rounded-none md:rounded-2xl' 
              : 'inset-0 md:inset-auto md:bottom-20 md:right-6 w-full md:w-[440px] h-full md:h-[590px] rounded-none md:rounded-2xl'
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
                  {isLoading ? (
                    <Button
                      type="button"
                      onClick={handleStopGenerating}
                      className="h-10 px-3 rounded-xl shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1 font-semibold animate-in fade-in"
                      title="Detener respuesta de la IA"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Detener
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim()}
                      className="w-10 h-10 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      title="Enviar consulta"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
