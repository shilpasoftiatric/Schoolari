import { NextResponse } from "next/server";
import { updateCareerInterests } from "@/app/actions/career";

export async function POST(request: Request) {
  try {
    const { interests } = await request.json();
    if (!interests) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await updateCareerInterests(interests);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
