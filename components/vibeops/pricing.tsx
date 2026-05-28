"use client";

import { Check, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
const plans = [
  {
    id: "solo",
    name: "Solo",
    price: "$19",
    note: "For independent developers managing active leads and clients.",
    features: [
      "AI reply drafts",
      "Lead/client inbox",
      "Voice profile",
      "Follow-up reminders",
      "Communication practice",
      "Basic integrations",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: "$49",
    note: "For small studios with more client volume and shared workflows.",
    features: [
      "Everything in Solo",
      "More clients/conversations",
      "Advanced automations",
      "Team/studio workspace",
      "Higher AI usage",
      "Priority integrations",
    ],
  },
];

const trustReducers = [
  "Cancel anytime",
  "No auto-send without approval",
  "Private client context",
  "Start with sample data before connecting tools",
];

import type { PlanId } from "./types";

export function PricingScreen({
  selectedPlan,
  onSelectPlan,
  onDashboard,
}: {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
  onDashboard: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl flex-1 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <Badge variant="outline">7-day trial</Badge>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Start managing clients with your AI communication assistant.
          </h2>
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                "cursor-pointer border-border bg-card shadow-sm transition",
                active && "border-primary ring-2 ring-ring"
              )}
              onClick={() => onSelectPlan(plan.id as PlanId)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.note}</CardDescription>
                  </div>
                  {active && <Badge>Selected</Badge>}
                </div>
                <div className="pt-4">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="size-4 text-primary" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button className="mt-6 w-full" onClick={onDashboard}>
                  Start 7-day free trial
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {trustReducers.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
