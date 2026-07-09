import { NextResponse } from "next/server";
import { updateApplicationStatus } from "@/app/actions/tracker";

export async function POST(request: Request) {
  try {
    const { applicationId, status } = await request.json();
    if (!applicationId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await updateApplicationStatus(applicationId, status);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
