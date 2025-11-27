import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import HomeLink from "@/components/home-link";
import { HeaderNav } from "@/components/header-nav";
import { GeminiFooter } from "@/components/gemini-footer";
import ParticleBackground from "@/components/particle-background";
import "./globals.css";
import "nprogress/nprogress.css";
import { NavigationEvents } from "@/components/navigation-events";
import NProgress from "nprogress";

// Configure NProgress to complete instantly
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 1,
  minimum: 0.99,
  easing: 'ease',
  speed: 1
});

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3000";

export const metadata = {
	metadataBase: new URL(defaultUrl),
	title: "Phenomitor",
	description: "AI-powered behavioral monitoring system for remote sessions",
};

const geistSans = Geist({
	display: "swap",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={geistSans.className} suppressHydrationWarning>
			<body className="bg-gradient-to-br from-black via-purple-950 to-black text-foreground relative" >
				<NavigationEvents />
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<ParticleBackground />
					<main className="min-h-screen flex flex-col items-center relative z-10">
						<div className="flex-1 w-full flex flex-col items-center">
							<nav className="w-full border-b border-b-foreground/10 h-16 bg-black/50 backdrop-blur-sm">
								<div className="w-full flex justify-between items-center p-3 px-5 text-sm">
									<div className="flex items-center gap-1">
										<HomeLink />
										<HeaderNav />
									</div>
									<HeaderAuth />
								</div>
							</nav>
							<div className="w-full">
								{children}
							</div>
							<footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center bg-black/50 backdrop-blur-sm">
								<GeminiFooter />
							</footer>
						</div>
					</main>
				</ThemeProvider>
			</body>
		</html>
	);
}
