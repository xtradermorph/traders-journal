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
    const { trades } = await req.json();
    
    if (!trades || trades.length === 0) {
      return NextResponse.json({ analysis: "Not enough trading data to analyze patterns." });
    }

    // Use OpenAI only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        analysis: "AI analysis not available. Please contact support to enable AI features." 
      });
    }

    const prompt = `You are a professional trading analyst. Analyze the following trading data and provide insights on patterns, strengths, weaknesses, and actionable recommendations.

Trading Data:
${trades.map((t: Record<string, unknown>) => `Date: ${t.date}, Pair: ${t.currency_pair}, Type: ${t.trade_type}, P/L: ${t.profit_loss}, Tags: ${t.tags || "-"}`).join("\n")}

Please provide a comprehensive analysis including:
1. Key patterns identified
2. Strengths in the trading approach
3. Areas for improvement
4. Specific actionable recommendations

Format the response in markdown with clear sections.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful trading performance analyst." },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error("OpenAI API error:", err);
      
      // Handle rate limiting and quota exceeded
      if (err.error?.code === 'rate_limit_exceeded' || err.error?.code === 'quota_exceeded') {
        return NextResponse.json({ 
          analysis: "AI analysis temporarily unavailable due to rate limits. Please try again later or contact support to upgrade your plan." 
        });
      }
      
      return NextResponse.json({ error: err.error?.message || "AI analysis failed" }, { status: 500 });
    }

    const openaiData = await openaiRes.json();
    const analysis = openaiData.choices?.[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Trading pattern analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 