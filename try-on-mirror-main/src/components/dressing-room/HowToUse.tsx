const steps = [
  { step: 1, text: 'Paste a garment product URL from any online store' },
  { step: 2, text: 'Select the garment type (shirt, pants, or skirt)' },
  { step: 3, text: 'Click "Start Virtual Mirror" and allow camera access' },
  { step: 4, text: 'Stand 6-8 feet back for best full-body tracking' },
  { step: 5, text: 'Move naturally - the outfit follows your movements!' },
];

const HowToUse = () => {
  return (
    <div className="card-elevated p-6">
      <h3 className="text-lg font-display font-semibold text-foreground mb-4">How to Use</h3>
      <ul className="space-y-3 text-sm text-muted-foreground">
        {steps.map(({ step, text }) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
              {step}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HowToUse;
