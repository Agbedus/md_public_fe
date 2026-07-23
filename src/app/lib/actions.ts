'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', { ...Object.fromEntries(formData), redirectTo: '/dashboard' });
  } catch (error) {
    if ((error as any).message === 'NEXT_REDIRECT' || (error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong during authentication.';
      }
    }
    
    console.error("Unhandled authenticate error:", error);
    return 'An unexpected error occurred. Please try again.';
  }
}

export async function authenticateWithDetail(
  prevState: { error?: string; needsVerification?: boolean; email?: string } | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.', needsVerification: false };
  }

  try {
    const checkRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });

    if (!checkRes.ok) {
      const errorText = await checkRes.text();
      let detail = '';
      try {
        const errorJson = JSON.parse(errorText);
        detail = (errorJson.detail || '').toLowerCase();
      } catch { detail = errorText.toLowerCase(); }

      if (detail.includes('verified') || detail.includes('verify')) {
        return {
          error: 'Your email has not been verified yet. Please check your inbox for the verification code.',
          needsVerification: true,
          email,
        };
      }
      return { error: 'Invalid credentials.', needsVerification: false };
    }

    await signIn('credentials', { email, password, redirectTo: '/dashboard' });

    return { error: undefined, needsVerification: false };
  } catch (error) {
    if ((error as any)?.message === 'NEXT_REDIRECT' || (error as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    if (error instanceof AuthError) {
      return { error: 'Invalid credentials.', needsVerification: false };
    }

    console.error("Unhandled authenticate error:", error);
    return { error: 'An unexpected error occurred. Please try again.', needsVerification: false };
  }
}

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    orgAction: z.string().optional(),
    orgName: z.string().optional(),
    orgSlug: z.string().optional(),
    orgIndustry: z.string().optional(),
    orgCompanySize: z.string().optional(),
    orgWebsite: z.string().optional(),
    orgCountry: z.string().optional(),
    orgPhone: z.string().optional(),
    inviteCode: z.string().optional(),
});

export async function register(prevState: string | undefined, formData: FormData) {
    const raw = Object.fromEntries(formData);
    const validatedFields = RegisterSchema.safeParse(raw);

    if (!validatedFields.success) {
        return "Invalid fields";
    }

    const { email, password, fullName, phone, jobTitle, orgAction, orgName, orgSlug, orgIndustry, orgCompanySize, orgWebsite, orgCountry, orgPhone, inviteCode } = validatedFields.data;

    const body: Record<string, string> = {
        email,
        password,
        full_name: fullName,
    };

    if (phone) body.phone = phone;
    if (jobTitle) body.job_title = jobTitle;

    if (orgAction) body.org_action = orgAction;
    if (orgAction === "create") {
        if (orgName) body.org_name = orgName;
        if (orgSlug) body.org_slug = orgSlug;
        if (orgIndustry) body.org_industry = orgIndustry;
        if (orgCompanySize) body.org_company_size = orgCompanySize;
        if (orgWebsite) body.org_website = orgWebsite;
        if (orgCountry) body.org_country = orgCountry;
        if (orgPhone) body.org_phone = orgPhone;
    } else if (orgAction === "join") {
        if (inviteCode) body.invite_code = inviteCode;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Registration failed:", errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                return errorJson.detail || "Registration failed";
            } catch {
                return "Registration failed. Please try again.";
            }
        }

        return "Verification code sent";
        
    } catch (error) {
        console.error("Registration error:", error);
        return "Network error during registration";
    }
}

const VerifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});

export async function verifyOtp(formData: FormData) {
    const raw = Object.fromEntries(formData);
    const validatedFields = VerifyOtpSchema.safeParse(raw);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid OTP format" };
    }

    const { email, otp } = validatedFields.data;

    const body: Record<string, any> = { email, otp };

    const pendingOrgStr = raw._pendingOrg as string | undefined;
    if (pendingOrgStr) {
        try {
            const pendingOrg = JSON.parse(pendingOrgStr);
            if (pendingOrg.orgAction === "create") {
                body.org_action = "create";
                body.org_name = pendingOrg.orgName;
                if (pendingOrg.orgSlug) body.org_slug = pendingOrg.orgSlug;
                if (pendingOrg.orgIndustry) body.org_industry = pendingOrg.orgIndustry;
                if (pendingOrg.orgCompanySize) body.org_company_size = pendingOrg.orgCompanySize;
                if (pendingOrg.orgWebsite) body.org_website = pendingOrg.orgWebsite;
                if (pendingOrg.orgCountry) body.org_country = pendingOrg.orgCountry;
                if (pendingOrg.orgPhone) body.org_phone = pendingOrg.orgPhone;
            } else if (pendingOrg.orgAction === "join") {
                body.org_action = "join";
                body.invite_code = pendingOrg.inviteCode;
            }
        } catch {}
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("OTP verification failed:", errorText);
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.detail || "Verification failed" };
            } catch {
                return { success: false, error: "Verification failed" };
            }
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("Verify OTP error:", error);
        return { success: false, error: "Network error" };
    }
}

export async function resendOtp(email: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.detail || "Failed to resend code" };
            } catch {
                return { success: false, error: "Failed to resend code" };
            }
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("Resend OTP error:", error);
        return { success: false, error: "Network error" };
    }
}

export async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'GET' });
    } catch {}
    await signOut({ redirectTo: '/' });
}
