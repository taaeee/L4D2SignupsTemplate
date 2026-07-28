import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import SteamProvider from "next-auth-steam";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { NextRequest } from "next/server";

export const getAuthOptions = (req?: NextRequest | Request): AuthOptions => {
  return {
    adapter: SupabaseAdapter({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }) as any,
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      }),
      SteamProvider(req as any, {
        clientSecret: process.env.STEAM_API_KEY!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
      }),
    ],
    callbacks: {
      async session({ session, user }) {
        if (session.user && user) {
          (session.user as any).id = user.id;
        }
        return session;
      },
    },
    // Esto asegura que la cookie de sesión no interfiera y funcionen correctamente
    secret: process.env.NEXTAUTH_SECRET,
  };
};
