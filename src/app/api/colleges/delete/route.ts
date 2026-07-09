import { NextResponse } from "next/server";
import { deleteCollege } from "@/app/actions/colleges";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await deleteCollege(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
