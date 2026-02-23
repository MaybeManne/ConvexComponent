"use client";

import { useState } from "react";
import { X, ZoomIn, ImageOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface ScreenshotsProps {
  urls: string[];
}

interface ImageState {
  loading: boolean;
  error: boolean;
}

export function Screenshots({ urls }: ScreenshotsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageStates, setImageStates] = useState<Record<number, ImageState>>({});

  if (urls.length === 0) {
    return null;
  }

  const handleImageLoad = (index: number) => {
    setImageStates((prev) => ({
      ...prev,
      [index]: { loading: false, error: false },
    }));
  };

  const handleImageError = (index: number) => {
    setImageStates((prev) => ({
      ...prev,
      [index]: { loading: false, error: true },
    }));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex < urls.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;

    if (e.key === "Escape") {
      setSelectedIndex(null);
    } else if (e.key === "ArrowLeft" && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (e.key === "ArrowRight" && selectedIndex < urls.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url, index) => {
          const state = imageStates[index] ?? { loading: true, error: false };

          return (
            <button
              key={`${url}-${index}`}
              onClick={() => !state.error && setSelectedIndex(index)}
              disabled={state.error}
              className={`
                relative aspect-video bg-neutral-800 rounded-lg overflow-hidden
                border border-neutral-700
                ${state.error
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-indigo-500 transition-all group cursor-pointer"
                }
              `}
            >
              {/* Loading state */}
              {state.loading && !state.error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
                </div>
              )}

              {/* Error state */}
              {state.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <ImageOff className="w-6 h-6 text-neutral-600" />
                  <span className="text-xs text-neutral-600">Failed to load</span>
                </div>
              )}

              {/* Image */}
              {!state.error && (
                <Image
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  fill
                  className={`object-cover transition-opacity ${state.loading ? "opacity-0" : "opacity-100"}`}
                  unoptimized
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              )}

              {/* Hover overlay */}
              {!state.error && !state.loading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Index badge */}
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot lightbox"
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors z-10"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous button */}
          {selectedIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-white transition-colors z-10"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next button */}
          {selectedIndex < urls.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-white transition-colors z-10"
              aria-label="Next screenshot"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Navigation dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {urls.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === selectedIndex
                    ? "bg-white"
                    : "bg-neutral-600 hover:bg-neutral-400"
                }`}
                aria-label={`Go to screenshot ${index + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-neutral-400 text-sm z-10">
            {selectedIndex + 1} / {urls.length}
          </div>

          {/* Image */}
          <div
            className="relative max-w-5xl max-h-[80vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={urls[selectedIndex]}
              alt={`Screenshot ${selectedIndex + 1}`}
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
