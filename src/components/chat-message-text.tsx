import { splitLinks } from "@/lib/safe-links";

// Renders chat text with clickable links. Safe by construction: the text is
// rendered as React text nodes (never innerHTML), and only http(s) URLs become
// <a> elements (target=_blank, rel=noopener noreferrer nofollow).
export default function ChatMessageText({ text }: { text: string }) {
  const parts = splitLinks(text);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all font-medium underline underline-offset-2"
          >
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}
