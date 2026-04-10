import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { authConfig } from "@/auth.config";
import type { Role } from "@/generated/prisma/client";

const ADMIN_EMAILS = ["connormcd98@gmail.com", "admin@thoughtlab.studio"];
const DEFAULT_ANNUAL_ALLOWANCE = 20;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email && ADMIN_EMAILS.includes(user.email)) {
        await prisma.user.update({
          where: { id: user.id! },
          data: { role: "ADMIN" },
        });
      }

      // Create leave balance for the current year if one doesn't exist
      if (user.id) {
        const currentYear = new Date().getFullYear();
        const existing = await prisma.leaveBalance.findUnique({
          where: { userId_year: { userId: user.id, year: currentYear } },
        });
        if (!existing) {
          await prisma.leaveBalance.create({
            data: {
              userId: user.id,
              year: currentYear,
              annualAllowance: DEFAULT_ANNUAL_ALLOWANCE,
              usedDays: 0,
              carriedOver: 0,
            },
          });
        }
      }
    },
  },
});
