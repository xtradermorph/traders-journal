import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export const runtime = "edge";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { trades } = await req.json();
    
    if (!trades || trades.length < 5) {
      return NextResponse.json({ 
        behavioralPatterns: [],
        psychologicalInsights: "Not enough trading data to analyze behavioral patterns.",
        actionableSteps: ["Add more trades to get a comprehensive behavioral analysis"]
      });
    }

    // Use OpenAI only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        behavioralPatterns: [],
        psychologicalInsights: "AI analysis not available. Please contact support to enable AI features.",
        actionableSteps: ["Contact support to enable AI behavioral analysis"]
      });
    }

    const prompt = `You are a professional trading psychologist. Analyze the following trading data to identify behavioral patterns and psychological insights.

Trading Data:
${trades.map((t: Record<string, unknown>) => `Date: ${t.date}, Pair: ${t.currency_pair}, Type: ${t.trade_type}, P/L: ${t.profit_loss}, Entry: ${t.entry_price}, Exit: ${t.exit_price}, Duration: ${t.duration || 'N/A'}`).join("\n")}

Please provide a JSON response with the following structure:
{
  "behavioralPatterns": ["pattern1", "pattern2", "pattern3"],
  "psychologicalInsights": "detailed psychological analysis text",
  "actionableSteps": ["step1", "step2", "step3"]
}

Focus on:
- Emotional decision-making patterns
- Risk-taking behavior
- Consistency in trading approach
- Psychological biases
- Specific behavioral improvements`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful trading psychologist. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.6,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error("OpenAI API error:", err);
      
      // Handle rate limiting and quota exceeded
      if (err.error?.code === 'rate_limit_exceeded' || err.error?.code === 'quota_exceeded') {
        return NextResponse.json({ 
          behavioralPatterns: [],
          psychologicalInsights: "AI analysis temporarily unavailable due to rate limits. Please try again later or contact support to upgrade your plan.",
          actionableSteps: ["Try again later or contact support to upgrade your plan"]
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
    console.error("Trading behavior analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 