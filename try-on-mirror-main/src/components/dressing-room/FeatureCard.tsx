interface FeatureCardProps {
  step: string;
  title: string;
  description: string;
  delay?: string;
}

const FeatureCard = ({ step, title, description, delay = '0s' }: FeatureCardProps) => {
  return (
    <div
      className="relative p-6 rounded-2xl card-elevated hover:shadow-hover transition-all duration-300 animate-fade-in-up group"
      style={{ animationDelay: delay }}
    >
      <div className="absolute -top-4 left-6 px-3 py-1 rounded-full gradient-accent text-foreground text-xs font-bold shadow-soft">
        {step}
      </div>
      <h3 className="text-lg font-display font-semibold text-foreground mb-2 mt-2 group-hover:text-accent transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;
