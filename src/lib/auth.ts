import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: process.env.AZURE_AD_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`
        : undefined,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const entraProfile = profile as Record<string, unknown>;
        token.groups = Array.isArray(entraProfile["groups"])
          ? (entraProfile["groups"] as string[])
          : [];
        token.entraOid = typeof entraProfile["oid"] === "string" ? entraProfile["oid"] : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      const groups = Array.isArray(token.groups) ? (token.groups as string[]) : [];
      const adminGroupId = process.env.ADMIN_GROUP_ID ?? "";

      session.user.id = token.sub ?? "";
      session.user.groups = groups;
      session.user.isAdmin = adminGroupId.length > 0 && groups.includes(adminGroupId);

      // Persist entraGroups to DB so token-based auth (MCP proxy) can resolve them
      if (session.user.id && groups.length >= 0) {
        void prisma
          .user
          .updateMany({
            where: { id: session.user.id },
            data: { entraGroups: groups },
          })
          .catch(() => undefined);
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
