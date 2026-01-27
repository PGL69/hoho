import { Shirt } from 'lucide-react';

export type GarmentType = 'shirt' | 'pants' | 'skirt';

interface GarmentTypeSelectorProps {
  selected: GarmentType;
  onChange: (type: GarmentType) => void;
}

const garmentTypes: { type: GarmentType; label: string; icon: string }[] = [
  { type: 'shirt', label: 'Shirt / Top', icon: '👕' },
  { type: 'pants', label: 'Pants', icon: '👖' },
  { type: 'skirt', label: 'Skirt', icon: '👗' },
];

const GarmentTypeSelector = ({ selected, onChange }: GarmentTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-display font-semibold text-foreground">Garment Type</h3>
      <div className="grid grid-cols-3 gap-3">
        {garmentTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              selected === type
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent/50 bg-background'
            }`}
          >
            <span className="text-2xl mb-1">{icon}</span>
            <span className="text-xs font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GarmentTypeSelector;
