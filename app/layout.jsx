import "./globals.css";

export const metadata = {
  title: "Football Stats Q&A",
  description: "Ask grounded questions about EPL and Champions League stats.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
