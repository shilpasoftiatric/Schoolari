import { NextResponse } from "next/server";
import { saveResume } from "@/app/actions/career";

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await saveResume(content);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
