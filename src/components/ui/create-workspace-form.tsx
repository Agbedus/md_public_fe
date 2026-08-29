'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiBriefcase, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import { createOrganization } from '@/lib/org-actions';
import { toast } from '@/lib/toast';
import { siteUrl } from '@/lib/seo';

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Shown as the prefix on the workspace-slug field. Derived from siteUrl so a
// domain change lands here too, rather than leaving a stale hostname in the
// one place users are asked to read it carefully.
const workspaceUrlHost = siteUrl.replace(/^https?:\/\//, '');

export default function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setError('');
    startTransition(async () => {
      const result = await createOrganization({ name: name.trim(), slug: slugify(slug), description: description.trim() || undefined });
      if (!result.success) {
        const message = result.error || 'Could not create the workspace.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(`${name.trim()} workspace created`);
      router.push(`/${result.slug}/dashboard`);
      router.refresh();
    });
  };

  return (
    <main className="min-h-dvh bg-background px-3 py-6 sm:px-4 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-text-muted hover:text-foreground sm:mb-8"><FiArrowLeft /> Back</Link>
        <div className="rounded-3xl border border-card-border bg-card p-5 shadow-sm sm:p-9">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><FiBriefcase size={22} /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a workspace</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">Create another team without registering again. You can switch between all your workspaces at any time.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">Workspace name</span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); if (!slugTouched) setSlug(slugify(event.target.value)); }} className="h-11 w-full rounded-xl border border-card-border bg-background px-3 text-sm outline-none focus:border-emerald-500/50" placeholder="Acme Studio" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">Workspace URL</span><div className="flex h-11 items-center overflow-hidden rounded-xl border border-card-border bg-background focus-within:border-emerald-500/50"><span className="border-r border-card-border px-3 text-xs text-text-muted">{workspaceUrlHost}/</span><input value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="acme-studio" /></div></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">What does this team do? <span className="normal-case font-normal tracking-normal">(optional)</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 300))} rows={3} className="w-full resize-none rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50" /></label>
            {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
            <button disabled={pending || !name.trim() || !slug.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50">{pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <FiCheck />} {pending ? 'Creating…' : 'Create workspace'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
