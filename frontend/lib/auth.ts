import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { api } from "./api";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Behind a proxy (Render/Railway/etc.) Auth.js can't auto-detect the host the
  // way it does on Vercel, so trust the configured host explicitly.
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const result = await api.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });
          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.full_name,
            accessToken: result.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
});
