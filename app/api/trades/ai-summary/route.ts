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

  let mode = "tags";
  try {
    const body = await req.json();
    if (body && body.mode === "strategy") mode = "strategy";
  } catch {}

  // Fetch user's trades with tags and performance fields
  const { data: trades, error } = await supabase
    .from("trades")
    .select("id, date, currency_pair, trade_type, profit_loss, tags")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trades || trades.length === 0) return NextResponse.json({ summary: "No trades found to analyze." });

  let prompt = "";
  if (mode === "strategy") {
    prompt = `You are a trading performance coach AI. Given the following trade records, analyze the user's trading strengths, weaknesses, and provide actionable, specific strategy improvement tips.\n\nTrades:\n${trades.map(t => `Date: ${t.date}, Pair: ${t.currency_pair}, Type: ${t.trade_type}, P/L: ${t.profit_loss}, Tag: ${t.tags || "-"}`).join("\n")}\n\nActionable Insights:`;
  } else {
    prompt = `You are a trading performance analyst AI. Given the following trade records with tags, analyze the tag-trade relations, tag performance, and provide actionable insights.\n\nTrades:\n${trades.map(t => `Date: ${t.date}, Pair: ${t.currency_pair}, Type: ${t.trade_type}, P/L: ${t.profit_loss}, Tag: ${t.tags || "-"}`).join("\n")}\n\nSummary:`;
  }

  // Call OpenAI API
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OpenAI API key not set." }, { status: 500 });
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: mode === "strategy" ? "You are a helpful trading performance coach." : "You are a helpful trading performance analyst." },
        { role: "user", content: prompt },
      ],
      max_tokens: 350,
      temperature: 0.7,
    }),
  });
  if (!openaiRes.ok) {
    const err = await openaiRes.json();
    console.error("OpenAI API error:", err);
    return NextResponse.json({ error: err.error?.message || "OpenAI API error" }, { status: 500 });
  }
  const openaiData = await openaiRes.json();
  const summary = openaiData.choices?.[0]?.message?.content || "No summary generated.";
  return NextResponse.json({ summary });
} 