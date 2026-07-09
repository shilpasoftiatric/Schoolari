import { NextResponse } from "next/server";
import { deleteDocument } from "@/app/actions/documents";

export async function POST(request: Request) {
  try {
    const { id, fileUrl } = await request.json();
    if (!id || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await deleteDocument(id, fileUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
