import { NextResponse } from "next/server";
import { updateCollege } from "@/app/actions/colleges";

export async function POST(request: Request) {
  try {
    const { id, updates } = await request.json();
    if (!id || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await updateCollege(id, updates);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
