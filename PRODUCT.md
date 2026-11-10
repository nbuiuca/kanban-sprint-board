# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Game development team members, indie game creators, and production leads tracking sprints, bugs, art/design assets, and game build milestones.

## Product Purpose

Provide a visual, friction-free Kanban board for game teams to organize tasks from backlog to release. Success means zero-friction onboarding, instant workspace sync, and crystal-clear visual clarity across design, code, and bug-fixing pipelines.

## Positioning

Instant, zero-login collaboration powered by Supabase Anonymous Auth that lets any team member or reviewer immediately view, drag, and manage game development tasks without creating an account or hitting auth barriers.

## Operating Context

- Desktop and mobile browser environments for developers, artists, and game producers.
- Fast-paced sprint cycles, daily standups, milestone reviews, and rapid bug triage.
- Integrates with Supabase backend for persistent task, member, and activity state.

## Capabilities and Constraints

- **Four Fixed Columns:** To Do, In Progress, In Review, Done.
- **Task Attributes:** Title, description, priority (`low`, `normal`, `high`), due date, assignee, and tags/labels (`Bug`, `Feature`, `Design`, `Backend`, `Polish`).
- **Anonymous Guest Auth:** Automatic session initialization via Supabase Anonymous Sign-ins with strict RLS policies.
- **Interactions:** Fast drag-and-drop card positioning and status updating (`@hello-pangea/dnd`).
- **Audit & Feedback:** Task comment threads and activity logging.

## Brand Commitments

- **Product Name:** Next Play Games - Kanban (`Next Play Games`)
- **Tone:** Professional, streamlined, high-craft, game-studio focused.
- Dark theme baseline with distinct column accent colors and priority visual cues.

## Evidence on Hand

- Runnable React 19 + TypeScript + Vite + Tailwind CSS application at `src/App.tsx`.
- Data schemas and sample workspace seed data in `src/lib/kanbanApi.ts` and `src/types/kanban.ts`.
- Supabase connection configured in `.env.local`.

## Product Principles

1. **Zero-Friction Access:** No auth barriers for team members to immediately view and contribute.
2. **Visual Hierarchy for Game Pipelines:** High scanability across art, code, and design states with unmistakable priority and overdue signals.
3. **Optimistic & Tactile Interaction:** Card drag-and-drop and status transitions feel immediate and responsive.
4. **Transparent Audit Trail:** Task histories and comments preserve context across team members.
