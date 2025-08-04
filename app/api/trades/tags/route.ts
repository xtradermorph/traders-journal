import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function PATCH(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { oldTag, newTag } = await req.json();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!oldTag || !newTag) return NextResponse.json({ error: "Missing tag data" }, { status: 400 });
  const { error } = await supabase
    .from("trades")
    .update({ tags: [newTag] })
    .eq("user_id", user.id)
    .contains("tags", [oldTag]);
  if (error) {
    console.error("PATCH /api/trades/tags error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { tag } = await req.json();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!tag) return NextResponse.json({ error: "Missing tag data" }, { status: 400 });
  const { error } = await supabase
    .from("trades")
    .update({ tags: [] })
    .eq("user_id", user.id)
    .contains("tags", [tag]);
  if (error) {
    console.error("DELETE /api/trades/tags error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 