import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button href="/sign-in" variant="ghost" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href="/sign-up">Start free</Button>
        </div>
      </div>
    </header>
  );
}
