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
import { ensurePublicUser } from "./ensure-user";
import bcrypt from "bcryptjs";

export const getAuthOptions = (req?: NextRequest | Request): AuthOptions => {
  const secret = process.env.NEXTAUTH_SECRET;

  const rawAdapter = SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }) as any;

  const adapter = {
    ...rawAdapter,
    async linkAccount(account: any) {
      const validColumns = [
        "id",
        "type",
        "provider",
        "providerAccountId",
        "refresh_token",
        "access_token",
        "expires_at",
        "token_type",
        "scope",
        "id_token",
        "session_state",
        "userId",
      ];
      const cleanAccount: any = {};
      for (const key of Object.keys(account)) {
        if (validColumns.includes(key)) {
          cleanAccount[key] = account[key];
        }
      }
      return await rawAdapter.linkAccount(cleanAccount);
    },
  };

  return {
    adapter,
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
      ...(process.env.KICK_CLIENT_ID && process.env.KICK_CLIENT_SECRET
        ? [
            {
              id: "kick",
              name: "Kick",
              type: "oauth" as const,
              version: "2.0",
              checks: ["pkce", "state"] as any,
              authorization: {
                url: "https://id.kick.com/oauth/authorize",
                params: {
                  scope: "user:read channel:read",
                  response_type: "code",
                },
              },
              token: {
                url: "https://id.kick.com/oauth/token",
                async request({ params, checks, provider }: any) {
                  const body = new URLSearchParams();
                  body.set("grant_type", "authorization_code");
                  body.set("client_id", provider.clientId as string);
                  body.set("client_secret", provider.clientSecret as string);
                  body.set("code", params.code as string);
                  if (checks?.code_verifier) {
                    body.set("code_verifier", checks.code_verifier as string);
                  }
                  body.set("redirect_uri", provider.callbackUrl as string);

                  const res = await fetch("https://id.kick.com/oauth/token", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                      Accept: "application/json",
                    },
                    body: body.toString(),
                  });

                  const data = await res.json();
                  if (!res.ok) {
                    console.error("Kick OAuth token error:", res.status, data);
                    throw new Error(data.error_description || data.message || `HTTP ${res.status}`);
                  }

                  return {
                    tokens: {
                      access_token: data.access_token,
                      token_type: data.token_type || "Bearer",
                      expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
                      refresh_token: data.refresh_token,
                      scope: data.scope,
                    },
                  };
                },
              },
              userinfo: {
                url: "https://api.kick.com/public/v1/users",
                async request({ tokens }: any) {
                  const res = await fetch("https://api.kick.com/public/v1/users", {
                    headers: {
                      Authorization: `Bearer ${tokens.access_token}`,
                      Accept: "application/json",
                    },
                  });
                  if (!res.ok) {
                    const err = await res.text();
                    console.error("Kick OAuth userinfo error:", res.status, err);
                    throw new Error(`Kick userinfo error ${res.status}`);
                  }
                  const json = await res.json();
                  return json.data?.[0] || json;
                },
              },
              clientId: process.env.KICK_CLIENT_ID,
              clientSecret: process.env.KICK_CLIENT_SECRET,
              profile(profile: any) {
                const user = profile.data?.[0] || profile;
                return {
                  id: String(user.user_id || user.id || user.name || "kick_user"),
                  name: user.name || user.username || "KickUser",
                  email: user.email || null,
                  image: user.profile_picture || user.profile_pic || null,
                };
              },
            },
          ]
        : []),
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

          // Ensure record exists in public.users
          try {
            await ensurePublicUser(user.id, { name: user.name, email: user.email, image: user.image });
          } catch (e) {
            console.warn("ensurePublicUser background error:", e);
          }
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
