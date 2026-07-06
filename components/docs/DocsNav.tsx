"use client";

import { useEffect, useState } from "react";

export interface NavItem {
  id: string;
  label: string;
}

export default function DocsNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="docs-nav" aria-label="Documentation sections">
      <div className="docs-nav-title">On this page</div>
      {items.map((it, i) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className={active === it.id ? "active" : ""}
          onClick={() => setActive(it.id)}
        >
          <span className="num">{String(i + 1).padStart(2, "0")}</span>
          {it.label}
        </a>
      ))}
    </nav>
  );
}
