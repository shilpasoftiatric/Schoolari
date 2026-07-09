import { NextResponse } from "next/server";
import { addCollege } from "@/app/actions/colleges";

export async function POST(request: Request) {
  try {
    const { collegeName, deadline } = await request.json();
    if (!collegeName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await addCollege(collegeName, deadline);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
