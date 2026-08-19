'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { updateTag } from 'next/cache';
import { z } from 'zod';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

function safeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const callbackUrl = safeRedirectPath(formData.get('callbackUrl'));

  try {
    await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirect: false,
    });
  } catch (error) {
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

  redirect(callbackUrl);
}

export async function authenticateWithDetail(
  prevState: { error?: string; needsVerification?: boolean; email?: string } | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const callbackUrl = safeRedirectPath(formData.get('callbackUrl'));
  const invitationToken = typeof formData.get('invitationToken') === 'string'
    ? String(formData.get('invitationToken')).trim()
    : '';
  let destination = callbackUrl;

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

    const loginData = await checkRes.json().catch(() => ({}));
    const accessToken = loginData.access_token as string | undefined;

    if (invitationToken) {
      if (!accessToken) {
        return { error: 'Sign-in succeeded, but the workspace invitation could not be verified.', needsVerification: false };
      }

      const acceptance = await fetch(
        `${API_BASE_URL}/invitations/accept/${encodeURIComponent(invitationToken)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        },
      );
      const acceptanceBody = await acceptance.json().catch(() => ({}));
      if (!acceptance.ok) {
        return {
          error: acceptanceBody.detail || 'We could not add you to that workspace. Please open the invitation again.',
          needsVerification: false,
        };
      }

      if (acceptanceBody.slug) {
        destination = `/${acceptanceBody.slug}/dashboard`;
      }
      updateTag('organizations');
    }

    // Auth.js now signs in after invitation acceptance, so its JWT snapshots
    // the newly selected organization instead of the user's previous one.
    // Keeping that redirect inside this action's error boundary is brittle and can
    // make Next.js report an "unexpected response" instead of navigating. Finish
    // the sign-in first, then redirect explicitly after the try/catch below.
    await signIn('credentials', { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid credentials.', needsVerification: false };
    }

    console.error("Unhandled authenticate error:", error);
    return { error: 'An unexpected error occurred. Please try again.', needsVerification: false };
  }

  redirect(destination);
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
    invitationToken: z.string().optional(),
    referralCode: z.string().optional(),
    shareClickId: z.string().optional(),
    // FormData values are always strings — the form only ever sends "true"
    // once the checkbox is checked, so this doubles as the "must agree"
    // check. The backend re-validates this independently (UserRegister
    // rejects agreed_to_terms=false) so a direct API call can't skip it.
    agreedToTerms: z.literal("true", { message: "You must agree to the Terms of Use and Privacy Policy" }),
});

export async function register(prevState: string | undefined, formData: FormData) {
    const raw = Object.fromEntries(formData);
    const validatedFields = RegisterSchema.safeParse(raw);

    if (!validatedFields.success) {
        return validatedFields.error.issues[0]?.message || "Invalid fields";
    }

    const { email, password, fullName, phone, jobTitle, orgAction, orgName, orgSlug, orgIndustry, orgCompanySize, orgWebsite, orgCountry, orgPhone, inviteCode, invitationToken, referralCode, shareClickId } = validatedFields.data;

    const body: Record<string, string | boolean> = {
        email,
        password,
        full_name: fullName,
        agreed_to_terms: true,
    };

    if (phone) body.phone = phone;
    if (jobTitle) body.job_title = jobTitle;
    if (invitationToken) body.invitation_token = invitationToken;
    if (referralCode) body.referral_code = referralCode;
    if (shareClickId) body.share_click_id = shareClickId;

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

/**
 * Live "does this account exist" check for the forgot-password form, so a
 * mistyped email is caught before a reset request is submitted. This is a
 * deliberate, narrow exception — requestPasswordReset() below stays
 * generic-response by design (an enumeration protection), and this is the
 * one place that trade-off was explicitly asked for instead.
 */
export async function checkEmailExists(email: string): Promise<boolean | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`, {
            method: 'GET',
        });
        if (!res.ok) return null;
        const data = await res.json();
        return Boolean(data.exists);
    } catch {
        return null;
    }
}

export async function requestPasswordReset(email: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        // The backend always returns the same generic message whether or
        // not the email matched an account — that's deliberate (a
        // forgot-password endpoint that confirms which emails exist is an
        // enumeration vector), so the frontend must never try to tell the
        // two cases apart either.
        if (!res.ok) {
            return { success: false, error: 'Something went wrong. Please try again.' };
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("Request password reset error:", error);
        return { success: false, error: "Network error" };
    }
}

/**
 * Resolves a reset token to the email it belongs to, so the reset-password
 * page can show "Resetting password for <email>" instead of a bare form.
 * Read-only on the backend — does not consume the token.
 */
export async function getResetTokenInfo(token: string): Promise<{ email: string } | { error: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password?token=${encodeURIComponent(token)}`, {
            method: 'GET',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { error: body.detail || 'This reset link is invalid or has expired.' };
        }
        const data = await res.json();
        return { email: data.email };
    } catch (error) {
        console.error("Get reset token info error:", error);
        return { error: 'Network error' };
    }
}

const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters long."),
});

export async function resetPassword(token: string, newPassword: string) {
    const validated = ResetPasswordSchema.safeParse({ token, newPassword });
    if (!validated.success) {
        return { success: false, error: validated.error.issues[0]?.message || "Invalid input" };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.detail || "Failed to reset password" };
            } catch {
                return { success: false, error: "Failed to reset password" };
            }
        }

        return { success: true, error: null };
    } catch (error) {
        console.error("Reset password error:", error);
        return { success: false, error: "Network error" };
    }
}

export async function logout() {
    redirect('/logout');
}
