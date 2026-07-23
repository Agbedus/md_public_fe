import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export const { auth, signIn, signOut, handlers: { GET, POST } } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Fast Dash",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${API_BASE_URL}/auth/login`, {
              method: 'POST',
              body: formData,
              // Set a reasonable timeout if your fetch implementation supports it, 
              // or just rely on the logging to identify slowness.
            });

            if (!res.ok) {
                const errorBody = await res.text();
                console.error(`Login API failed for ${email} with status ${res.status}:`, errorBody);
                return null;
            }

            const data = await res.json();
            
            // Fetch user profile
            const userRes = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });

            if (userRes.ok) {
                const userProfileData = await userRes.json();
                
                // Robustly handle if the profile is returned as an array or object
                const userProfile = Array.isArray(userProfileData) 
                  ? userProfileData[0] 
                  : userProfileData;

                if (!userProfile || !userProfile.id) {
                    console.error("Invalid user profile response structure:", userProfileData);
                    return null;
                }

                const currentOrg = userProfile.current_organization || null;

                let currentOrgId = currentOrg?.id ||
                  data.current_organization_id || 
                  userProfile.current_organization_id || 
                  userProfile.organization_id || 
                  userProfile.org_id || 
                  userProfile.default_organization_id || 
                  (Array.isArray(userProfile.organizations) && userProfile.organizations[0]?.id) || 
                  null;

                let orgSlug = currentOrg?.slug || null;
                let orgRole = currentOrg?.role || null;
                let orgName = currentOrg?.name || null;

                if (!currentOrgId && data.access_token) {
                  try {
                    const orgRes = await fetch(`${API_BASE_URL}/organizations`, {
                      headers: { 'Authorization': `Bearer ${data.access_token}` }
                    });
                    if (orgRes.ok) {
                      const orgData = await orgRes.json();
                      const orgList = Array.isArray(orgData) 
                        ? orgData 
                        : (orgData.items || orgData.data || orgData.organizations || []);
                      if (orgList.length > 0) {
                        const firstOrg = orgList[0];
                        currentOrgId = firstOrg.id || firstOrg.organization_id || firstOrg._id || null;
                        if (!orgSlug) orgSlug = firstOrg.slug || null;
                        if (!orgName) orgName = firstOrg.name || null;
                        if (!orgRole && firstOrg.membership) orgRole = firstOrg.membership.role || null;
                      }
                    }
                  } catch (e) {
                    console.error("Error auto-fetching organization at auth:", e);
                  }
                }

                return {
                    id: userProfile.id,
                    name: userProfile.full_name,
                    email: userProfile.email,
                    image: userProfile.avatar_url || userProfile.image,
                    roles: userProfile.roles || ['staff'],
                    accessToken: data.access_token,
                    currentOrganizationId: currentOrgId,
                    orgRole,
                    orgSlug,
                    orgName,
                };
            }
            
            const profileError = await userRes.text();
            console.error(`Failed to fetch user profile for ${email}:`, profileError);
            return null;
          } catch (error) {
            console.error("Authentication exception:", error);
            return null;
          }
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
                token.accessToken = user.accessToken;
                token.currentOrganizationId = user.currentOrganizationId;
                if (user.orgRole) token.orgRole = user.orgRole;
                if (user.orgSlug) token.orgSlug = user.orgSlug;
                if (user.orgName) token.orgName = user.orgName;
            }

            if (trigger === "update" && session) {
                if (session.currentOrganizationId !== undefined) {
                    token.currentOrganizationId = session.currentOrganizationId;
                }
                token = { ...token, ...session };
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.roles = token.roles as string[];
                session.user.accessToken = token.accessToken as string;
                session.user.currentOrganizationId = token.currentOrganizationId as string | null;
                session.user.orgRole = token.orgRole as string | undefined;
                session.user.orgSlug = token.orgSlug as string | undefined;
                session.user.orgName = token.orgName as string | null | undefined;
            }
            return session;
        }
    }
});
