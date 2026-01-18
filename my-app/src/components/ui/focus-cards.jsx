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

  // Get first 3 words of subtitle
  const getShortSubtitle = (text) => {
    if (!text) return "";
    const words = text.split(/\s+/);
    if (words.length <= 3) return text;
    return words.slice(0, 3).join(" ") + "...";
  };

  const isHovered = hovered === index;
  const shortSubtitle = getShortSubtitle(card.subtitle);

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
        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(card.title || 'User')}&background=random&size=400`;
      }}
    />
    <div
      className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end py-4 px-4 transition-all duration-300",
        isHovered ? "from-black/95 via-black/70" : "from-black/80"
      )}>
      {/* Score Badge - Top Right */}
      {card.score !== null && card.score !== undefined && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs md:text-sm font-bold px-2 py-1 rounded-full shadow-lg">
          {card.score}%
        </div>
      )}
      <div className="w-full">
        {/* Name - Always visible */}
        <div className="text-lg md:text-xl font-semibold text-white mb-1 truncate">
          {card.title}
        </div>
        
        {/* Subtitle - Short version normally, full on hover */}
        {card.subtitle && (
          <div className={cn(
            "text-sm text-neutral-300 transition-all duration-300",
            isHovered ? "line-clamp-none" : "truncate"
          )}>
            {isHovered ? card.subtitle : shortSubtitle}
          </div>
        )}
        
        {/* Pitch text - Only on hover */}
        {card.pitch && isHovered && (
          <div className="text-xs text-purple-300 mt-2 italic line-clamp-3 animate-fadeIn">
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
