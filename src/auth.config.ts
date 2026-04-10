import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const ALLOWED_DOMAINS = ["thoughtlab.studio"];
const DEV_EMAILS: string[] = ["connormcd98@gmail.com"];

function isAllowedEmail(email: string): boolean {
  if (process.env.NODE_ENV === "development" && DEV_EMAILS.includes(email)) {
    return true;
  }
  const domain = email.split("@")[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    signIn({ user }) {
      if (!user.email || !isAllowedEmail(user.email)) {
        return false;
      }
      return true;
    },
    // Read role from JWT so proxy can check it (written by src/auth.ts jwt callback)
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.role) {
        session.user.role = token.role as "ADMIN" | "EMPLOYEE";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
