import { NextResponse } from "next/server";
import { optimizeResumeBullet } from "@/app/actions/ai";

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    if (!description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await optimizeResumeBullet(description);
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
