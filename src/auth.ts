import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { authConfig } from "@/auth.config";
import type { Role } from "@/generated/prisma/client";

const DEFAULT_ANNUAL_ALLOWANCE = 20;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // On first sign-in, set userId from the newly created user
      if (user?.id) {
        token.userId = user.id;
      }

      // Always fetch role from DB to pick up promotions (e.g. createUser event)
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { role: true },
        });
        if (dbUser) {
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
