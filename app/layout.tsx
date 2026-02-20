import { ThemeProvider } from "next-themes";
import "./globals.css";
import LayoutWrapper from "@/components/layout-wrapper";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource-variable/inter";


export const metadata = {
  title: "Avinya HRMS – Reinventing the Way You Work",
  description: "Streamline your workforce with Avinya HRMS – your all-in-one solution for modern human resource management.",
  icons: {
    icon: "/fav.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="bottom-right" richColors closeButton />
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
