"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const Card = React.memo(({
  card,
  index,
  hovered,
  setHovered
}) => {
  const handleClick = () => {
    if (card.url) {
      window.open(card.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
  <div
    onMouseEnter={() => setHovered(index)}
    onMouseLeave={() => setHovered(null)}
    onClick={handleClick}
    className={cn(
      "rounded-lg relative bg-gray-100 dark:bg-neutral-900 overflow-hidden h-48 md:h-64 w-full transition-all duration-300 ease-out min-h-[192px] md:min-h-[256px]",
      hovered !== null && hovered !== index && "blur-sm scale-[0.98]",
      card.url && "cursor-pointer hover:shadow-lg hover:shadow-purple-500/50"
    )}>
    <img 
      src={card.src} 
      alt={card.title} 
      className="object-cover object-center absolute inset-0 w-full h-full"
      style={{ 
        objectFit: 'cover', 
        objectPosition: 'center',
        width: '100%', 
        height: '100%',
        minWidth: '100%',
        minHeight: '100%'
      }}
      onError={(e) => {
        // Fallback to placeholder if image fails to load
        e.target.src = `https://images.unsplash.com/photo-${1507003211 + index}?w=400&h=600&fit=crop`;
      }}
    />
    <div
      className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end py-6 px-4 transition-all duration-300",
        hovered === index ? "from-black/90" : "from-black/80"
      )}>
      {/* Score Badge - Top Right */}
      {card.score !== null && card.score !== undefined && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs md:text-sm font-bold px-2 py-1 rounded-full shadow-lg">
          {card.score}% Match
        </div>
      )}
      <div className="w-full">
        <div
          className="text-xl md:text-2xl font-semibold text-white mb-1">
          {card.title}
        </div>
        {card.subtitle && (
          <div className="text-sm md:text-base text-neutral-300">
            {card.subtitle}
          </div>
        )}
        {/* Pitch text on hover */}
        {card.pitch && hovered === index && (
          <div className="text-xs md:text-sm text-purple-300 mt-2 italic line-clamp-2">
            "{card.pitch}"
          </div>
        )}
      </div>
    </div>
  </div>
  );
});

Card.displayName = "Card";

export function FocusCards({
  cards
}) {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-7xl mx-auto md:px-8 w-full">
      {cards.map((card, index) => (
        <Card
          key={card.id || `card-${index}`}
          card={card}
          index={index}
          hovered={hovered}
          setHovered={setHovered} />
      ))}
    </div>
  );
}
