import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { memberFromCookieStore } from "@/lib/members";
import { ideaVoteCount, listIdeas, rankIdeas } from "@/lib/ideas";
import IdeaBoard from "@/components/community/IdeaBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Idea board",
  description: "Suggest what to make next and back the ideas you want to see. The most-backed ones rise to the top.",
  alternates: { canonical: "/ideas" },
};

export default async function IdeasPage() {
  noStore();

  const session = await memberFromCookieStore(cookies());
  const username = session?.username || null;
  const ideas = rankIdeas(await listIdeas()).map((idea) => {
    const { votes, ...rest } = idea;
    return {
      ...rest,
      voteCount: ideaVoteCount(idea),
      voted: username ? votes.includes(username) : false,
    };
  });

  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: "52rem" }}>
        <div className="max-w-2xl mb-8">
          <p className="kicker">Idea board</p>
          <h1 className="display-lg mt-3 mb-4">What should come next?</h1>
          <p className="muted text-lg leading-relaxed">
            Post what you want to see and back the ones you agree with. The most-backed ideas sit at
            the top, and the team marks them as planned or shipped as they move.
          </p>
        </div>

        <IdeaBoard initialIdeas={ideas} signedIn={!!username} />
      </div>
    </main>
  );
}
