import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { createAssistantReportPdf, createFallbackAssistantReportPdf } from '@/lib/assistant-report-pdf';

export const runtime = 'nodejs';

const reportRequestSchema = z.object({
  content: z.string().trim().min(40).max(200_000),
  title: z.string().trim().max(140).optional(),
});

function safeFilename(value: string): string {
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return clean || `mynddesk-ai-report-${new Date().toISOString().slice(0, 10)}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const parsed = reportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'The report content is missing or invalid.' }, { status: 400 });
  }

  try {
    const generatedAt = new Date();
    const reportInput = {
      content: parsed.data.content,
      title: parsed.data.title,
      generatedAt,
      organizationName: session.user.orgName,
      preparedFor: session.user.name || session.user.email,
    };
    let pdf: Buffer;
    try {
      pdf = await createAssistantReportPdf(reportInput);
    } catch (richPdfError) {
      console.error('Rich assistant PDF generation failed; using safe fallback:', richPdfError);
      pdf = await createFallbackAssistantReportPdf(reportInput);
    }
    const title = parsed.data.title || 'MyndDesk AI Report';
    const filename = `${safeFilename(title)}-${generatedAt.toISOString().slice(0, 10)}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.byteLength),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Assistant PDF generation failed:', error);
    return NextResponse.json({ error: 'The PDF could not be generated. Please try again.' }, { status: 500 });
  }
}
