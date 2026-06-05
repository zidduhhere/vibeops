"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowRight, Check, CheckCircle2, Gauge, Mic, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
export const problemOptions = [
  "Starting conversations with new leads",
  "Discussing price",
  "Following up without sounding desperate",
  "Saying no to scope creep",
  "Giving project delays professionally",
  "Asking for content/assets",
  "Handling impatient clients",
  "Managing WhatsApp/email overload",
];

export const workflows = [
  "Pricing reply assistant",
  "Follow-up assistant",
  "Scope creep detector",
  "Client update generator",
];

export const onboardingSteps = [
  "Problem discovery",
  "Voice setup",
  "Practice",
  "Integrations",
  "First value",
];

export type OnboardingProps = {
  step: number;
  progress: number;
  selectedProblems: string[];
  transcript: string;
  practiceReply: string;
  showAssessment: boolean;
  onToggleProblem: (problem: string) => void;
  onTranscript: (value: string) => void;
  onSampleTranscript: () => void;
  onPracticeReply: (value: string) => void;
  onSampleReply: () => void;
  onAssess: () => void;
  onBack: () => void;
  onNext: () => void;
  gmailConnected?: boolean;
  gmailLabel?: string;
};

export function OnboardingFlow(props: OnboardingProps) {
  return (
    <section className="mx-auto w-full max-w-5xl flex-1 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Step {props.step + 1} of {onboardingSteps.length}
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.025em]">
            {onboardingSteps[props.step]}
          </h2>
        </div>
        <div className="w-full sm:w-64">
          <Progress value={props.progress} />
        </div>
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {props.step === 0 && <ProblemStep {...props} />}
          {props.step === 1 && <VoiceStep {...props} />}
          {props.step === 2 && <PracticeStep {...props} />}
          {props.step === 3 && (
            <IntegrationStep
              gmailConnected={props.gmailConnected ?? false}
              gmailLabel={props.gmailLabel}
            />
          )}
          {props.step === 4 && (
            <FirstValueStep selectedProblems={props.selectedProblems} />
          )}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="ghost"
              onClick={props.onBack}
              disabled={props.step === 0}
            >
              Back
            </Button>
            <Button onClick={props.onNext}>
              {props.step === onboardingSteps.length - 1
                ? "Continue to plans"
                : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ProblemStep({
  selectedProblems,
  onToggleProblem,
}: OnboardingProps) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.02em]">
        Where do client conversations usually get difficult?
      </h3>
      <p className="mt-2 text-muted-foreground">
        Select every area where you want the assistant to watch, draft, or
        rehearse with you.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {problemOptions.map((option) => {
          const checked = selectedProblems.includes(option);
          return (
            <Button
              key={option}
              type="button"
              variant="outline"
              onClick={() => onToggleProblem(option)}
              className={cn(
                "h-auto justify-start gap-3 rounded-xl p-4 text-left whitespace-normal",
                checked
                  ? "border-primary bg-secondary text-secondary-foreground ring-2 ring-ring/20"
                  : "bg-background hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background"
                )}
              >
                {checked && <Check className="size-3" />}
              </div>
              <span className="text-sm font-medium">{option}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function VoiceStep({
  transcript,
  onTranscript,
  onSampleTranscript,
}: OnboardingProps) {
  const hasTranscript = transcript.trim().length > 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.78fr]">
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.02em]">
          Tell us how you usually talk to clients and where communication gets
          hard.
        </h3>
        <Card className="mt-5 border-border bg-muted/40 shadow-none">
          <CardContent className="p-4">
            <Button
              type="button"
              className="mx-auto flex size-20 rounded-full shadow-lg"
              aria-label="Microphone setup placeholder"
            >
              <Mic className="size-7" />
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Voice capture is coming later. Use the fallback field for now.
            </p>
            <Textarea
              value={transcript}
              onChange={(event) => onTranscript(event.target.value)}
              className="mt-4 min-h-36 bg-background"
              placeholder="Describe your client communication style..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={onSampleTranscript}
              className="mt-3"
            >
              Use sample transcript
            </Button>
          </CardContent>
        </Card>
      </div>
      <ProfilePreview active={hasTranscript} />
    </div>
  );
}

function ProfilePreview({ active }: { active: boolean }) {
  const rows = [
    ["Tone", "friendly, professional, direct"],
    ["Reply length", "medium"],
    ["Needs help with", "pricing, follow-ups, scope boundaries"],
    ["Client style", "small business owners and founders"],
  ];
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-primary" />
        <h4 className="font-semibold">Extracted profile preview</h4>
      </div>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                !active && "blur-[2px]"
              )}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      {!active && (
        <p className="mt-5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Add a transcript or sample to reveal the profile.
        </p>
      )}
    </div>
  );
}

function PracticeStep({
  practiceReply,
  showAssessment,
  onPracticeReply,
  onSampleReply,
  onAssess,
}: OnboardingProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.02em]">
          Practice with a realistic lead.
        </h3>
        <Card className="mt-5 border-border bg-muted/40 shadow-none">
          <CardContent className="p-4">
            <Badge variant="outline">WhatsApp lead</Badge>
            <p className="mt-4 text-lg leading-8">
              “Hi bro, website create cheyyumo? Need for my business. How much
              cost?”
            </p>
          </CardContent>
        </Card>
        <Textarea
          value={practiceReply}
          onChange={(event) => {
            onPracticeReply(event.target.value);
            if (event.target.value.trim()) onAssess();
          }}
          className="mt-4 min-h-36 bg-background"
          placeholder="Type your reply..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onSampleReply}>
            Use sample reply
          </Button>
          <Button onClick={onAssess} disabled={!practiceReply.trim()}>
            Assess reply
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-background p-5">
        {showAssessment ? (
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Communication score</h4>
              <span className="text-3xl font-semibold">82</span>
            </div>
            <Progress value={82} className="mt-3" />
            <div className="mt-5 grid gap-4">
              <AssessmentBlock
                title="Strengths"
                items={[
                  "friendly",
                  "did not rush pricing",
                  "asked discovery questions",
                ]}
              />
              <AssessmentBlock
                title="Improvements"
                items={[
                  "add a clearer next step",
                  "mention you can share a range after scope",
                ]}
              />
              <div>
                <p className="text-sm font-semibold">
                  Improved reply in your tone
                </p>
                <p className="mt-2 rounded-xl bg-muted p-3 text-sm leading-6">
                  Yes, I can help with that. To give you a useful price range,
                  I need to understand the scope first: what business is this
                  for, how many pages do you need, do you already have
                  content/branding, and when do you want to launch? Once I know
                  that, I can suggest the right package and timeline.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
            <Sparkles className="size-8 text-primary" />
            <p className="mt-3 font-medium">Assessment appears after a reply.</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              VibeOps checks tone, pricing pressure, next step clarity, and
              boundary risk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssessmentBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 text-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationStep({
  gmailConnected,
  gmailLabel,
}: {
  gmailConnected: boolean;
  gmailLabel?: string;
}) {
  const channels = [
    {
      key: "gmail",
      icon: () => <img src="/gmail.svg" alt="Gmail" className="size-5" />,
      title: "Gmail",
      body: "Pull client email threads into one reviewed reply queue.",
      live: true,
      connected: gmailConnected,
      label: gmailLabel,
      href: "/api/integrations/gmail",
    },
    {
      key: "whatsapp",
      icon: () => <img src="/whatsapp-icon.svg" alt="WhatsApp" className="size-5" />,
      title: "WhatsApp",
      body: "Manage WhatsApp client conversations with AI-drafted replies.",
      live: false,
      connected: false,
      label: undefined,
      href: undefined,
    },
    {
      key: "outlook",
      icon: () => <img src="/microsoft-outlook.svg" alt="Outlook" className="size-5" />,
      title: "Outlook",
      body: "Connect your Outlook inbox for professional email management.",
      live: false,
      connected: false,
      label: undefined,
      href: undefined,
    },
    {
      key: "notion",
      icon: () => <img src="/notion.svg" alt="Notion" className="size-5" />,
      title: "Notion",
      body: "Turn project notes into client-safe status updates.",
      live: false,
      connected: false,
      label: undefined,
      href: undefined,
    },
  ];

  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.02em]">
        Connect your client channels
      </h3>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Connect Gmail now. More channels are coming soon.
      </p>
      <div className="mt-7 grid gap-3">
        {channels.map((ch) => (
          <div
            key={ch.key}
            className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <ch.icon />
            </div>
            <div>
              <p className="font-medium">{ch.title}</p>
              <p className="text-sm text-muted-foreground">{ch.body}</p>
              {ch.connected && ch.label && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {ch.label}
                </p>
              )}
            </div>
            {ch.live ? (
              ch.connected ? (
                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-500">
                  Connected ✓
                </Badge>
              ) : (
                <a href={ch.href}>
                  <button
                    type="button"
                    className="h-9 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                </a>
              )
            ) : (
              <Badge variant="outline" className="text-zinc-400">
                Coming soon
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FirstValueStep({
  selectedProblems,
}: {
  selectedProblems: string[];
}) {
  const values = [
    "Voice profile created",
    "Communication pain points detected",
    "First lead reply improved",
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.02em]">
          Your first communication assistant is ready.
        </h3>
        <div className="mt-6 space-y-3">
          {values.map((value) => (
            <div key={value} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-primary" />
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-muted p-4">
          <p className="text-sm font-semibold">Detected pain points</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {selectedProblems.length
              ? selectedProblems.join(", ")
              : "No pain points selected yet."}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Recommended workflows enabled</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {workflows.map((workflow) => (
            <div key={workflow} className="rounded-xl bg-muted p-4 text-sm">
              {workflow}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
