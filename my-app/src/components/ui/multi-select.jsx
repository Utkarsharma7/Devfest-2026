"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function MultiSelect({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select skills...",
  className 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (option) => {
    const newValue = value.includes(option)
      ? value.filter((item) => item !== option)
      : [...value, option];
    onChange(newValue);
  };

  const removeSkill = (skillToRemove) => {
    onChange(value.filter((skill) => skill !== skillToRemove));
  };

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      {/* Selected Skills Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900 p-2 bg-neutral-900 rounded-lg border border-neutral-700">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30 hover:border-purple-500/50 transition-colors"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="hover:text-purple-100 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-left focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 flex items-center justify-between"
      >
        <span className={value.length === 0 ? "text-neutral-500" : "text-white"}>
          {value.length === 0 ? placeholder : `${value.length} skill${value.length !== 1 ? 's' : ''} selected`}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl shadow-black/50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-neutral-700 sticky top-0 bg-neutral-900">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-72 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                No skills found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left hover:bg-neutral-800 transition-colors flex items-center gap-3 text-sm",
                      isSelected && "bg-purple-500/10 text-purple-300"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 border-purple-500"
                          : "border-neutral-600"
                      )}
                    >
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isSelected ? "font-medium" : "text-neutral-300"}>
                      {option}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
