---
name: figma-desktop-bridge
description: Connects Cursor work to Figma through the user-Figma Desktop MCP server for two-way design/code workflows. Use when the user wants to implement UI from Figma, push UI mockups into Figma, align components with the design system, or keep Figma and code in sync.
---

# Figma Desktop Bridge

Use this skill for bidirectional design/code work in this repo, with `user-Figma Desktop` as the default connection.

## Default behavior

1. Prefer MCP server: `user-Figma Desktop`.
2. If unavailable, fall back to `plugin-figma-figma`.
3. For any write action in Figma, load and follow the `figma-use` skill first.
4. Keep design tokens and component usage aligned with `assets/design-system`.

## Trigger phrases

Apply this skill when requests include phrases like:
- "connect to figma"
- "implement from figma"
- "write to figma"
- "sync figma and code"
- "update design to match UI"
- "update UI to match design"

## Workflow A: Implement code from Figma

1. Confirm target frame/component in Figma (name or URL).
2. Inspect structure, spacing, typography, colors, and interaction states.
3. Map visual elements to existing design-system components first.
4. Implement in code with minimal custom styling.
5. Validate in local UI and adjust for close visual parity.

## Workflow B: Push UI ideas into Figma

1. Identify the target app screen/flow in code.
2. Extract reusable blocks from `assets/design-system` patterns.
3. Recreate sections in Figma incrementally (layout first, details second).
4. Bind to tokens/variables instead of hardcoded values.
5. Name layers and frames for easy handoff and iteration.

## Guardrails

- Prefer existing design-system components over one-off primitives.
- Keep naming consistent between code and Figma where possible.
- Avoid backend dependencies for prototyping tasks unless explicitly requested.
- If a request is ambiguous, ask for the target frame/page before heavy edits.

## Deliverables format

When finishing Figma-related tasks, provide:
- What was changed (design, code, or both)
- Where it changed (`Figma frame/component` and code path)
- Any known gaps (tokens, interactions, responsive behavior)
- Suggested next UX iteration
