"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { OnboardingFlow, onboardingSteps } from "@/components/vibeops/onboarding";
import { TopBar } from "@/components/vibeops/top-bar";
const sampleTranscript =
  "I keep things friendly but I don’t want to sound too casual. I struggle when clients ask for price too early, and I sometimes delay follow-ups because I don’t know how to phrase them.";

const samplePracticeReply =
  "Yes, I can help with that. Before I give a price, can you tell me what kind of business it is, how many pages you need, whether you already have content, and when you want to launch?";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  const step = Math.max(
    0,
    Math.min(
      onboardingSteps.length - 1,
      parseInt(searchParams.get("step") || "0", 10)
    )
  );

  const [selectedProblems, setSelectedProblems] = useState<string[]>([
    "Discussing price",
    "Following up without sounding desperate",
  ]);
  const [transcript, setTranscript] = useState("");
  const [practiceReply, setPracticeReply] = useState("");
  const [showAssessment, setShowAssessment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Read integration connection status from URL params
  const gmailConnected = searchParams.get("gmail") === "connected";
  const gmailLabel = searchParams.get("gmailLabel") ?? undefined;
  function toggleProblem(problem: string) {
    setSelectedProblems((current) =>
      current.includes(problem)
        ? current.filter((item) => item !== problem)
        : [...current, problem]
    );
  }

  function handleBack() {
    if (step > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(step - 1));
      router.push(`/onboarding?${params.toString()}`);
    }
  }

  async function handleNext() {
    if (step === onboardingSteps.length - 1) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedProblems,
            voiceTranscript: transcript,
            practiceReply,
          }),
        });
        if (!res.ok) {
          console.error("Failed to save onboarding:", await res.text());
        }
      } catch (err) {
        console.error("Onboarding save error:", err);
      } finally {
        setIsSaving(false);
      }
      router.push("/dashboard");
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(step + 1));
      router.push(`/onboarding?${params.toString()}`);
    }
  }

  return (
    <OnboardingFlow
      step={step}
      progress={Math.round(((step + 1) / onboardingSteps.length) * 100)}
      selectedProblems={selectedProblems}
      transcript={transcript}
      practiceReply={practiceReply}
      showAssessment={showAssessment}
      gmailConnected={gmailConnected}
      gmailLabel={gmailLabel}
      onToggleProblem={toggleProblem}
      onTranscript={setTranscript}
      onSampleTranscript={() => setTranscript(sampleTranscript)}
      onPracticeReply={setPracticeReply}
      onSampleReply={() => {
        setPracticeReply(samplePracticeReply);
        setShowAssessment(true);
      }}
      onAssess={() => setShowAssessment(true)}
      onBack={handleBack}
      onNext={handleNext}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <TopBar onDashboard={() => router.push("/dashboard")} />
      <Suspense
        fallback={
          <div className="py-10 text-center text-muted-foreground">
            Loading onboarding...
          </div>
        }
      >
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
