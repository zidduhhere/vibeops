# Graph Report - .  (2026-05-28)

## Corpus Check
- Corpus is ~35,965 words - fits in a single context window. You may not need a graph.

## Summary
- 263 nodes · 443 edges · 25 communities (13 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 51 edges
2. `Lucide React Icons` - 18 edges
3. `compilerOptions` - 16 edges
4. `Button()` - 13 edges
5. `Badge()` - 11 edges
6. `Card()` - 7 edges
7. `CardContent()` - 7 edges
8. `useAuth()` - 7 edges
9. `AuthProvider Context` - 7 edges
10. `tailwind` - 6 edges

## Surprising Connections (you probably didn't know these)
- `CardAction()` --calls--> `cn()`  [EXTRACTED]
  components/ui/card.tsx → lib/utils.ts
- `CardFooter()` --calls--> `cn()`  [EXTRACTED]
  components/ui/card.tsx → lib/utils.ts
- `Log In Page` --references--> `AuthProvider Context`  [INFERRED]
  app/login/page.tsx → lib/auth.tsx
- `Sign Up Page` --references--> `AuthProvider Context`  [INFERRED]
  app/signup/page.tsx → lib/auth.tsx
- `SignupPage()` --calls--> `useAuth()`  [EXTRACTED]
  app/signup/page.tsx → lib/auth.tsx

## Hyperedges (group relationships)
- **Authentication Flow** — auth_provider, sandbox_auth_provider, auth0_wrapper, use_auth_hook [EXTRACTED 1.00]
- **Page Routing Structure** — landing_page, signup_page, login_page, onboarding_page, pricing_page, dashboard_page [INFERRED 0.85]
- **UI Component System** — landing_screen_component, dashboard_shell, pricing_screen, onboarding_flow, top_bar [INFERRED 0.80]

## Communities (25 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (22): cn(), Checkbox(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogTitle() (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (17): Input(), Select(), SelectValue(), DashboardShell(), conversations, filters, integrationLayers, landingSections (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (14): featureList, FeaturesSection(), LandingFooter(), LandingHeader(), LandingHero(), HowItWorksSection(), platformIcons, VideoDemoSection() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (23): Root Layout Component, Auth0 NextJS Auth0 4.21.0, Auth0Wrapper Component, AuthProvider Context, cn Utility Function, Global Styles, Log In Page, React 19.2.4 (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (20): dependencies, @auth0/nextjs-auth0, class-variance-authority, clsx, lucide-react, next, radix-ui, react (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (5): Progress(), Textarea(), OnboardingFlow(), OnboardingProps, onboardingSteps

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (8): metadata, AuthContext, AuthContextType, AuthProvider(), AuthUser, useAuth(), LoginPage(), SignupPage()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (10): Card(), CardAction(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), PricingScreen() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (12): ConversationId Type, Dashboard Page, DashboardShell Component, Landing Page, LandingScreen Component, Mock Data Module, Next.js 16.2.6, OnboardingFlow Component (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (4): Geist Font Family, Next.js Framework, Next.js Project README, Vercel Deployment Platform

### Community 14 - "Community 14"
Cohesion: 0.50
Nodes (4): Sample Conversations, Landing Page Sections, Pricing Plans, VibeOps: AI client communication command center

## Knowledge Gaps
- **94 isolated node(s):** `config`, `name`, `version`, `private`, `dev` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Lucide React Icons` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `config`, `name`, `version` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10967741935483871 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09885057471264368 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._