import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      accessToken: string;
      currentOrganizationId: string | null;
      orgRole?: string;
      orgSlug?: string;
      orgName?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    roles: string[];
    accessToken: string;
    currentOrganizationId: string | null;
    avatarUrl?: string | null;
    orgRole?: string;
    orgSlug?: string;
    orgName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    accessToken: string;
    currentOrganizationId: string | null;
    orgRole?: string;
    orgSlug?: string;
    orgName?: string | null;
  }
}
