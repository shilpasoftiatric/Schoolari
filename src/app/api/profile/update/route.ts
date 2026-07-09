import { NextResponse } from "next/server";
import { updateProfile } from "@/app/actions/profile";

export async function POST(request: Request) {
  try {
    const { updates } = await request.json();
    if (!updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await updateProfile(updates);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
