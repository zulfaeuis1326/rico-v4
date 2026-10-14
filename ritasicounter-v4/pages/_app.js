import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import "../styles/globals.css";
import ThemeToggle from "../components/ThemeToggle";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // Rail di semua halaman setelah login sudah punya toggle tema sendiri,
  // jadi tombol melayang hanya tampil di halaman auth (login/register).
  const showFloatingToggle = router.pathname === "/login" || router.pathname === "/register";

  return (
    <>
      <Head>
        <title>RitasiCounter V4 — Mining Hauler Realtime</title>
        <meta name="description" content="RitasiCounter V4: pencatat ritasi hauler tambang realtime dengan fleet, PIT, approval shift & dashboard analitik." />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Script id="theme-init" strategy="beforeInteractive">
        {`
          try {
            var saved = window.localStorage.getItem("ritasi-theme");
            var theme = (saved === "dark" || saved === "light") ? saved : "light";
            document.documentElement.setAttribute("data-theme", theme);
          } catch (err) {
            document.documentElement.setAttribute("data-theme", "light");
          }
        `}
      </Script>
      {showFloatingToggle && <ThemeToggle />}
      <Component {...pageProps} />
    </>
  );
}
