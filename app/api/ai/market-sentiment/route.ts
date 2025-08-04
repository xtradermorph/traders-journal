import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { currencyPair } = await req.json();
    
    if (!currencyPair) {
      return NextResponse.json({ error: "Currency pair is required" }, { status: 400 });
    }

    // Use OpenAI only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        sentiment: "neutral",
        score: 0,
        analysis: "AI analysis not available. Please contact support to enable AI features.",
        factors: ["Contact support to enable AI market sentiment analysis"]
      });
    }

    const prompt = `You are a professional forex market analyst. Provide a market sentiment analysis for ${currencyPair}.

Please provide a JSON response with the following structure:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": number (-100 to 100, where -100 is extremely bearish, 0 is neutral, 100 is extremely bullish),
  "analysis": "detailed market sentiment analysis text",
  "factors": ["factor1", "factor2", "factor3"]
}

Consider:
- Current market conditions
- Technical analysis factors
- Fundamental factors
- Market psychology
- Recent price action`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful forex market analyst. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.6,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error("OpenAI API error:", err);
      
      // Handle rate limiting and quota exceeded
      if (err.error?.code === 'rate_limit_exceeded' || err.error?.code === 'quota_exceeded') {
        return NextResponse.json({ 
          sentiment: "neutral",
          score: 0,
          analysis: "AI analysis temporarily unavailable due to rate limits. Please try again later or contact support to upgrade your plan.",
          factors: ["Try again later or contact support to upgrade your plan"]
        });
      }
      
      return NextResponse.json({ error: err.error?.message || "AI analysis failed" }, { status: 500 });
    }

    const openaiData = await openaiRes.json();
    const responseText = openaiData.choices?.[0]?.message?.content || "{}";
    
    try {
      const analysis = JSON.parse(responseText);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }
  } catch (error) {
    console.error("Market sentiment analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 