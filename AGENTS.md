<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `.agents/skills/antislop/SKILL.md` (core) and then the skill for the task:
- UI / visual: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: download `antislop.md` again, or run `npx antislop-ai --update` if it was installed as skill folders.
<!-- antislop:end -->

<!-- karpathy-guidelines:start -->
## karpathy-guidelines
Follow the Karpathy-inspired behavioral guidelines (`CLAUDE.md`, `.cursor/rules/karpathy-guidelines.mdc`, and `.agents/skills/karpathy-guidelines/SKILL.md`) to prevent common LLM coding pitfalls:
1. **Think Before Coding:** Don't assume. Don't hide confusion. Surface tradeoffs and ask when uncertain. Push back if a simpler approach exists.
2. **Simplicity First:** Write the minimum code that solves the problem. Nothing speculative. No unnecessary abstractions, no unasked "flexibility", no error handling for impossible scenarios.
3. **Surgical Changes:** Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Match existing style. Clean up only your own orphans.
4. **Goal-Driven Execution:** Define clear success criteria and loop until verified. Break multi-step tasks into verifiable checkpoints.
<!-- karpathy-guidelines:end -->
