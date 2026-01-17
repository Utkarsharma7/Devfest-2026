"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IconBrandGithub,
  IconBrandGoogle,
} from "@tabler/icons-react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { createOrUpdateUser } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/config";

export default function SignupFormDemo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: ""
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // For form signup, we'll create a user account
      // Note: You'll need to implement email/password auth separately
      // For now, this is just saving the form data
      // In a real app, you'd use createUserWithEmailAndPassword first
      console.log("Form submitted", formData);
      
      // If user is already authenticated (e.g., via Google), save their data
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createOrUpdateUser(currentUser.uid, {
          name: `${formData.firstname} ${formData.lastname}`.trim(),
          firstName: formData.firstname,
          lastName: formData.lastname,
          email: formData.email,
        });
        router.push("/home");
      } else {
        // In a real implementation, create auth account first, then save to Firestore
        console.log("User not authenticated. Please sign in first.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      
      // Save user data to Firestore
      if (user) {
        await createOrUpdateUser(user.uid, {
          name: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
        });
      }
      
      router.push("/home");
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false);
    }
  };
  return (
    <div
      className="shadow-input mx-auto w-full max-w-md rounded-none bg-neutral-800 p-4 md:rounded-2xl md:p-6 dark:bg-neutral-800 shadow-lg shadow-black/50">
      <h2 className="text-xl font-bold text-neutral-200 text-center">
        Welcome
      </h2>
      <form className="my-6" onSubmit={handleSubmit}>
        <div
          className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <LabelInputContainer>
            <Label htmlFor="firstname" className="text-white">First name</Label>
            <Input 
              id="firstname" 
              placeholder="Tyler" 
              type="text" 
              value={formData.firstname}
              onChange={handleInputChange}
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname" className="text-white">Last name</Label>
            <Input 
              id="lastname" 
              placeholder="Durden" 
              type="text" 
              value={formData.lastname}
              onChange={handleInputChange}
            />
          </LabelInputContainer>
        </div>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email" className="text-white">Email Address</Label>
          <Input 
            id="email" 
            placeholder="projectmayhem@fc.com" 
            type="email" 
            value={formData.email}
            onChange={handleInputChange}
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="password" className="text-white">Password</Label>
          <Input 
            id="password" 
            placeholder="••••••••" 
            type="password" 
            value={formData.password}
            onChange={handleInputChange}
          />
        </LabelInputContainer>

        <button
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}>
          {loading ? "Processing..." : "Sign up &rarr;"}
          <BottomGradient />
        </button>

        <div
          className="my-6 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

        <div className="flex flex-col space-y-3">
          <button
            className="group/btn shadow-input relative flex h-10 w-full items-center justify-start space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
            type="submit">
            <IconBrandGithub className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              GitHub
            </span>
            <BottomGradient />
          </button>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group/btn shadow-input relative flex h-10 w-full items-center justify-start space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626] disabled:opacity-50 disabled:cursor-not-allowed"
            type="button">
            <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {loading ? "Signing in..." : "Google"}
            </span>
            <BottomGradient />
          </button>
        </div>
      </form>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span
        className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span
        className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
