import { Shirt } from "lucide-react";

const Header = () => (
  <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center shadow-soft">
          <Shirt className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-display font-semibold text-foreground">
          Virtual Dressing Room
        </span>
      </div>
      
      <nav className="hidden sm:flex items-center gap-6">
        <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          How it works
        </a>
        <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Features
        </a>
        <a href="#" className="text-sm font-medium text-accent hover:opacity-80 transition-colors">
          Try Free
        </a>
      </nav>
    </div>
  </header>
);

export default Header;
