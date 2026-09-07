export function Clubhouse({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "clubhouse small" : "clubhouse"}
      viewBox="0 0 480 380"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="240" cy="180" r="157" fill="#273e49" />
      <circle cx="344" cy="75" r="24" fill="#e7ca8e" />
      <circle cx="354" cy="66" r="22" fill="#273e49" />
      <g fill="#e7ca8e">
        <circle cx="141" cy="92" r="2" />
        <circle cx="294" cy="38" r="2" />
        <circle cx="384" cy="163" r="2" />
        <path d="m102 172 2-6 2 6 6 2-6 2-2 6-2-6-6-2ZM270 84l2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" />
      </g>
      <ellipse cx="241" cy="329" rx="159" ry="12" fill="#152a34" />
      <path d="M135 188h209v133H135z" fill="#49616a" />
      <path d="m113 189 126-98 129 98z" fill="#b88470" />
      <path
        d="m111 191 128-98 130 98"
        stroke="#dfb89a"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M211 232a29 29 0 0 1 58 0v89h-58z" fill="#e8c786" />
      <path d="M221 236a19 19 0 0 1 38 0v85h-38z" fill="#f6df9f" />
      <circle cx="251" cy="274" r="3" fill="#8d6546" />
      <rect x="151" y="216" width="39" height="45" rx="4" fill="#ebca87" />
      <path d="M170 217v43m-18-21h38" stroke="#7d6652" strokeWidth="3" />
      <rect x="290" y="216" width="39" height="45" rx="4" fill="#ebca87" />
      <path d="M309 217v43m-18-21h38" stroke="#7d6652" strokeWidth="3" />
      <path d="M203 322h74v8h-74zm-10 8h94v7h-94z" fill="#a8b0a1" />
      <path
        d="M111 319v-37m0 23c-27 0-34-24-27-35 20 1 30 16 27 35Zm0-14c25-8 31-32 20-43-18 5-24 23-20 43Zm252 28v-40m0 25c-22-1-29-24-22-35 18 3 26 18 22 35Zm0-9c26-6 34-29 24-40-18 4-29 22-24 40Z"
        fill="#8ba58e"
      />
      <path d="M152 187q89 29 177 0" stroke="#e8c786" strokeWidth="2" />
      {[159, 185, 212, 240, 268, 295, 322].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={190 + (3 - Math.abs(3 - i)) * 3}
          r="3"
          fill="#fae7b3"
        />
      ))}
    </svg>
  );
}
