const NODES = [{ label: "Chatbot", sub: "answers visitors" }];

export default function FlowDiagram() {
  return (
    <svg
      viewBox="0 0 700 220"
      className="w-full max-w-xl"
      role="img"
      aria-label="Visitor flows through the Chatbot tool into business growth"
    >
      <line x1="70" y1="110" x2="630" y2="110" stroke="var(--line)" strokeWidth="2" />

      <g>
        <circle cx="40" cy="110" r="28" fill="var(--ink)" />
        <text x="40" y="115" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
          Visitor
        </text>
      </g>

      {NODES.map((node, i) => {
        const x = 350 + i * 260;
        return (
          <g key={node.label}>
            <rect
              x={x - 65}
              y={70}
              width={130}
              height={80}
              rx={16}
              fill="var(--brand-bg)"
              stroke="var(--brand)"
              strokeWidth="1.5"
            />
            <text
              x={x}
              y={102}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="var(--brand)"
            >
              {node.label}
            </text>
            <text x={x} y={122} textAnchor="middle" fontSize="10.5" fill="var(--slate)">
              {node.sub}
            </text>
          </g>
        );
      })}

      <g>
        <circle cx="660" cy="110" r="28" fill="var(--flow)" />
        <text x="660" y="106" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
          More
        </text>
        <text x="660" y="119" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
          customers
        </text>
      </g>
    </svg>
  );
}
