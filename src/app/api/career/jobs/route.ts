import { NextResponse } from "next/server";
import { getJobsAndInternships } from "@/app/actions/career";

export async function GET() {
  try {
    const jobs = await getJobsAndInternships();
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load jobs" }, { status: 500 });
  }
}
