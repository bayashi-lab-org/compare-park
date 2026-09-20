"use client";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length < 2) return null;

  return (
    <details className="mb-8 rounded-xl border bg-white p-4">
      <summary className="cursor-pointer py-1 text-sm font-bold text-foreground">この記事の目次を見る</summary>
      <nav aria-label="記事の目次" className="mt-4"><ol className="space-y-2 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "ml-4" : ""}
          >
            <a
              href={`#${item.id}`}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol></nav>
    </details>
  );
}
