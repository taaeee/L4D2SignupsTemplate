import "./globals.css";

export const metadata = {
  title: "L4D2 Tournament Registration",
  description: "Generate and share dynamic L4D2 tournament registration templates.",
};

import Providers from "@/components/Providers";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
