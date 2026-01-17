"use client";
import { useEffect, useState } from "react";
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

  const questions = [
    "What's your goal right now?",
    "Your domain (1–3 interests)?",
    "Who do you want: mentors / peers / hiring / founders?",
    "Where: local / remote / global?",
    "Local preference",
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
    if (!answers[currentQuestionIndex].trim()) {
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - save to Firestore
      try {
        const user = auth.currentUser;
        if (user) {
          await saveUserAnswers(user.uid, answers);
          console.log("Answers saved to Firestore:", answers);
        } else {
          console.error("User not authenticated");
        }
      } catch (error) {
        console.error("Error saving answers:", error);
      }
      setShowQuestions(false);
    }
  };

  const handleAnswerChange = (value) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
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
                  onClick={() => setShowQuestions(true)}
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
                          "Enter LinkedIn Profile URL",
                          "e.g., https://www.linkedin.com/in/username/",
                          "Paste your LinkedIn profile link here",
                        ]}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (linkedinUrl.trim() || githubUrl.trim()) {
                            handleScrape(e);
                          }
                        }}
                      />
                      <PlaceholdersAndVanishInput
                        placeholders={[
                          "Enter GitHub Profile URL",
                          "e.g., https://github.com/username",
                          "Paste your GitHub profile link here",
                        ]}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (linkedinUrl.trim() || githubUrl.trim()) {
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
                  <CardBody className="bg-neutral-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-purple-500/[0.1] dark:bg-neutral-800 dark:border-white/[0.2] border-neutral-700 w-full sm:w-[30rem] h-auto rounded-xl p-6 border shadow-lg shadow-black/50">
                    <CardItem
                      translateZ="50"
                      className="text-xl font-bold text-white mb-4"
                    >
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </CardItem>
                    <CardItem
                      translateZ="60"
                      className="text-neutral-300 mb-6 text-lg"
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
                        <textarea
                          value={answers[currentQuestionIndex]}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
                          rows="5"
                          required
                        />
                      </CardItem>
                      <CardItem translateZ="30">
                        <button
                          type="submit"
                          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors"
                        >
                          {currentQuestionIndex < questions.length - 1
                            ? "Next Question"
                            : "Finish"}
                        </button>
                      </CardItem>
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
