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
import { MultiSelect } from "@/components/ui/multi-select";
import skillsData from "@/data/skills.json";
import Navbar from "@/components/Navbar";

export default function Dashboard() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState("");

  // Question flow state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(["", [], "", "", ""]); // Note: answers[1] is now an array for skills
  const [showQuestions, setShowQuestions] = useState(false);
  const [githubPeople, setGithubPeople] = useState([]); // Store GitHub results
  const [githubLoading, setGithubLoading] = useState(false); // Track GitHub loading
  const githubFetchPromiseRef = useRef(null); // Track GitHub fetch promise
  const [uploadedFile, setUploadedFile] = useState(null); // Store uploaded file

  // Flatten all skills from categories
  const allSkills = Object.values(skillsData.categories).flat().sort();

  const questions = [
    "What is your primary professional goal or objective right now? (e.g., finding collaborators for a project, networking, career growth, building a startup, etc.)",
    "Describe your technical skills, technologies, programming languages, frameworks, or domains of expertise in detail. (e.g., React, Python, Machine Learning, System Design, DevOps, etc.)",
    "What type of projects, work, or initiatives are you currently working on or interested in? Describe specific areas or topics.",
    "You want to connect with",
    "What type of engagement are you looking for?",
  ];

  // Question types: 'text', 'multiselect', or 'radio'
  const questionTypes = ["text", "multiselect", "text", "radio", "radio"];

  // Radio options for question 4 (connection type)
  const radioOptionsQ4 = ["hiring community", "collaborators"];

  // Radio options for question 5 (engagement type)
  const radioOptionsQ5 = [
    "open source projects",
    "startup ventures",
    "enterprise projects",
    "research & academia",
    "freelance work",
    "mentorship",
  ];

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

  // ============= API Helper Functions =============
  
  /**
   * Upload PDF and extract text using OCR
   */
  const handleOCRUpload = async (file) => {
    try {
      console.log("📄 Uploading PDF for OCR...");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8003/ocr/pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process PDF");
      }

      const ocrData = await response.json();
      console.log("✅ OCR completed:", ocrData);

      // Check if OCR processing was successful
      if (ocrData.status !== "success") {
        throw new Error(ocrData.message || "OCR processing failed");
      }

      // Store OCR text in localStorage
      localStorage.setItem("ocrData", JSON.stringify(ocrData));
      console.log("💾 OCR data saved to localStorage");

      return ocrData;
    } catch (error) {
      console.error("❌ OCR upload error:", error);
      throw error;
    }
  };

  /**
   * Fetch people from LinkedIn using processed filters
   */
  const fetchLinkedInPeople = async (keyword, filters) => {
    try {
      console.log("👥 Fetching LinkedIn people with filters...");
      const response = await fetch("http://localhost:8000/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword,
          filters: filters,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch LinkedIn people");
      }

      const peopleData = await response.json();
      console.log("✅ LinkedIn people received:", peopleData);

      // Handle different response structures
      let people = [];
      if (Array.isArray(peopleData)) {
        people = peopleData;
      } else if (peopleData.data && Array.isArray(peopleData.data)) {
        people = peopleData.data;
      } else if (peopleData.results && Array.isArray(peopleData.results)) {
        people = peopleData.results;
      } else if (peopleData.error) {
        console.warn("LinkedIn API returned error:", peopleData.error);
        people = [];
      }

      console.log("📊 Parsed LinkedIn people count:", people.length);
      return people;
    } catch (error) {
      console.error("❌ LinkedIn people fetch error:", error);
      return [];
    }
  };

  /**
   * Get keywords from LLM
   */
  const fetchKeywordsFromLLM = async (userProfile) => {
    try {
      console.log("🔑 Fetching keywords from LLM...");
      const response = await fetch("http://localhost:8001/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });

      if (!response.ok) {
        throw new Error("LLM keywords request failed");
      }

      const llmData = await response.json();
      console.log("✅ LLM keywords received:", llmData);
      return llmData.keywords || [];
    } catch (error) {
      console.error("❌ LLM keywords error:", error);
      return [];
    }
  };

  /**
   * Fetch jobs from LinkedIn
   */
  const fetchLinkedInJobs = async (keyword, location, maxJobs = 10) => {
    try {
      console.log("💼 Fetching LinkedIn jobs...");
      const response = await fetch(
        `http://localhost:8000/job?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&max_jobs=${maxJobs}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const jobsData = await response.json();
      console.log("✅ Jobs received:", jobsData);
      return jobsData.data || [];
    } catch (error) {
      console.error("❌ Jobs fetch error:", error);
      return [];
    }
  };

  /**
   * Clean keyword formatting
   */
  const cleanKeyword = (keyword) => {
    if (typeof keyword !== "string") return keyword || "";
    return keyword
      .replace(/^\d+[).]\s*/, "") // Remove "1) ", "2. ", etc.
      .replace(/^[-*•]\s*/, "") // Remove "- ", "* ", "• ", etc.
      .trim();
  };

  // ============= End of API Helper Functions =============

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

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    // Check if answer is provided (for text) or selected (for radio/multiselect)
    const currentAnswer = answers[currentQuestionIndex];
    const questionType = questionTypes[currentQuestionIndex];

    if (questionType === "multiselect") {
      if (!Array.isArray(currentAnswer) || currentAnswer.length === 0) {
        setError("Please select at least one skill");
        return;
      }
    } else if (questionType === "text") {
      if (!currentAnswer || !currentAnswer.trim()) {
        return;
      }
    } else if (!currentAnswer) {
      return;
    }

    setError(""); // Clear any errors

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
        const skillsString = Array.isArray(answers[1])
          ? answers[1].join(", ")
          : answers[1];
        const userProfile = {
          goal: answers[0], // Professional goal
          skills: skillsString, // Technical skills and technologies (joined string)
          projects: answers[2], // Projects and initiatives
          connection_type: answers[3], // "hiring community" or "collaborators"
          engagement_type: answers[4], // Engagement type (open source, startup, etc.)
          // Create a comprehensive about section from all answers
          about: `Goal: ${answers[0]}. Technical Skills: ${skillsString}. Current Projects/Interests: ${answers[2]}. Looking for: ${answers[3]} (${answers[4]}).`,
        };

        console.log("\ud83d\udc64 User profile created:", userProfile);

        // ========== Step 1: Get Keywords from LLM ==========
        let keywords = [];
        const fallbackSkill =
          Array.isArray(answers[1]) && answers[1].length > 0
            ? answers[1][0]
            : typeof answers[1] === "string"
              ? answers[1]
              : answers[0];
        let primaryKeyword = fallbackSkill || "developer";

        try {
          keywords = await fetchKeywordsFromLLM(userProfile);
          primaryKeyword =
            Array.isArray(keywords) && keywords.length > 0
              ? cleanKeyword(keywords[0])
              : cleanKeyword(fallbackSkill || "developer");
        } catch (error) {
          console.warn("\u26a0\ufe0f Using fallback keyword due to LLM error");
          primaryKeyword = cleanKeyword(fallbackSkill || "developer");
        }

        console.log("🎯 Primary keyword:", primaryKeyword);

        // ========== Validate GitHub URL ==========
        if (!githubUrl || !githubUrl.trim()) {
          setError(
            "GitHub Profile URL is required. Please enter a valid GitHub URL.",
          );
          setLoading(false);
          return;
        }

        // ========== Step 2: Process based on connection type ==========
        if (answers[3] === "hiring community") {
          // ========== HIRING COMMUNITY PATH: Fetch Jobs ==========
          const location = userProfile.domain || "Global";
          const jobs = await fetchLinkedInJobs(primaryKeyword, location, 10);

          // Store and navigate
          sessionStorage.setItem(
            "matchesData",
            JSON.stringify({
              type: "jobs",
              data: jobs,
            }),
          );

          setLoading(false);
          router.push("/home/matches");
        } else {
          // ========== COLLABORATORS PATH: Fetch People ==========
          
          // Wait for GitHub results
          console.log("🔄 Waiting for GitHub results...");
          let finalGithubPeople = githubPeople.length > 0 ? githubPeople : [];
          
          if (githubLoading && githubFetchPromiseRef.current) {
            try {
              const promiseResult = await githubFetchPromiseRef.current;
              if (promiseResult && promiseResult.length > 0) {
                finalGithubPeople = promiseResult;
                console.log("✅ GitHub results ready:", finalGithubPeople.length);
              }
            } catch (err) {
              console.warn("⚠️ GitHub fetch error:", err);
              finalGithubPeople = githubPeople.length > 0 ? githubPeople : [];
            }
          }

          // Prepare initial GitHub results (max 20)
          const allPeopleInitial =
            finalGithubPeople.length > 0 ? finalGithubPeople.slice(0, 20) : [];

          // Store initial data and navigate
          sessionStorage.setItem(
            "matchesData",
            JSON.stringify({
              type: "people",
              data: allPeopleInitial,
            }),
          );
          sessionStorage.setItem("linkedinLoading", "true");

          setLoading(false);
          router.push("/home/matches");

          // ========== Async LinkedIn Fetch ==========
          (async () => {
            try {
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Fetch LinkedIn people with empty filters (no filter processing)
              console.log("👥 Fetching LinkedIn people with keyword:", primaryKeyword);
              const linkedinPeople = await fetchLinkedInPeople(
                primaryKeyword,
                {}, // Empty filters - let LinkedIn scraper handle it
              );

              if (linkedinPeople.length === 0) {
                console.log("👁️ No LinkedIn results, keeping GitHub only");
                sessionStorage.setItem("linkedinCompleted", "true");
                sessionStorage.setItem("linkedinCount", "0");
                sessionStorage.removeItem("linkedinLoading");
                return;
              }

              // Step 4: Merge results
              const currentMatchesDataStr = sessionStorage.getItem("matchesData");
              let currentGithubPeople = [];
              
              if (currentMatchesDataStr) {
                const currentMatchesData = JSON.parse(currentMatchesDataStr);
                currentGithubPeople = (currentMatchesData.data || []).filter(
                  (p) => p.source !== "linkedin",
                );
              }

              const linkedinWithSource = linkedinPeople.map((p) => ({
                ...p,
                source: "linkedin",
                score: Math.floor(Math.random() * 41) + 60, // Random score 60-100
              }));

              const finalPeople = [
                ...currentGithubPeople.slice(0, 20), // Keep 20 GitHub
                ...linkedinWithSource, // Add LinkedIn
              ];

              console.log("🎉 Final merged results:", finalPeople.length);

              // Update storage
              sessionStorage.setItem(
                "matchesData",
                JSON.stringify({
                  type: "people",
                  data: finalPeople,
                }),
              );
              sessionStorage.setItem("linkedinCompleted", "true");
              sessionStorage.setItem(
                "linkedinCount",
                linkedinWithSource.length.toString(),
              );
              sessionStorage.removeItem("linkedinLoading");

              // Notify page
              window.dispatchEvent(new Event("storage"));
              window.dispatchEvent(new CustomEvent("matchesDataUpdated"));
            } catch (asyncError) {
              console.error("❌ Async LinkedIn fetch error:", asyncError);
              sessionStorage.removeItem("linkedinLoading");
              sessionStorage.setItem("linkedinCompleted", "true");
              sessionStorage.setItem("linkedinCount", "0");
              sessionStorage.setItem(
                "linkedinError",
                asyncError.message || "Failed to fetch LinkedIn results",
              );
            }
          })();

          return;
        }
      } catch (error) {
        console.error("❌ Error processing questions:", error);
        console.error("Error stack:", error.stack);
        setLoading(false);
        
        // Navigate with error state
        sessionStorage.setItem("matchesError", error.message);
        sessionStorage.setItem(
          "matchesData",
          JSON.stringify({
            type: answers[3] === "hiring community" ? "jobs" : "people",
            data: [],
          }),
        );
        router.push("/home/matches");
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
        const githubUsername = githubUrl
          .trim()
          .replace(/^https?:\/\/(www\.)?github\.com\//, "")
          .replace(/\/$/, "")
          .split("/")[0];

        if (githubUsername) {
          console.log("🚀 Fetching GitHub matches for:", githubUsername);
          console.log(
            "GitHub API URL: http://localhost:8002/match/" + githubUsername,
          );

          const githubResponse = await fetch(
            `http://localhost:8002/match/${githubUsername}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log("GitHub response status:", githubResponse.status);

          if (githubResponse.ok) {
            const githubData = await githubResponse.json();
            console.log("✅ GitHub matches received:", githubData);
            console.log(
              "Number of GitHub matches:",
              (githubData.matches || []).length,
            );

            const processedGithubPeople = (githubData.matches || []).map(
              (match) => ({
                ...match,
                source: "github",
              }),
            );

            setGithubPeople(processedGithubPeople);
            console.log(
              "✅✅ GitHub matches processed and stored:",
              processedGithubPeople.length,
              "profiles",
            );
            return processedGithubPeople;
          } else {
            const errorText = await githubResponse.text();
            console.error(
              "❌ GitHub fetch failed:",
              githubResponse.status,
              errorText,
            );
            return [];
          }
        } else {
          console.error("⚠️ No GitHub username extracted from URL:", githubUrl);
          return [];
        }
      } catch (githubFetchError) {
        console.error("❌ GitHub API error:", githubFetchError);
        console.error(
          "Error details:",
          githubFetchError.message,
          githubFetchError.stack,
        );
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
    console.log(
      "Questions view shown. GitHub fetch should be running in background.",
    );
  };

  return (
    <>
      <Navbar />
      <BackgroundLines className="min-h-screen w-full bg-neutral-950">
        <div className="min-h-screen w-full flex items-center justify-center p-4 py-12 pt-20 relative z-10">
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
                      onChange={async (files) => {
                        if (files && files.length > 0) {
                          const file = files[0];
                          console.log("📄 File uploaded:", file.name);
                          setUploadedFile(file);
                          
                          try {
                            // Immediately process with OCR
                            await handleOCRUpload(file);
                            console.log("✅ File processed and stored");
                          } catch (error) {
                            console.error("❌ Failed to process file:", error);
                            setError("Failed to process uploaded file. Please try again.");
                          }
                        }
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
                          <p className="text-neutral-300">
                            {profileData.about}
                          </p>
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
                                  <p className="text-purple-400">
                                    {exp.company}
                                  </p>
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
                                  <p className="text-purple-400">
                                    {edu.degree}
                                  </p>
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
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-center px-4 lg:px-0">
                <div className="flex flex-col gap-4 w-full lg:w-auto">
                  <div className="flex items-center justify-between lg:justify-start gap-4 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center lg:text-left min-h-[60px] flex items-center">
                      <EncryptedText
                        text="Intro Questions"
                        revealDelayMs={50}
                        flipDelayMs={50}
                        encryptedClassName="text-purple-400"
                        revealedClassName="text-white"
                        className="inline-block"
                      />
                    </h2>
                    {/* Progress indicator */}
                    <div className="flex gap-1.5 lg:ml-4">
                      {questions.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentQuestionIndex
                              ? "w-8 bg-gradient-to-r from-purple-500 to-pink-500"
                              : idx < currentQuestionIndex
                                ? "w-2 bg-purple-500"
                                : "w-2 bg-neutral-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <CardContainer
                    className="inter-var flex-shrink-0"
                    containerClassName="py-0"
                  >
                    <CardBody className="bg-neutral-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-purple-500/[0.1] dark:bg-neutral-800 dark:border-white/[0.2] border-neutral-700 w-full sm:w-[90vw] md:w-[32rem] lg:w-[40rem] min-h-[500px] sm:min-h-[600px] rounded-xl p-6 sm:p-8 border shadow-lg shadow-black/50">
                      <CardItem
                        translateZ="50"
                        className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center justify-between"
                      >
                        <span>
                          Question {currentQuestionIndex + 1} of{" "}
                          {questions.length}
                        </span>
                      </CardItem>
                      <CardItem
                        translateZ="60"
                        className="text-neutral-300 mb-6 sm:mb-8 text-lg sm:text-2xl"
                      >
                        <div className="min-h-[80px] sm:min-h-[100px] w-full">
                          <EncryptedText
                            text={questions[currentQuestionIndex]}
                            revealDelayMs={5}
                            flipDelayMs={50}
                            encryptedClassName="text-purple-400"
                            revealedClassName="text-neutral-300"
                            className="inline-block"
                          />
                        </div>
                      </CardItem>
                      <form onSubmit={handleQuestionSubmit} className="w-full">
                        <CardItem translateZ="40" className="mb-6 w-full">
                          {questionTypes[currentQuestionIndex] === "radio" ? (
                            <div className="form-control space-y-3 sm:space-y-4">
                              {(currentQuestionIndex === 3
                                ? radioOptionsQ4
                                : radioOptionsQ5
                              ).map((option, index) => (
                                <label
                                  key={index}
                                  className="label cursor-pointer mx-2 justify-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-purple-500 hover:bg-neutral-850 transition-all duration-200 hover:shadow-md hover:shadow-purple-500/20"
                                >
                                  <input
                                    type="radio"
                                    name={
                                      currentQuestionIndex === 3
                                        ? "connectionType"
                                        : "engagementType"
                                    }
                                    value={option}
                                    checked={
                                      answers[currentQuestionIndex] === option
                                    }
                                    onChange={(e) =>
                                      handleAnswerChange(e.target.value)
                                    }
                                    className="radio radio-primary shrink-0"
                                    required
                                  />
                                  <span className="label-text text-white capitalize text-base sm:text-lg">
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : questionTypes[currentQuestionIndex] ===
                            "multiselect" ? (
                            <MultiSelect
                              options={allSkills}
                              value={answers[currentQuestionIndex] || []}
                              onChange={(selectedSkills) =>
                                handleAnswerChange(selectedSkills)
                              }
                              placeholder="Search and select your skills..."
                            />
                          ) : (
                            <textarea
                              value={answers[currentQuestionIndex]}
                              onChange={(e) =>
                                handleAnswerChange(e.target.value)
                              }
                              placeholder="Type your answer here..."
                              className="w-full px-3 sm:px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all duration-200 text-sm sm:text-base"
                              rows="8"
                              required
                            />
                          )}
                        </CardItem>
                        <CardItem
                          translateZ="30"
                          className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                        >
                          {currentQuestionIndex > 0 && (
                            <button
                              type="button"
                              onClick={handlePreviousQuestion}
                              disabled={loading}
                              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-neutral-700 text-white font-semibold hover:bg-neutral-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-md"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Back
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02]"
                          >
                            {loading ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                Processing...
                              </>
                            ) : (
                              <>
                                {currentQuestionIndex < questions.length - 1
                                  ? "Next Question"
                                  : "Finish"}
                                {currentQuestionIndex <
                                  questions.length - 1 && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </>
                            )}
                          </button>
                        </CardItem>
                        {error && (
                          <CardItem translateZ="20" className="mt-4">
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 sm:p-4 text-red-400 text-xs sm:text-sm">
                              {error}
                            </div>
                          </CardItem>
                        )}
                      </form>
                    </CardBody>
                  </CardContainer>
                </div>
                <div className="flex-shrink-0 w-full lg:w-[600px] h-[300px] sm:h-[400px] lg:h-auto">
                  <ThreeScene />
                </div>
              </div>
            )}
          </div>
        </div>
      </BackgroundLines>
    </>
  );
}
