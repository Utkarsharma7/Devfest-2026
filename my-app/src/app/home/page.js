"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { saveUserAnswers, createOrUpdateUser } from "@/lib/firebase/firestore";
import { BackgroundLines } from "@/components/ui/background-lines";
import { EvervaultCard } from "@/components/ui/evervault-card";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { FileUpload } from "@/components/ui/file-upload";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { EncryptedText } from "@/components/ui/encrypted-text";
import ThreeScene from "@/components/ThreeScene";

export default function Dashboard() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState("");

  // Question flow state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(["", "", "", "", ""]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [githubPeople, setGithubPeople] = useState([]); // Store GitHub results
  const [githubLoading, setGithubLoading] = useState(false); // Track GitHub loading
  const githubFetchPromiseRef = useRef(null); // Track GitHub fetch promise

  const questions = [
    "What is your primary professional goal or objective right now? (e.g., finding collaborators for a project, networking, career growth, building a startup, etc.)",
    "Describe your technical skills, technologies, programming languages, frameworks, or domains of expertise in detail. (e.g., React, Python, Machine Learning, System Design, DevOps, etc.)",
    "What type of projects, work, or initiatives are you currently working on or interested in? Describe specific areas or topics.",
    "You want to connect with",
    "What type of engagement are you looking for?",
  ];
  
  // Question types: 'text' or 'radio'
  const questionTypes = ['text', 'text', 'text', 'radio', 'radio'];
  
  // Radio options for question 4 (connection type)
  const radioOptionsQ4 = ['hiring community', 'collaborators'];
  
  // Radio options for question 5 (engagement type)
  const radioOptionsQ5 = ['open source projects', 'startup ventures', 'enterprise projects', 'research & academia', 'freelance work', 'mentorship'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
      } else {
        // Ensure user data is saved in Firestore when they authenticate
        try {
          await createOrUpdateUser(user.uid, {
            name: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
          });
        } catch (error) {
          console.error("Error saving user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn URL");
      return;
    }

    setLoading(true);
    setError("");
    setProfileData(null);

    try {
      const response = await fetch(
        `http://localhost:8000/scrape/person?linkedin_url=${encodeURIComponent(linkedinUrl)}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scrape profile");
      }

      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      setError(err.message || "An error occurred while scraping the profile");
      console.error("Scraping error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    // Check if answer is provided (for text) or selected (for radio)
    const currentAnswer = answers[currentQuestionIndex];
    if (!currentAnswer || (questionTypes[currentQuestionIndex] === 'text' && !currentAnswer.trim())) {
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // All questions answered - process and fetch data
        setLoading(true);
        try {
        const user = auth.currentUser;
        if (user) {
          await saveUserAnswers(user.uid, answers);
          console.log("Answers saved to Firestore:", answers);
        } else {
          console.error("User not authenticated");
        }

        // Create user profile object from answers (all 5 questions)
        const userProfile = {
          goal: answers[0], // Professional goal
          skills: answers[1], // Technical skills and technologies
          projects: answers[2], // Projects and initiatives
          connection_type: answers[3], // "hiring community" or "collaborators"
          engagement_type: answers[4], // Engagement type (open source, startup, etc.)
          // Create a comprehensive about section from all answers
          about: `Goal: ${answers[0]}. Technical Skills: ${answers[1]}. Current Projects/Interests: ${answers[2]}. Looking for: ${answers[3]} (${answers[4]}).`
        };

        // Step 1: Get keywords from LLM (optional - can skip if LLM is down)
        console.log("Fetching keywords from LLM...");
        console.log("User profile:", userProfile);
        console.log("Request URL: http://localhost:8001/keywords");
        
        // Clean keywords - remove formatting like "1) ", "2. ", "- ", etc.
        // Define this function at the top so it's accessible everywhere
        const cleanKeyword = (keyword) => {
          if (typeof keyword !== 'string') return keyword || '';
          return keyword
            .replace(/^\d+[).]\s*/, '') // Remove "1) ", "2. ", etc.
            .replace(/^[-*•]\s*/, '') // Remove "- ", "* ", "• ", etc.
            .trim();
        };
        
        let llmResponse;
        let keywords = [];
        // Fallback keyword: prefer skills (answers[1]), then goal (answers[0])
        let primaryKeyword = answers[1] || answers[0] || "developer"; // Fallback keyword
        
        try {
          llmResponse = await fetch('http://localhost:8001/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
          });
          console.log("LLM Response status:", llmResponse.status, llmResponse.statusText);
          
          if (llmResponse.ok) {
            const llmData = await llmResponse.json();
            console.log("LLM Response data:", llmData);
            keywords = llmData.keywords || [];
            
            primaryKeyword = Array.isArray(keywords) && keywords.length > 0 
              ? cleanKeyword(keywords[0]) 
              : cleanKeyword(answers[1] || answers[0] || "developer");
          } else {
            console.warn("LLM server returned error, using fallback keyword");
            // Clean the fallback keyword if it's a string with newlines/formatting
            const rawKeyword = answers[1] || answers[0] || "developer";
            if (typeof rawKeyword === 'string') {
              // Split by newlines, take first line, clean it
              const firstLine = rawKeyword.split('\n')[0].trim();
              primaryKeyword = cleanKeyword(firstLine);
            } else {
              primaryKeyword = cleanKeyword(rawKeyword);
            }
          }
        } catch (fetchError) {
          console.warn("⚠️ LLM server not available, using fallback keywords. Error:", fetchError.message);
          // Clean the fallback keyword if it's a string with newlines/formatting
          const rawKeyword = answers[1] || answers[0] || "developer";
          if (typeof rawKeyword === 'string') {
            // Split by newlines, take first line, clean it
            const firstLine = rawKeyword.split('\n')[0].trim();
            primaryKeyword = cleanKeyword(firstLine);
            console.log("Using cleaned fallback keyword:", primaryKeyword);
          } else {
            primaryKeyword = cleanKeyword(rawKeyword);
            console.log("Using fallback keyword:", primaryKeyword);
          }
          // Don't throw - continue with fallback keyword
        }

        console.log("Keywords received:", keywords);
        console.log("Primary keyword (cleaned):", primaryKeyword);

        // Validate GitHub URL is not empty before proceeding
        if (!githubUrl || !githubUrl.trim()) {
          setError("GitHub Profile URL is required. Please enter a valid GitHub URL.");
          setLoading(false);
          return;
        }

        // Step 2: Based on connection type, fetch data
        console.log("GitHub URL state:", githubUrl);
        console.log("LinkedIn URL state:", linkedinUrl);
        
        if (answers[3] === 'hiring community') {
          // For hiring community: fetch jobs
          const location = userProfile.domain || "Global"; // Use domain as location or default
          console.log("Fetching jobs...");
          const jobsResponse = await fetch(
            `http://localhost:8000/job?keyword=${encodeURIComponent(primaryKeyword)}&location=${encodeURIComponent(location)}&max_jobs=10`
          );

          if (!jobsResponse.ok) {
            throw new Error('Failed to fetch jobs');
          }

          const jobsData = await jobsResponse.json();
          console.log("Jobs received:", jobsData);

          // Store in sessionStorage and navigate
          sessionStorage.setItem('matchesData', JSON.stringify({
            type: 'jobs',
            data: jobsData.data || []
          }));
          
          // Navigate to matches page
          setLoading(false);
          router.push('/home/matches');
        } else {
          // For collaborators: Wait for GitHub first, then do LinkedIn in background
          
          // Wait for GitHub results first (if still loading)
          console.log("=== WAITING FOR GITHUB RESULTS ===");
          console.log("GitHub matches already fetched:", githubPeople.length);
          console.log("GitHub loading state:", githubLoading);
          
          // If GitHub is still loading, wait for the fetch promise to complete
          let finalGithubPeople = githubPeople.length > 0 ? githubPeople : [];
          if (githubLoading && githubFetchPromiseRef.current) {
            console.log("⚠️ GitHub is still fetching, waiting for promise to complete...");
            try {
              // Wait for the GitHub fetch promise to complete and get its result
              const promiseResult = await githubFetchPromiseRef.current;
              if (promiseResult && promiseResult.length > 0) {
                finalGithubPeople = promiseResult;
                console.log("✅ GitHub results received from promise:", finalGithubPeople.length);
              } else {
                // Fallback to state if promise didn't return results
                await new Promise(resolve => setTimeout(resolve, 300));
                if (githubPeople.length > 0) {
                  finalGithubPeople = githubPeople;
                  console.log("✅ GitHub results received from state:", finalGithubPeople.length);
                } else {
                  console.warn("⚠️ GitHub fetch completed but no results found");
                }
              }
            } catch (err) {
              console.warn("⚠️ Error waiting for GitHub fetch:", err);
              // Fallback to current state
              finalGithubPeople = githubPeople.length > 0 ? githubPeople : [];
            }
          } else if (githubPeople.length > 0) {
            finalGithubPeople = githubPeople;
            console.log("✅ GitHub results already available:", finalGithubPeople.length);
          }

          // Only navigate once we have GitHub results (or confirmed empty)
          // Limit to 20 GitHub results initially
          const allPeopleInitial = finalGithubPeople.length > 0 
            ? finalGithubPeople.slice(0, 20) 
            : [];
          console.log("Initial people (GitHub only, max 20):", allPeopleInitial.length);

          // Store initial GitHub results (even if empty - will show loading on matches page)
          sessionStorage.setItem('matchesData', JSON.stringify({
            type: 'people',
            data: allPeopleInitial
          }));

          // Set flag that LinkedIn is loading
          sessionStorage.setItem('linkedinLoading', 'true');

          // IMPORTANT: Clear loading state BEFORE navigation
          setLoading(false);
          
          // Navigate immediately after GitHub is ready
          console.log("🚀 Navigating to matches page with GitHub results:", allPeopleInitial.length);
          router.push('/home/matches');

          // Fetch LinkedIn results asynchronously after navigation
          // This will update the results by replacing top 5 GitHub with LinkedIn
          (async () => {
            try {
              console.log("Fetching LinkedIn results asynchronously...");
              
              // Wait a bit to ensure page navigation completes
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Try LinkedIn filters and people (skip if LinkedIn server is down)
              let linkedinPeopleAsync = [];
              
              try {
                console.log("Attempting LinkedIn filters...");
                const filtersResponseAsync = await fetch(
                  `http://localhost:8000/filter?keyword=${encodeURIComponent(primaryKeyword)}`
                );

                if (filtersResponseAsync.ok) {
                  const filtersDataAsync = await filtersResponseAsync.json();
                  console.log("LinkedIn filters received:", filtersDataAsync);

                  // Try to get people from LinkedIn
                  console.log("Fetching people from LinkedIn...");
                  const peopleResponseAsync = await fetch('http://localhost:8000/people', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      keyword: primaryKeyword,
                      filters: filtersDataAsync
                    })
                  });

                  if (peopleResponseAsync.ok) {
                    const peopleDataAsync = await peopleResponseAsync.json();
                    console.log("LinkedIn people received:", peopleDataAsync);
                    
                    // Handle different response structures
                    if (Array.isArray(peopleDataAsync)) {
                      linkedinPeopleAsync = peopleDataAsync;
                    } else if (peopleDataAsync.data && Array.isArray(peopleDataAsync.data)) {
                      linkedinPeopleAsync = peopleDataAsync.data;
                    } else if (peopleDataAsync.results && Array.isArray(peopleDataAsync.results)) {
                      linkedinPeopleAsync = peopleDataAsync.results;
                    } else if (peopleDataAsync.error) {
                      console.warn("LinkedIn API returned error:", peopleDataAsync.error);
                      linkedinPeopleAsync = [];
                    } else {
                      console.warn("Unexpected LinkedIn response structure:", peopleDataAsync);
                      linkedinPeopleAsync = [];
                    }
                    console.log("Parsed LinkedIn results count:", linkedinPeopleAsync.length);
                  }
                } else {
                  console.warn("⚠️ LinkedIn filters fetch failed, skipping LinkedIn");
                }
              } catch (linkedinErrorAsync) {
                console.warn("⚠️ LinkedIn server not available, skipping LinkedIn. Error:", linkedinErrorAsync.message);
              }

              // Get current GitHub results from sessionStorage (not from state, which might be stale)
              const currentMatchesDataStr = sessionStorage.getItem('matchesData');
              let currentGithubPeople = [];
              if (currentMatchesDataStr) {
                try {
                  const currentMatchesData = JSON.parse(currentMatchesDataStr);
                  // Get all results that are NOT LinkedIn (initially all are GitHub)
                  currentGithubPeople = (currentMatchesData.data || []).filter(p => 
                    p.source !== 'linkedin'
                  );
                  console.log("Total results in sessionStorage:", (currentMatchesData.data || []).length);
                  console.log("GitHub results filtered:", currentGithubPeople.length);
                } catch (err) {
                  console.error("Error reading current GitHub data:", err);
                  // Fallback to state if sessionStorage fails
                  currentGithubPeople = githubPeople || [];
                }
              } else {
                // Fallback to state if sessionStorage is empty
                currentGithubPeople = githubPeople || [];
              }

              console.log("Current GitHub people count:", currentGithubPeople.length);
              console.log("LinkedIn results received:", linkedinPeopleAsync ? linkedinPeopleAsync.length : 0);

              // Only merge if we have LinkedIn results (check it's defined and is an array)
              if (linkedinPeopleAsync && Array.isArray(linkedinPeopleAsync) && linkedinPeopleAsync.length > 0) {
                // Append 10 LinkedIn results to the existing 20 GitHub results (total 30 cards)
                const linkedinWithSource = linkedinPeopleAsync.map(p => ({ ...p, source: 'linkedin' }));
                const topLinkedin = linkedinWithSource.slice(0, 10); // Take top 10 LinkedIn
                
                // Merge: Keep all 20 GitHub + append 10 LinkedIn (total 30 cards)
                const finalPeople = [
                  ...currentGithubPeople.slice(0, 20), // Keep all 20 GitHub
                  ...topLinkedin  // Append 10 LinkedIn
                ];

                console.log("GitHub results (kept):", currentGithubPeople.slice(0, 20).length);
                console.log("LinkedIn results (appended):", topLinkedin.length);
                console.log("Final merged people (20 GitHub + 10 LinkedIn = 30 total):", finalPeople.length);

                // Update sessionStorage with merged results
                sessionStorage.setItem('matchesData', JSON.stringify({
                  type: 'people',
                  data: finalPeople
                }));
              } else {
                // If no LinkedIn results, keep all GitHub results (don't update, already correct)
                console.log("No LinkedIn results, keeping all GitHub results");
                console.log("Keeping GitHub people count:", currentGithubPeople.length);
                // Store LinkedIn status as completed (even if empty)
                sessionStorage.setItem('linkedinCompleted', 'true');
                sessionStorage.setItem('linkedinCount', '0');
              }
              
              // Remove loading flag and mark as completed
              sessionStorage.removeItem('linkedinLoading');
              if (linkedinPeopleAsync && Array.isArray(linkedinPeopleAsync) && linkedinPeopleAsync.length > 0) {
                sessionStorage.setItem('linkedinCompleted', 'true');
                sessionStorage.setItem('linkedinCount', linkedinPeopleAsync.length.toString());
              } else {
                sessionStorage.setItem('linkedinCompleted', 'true');
                sessionStorage.setItem('linkedinCount', '0');
              }
              
              // Dispatch storage event to notify matches page
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('matchesDataUpdated'));
              
            } catch (asyncError) {
              console.error("Error fetching LinkedIn results asynchronously:", asyncError);
              sessionStorage.removeItem('linkedinLoading');
              sessionStorage.setItem('linkedinCompleted', 'true');
              sessionStorage.setItem('linkedinCount', '0');
              sessionStorage.setItem('linkedinError', asyncError.message || 'Failed to fetch LinkedIn results');
            }
          })();

          // Exit early - navigation already happened above and loading was cleared
          return;
        }
      } catch (error) {
        console.error("Error processing questions:", error);
        console.error("Error stack:", error.stack);
        setLoading(false);
        // Still navigate but with error state
        sessionStorage.setItem('matchesError', error.message);
        sessionStorage.setItem('matchesData', JSON.stringify({
          type: answers[2] === 'hiring community' ? 'jobs' : 'people',
          data: []
        }));
        router.push('/home/matches');
      }
    }
  };

  const handleAnswerChange = (value) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  // Fetch GitHub matches when "Start Questions" is clicked
  const fetchGitHubMatches = async () => {
    console.log("=== fetchGitHubMatches() CALLED ===");
    console.log("GitHub URL state in fetchGitHubMatches:", githubUrl);
    
    if (!githubUrl || !githubUrl.trim()) {
      console.log("⚠️ No GitHub URL provided, skipping GitHub fetch");
      return null;
    }

    setGithubLoading(true);
    console.log("=== STARTING GITHUB FETCH (when questions started) ===");
    console.log("GitHub URL:", githubUrl);
    
    // Create and store the promise
    const fetchPromise = (async () => {
      try {
        // Extract username from GitHub URL
        const githubUsername = githubUrl.trim()
          .replace(/^https?:\/\/(www\.)?github\.com\//, '')
          .replace(/\/$/, '')
          .split('/')[0];
        
        if (githubUsername) {
          console.log("🚀 Fetching GitHub matches for:", githubUsername);
          console.log("GitHub API URL: http://localhost:8002/match/" + githubUsername);
          
          const githubResponse = await fetch(`http://localhost:8002/match/${githubUsername}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          console.log("GitHub response status:", githubResponse.status);
          
          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            console.log("✅ GitHub matches received:", githubData);
            console.log("Number of GitHub matches:", (githubData.matches || []).length);
            
            const processedGithubPeople = (githubData.matches || []).map(match => ({
              ...match,
              source: 'github'
            }));
            
            setGithubPeople(processedGithubPeople);
            console.log("✅✅ GitHub matches processed and stored:", processedGithubPeople.length, "profiles");
            return processedGithubPeople;
          } else {
            const errorText = await githubResponse.text();
            console.error("❌ GitHub fetch failed:", githubResponse.status, errorText);
            return [];
          }
        } else {
          console.error("⚠️ No GitHub username extracted from URL:", githubUrl);
          return [];
        }
      } catch (githubFetchError) {
        console.error("❌ GitHub API error:", githubFetchError);
        console.error("Error details:", githubFetchError.message, githubFetchError.stack);
        return [];
      } finally {
        setGithubLoading(false);
        console.log("=== GITHUB FETCH COMPLETE ===");
      }
    })();
    
    // Store promise reference so we can await it later
    githubFetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  };

  const handleStartQuestions = () => {
    console.log("=== START QUESTIONS BUTTON CLICKED ===");
    console.log("GitHub URL at button click:", githubUrl);
    
    // Validate GitHub URL is not empty
    if (!githubUrl || !githubUrl.trim()) {
      setError("Please enter a GitHub Profile URL before starting questions");
      return;
    }
    
    setError(""); // Clear any previous errors
    
    // Start GitHub fetch FIRST, before showing questions
    console.log("🚀 Starting GitHub fetch BEFORE showing questions...");
    const githubPromise = fetchGitHubMatches();
    console.log("GitHub fetch promise created:", !!githubPromise);
    
    // Then show questions
    setShowQuestions(true);
    console.log("Questions view shown. GitHub fetch should be running in background.");
  };

  return (
    <BackgroundLines className="min-h-screen w-full bg-neutral-950">
      <div className="min-h-screen w-full flex items-center justify-center p-4 py-12 relative z-10">
        <div className="w-full max-w-4xl">
          {!showQuestions ? (
            <div className="bg-neutral-800 rounded-2xl p-6 shadow-lg shadow-black/50 max-h-[calc(100vh-3rem)] overflow-y-hidden">
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
                Dashboard
              </h1>
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleStartQuestions}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 transform"
                >
                  Start Questions
                </button>
              </div>

              <div className="mb-6 w-full flex justify-center">
                <EvervaultCard className="w-full max-w-2xl h-auto" text="">
                  <div className="w-full p-6 bg-neutral-800 rounded-2xl">
                    <div className="flex flex-col gap-4 mb-4">
                      <PlaceholdersAndVanishInput
                        placeholders={[
                          "Enter GitHub Profile URL",
                          "e.g., https://github.com/username",
                          "Paste your GitHub profile link here",
                        ]}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (githubUrl.trim()) {
                            handleScrape(e);
                          }
                        }}
                      />
                    </div>
                    {error && (
                      <p className="mt-3 text-red-400 text-sm">{error}</p>
                    )}
                  </div>
                </EvervaultCard>
              </div>

              <div className="mb-6 w-full flex justify-center">
                <div className="w-full max-w-md">
                  <FileUpload
                    onChange={(files) => {
                      console.log("Files uploaded:", files);
                    }}
                  />
                </div>
              </div>

              {profileData && (
                <div className="mt-8 space-y-6">
                  <div className="border-t border-neutral-700 pt-6">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      {profileData.name}
                    </h2>
                    {profileData.headline && (
                      <p className="text-lg text-purple-400 mb-2">
                        {profileData.headline}
                      </p>
                    )}
                    {profileData.location && (
                      <p className="text-neutral-400 mb-4">
                        {profileData.location}
                      </p>
                    )}
                    {profileData.about && (
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          About
                        </h3>
                        <p className="text-neutral-300">{profileData.about}</p>
                      </div>
                    )}
                  </div>

                  {profileData.experiences &&
                    profileData.experiences.length > 0 && (
                      <div className="border-t border-neutral-700 pt-6">
                        <h3 className="text-xl font-semibold text-white mb-4">
                          Experience
                        </h3>
                        <div className="space-y-4">
                          {profileData.experiences.map((exp, idx) => (
                            <div
                              key={idx}
                              className="bg-neutral-900 rounded-lg p-4"
                            >
                              <h4 className="text-white font-semibold">
                                {exp.title || exp.position}
                              </h4>
                              {exp.company && (
                                <p className="text-purple-400">{exp.company}</p>
                              )}
                              {exp.duration && (
                                <p className="text-neutral-400 text-sm">
                                  {exp.duration}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {profileData.educations &&
                    profileData.educations.length > 0 && (
                      <div className="border-t border-neutral-700 pt-6">
                        <h3 className="text-xl font-semibold text-white mb-4">
                          Education
                        </h3>
                        <div className="space-y-4">
                          {profileData.educations.map((edu, idx) => (
                            <div
                              key={idx}
                              className="bg-neutral-900 rounded-lg p-4"
                            >
                              <h4 className="text-white font-semibold">
                                {edu.school || edu.institution}
                              </h4>
                              {edu.degree && (
                                <p className="text-purple-400">{edu.degree}</p>
                              )}
                              {edu.year && (
                                <p className="text-neutral-400 text-sm">
                                  {edu.year}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {profileData.skills && profileData.skills.length > 0 && (
                    <div className="border-t border-neutral-700 pt-6">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
              <div className="flex flex-col gap-4">
                <h2 className="text-3xl font-bold mb-2 text-center lg:text-left">
                  <EncryptedText
                    text="Intro Questions"
                    revealDelayMs={50}
                    flipDelayMs={50}
                    encryptedClassName="text-purple-400"
                    revealedClassName="text-white"
                    className="inline-block"
                  />
                </h2>
                <CardContainer className="inter-var flex-shrink-0">
                  <CardBody className="bg-neutral-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-purple-500/[0.1] dark:bg-neutral-800 dark:border-white/[0.2] border-neutral-700 w-full sm:w-[40rem] h-auto rounded-xl p-8 border shadow-lg shadow-black/50">
                    <CardItem
                      translateZ="50"
                      className="text-2xl font-bold text-white mb-6"
                    >
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </CardItem>
                    <CardItem
                      translateZ="60"
                      className="text-neutral-300 mb-8 text-2xl"
                    >
                      <EncryptedText
                        text={questions[currentQuestionIndex]}
                        revealDelayMs={50}
                        flipDelayMs={50}
                        encryptedClassName="text-purple-400"
                        revealedClassName="text-neutral-300"
                        className="inline-block"
                      />
                    </CardItem>
                    <form onSubmit={handleQuestionSubmit}>
                      <CardItem translateZ="40" className="mb-6">
                        {questionTypes[currentQuestionIndex] === 'radio' ? (
                          <div className="form-control space-y-4">
                            {(currentQuestionIndex === 3 ? radioOptionsQ4 : radioOptionsQ5).map((option, index) => (
                              <label key={index} className="label cursor-pointer justify-start gap-4 p-4 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-purple-500 transition-colors">
                                <input
                                  type="radio"
                                  name={currentQuestionIndex === 3 ? "connectionType" : "engagementType"}
                                  value={option}
                                  checked={answers[currentQuestionIndex] === option}
                                  onChange={(e) => handleAnswerChange(e.target.value)}
                                  className="radio radio-primary"
                                  required
                                />
                                <span className="label-text text-white capitalize text-lg">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={answers[currentQuestionIndex]}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
                            rows="5"
                            required
                          />
                        )}
                      </CardItem>
                      <CardItem translateZ="30">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin">⏳</span>
                              Processing...
                            </span>
                          ) : (
                            currentQuestionIndex < questions.length - 1
                              ? "Next Question"
                              : "Finish"
                          )}
                        </button>
                      </CardItem>
                      {error && (
                        <CardItem translateZ="20" className="mt-4">
                          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
                            {error}
                          </div>
                        </CardItem>
                      )}
                    </form>
                  </CardBody>
                </CardContainer>
              </div>
              <div className="flex-shrink-0 w-full lg:w-[600px]">
                <ThreeScene />
              </div>
            </div>
          )}
        </div>
      </div>
    </BackgroundLines>
  );
}
