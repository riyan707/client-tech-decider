import fs from "fs";
import path from "path";
import Link from "next/link";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
};

function getPosts(): Post[] {
  const dir = path.join(process.cwd(), "content/blog");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const slug = f.replace(".json", "");
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { slug, title: raw.title, excerpt: raw.excerpt, date: raw.date, readTime: raw.readTime };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-semibold">Guides & Articles</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Plain-English guides to help you make smarter buying decisions.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {posts.length === 0 && (
          <p className="text-sm text-neutral-400">No posts yet. Check back soon.</p>
        )}
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-2xl border border-neutral-200 p-6 transition-all hover:border-neutral-400 hover:shadow-sm"
          >
            <p className="mb-2 text-xs text-neutral-400">
              {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {post.readTime} · By TechDecider
            </p>
            <h2 className="text-lg font-medium group-hover:underline">{post.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{post.excerpt}</p>
            <span className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">
              Read article →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
