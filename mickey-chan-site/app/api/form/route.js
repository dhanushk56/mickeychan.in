import { NextResponse } from "next/server";
import { getFormConfig } from "@/lib/form-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getFormConfig());
}
