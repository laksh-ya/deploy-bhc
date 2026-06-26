import { google } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { streamText, type CoreMessage } from "ai"
import { buildSystemPrompt, localAnswer } from "@/lib/ai-context"

// Allow streaming responses up to 30s (Vercel serverless friendly).
export const maxDuration = 30

// --- Model configuration (all env-driven, switchable without code changes) ---
// AI_PROVIDER:        "google" (default) | "groq"
// GOOGLE_CHAT_MODEL:  e.g. "gemini-2.0-flash", "gemini-2.5-flash", "gemma-3-1b-it"
// GROQ_CHAT_MODEL:    e.g. "llama-3.3-70b-versatile", "gemma2-9b-it"
const AI_PROVIDER = (process.env.AI_PROVIDER || "google").toLowerCase()
const GOOGLE_CHAT_MODEL = process.env.GOOGLE_CHAT_MODEL || "gemini-2.0-flash"
const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile"

const hasGoogle = () => !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
const hasGroq = () => !!process.env.GROQ_API_KEY

/** Choose a model honouring AI_PROVIDER, falling back to whichever key exists. */
function resolveModel() {
  const groq = hasGroq() ? createGroq({ apiKey: process.env.GROQ_API_KEY }) : null

  if (AI_PROVIDER === "groq" && groq) return { model: groq(GROQ_CHAT_MODEL), provider: "groq" as const }
  if (AI_PROVIDER === "google" && hasGoogle())
    return { model: google(GOOGLE_CHAT_MODEL), provider: "google" as const }
  if (hasGoogle()) return { model: google(GOOGLE_CHAT_MODEL), provider: "google" as const }
  if (groq) return { model: groq(GROQ_CHAT_MODEL), provider: "groq" as const }
  return null
}

/** Stream a plain string as a text/plain ReadableStream (no-key fallback). */
function streamString(text: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const words = text.split(" ")
      for (let i = 0; i < words.length; i++) {
        controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? " " : "")))
        // Small delay so it feels like live token streaming.
        await new Promise((r) => setTimeout(r, 12))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

export async function POST(req: Request) {
  let messages: CoreMessage[] = []
  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
  } catch {
    return new Response("Invalid request body.", { status: 400 })
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const question = typeof lastUser?.content === "string" ? lastUser.content : ""

  const chosen = resolveModel()

  // No API key configured anywhere → answer locally from the dataset so the
  // assistant still works in a pure frontend deployment.
  if (!chosen) {
    return streamString(localAnswer(question))
  }

  try {
    const result = streamText({
      model: chosen.model,
      system: buildSystemPrompt(),
      messages,
      temperature: 0.6,
      maxTokens: 1500,
    })
    return result.toTextStreamResponse()
  } catch (err) {
    console.error(`[chat] ${chosen.provider} failed, using local fallback:`, err)
    return streamString(localAnswer(question))
  }
}
