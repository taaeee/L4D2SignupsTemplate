import NextAuth from "next-auth/next";
import { AuthOptions } from "next-auth";
import { getAuthOptions } from "@/lib/authOptions";
import { NextRequest } from "next/server";

async function handler(req: NextRequest, ctx: any) {
  return NextAuth(getAuthOptions(req))(req, ctx);
}

export { handler as GET, handler as POST };
