import { Link } from "wouter";
import { Cpu, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <header className="bg-background border-b border-border py-3 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-semibold text-primary flex items-center">
          <Cpu className="h-6 w-6 mr-2 text-primary" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary/90 to-primary">
            COBOL SME Agent
          </span>
        </Link>
      </div>
      <div className="flex items-center space-x-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </Link>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8 border border-border">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </Button>
      </div>
    </header>
  );
}
