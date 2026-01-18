"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { FocusCards } from "@/components/ui/focus-cards";

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [dataType, setDataType] = useState('people');
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinCompleted, setLinkedinCompleted] = useState(false);
  const [linkedinCount, setLinkedinCount] = useState(0);

  // Function to load and update cards from sessionStorage
  const loadMatchesData = () => {
    try {
      const matchesDataStr = sessionStorage.getItem('matchesData');
      const errorStr = sessionStorage.getItem('matchesError');

      console.log("Matches page - matchesDataStr:", matchesDataStr);
      console.log("Matches page - errorStr:", errorStr);

      if (errorStr) {
        console.error("Matches page - Error found:", errorStr);
        setError(errorStr);
        sessionStorage.removeItem('matchesError');
        // Don't use mock data - show error or keep loading
      } else if (matchesDataStr) {
        const matchesData = JSON.parse(matchesDataStr);
        console.log("Matches page - Parsed matchesData:", matchesData);
        setDataType(matchesData.type || 'people');
        
        // Transform data to card format
        const transformedCards = transformDataToCards(matchesData.data, matchesData.type);
        console.log("Matches page - Transformed cards:", transformedCards);
        
        if (transformedCards && transformedCards.length > 0) {
          setCards(transformedCards);
          setLoading(false); // Data is ready, stop loading
        } else {
          // No cards yet - keep loading (don't show mock data)
          console.log("Matches page - No cards yet, keeping loading state");
          // Keep loading state true
        }
      } else {
        // No data found - keep loading (don't show mock data)
        console.log("Matches page - No data in sessionStorage, keeping loading state");
        // Keep loading state true
      }
    } catch (err) {
      console.error("Matches page - Error loading matches data:", err);
      console.error("Matches page - Error details:", err.message, err.stack);
      setError("Failed to load matches data: " + err.message);
      // Don't show mock data on error, keep loading
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
      } else {
        // Initial load - don't set loading to false yet, let loadMatchesData handle it
        loadMatchesData();
        
        // Check LinkedIn loading status on initial load
        const linkedinLoadingFlag = sessionStorage.getItem('linkedinLoading');
        const linkedinCompletedFlag = sessionStorage.getItem('linkedinCompleted');
        const linkedinCountStr = sessionStorage.getItem('linkedinCount');
        setLinkedinLoading(linkedinLoadingFlag === 'true');
        setLinkedinCompleted(linkedinCompletedFlag === 'true');
        setLinkedinCount(linkedinCountStr ? parseInt(linkedinCountStr, 10) : 0);
      }
    });

    // Listen for storage events and custom events to update when LinkedIn results arrive
    const handleStorageUpdate = () => {
      console.log("Matches page - Storage updated, reloading data...");
      loadMatchesData();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('matchesDataUpdated', handleStorageUpdate);

    // Also poll sessionStorage for updates (in case same-tab updates don't trigger storage event)
    const pollInterval = setInterval(() => {
      const linkedinLoadingFlag = sessionStorage.getItem('linkedinLoading');
      const linkedinCompletedFlag = sessionStorage.getItem('linkedinCompleted');
      const linkedinCountStr = sessionStorage.getItem('linkedinCount');
      setLinkedinLoading(linkedinLoadingFlag === 'true');
      setLinkedinCompleted(linkedinCompletedFlag === 'true');
      setLinkedinCount(linkedinCountStr ? parseInt(linkedinCountStr, 10) : 0);
      
      if (linkedinLoadingFlag === 'true') {
        // LinkedIn is still loading, check for updates
        const matchesDataStr = sessionStorage.getItem('matchesData');
        if (matchesDataStr) {
          try {
            const matchesData = JSON.parse(matchesDataStr);
            const transformedCards = transformDataToCards(matchesData.data, matchesData.type);
            if (transformedCards && transformedCards.length > 0) {
              setCards(transformedCards);
            }
          } catch (err) {
            console.error("Error polling matches data:", err);
          }
        }
      }
    }, 1000); // Poll every second

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('matchesDataUpdated', handleStorageUpdate);
      clearInterval(pollInterval);
    };
  }, [router]);

  const transformDataToCards = (data, type) => {
    if (!data || !Array.isArray(data)) return [];

    if (type === 'jobs') {
      // Transform job data to cards
      return data.map((job, index) => ({
        id: `job-${index}-${job.job_link || index}`,
        src: job.image_url || `https://images.unsplash.com/photo-${1507003211 + index}?w=400&h=600&fit=crop`,
        title: job.title || job.job_title || "Job Position",
        subtitle: `${job.company || "Company"} • ${job.location || "Location"}`
      }));
    } else {
      // Transform people data to cards
      return data.map((person, index) => {
        // Check source field FIRST (most reliable)
        const isGitHub = person.source === 'github';
        const isLinkedIn = person.source === 'linkedin';
        
        // Handle GitHub format
        if (isGitHub || (!isLinkedIn && (person.username || person.avatar_url))) {
          return {
            id: `github-${index}-${person.username || index}`,
            src: person.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name || person.username || 'User')}&background=random&size=400`,
            title: person.name || person.username || "GitHub User",
            subtitle: person.reason || person.bio || `@${person.username}`,
            url: person.url || (person.username ? `https://github.com/${person.username}` : null),
            score: person.score ?? null,
            pitch: person.pitch || null,
            source: 'github'
          };
        }
        
        // Handle LinkedIn format
        if (isLinkedIn || person.title || person.image_url || person.subtitle) {
          return {
            id: `linkedin-${index}-${person.url || person.urn_id || index}`,
            src: person.image_url || person.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.title || 'User')}&background=6366f1&color=fff&size=400`,
            title: person.title || person.name || person.full_name || "LinkedIn User",
            subtitle: person.subtitle || person.headline || person.current_position || "Professional",
            url: person.url || null,
            score: person.score ?? null, // Include random score from LinkedIn data
            pitch: null,
            source: 'linkedin'
          };
        }
        
        // Fallback for any other format
        return {
          id: `person-${index}-${person.url || index}`,
          src: person.image_url || person.avatar_url || `https://ui-avatars.com/api/?name=User&background=random&size=400`,
          title: person.title || person.name || person.username || "User",
          subtitle: person.subtitle || person.headline || person.bio || "Professional",
          url: person.url || null,
          score: person.score ?? null,
          pitch: null,
          source: 'unknown'
        };
      });
    }
  };

  // Mock data as fallback
  const mockCards = [
    {
      src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
      title: "Alex Johnson",
      subtitle: "Senior Software Engineer at Google"
    },
    {
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
      title: "Sarah Chen",
      subtitle: "Product Manager at Microsoft"
    },
    {
      src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop",
      title: "Michael Rodriguez",
      subtitle: "AI/ML Researcher at OpenAI"
    },
    {
      src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop",
      title: "Emily Watson",
      subtitle: "Full Stack Developer at Meta"
    },
    {
      src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
      title: "David Kim",
      subtitle: "DevOps Engineer at Amazon"
    },
    {
      src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
      title: "Jessica Martinez",
      subtitle: "Data Scientist at Netflix"
    },
    {
      src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
      title: "Ryan Thompson",
      subtitle: "Backend Engineer at Stripe"
    },
    {
      src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop",
      title: "Olivia Brown",
      subtitle: "Frontend Developer at Airbnb"
    },
    {
      src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop",
      title: "James Wilson",
      subtitle: "Security Engineer at Cloudflare"
    },
    {
      src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
      title: "Sophia Lee",
      subtitle: "UX Designer at Apple"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950">
      <div className="w-full min-h-screen py-12 px-4 relative z-10 pb-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
            {dataType === 'jobs' ? 'Job Opportunities' : 'Your Matches'}
          </h1>
          
          {/* Status Messages */}
          {dataType === 'people' && cards.length > 0 && (
            <div className="mb-6 space-y-2">
              {/* GitHub Status */}
              {cards.filter(c => c.source === 'github').length > 0 && (
                <p className="text-green-400 text-center text-lg font-semibold">
                  ✅ GitHub ({cards.filter(c => c.source === 'github').length} profiles)
                </p>
              )}
              {/* LinkedIn Status - Show loading OR results based on actual card count */}
              {(() => {
                const linkedinCards = cards.filter(c => c.source === 'linkedin');
                if (linkedinCards.length > 0) {
                  return (
                    <p className="text-green-400 text-center text-base">
                      ✅ LinkedIn ({linkedinCards.length} profiles)
                    </p>
                  );
                } else if (linkedinLoading && !linkedinCompleted) {
                  return (
                    <p className="text-yellow-400 text-center text-base animate-pulse">
                      ⏳ Fetching LinkedIn Results...
                    </p>
                  );
                } else if (linkedinCompleted) {
                  return (
                    <p className="text-yellow-400 text-center text-base">
                      ⚠️ LinkedIn: No matches found
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          )}
          
          <p className="text-neutral-400 text-center mb-12 text-lg">
            {dataType === 'jobs' 
              ? 'Find your next opportunity' 
              : 'Connect with people who share your interests'}
          </p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8 text-red-400 text-center">
              Error: {error}
            </div>
          )}

          {cards.length > 0 ? (
            <FocusCards cards={cards} />
          ) : (
            <div className="text-center text-neutral-400 py-12">
              No matches found. Please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
