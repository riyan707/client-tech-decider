import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

function getPost(slug: string) {
  const filePath = path.join(process.cwd(), "content/blog", `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let tableRows: string[] = [];

  function flushTable() {
    if (tableRows.length > 0) {
      output.push(
        `<div class="overflow-x-auto my-6"><table class="w-full border-collapse border border-neutral-200 rounded-lg">${tableRows.join("")}</table></div>`
      );
      tableRows = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushTable();
      output.push(`<h2 class="text-xl font-semibold mt-10 mb-3">${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      flushTable();
      output.push(`<h3 class="text-lg font-semibold mt-8 mb-2">${line.slice(4)}</h3>`);
      continue;
    }
    if (line === "---") {
      flushTable();
      output.push(`<hr class="my-8 border-neutral-200" />`);
      continue;
    }
    if (line.startsWith("|")) {
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-: ]+$/.test(c))) continue; // separator row
      const isHeader = tableRows.length === 0;
      const tag = isHeader ? "th" : "td";
      tableRows.push(
        `<tr>${cells.map((c) => `<${tag} class="border border-neutral-200 px-3 py-2 text-sm text-left">${c}</${tag}>`).join("")}</tr>`
      );
      continue;
    }

    flushTable();

    let out = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline hover:text-neutral-900">$1</a>');

    if (out.trim() === "") {
      output.push("<br/>");
    } else {
      output.push(`<p class="mb-4 text-neutral-700 leading-relaxed">${out}</p>`);
    }
  }

  flushTable();
  return output.join("\n");
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return notFound();

  const html = renderMarkdown(post.content);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14">
      <Link href="/blog" className="text-sm text-neutral-400 hover:text-neutral-700">
        ← Back to Guides
      </Link>

      <h1 className="mt-6 text-3xl font-semibold leading-snug">{post.title}</h1>
      <p className="mt-3 text-sm text-neutral-400">
        {new Date(post.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}{" "}
        · {post.readTime} · By TechDecider
      </p>

      <div className="mt-10" dangerouslySetInnerHTML={{ __html: html }} />

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
        <h3 className="text-lg font-semibold">Not sure which TV is right for you?</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Take our 2-minute quiz and we&apos;ll recommend the perfect TV for your room and budget.
        </p>
        <Link
          href="/quiz/tv"
          className="mt-5 inline-block rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Find my perfect TV →
        </Link>
      </div>
    </div>
  );
}
