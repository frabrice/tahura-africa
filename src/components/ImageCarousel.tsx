import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  title: string;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const itemWidth = scrollContainerRef.current.offsetWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setCurrentIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const itemWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: index * itemWidth,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/9] md:aspect-[2/1] bg-neutral-100 mb-6 md:mb-8 rounded-xl"></div>
    );
  }

  return (
    <div className="relative mb-6 md:mb-8">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth gap-3 pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="flex-shrink-0 snap-start first:ml-0 last:mr-0"
            style={{
              width: index === 0 ? '100%' : 'calc(100% - 80px)',
            }}
          >
            <div className="aspect-[16/9] md:aspect-[2/1] bg-neutral-100 overflow-hidden rounded-xl border-2 border-neutral-200 shadow-sm">
              <img
                src={image}
                alt={`${title} - Image ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-all ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-neutral-100 hover:scale-110'
            }`}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-all ${
              currentIndex === images.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-neutral-100 hover:scale-110'
            }`}
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-neutral-900" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
