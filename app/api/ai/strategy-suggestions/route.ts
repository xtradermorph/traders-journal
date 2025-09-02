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
    const { performance } = await req.json();
    
    if (!performance) {
      return NextResponse.json({ suggestions: "Not enough performance data to generate strategy suggestions." });
    }

    // Use OpenAI only
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        suggestions: "AI analysis not available. Please contact support to enable AI features." 
      });
    }

    const prompt = `You are a professional trading strategist. Based on the following performance data, provide strategic suggestions for improvement.

Performance Data:
${JSON.stringify(performance, null, 2)}

Please provide a comprehensive analysis with specific strategy suggestions including:
1. Current strategy assessment
2. Identified weaknesses
3. Specific strategy improvements
4. Risk management enhancements
5. Entry/exit optimization suggestions

Format the response in markdown with clear sections and actionable recommendations.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful trading strategist." },
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
          suggestions: "AI analysis temporarily unavailable due to rate limits. Please try again later or contact support to upgrade your plan." 
        });
      }
      
      return NextResponse.json({ error: err.error?.message || "AI analysis failed" }, { status: 500 });
    }

    const openaiData = await openaiRes.json();
    const suggestions = openaiData.choices?.[0]?.message?.content || "No suggestions generated.";

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Strategy suggestions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 