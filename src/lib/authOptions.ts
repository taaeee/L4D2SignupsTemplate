import { AuthOptions } from "next-auth";
import { decode, encode } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import TwitchProvider from "next-auth/providers/twitch";
import SteamProvider from "next-auth-steam";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase-admin";
import bcrypt from "bcryptjs";

export const getAuthOptions = (req?: NextRequest | Request): AuthOptions => {
  const secret = process.env.NEXTAUTH_SECRET;

  return {
    adapter: SupabaseAdapter({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }) as any,
    session: {
      strategy: "jwt",
    },
    jwt: {
      secret,
      async decode(params) {
        try {
          return await decode(params);
        } catch {
          // If cookie token is invalid/legacy JWE, return null to invalidate gracefully
          return null;
        }
      },
      async encode(params) {
        return await encode(params);
      },
    },
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Por favor ingresa tu correo y contraseña.");
          }

          const email = credentials.email.toLowerCase().trim();

          // 1. Check in next_auth.users schema
          let user: any = null;
          try {
            const { data: nextAuthUser } = await supabaseAdmin
              .schema("next_auth")
              .from("users")
              .select("*")
              .eq("email", email)
              .maybeSingle();

            if (nextAuthUser) {
              user = nextAuthUser;
            }
          } catch (e) {
            console.warn("Could not query next_auth.users:", e);
          }

          // 2. Fallback check in public.users schema if not found
          if (!user) {
            try {
              const { data: publicUser } = await supabaseAdmin
                .from("users")
                .select("*")
                .eq("email", email)
                .maybeSingle();

              if (publicUser) {
                user = publicUser;
              }
            } catch (e) {
              console.warn("Could not query public.users:", e);
            }
          }

          if (!user || !user.password_hash) {
            throw new Error("Credenciales inválidas o cuenta no registrada con contraseña.");
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            throw new Error("Correo o contraseña incorrectos.");
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image || null,
          };
        },
      }),
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      }),
      TwitchProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      }),
      SteamProvider(req as any, {
        clientSecret: process.env.STEAM_API_KEY!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback`,
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger, session }) {
        if (user) {
          token.id = user.id;
          if (user.name) token.name = user.name;
          if (user.email) token.email = user.email;
          if (user.image) token.picture = user.image;
        }
        if (trigger === "update" && session) {
          if (session.name !== undefined) token.name = session.name;
          if (session.email !== undefined) token.email = session.email;
          if (session.image !== undefined) token.picture = session.image;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user && token) {
          (session.user as any).id = token.id || token.sub;
          if (token.name) session.user.name = token.name;
          if (token.email) session.user.email = token.email;
          if (token.picture) session.user.image = token.picture;
        }
        return session;
      },
    },
    secret,
  };
};
