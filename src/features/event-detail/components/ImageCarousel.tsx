import { useEffect, useRef } from "react";
import Slider from "react-slick";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function ImageCarousel({
  images,
  alt,
  idx,
  onIdxChange,
}: {
  images: string[];
  alt: string;
  idx: number;
  onIdxChange: (i: number) => void;
}) {
  const safeImages = images && images.length > 0 ? images : [];
  const total = safeImages.length;
  const sliderRef = useRef<any>(null);
  if (total === 0) return null;

  useEffect(() => {
    if (
      sliderRef.current &&
      typeof sliderRef.current.slickGoTo === "function"
    ) {
      sliderRef.current.slickGoTo(idx);
    }
  }, [idx]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden carousel-host">
      {/* Force react-slick's wrapper chain to fill the host so the image is
          truly full-bleed (covers the entire hero / card, any aspect ratio). */}
      <style>{`
  .carousel-host,
  .carousel-host .slick-slider,
  .carousel-host .slick-list,
  .carousel-host .slick-track,
  .carousel-host .slick-slide,
  .carousel-host .slick-slide > div {
    height: 100%;
  }

  .carousel-host .slick-track {
    display: flex;
  }

  .carousel-host .slick-slide {
    float: none;
  }

  .carousel-host .slick-slide > div > div {
    height: 100%;
  }
`}</style>
      <Slider
        ref={sliderRef}
        dots={false}
        arrows={false}
        infinite={false}
        speed={350}
        slidesToShow={1}
        slidesToScroll={1}
        swipe
        swipeToSlide
        touchThreshold={10}
        initialSlide={idx}
        beforeChange={(_: number, next: number) =>
          onIdxChange(next)
        }
      >
        {safeImages.map((src, i) => (
          <div key={i} className="h-full">
            <div className="relative w-full h-full overflow-hidden">
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export function CarouselDots({
  count,
  idx,
  onChange,
  isDark,
}: {
  count: number;
  idx: number;
  onChange: (i: number) => void;
  isDark: boolean;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {Array.from({ length: count }).map((_, i) => (
        <AppButton
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onChange(i);
          }}
          aria-label={`Go to image ${i + 1}`}
          className="relative overflow-hidden rounded-full transition-all"
          style={{
            width: i === idx ? 20 : 6,
            height: 6,
            background:
              i === idx
                ? isDark
                  ? "#d6f905"
                  : "#0a0a0a"
                : isDark
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(0,0,0,0.2)",
          }}
        >
          {i === idx && <GlassReflection isDark={isDark} />}
        </AppButton>
      ))}
    </div>
  );
}
