import NotesPageClient from "@/components/ui/notes/notes-page-client";
import { auth } from "@/auth";
import { getNotes } from "@/app/(dashboard)/[orgSlug]/notes/actions";
import { getUsersSafe } from "@/app/(dashboard)/[orgSlug]/users/actions";

export default async function NotesPage() {
  // Load the first page on the server so the client starts with real data. An
  // empty workspace then renders its empty state straight away instead of
  // holding the skeleton until a client-side fetch settles.
  // getNotes already loads the org's users to attach note owners; getUsersSafe
  // is request-cached, so passing them to the share menu costs nothing extra.
  const [session, notes, users] = await Promise.all([auth(), getNotes(100), getUsersSafe()]);
  return <NotesPageClient allNotes={notes} users={users} currentUser={session?.user} />;
}
