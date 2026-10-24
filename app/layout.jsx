import "./globals.css";
import "./profile.css";
import "./releases.css";
import "./mobile.css";
import "./themes.css";

export const metadata = {
  title: "Velora — Movies & Series Tracker",
  description:
    "Movies, anime and series in one library, saved and synced across all your devices.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Velora",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06100c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ka" data-theme="night" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Netlify injects a hosting comment surrounded by text nodes into
            // <head>. Remove only that injected whitespace before hydration.
            __html: `(function(){for(var n of Array.from(document.head.childNodes)){if(n.nodeType===8&&n.textContent.includes('This site is hosted on Netlify.')){for(var s of [n.previousSibling,n.nextSibling]){if(s&&s.nodeType===3&&!s.textContent.trim())s.remove()}n.remove()}}try{var t=localStorage.getItem('velora.theme');document.documentElement.dataset.theme=t==='bright'?'bright':'night'}catch{}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
