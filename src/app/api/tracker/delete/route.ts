import { NextResponse } from "next/server";
import { deleteApplication } from "@/app/actions/tracker";

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await deleteApplication(applicationId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
