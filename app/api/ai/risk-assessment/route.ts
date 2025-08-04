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
      return NextResponse.json({ 
        riskScore: 50,
        riskLevel: 'moderate',
        analysis: "Not enough trading data to analyze risk profile.",
        recommendations: ["Add more trades to get a comprehensive risk assessment"]
      });
    }

    // Use OpenAI only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        riskScore: 50,
        riskLevel: 'moderate',
        analysis: "AI analysis not available. Please contact support to enable AI features.",
        recommendations: ["Contact support to enable AI risk assessment"]
      });
    }

    const prompt = `You are a professional risk management analyst. Analyze the following trading data and provide a comprehensive risk assessment.

Trading Data:
${trades.map((t: Record<string, unknown>) => `Date: ${t.date}, Pair: ${t.currency_pair}, Type: ${t.trade_type}, P/L: ${t.profit_loss}, Lot Size: ${t.lot_size}, Stop Loss: ${t.stop_loss}, Take Profit: ${t.take_profit}`).join("\n")}

Please provide a JSON response with the following structure:
{
  "riskScore": number (1-100),
  "riskLevel": "low" | "moderate" | "high" | "extreme",
  "analysis": "detailed risk analysis text",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Focus on:
- Position sizing consistency
- Risk-to-reward ratios
- Stop-loss discipline
- Overall risk exposure
- Specific recommendations for improvement`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful risk management analyst. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.5,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error("OpenAI API error:", err);
      
      // Handle rate limiting and quota exceeded
      if (err.error?.code === 'rate_limit_exceeded' || err.error?.code === 'quota_exceeded') {
        return NextResponse.json({ 
          riskScore: 50,
          riskLevel: 'moderate',
          analysis: "AI analysis temporarily unavailable due to rate limits. Please try again later or contact support to upgrade your plan.",
          recommendations: ["Try again later or contact support to upgrade your plan"]
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
    console.error("Risk assessment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 