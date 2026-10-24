export default function Icon({ name, size = 20 }) {
  const paths = {
    moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
    sun: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7",
    film: "M4 3h16v18H4zM4 7h16M4 17h16M8 3v18M16 3v18",
    tv: "M3 7h18v13H3zM8 3l4 4 4-4",
    spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    clock: "M12 8v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    check: "m5 12 4 4L19 6",
    settings:
      "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
    close: "m6 6 12 12M6 18 18 6",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.film} />
    </svg>
  );
}
