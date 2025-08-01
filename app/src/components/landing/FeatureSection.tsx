'use client'

interface FeatureSectionProps {
  title: string;
  summary: string;
  description: string[];
  imagePath: string;
  imageAlt: string;
  imageOnRight?: boolean;
}

export function FeatureSection({
  title,
  summary,
  description,
  imagePath,
  imageAlt,
  imageOnRight = false,
}: FeatureSectionProps) {
  return (
    <div className="container mx-auto px-4">
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-8 ${
        imageOnRight ? '' : 'md:[&>div:first-child]:order-last'
      }`}>
        {/* Content Section */}
        <div className="space-y-6 md:px-4">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-lg text-primary italic border-l-4 border-primary pl-4 py-2">
              {summary}
            </p>
          </div>
          <div className="space-y-3">
            {description.map((text, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-lg text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image Section */}
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl shadow-lg">
          <img 
            src={imagePath} 
            alt={imageAlt} 
            className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" 
          />
        </div>
      </div>
    </div>
  );
}
