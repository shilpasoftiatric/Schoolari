import { NextResponse } from "next/server";
import { uploadDocumentAction } from "@/app/actions/documents";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await uploadDocumentAction(formData);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}
