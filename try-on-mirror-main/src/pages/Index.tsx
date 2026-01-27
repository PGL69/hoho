import { useState, useCallback } from 'react';
import { Camera, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import UrlInput from '@/components/dressing-room/UrlInput';
import GarmentTypeSelector, { GarmentType } from '@/components/dressing-room/GarmentTypeSelector';
import HowToUse from '@/components/dressing-room/HowToUse';
import FeatureCard from '@/components/dressing-room/FeatureCard';
import VirtualMirror, { VirtualMirrorPlaceholder } from '@/components/dressing-room/VirtualMirror';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const features = [
  { 
    step: '01', 
    title: 'Real-Time AR', 
    description: 'See yourself wearing the outfit instantly with advanced pose tracking and 3D rendering at ~30 FPS.' 
  },
  { 
    step: '02', 
    title: 'Any Store', 
    description: 'Works with product URLs from Amazon, Flipkart, Myntra, H&M, Zara, and any other online store.' 
  },
  { 
    step: '03', 
    title: 'Shop Smart', 
    description: 'Make confident purchases by seeing how clothes actually look on you before buying.' 
  },
];

// Validate if URL is a valid product or image URL
const validateUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    // Direct image URLs
    if (/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(urlObj.pathname)) {
      return true;
    }
    // Known shopping sites
    const shoppingSites = [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
      'zara', 'hm', 'uniqlo', 'asos', 'shein', 'nike', 'adidas',
    ];
    return shoppingSites.some(site => urlObj.hostname.includes(site)) || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

const Index = () => {
  const { toast } = useToast();
  const [garmentUrl, setGarmentUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [garmentType, setGarmentType] = useState<GarmentType>('shirt');
  const [isMirrorActive, setIsMirrorActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedImageUrl, setExtractedImageUrl] = useState<string | null>(null);

  const handleUrlChange = useCallback((url: string) => {
    setGarmentUrl(url);
    setIsUrlValid(validateUrl(url));
    setExtractedImageUrl(null);
  }, []);

  const handleReset = useCallback(() => {
    setIsMirrorActive(false);
    setExtractedImageUrl(null);
    setGarmentUrl('');
    setIsUrlValid(false);
    toast({
      title: 'Mirror Reset',
      description: 'You can now try a different garment URL.',
    });
  }, [toast]);

  const handleStartMirror = async () => {
    if (!garmentUrl) return;

    setIsExtracting(true);
    
    try {
      // Check if it's a direct image URL
      if (/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(garmentUrl)) {
        setExtractedImageUrl(garmentUrl);
        setIsMirrorActive(true);
        toast({
          title: 'Starting Virtual Mirror',
          description: 'Allow camera access when prompted.',
        });
      } else {
        // Call backend to extract image
        toast({
          title: 'Extracting garment image...',
          description: 'This may take a few seconds.',
        });

        const { data, error } = await supabase.functions.invoke('extract-image', {
          body: { url: garmentUrl },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to extract image');
        }

        setExtractedImageUrl(data.image_base64);
        setIsMirrorActive(true);
        toast({
          title: 'Image extracted successfully!',
          description: 'Starting Virtual Mirror...',
        });
      }
    } catch (error) {
      console.error('Error starting mirror:', error);
      toast({
        title: 'Failed to extract image',
        description: error instanceof Error ? error.message : 'Please try a different URL or use a direct image link.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const canStart = isUrlValid && !isExtracting;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center mb-12 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Real-Time Virtual Try-On</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
            See How You Look
            <br />
            <span className="text-accent">In Real-Time</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Experience the future of online shopping. Paste a garment link, enable your camera, 
            and see yourself wearing it instantly with AR technology.
          </p>
        </section>

        {/* Main Content Grid */}
        <section className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Controls */}
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* URL Input Card */}
            <div className="card-elevated p-6 sm:p-8">
              <UrlInput 
                url={garmentUrl} 
                onUrlChange={handleUrlChange} 
                isValid={isUrlValid}
                isLoading={isExtracting}
              />
            </div>

            {/* Garment Type Selector */}
            <div className="card-elevated p-6 sm:p-8">
              <GarmentTypeSelector 
                selected={garmentType} 
                onChange={setGarmentType} 
              />
            </div>
            
            {/* Start Button */}
            {!isMirrorActive ? (
              <Button
                onClick={handleStartMirror}
                disabled={!canStart}
                className="w-full h-14 rounded-xl btn-hero text-lg font-medium flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Extracting Image...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Start Virtual Mirror</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-sm text-foreground text-center font-medium">
                    ✨ Mirror is active! Stand back to see full body
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset & Try Another</span>
                </Button>
              </div>
            )}
            
            {!canStart && !isMirrorActive && !isExtracting && (
              <p className="text-center text-sm text-muted-foreground">
                {!garmentUrl ? 'Paste a valid garment URL to get started' : 'Please enter a valid URL'}
              </p>
            )}

            {/* How to Use */}
            <HowToUse />
          </div>

          {/* Right Column - Mirror */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="card-elevated p-6 sm:p-8 lg:sticky lg:top-8">
              {isMirrorActive ? (
                <VirtualMirror 
                  isActive={isMirrorActive} 
                  garmentType={garmentType}
                  textureUrl={extractedImageUrl || undefined}
                />
              ) : (
                <VirtualMirrorPlaceholder />
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mt-16 sm:mt-24 grid sm:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.step}
              step={feature.step}
              title={feature.title}
              description={feature.description}
              delay={`${0.3 + index * 0.1}s`}
            />
          ))}
        </section>

        {/* Limitations Section */}
        <section id="how-it-works" className="mt-16 sm:mt-24 card-elevated p-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">How It Works (MVP)</h2>
          <p className="text-muted-foreground mb-6">
            This virtual dressing room uses cutting-edge browser technologies for real-time try-on:
          </p>
          <ul className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">→</span>
              <span><strong>MediaPipe Pose:</strong> Real-time body pose detection running entirely in your browser</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">→</span>
              <span><strong>Three.js:</strong> 3D rendering with bone-based garment deformation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">→</span>
              <span><strong>Simple Physics:</strong> Gravity and spring constraints for natural cloth movement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">→</span>
              <span><strong>No AI Generation:</strong> This is real-time pose-driven overlay, not AI image generation</span>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <h3 className="font-semibold text-foreground mb-2">Current Limitations</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Approximate fit only - not tailoring-accurate</li>
              <li>• Simplified physics without micro-wrinkles</li>
              <li>• Upper-body (shirts) and lower-body (pants, skirts) garments only</li>
              <li>• Single camera, front-facing view</li>
            </ul>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
