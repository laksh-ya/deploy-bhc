"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, User, Send, Sparkles, Loader2, Mic, MicOff, AlertCircle, RefreshCw, Heart, Headphones, Volume2 } from "lucide-react";
import { useNotifications } from "@/components/notifications-provider";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Define quick queries
const quickQueries = [
  "Which hospital clients owe money?",
  "What's our best-selling medical product?",
  "Show this month's healthcare expenses",
  "Create a medical inventory report",
  "Analyze our healthcare profit trends",
  "List low-stock medical supplies",
  "Generate a client payment schedule",
  "Show sales performance by region",
];

// Speech recognition types
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}


interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
  speechSynthesis: SpeechSynthesis;
}


declare let window: Window;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatbotTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const voiceModeRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { addNotification } = useNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

  useEffect(() => {
    // Initialize welcome message
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm your AI Business Assistant for Balaji Health Care, powered by Google Gemini. I can help you with inventory management, order tracking, financial reports, client information, and much more. How can I assist you with your healthcare business today?",
      },
    ]);

    // Check for speech recognition support
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setSpeechSupported(true);
    }
    // Check for text-to-speech support (for hands-free voice mode)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true);
    }

    // Cleanup speech recognition + synthesis on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Effect for auto-scrolling to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]); // Scroll whenever messages or loading state changes

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Read an answer aloud (only in hands-free voice mode), then resume listening
  // for a natural back-and-forth conversation.
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!voiceModeRef.current) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[#*_`>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.03;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        if (voiceModeRef.current) {
          setTimeout(() => startListening(), 400);
        }
      };
      window.speechSynthesis.speak(utter);
    } catch {
      /* ignore TTS errors */
    }
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    voiceModeRef.current = next;
    if (next) {
      addNotification({
        title: "Voice mode enabled",
        message: "Hands-free: ask out loud and I'll reply by voice. Tap again to exit.",
        type: "info",
      });
      startListening();
    } else {
      stopListening();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (query: string) => {
    if (!query.trim()) return;

    // --- FIX STARTS HERE ---
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: query };

    // 1. Create the definitive history for this turn *before* any state updates.
    // This includes the previous messages and the new user message.
    const historyForApi = [...messages, userMessage];

    // 2. Prepare the AI's placeholder message.
    const assistantMessageId = Date.now().toString() + "-ai";
    const assistantPlaceholder: Message = { id: assistantMessageId, role: "assistant", content: "" };

    // 3. Update the UI with both the user's message and the AI placeholder in one single, clean update.
    setMessages([...historyForApi, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);
    setError(null);
    // --- FIX ENDS HERE ---

    // Same-origin Next.js AI route — streams plain text. Works on Vercel with
    // no separate backend (model is env-configurable: Google or Groq).
    try {
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyForApi
            .filter((msg) => msg.id !== "1") // drop the welcome message
            .map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorText || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get readable stream.");
      }

      const decoder = new TextDecoder("utf-8");
      let assistantResponseAccumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantResponseAccumulated += decoder.decode(value, { stream: true });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: assistantResponseAccumulated } : msg
          )
        );
      }

      // In hands-free mode, read the answer aloud and then listen again.
      if (assistantResponseAccumulated.trim()) {
        speak(assistantResponseAccumulated);
      }
    } catch (err: unknown) {
      console.error('Error sending message or receiving stream:', err);
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(new Error(`Failed to connect to AI service: ${errorMessage}.`));
      setMessages((prevMessages) =>
        prevMessages.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: `Error: ${errorMessage}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };


  const startListening = () => {
    // Add typeof window check for Next.js SSR compatibility
    if (!speechSupported || typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      addNotification({
        title: "Speech Recognition Not Supported",
        message: "Your browser does not support speech recognition. Please try Chrome or Edge.",
        type: "warning",
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false; // Set to false for single utterance
    recognitionRef.current.interimResults = false; // Set to false for final results only

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Immediately send message after recognition stops (if continuous is false)
      sendMessage(transcript);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => { // Corrected: Proper type for event
      console.error("Speech recognition error:", event.error);
      addNotification({
        title: "Voice Input Error",
        message: `Speech recognition error: ${event.error}. Please try again.`,
        type: "error",
      });
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);

    if (!voiceModeRef.current) {
      addNotification({
        title: "Voice Input Active",
        message: "Speak clearly into your microphone. Click the mic button again to stop.",
        type: "info",
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isListening) { // If listening, stop it first before sending
      stopListening();
    }
    sendMessage(input);
  };

  const handleRetry = () => {
    const lastUserMessage = messages.findLast((msg) => msg.role === 'user');
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content);
    } else {
      addNotification({
        title: "No Previous Message",
        message: "There is no previous user message to retry.",
        type: "warning",
      });
    }
  };

  const handleQuickQuery = (query: string) => {
    sendMessage(query);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold heading-primary">AI Assistant</h1>
            <p className="text-sm text-readable-muted">Balaji Health Care - Intelligent Business Support</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border-0"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Powered by Gemini
        </Badge>
      </div>

      {/* API Configuration Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {error.message.includes("API key")
                ? "Google AI API key not configured. Please add your GOOGLE_GENERATIVE_AI_API_KEY to environment variables."
                : "Failed to connect to AI service. Please check your configuration and try again."}
            </span>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2" aria-label="Retry connection">
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <div className="xl:col-span-3">
          <Card className="h-[500px] md:h-[600px] flex flex-col glass-card">
            <CardHeader className="border-b border-white/20 dark:border-gray-700/30">
              <CardTitle className="flex items-center justify-between heading-secondary">
                <div className="flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                  Balaji Health Care AI Assistant
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-green-500"}`}></div>
                  <span className="text-xs text-readable-muted">{error ? "Disconnected" : "Connected"}</span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[380px] md:h-[480px] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 backdrop-blur-sm ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg"
                            : "glass text-readable shadow-lg"
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {message.role === "assistant" && (
                            <Bot className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400" />
                          )}
                          {message.role === "user" && <User className="w-4 h-4 mt-0.5" />}
                          <div className="flex-1">
                            <div className="prose prose-sm dark:prose-invert max-w-full whitespace-pre-wrap">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content.replace(/\n/g, '  \n')}</ReactMarkdown>
                            </div>
                            <p
                              className={`text-xs mt-1 ${
                                message.role === "user" ? "text-red-100" : "text-readable-subtle"
                              }`}
                            >
                              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl p-3 glass text-readable shadow-lg">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" />
                          <span className="text-sm">AI is analyzing your healthcare business data...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} /> {/* For auto-scrolling */}
                </div>
              </ScrollArea>

              <div className="border-t border-white/20 dark:border-gray-700/30 p-4">
                {voiceMode && (
                  <div className="mb-2 flex items-center justify-center gap-2 text-xs text-readable-muted">
                    <span className={`inline-flex h-2 w-2 rounded-full ${isSpeaking ? "bg-blue-500 animate-pulse" : isListening ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                    {isSpeaking ? "Speaking…" : isListening ? "Listening… speak now" : "Hands-free mode active"}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="flex space-x-2">
                  <Input
                    name="prompt"
                    value={input}
                    onChange={handleInputChange}
                    placeholder={error ? "Fix API configuration to chat..." : "Ask about your healthcare business..."}
                    className="flex-1 glass-input text-readable placeholder:text-readable-subtle"
                    disabled={isLoading || !!error}
                    aria-label="Chat input"
                  />
                  {ttsSupported && speechSupported && (
                    <Button
                      type="button"
                      variant={voiceMode ? "default" : "outline"}
                      size="icon"
                      onClick={toggleVoiceMode}
                      disabled={isLoading || !!error}
                      className={`glass-button ${voiceMode ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0" : ""}`}
                      aria-label={voiceMode ? "Exit hands-free voice mode" : "Enter hands-free voice mode"}
                      title="Hands-free voice mode"
                    >
                      {voiceMode ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                    </Button>
                  )}
                  {speechSupported && (
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={toggleListening}
                      disabled={isLoading || !!error}
                      className={`glass-button ${isListening ? "animate-pulse bg-gradient-to-r from-red-500 to-pink-500 text-white border-0" : ""}`}
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg border-0"
                    disabled={isLoading || !!error}
                    aria-label="Send message"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Queries Sidebar */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg heading-secondary">Healthcare Quick Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickQueries.slice(0, 8).map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left justify-start h-auto p-3 text-sm glass-button text-readable hover:bg-red-50/50 dark:hover:bg-red-950/30 whitespace-normal break-words"
                  onClick={() => handleQuickQuery(query)}
                  disabled={isLoading || !!error}
                  style={{ whiteSpace: "normal", wordWrap: "break-word", textAlign: "left" }}
                  aria-label={`Quick query: ${query}`}
                >
                  <span className="block text-left leading-relaxed">{query}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}