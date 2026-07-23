import NotesPageClient from "@/components/ui/notes/notes-page-client";
import { auth } from "@/auth";

export default async function NotesPage() {
  const session = await auth();
  return <NotesPageClient currentUser={session?.user} />;
}
