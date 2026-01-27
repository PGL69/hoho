import { Heart } from "lucide-react";

const Footer = () => (
  <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        Made with <Heart className="w-4 h-4 text-rose fill-current" /> for fashion lovers
      </p>
      
      <div className="flex items-center gap-6">
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
      </div>
    </div>
  </footer>
);

export default Footer;
