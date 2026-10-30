import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { detectTypos, generateLogicsAiResponse } from '@/lib/logicsAi';

export const runtime = 'nodejs';

interface CacheEntry {
  reply: string;
  detectedCorrections: Array<{ original: string; corrected: string }>;
  correctedText: string;
  source: string;
  cachedAt: number;
}

const AI_CACHE_TTL_MS = 60 * 1000;
const aiResponseCache = new Map<string, CacheEntry>();

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const RATE_LIMIT_MAX = 80;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX, lastRefill: now };
    rateLimitBuckets.set(ip, bucket);
  } else if (now - bucket.lastRefill > RATE_LIMIT_WINDOW_MS) {
    bucket.tokens = RATE_LIMIT_MAX;
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return false;
  }
  return true;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. System scalability safeguard active. Please retry in a few seconds.' },
      { status: 429 }
    );
  }

  let body: {
    message?: string;
    userContext?: Parameters<typeof generateLogicsAiResponse>[1];
    systemData?: Parameters<typeof generateLogicsAiResponse>[2];
    history?: Array<{ role?: string; text?: string }>;
  } = {};

  try {
    body = await req.json();
    const { message, userContext, systemData, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const { correctedText, detectedCorrections } = detectTypos(message);
    const cacheKey = `${userContext?.email || 'user'}:${message.trim().toLowerCase()}`;
    const cached = aiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < AI_CACHE_TTL_MS) {
      return NextResponse.json({
        reply: cached.reply,
        detectedCorrections: cached.detectedCorrections,
        correctedText: cached.correctedText,
        source: `${cached.source} (cached)`,
        responseTimeMs: Date.now() - startTime
      });
    }

    const isAdmin = Boolean(
      userContext?.isAdmin ||
        userContext?.role?.toLowerCase() === 'admin' ||
        userContext?.role?.toLowerCase() === 'administrator'
    );

    const systemInstruction = `You are Logics AI, the authoritative high-speed executive AI Copilot for the ICT Performance & Reporting Management System (${systemData?.companyName || 'Organization'}).
Current Date: October 2026.
Business Timezone: ${systemData?.timezone || 'Africa/Dar_es_Salaam'}.

IDENTITY & TONE:
- Your name is Logics AI. Always introduce or sign off as Logics AI when appropriate.
- Respond immediately, crisply, and with high accuracy.
- Keep answers concise and direct so they load on time.
- Never mention, display, or guess login emails, passwords, or recovery codes.

CURRENT USER CONTEXT:
- Name: ${userContext?.fullName}
- Role: ${userContext?.role}
- Is System Admin: ${isAdmin ? 'YES' : 'NO'}
- User's Allowed Modules: ${JSON.stringify(userContext?.allowedModules || ['dashboard'])}

LIVE SYSTEM DATA:
- Total Registered Users: ${systemData?.totalUsersCount || 0}
- All Registered Users & Their Module Access:
${JSON.stringify(systemData?.usersList || [], null, 2)}
- Daily Activities Count: ${systemData?.activitiesCount || 0}
- Helpdesk Tickets Count: ${systemData?.ticketsCount || 0} (Open: ${systemData?.openTicketsCount || 0})
- Projects and operational records are available from live system data
- Strategic KPIs Count: ${systemData?.kpisCount || 0}
- Evidence Files Count: ${systemData?.evidenceCount || 0}
- Training Records: ${systemData?.trainingsCount || 0}
- Generated Reports: ${systemData?.reportsCount || 0}
- Key KPI Highlights: ${JSON.stringify(systemData?.kpiSummary || [])}

BEHAVIOR GUIDELINES:
1. TYPO & HUMAN WRITING UNDERSTANDING:
   - Understand typos (e.g. 'kpiz', 'usr', 'modul', 'asine', 'repot', 'dashbord', 'tckts').
   - If user made noticeable typos, start with: "Did you mean: '[Corrected Query]'?" or clarify what you interpreted, then provide the full answer.
2. ADMIN PRIVILEGES:
   - For Admin users, YOU MUST BE FULLY AWARE of all system details including the number of users and which modules each user is allowed to access.
   - When asked about users, permissions, module assignments, or security, list every user, their role, and the specific modules assigned to them. Do not recite passwords or login credentials.
3. FOR STANDARD USERS:
   - Guide them on their specific assigned modules, logging daily work, raising tickets, and general ICT SOPs.`;

    const ai = getGeminiClient();
    let geminiResult: string | null = null;

    if (ai) {
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      if (Array.isArray(history)) {
        history.slice(-4).forEach((h: { role?: string; text?: string }) => {
          if (h.role && h.text) {
            contents.push({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.text }]
            });
          }
        });
      }

      const userPromptText =
        detectedCorrections.length > 0
          ? `User Input: "${message}" (Detected intended query: "${correctedText}"). Please respond directly as Logics AI, noting "Did you mean '${correctedText}'?" if appropriate.`
          : message;

      contents.push({
        role: 'user',
        parts: [{ text: userPromptText }]
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3800);
      });

      const geminiPromise = ai.models
        .generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 850,
            temperature: 0.2
          }
        })
        .then((res) => res.text || null)
        .catch((err: { message?: string }) => {
          console.warn('Gemini generateContent error:', err?.message || err);
          return null;
        });

      geminiResult = await Promise.race([geminiPromise, timeoutPromise]);
    }

    const finalReply = geminiResult
      ? geminiResult
      : generateLogicsAiResponse(message, userContext || {}, systemData || {}, detectedCorrections);
    const finalSource = geminiResult ? 'Logics AI (Gemini 3.8 Flash)' : 'Logics AI Ultra-Fast Engine';

    aiResponseCache.set(cacheKey, {
      reply: finalReply,
      detectedCorrections,
      correctedText,
      source: finalSource,
      cachedAt: Date.now()
    });

    return NextResponse.json({
      reply: finalReply,
      detectedCorrections,
      correctedText,
      source: finalSource,
      responseTimeMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('Logics AI chat error:', err);
    const fallback = generateLogicsAiResponse(body?.message || '', body?.userContext || {}, body?.systemData || {}, []);
    return NextResponse.json({
      reply: fallback,
      detectedCorrections: [],
      correctedText: body?.message || '',
      source: 'Logics AI Resilient Engine',
      responseTimeMs: Date.now() - startTime
    });
  }
}
