import { useState, useCallback } from 'react';
import { Link, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface UrlInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  isValid: boolean;
  isLoading?: boolean;
}

const UrlInput = ({ url, onUrlChange, isValid, isLoading }: UrlInputProps) => {
  const [inputValue, setInputValue] = useState(url);
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onUrlChange(value);
    
    // Show preview for direct image URLs
    if (value && /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(value)) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [onUrlChange]);

  const clearInput = useCallback(() => {
    setInputValue('');
    setPreview(null);
    onUrlChange('');
  }, [onUrlChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-foreground">Garment URL</h3>
        {isValid && !isLoading && (
          <span className="text-xs text-accent flex items-center gap-1">
            <Check className="w-3 h-3" />
            Valid URL
          </span>
        )}
      </div>
      
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Link className="w-5 h-5" />
        </div>
        <Input
          type="url"
          value={inputValue}
          onChange={handleChange}
          placeholder="Paste garment product URL from any store..."
          disabled={isLoading}
          className={`w-full pl-12 pr-12 py-6 rounded-xl border-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
            inputValue 
              ? (isValid ? 'border-accent focus:border-accent' : 'border-rose focus:border-rose') 
              : 'border-border focus:border-accent'
          }`}
        />
        {inputValue && !isLoading && (
          <button 
            onClick={clearInput} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Supports: Amazon, Flipkart, Myntra, Ajio, H&M, Zara, or any direct image URL
      </p>
      
      {preview && (
        <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-center gap-4">
          <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={preview} 
              alt="Garment preview" 
              className="w-full h-full object-cover" 
              onError={() => setPreview(null)} 
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Garment Preview</p>
            <p className="text-xs text-muted-foreground">Image loaded successfully</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlInput;
