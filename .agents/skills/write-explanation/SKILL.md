---
name: write-explanation
description: Write an explanation document (Diataxis "learn") through codebase exploration, structured brainstorming, and outline speedrunning
user-invocable: true
---

# Write Explanation

Write an explanation document for the `docs/learn/` or `packages/<module>/src/docs/learn/` directory. Explanation is **understanding-oriented** — the reader is here to understand a concept, not accomplish a task or look something up.

## Input

The user describes what concept or topic needs explaining, and for whom. They may also point to specific files, modules, or areas of the codebase that are relevant.

## Writing Standards

These apply to all writing in this session:

- **Concrete over abstract.** Prefer examples, specifics, and tangible explanations.
- **Every sentence earns its place.** If it doesn't add information or move the reader forward, cut it.
- **Match the reader.** Calibrate vocabulary, depth, and assumed knowledge to the audience.
- **Clarity is king.** Choose the clearer option over the cleverer one.
- **No filler.** No "It's worth noting that...", "In order to...", "It's important to understand that...".
- **No restating.** Say it once, say it well, move on.
- **No fabrication.** Every technical claim must be grounded in what you've read in the codebase. If unsure about a technical detail, flag with `[VERIFY]` rather than stating as fact. Never write from general knowledge when specific implementation details exist in the code.
- **No generic intros/conclusions.** No "In today's fast-paced world..." or equivalent.

## Explanation Principles (Diataxis)

- Illuminate concepts, provide context, build mental models.
- Answer "why?" — why is it this way? why does it matter?
- Connect ideas to things the reader already knows.
- Discuss alternatives and trade-offs — understanding means seeing the landscape.
- Address misconceptions directly — name what people get wrong and why.
- Don't teach procedures or document facts — explain the meaning behind them.
- The reader should finish with an "aha!" feeling.

## Phase 1: Orient

_Mode: Explorer and cartographer — build grounded understanding before the conversation begins._

Before you ask the human a single question, explore the codebase to understand what you're working with. The quality of your questions — and eventually your writing — depends on the depth of this exploration.

**Actions:**

1. **Read any files the human pointed to.** If they mentioned specific modules, files, or code areas, read them thoroughly first.

2. **Explore the relevant area of the codebase.** Based on what the human described, find and read:
   - The source code that implements the concept — not just types and signatures, but the actual implementation. Understand how it works, not just what it exposes.
   - Tests related to the concept — test descriptions and assertions reveal intended behavior, edge cases, invariants, and the developer's own mental model of what matters. Read the test logic, not just the test names.
   - Examples that demonstrate the concept — what patterns do they show? What do they skip?
   - Existing documentation — what's already written? Is it accurate? Where does it fall short?

3. **Look for nuance.** Specifically search for:
   - Edge cases and boundary conditions (visible in tests, error handling, and conditional logic)
   - Design decisions — why is the API shaped this way? What alternatives were likely considered? Look for comments, deprecated code, naming patterns that reveal intent.
   - Pain signals — `TODO`, `FIXME`, `HACK`, `WORKAROUND` comments near the relevant code
   - Invariants — what must always be true for this to work correctly?
   - Failure modes — what happens when things go wrong? What errors are thrown and why?
   - Defaults and their rationale — what happens when the user doesn't configure something?
   - Connections to other concepts — where does this touch other parts of the system?

4. **Note what you find.** Keep a mental inventory of:
   - Things that surprised you (these are likely to surprise readers too)
   - Things that confused you initially (these need extra clarity in the doc)
   - Things that are subtle or easy to miss (these are the nuances the doc must capture)
   - Contradictions between code and any existing docs (these need resolution)

**This phase is not optional and should not be rushed.** The depth of your exploration directly determines the quality of your writing. A doc written from shallow understanding reads as generic. A doc written from deep code understanding reads as authoritative.

**Phase transition:** Move to Phase 2 with your findings ready to share.

## Phase 2: Understand

_Mode: Conceptual listener — understand what's confusing and what understanding looks like._

You've explored the code. Now align with the human on scope, audience, and intent. Come to this conversation with substance — share what you found, surface what surprised you, and ask questions born from your exploration.

**Open with your strongest insight from exploration.** Share what you learned and your interpretation of the concept. Give the human something concrete to react to. For example: "I read through the reconciler implementation and tests — the core insight seems to be that it diff-compares declarative state against actual state rather than tracking mutations. Is that the right mental model to build the explanation around?"

Then explore (one question at a time, share reflections after each answer):

- The concept — what exactly needs explaining? (Informed by what you found in the code)
- Why it's confusing — where do people get stuck? (You may have hypotheses from reading the code — share them)
- Reader's starting point — what do they already know?
- Why it matters — what does understanding this unlock?
- Depth level — intuition, working understanding, or deep mastery?
- Scope — what's in, what's out?
- Related concepts — what else connects? (You've seen the connections in the code — name them)
- Common misconceptions — what do people get wrong? (Edge cases from tests may reveal these)
- Desired mental model — what should the reader's internal picture look like after?

**Surface contradictions.** If something the human says contradicts what you found in the code, say so openly. These moments are gold — they reveal exactly where the explanation needs to be most precise.

**Gate:** Articulate the concept, why it's confusing, and what understanding looks like. **Do not proceed until confirmed.**

**Artifact:** Explanation Scope Brief.

## Phase 3: Deep Dive

_Mode: Code archaeologist — now that you know the scope, go deep on exactly what matters._

Phase 1 was a broad survey. Now you know exactly what concept you're explaining, who the audience is, and what understanding looks like. Go back to the code with this focused lens.

**Actions:**

1. **Re-read the core implementation with fresh eyes.** You now know what the reader needs to understand. Read the code asking: "What would someone need to know to build the right mental model of this?"

2. **Trace key flows end-to-end.** For the concept being explained:
   - What's the happy path? Walk through it step by step in the code.
   - What are the error paths? What goes wrong and how does the system respond?
   - What are the edge cases? (Tests are your best friend here.)
   - What are the configuration/customization paths?

3. **Identify what the explanation must get right.** Based on your deep read:
   - What are the 2-3 things that, if the reader understands them, everything else clicks?
   - What's the most common way to misunderstand this?
   - Where does the abstraction intentionally leak, and why?
   - What subtle behaviors would surprise a developer?

4. **Gather concrete material.** Collect specific things from the code that could serve the explanation:
   - Code patterns that illustrate the concept clearly
   - Meaningful default values that reveal design intent
   - Error messages that hint at invariants
   - Test cases that demonstrate important behavior (especially edge cases)
   - Comments from the maintainers that explain "why"

**Take your time.** The nuances you find here are what separate a generic explanation from one that makes readers think "whoever wrote this really understands the system."

**Phase transition:** Share a brief summary of your deep findings with the human — especially anything that surprised you or that changes how you'd approach the explanation. Then move to Phase 4.

## Phase 4: Expand

_Mode: Conceptual explorer — find angles that illuminate, grounded in what you've learned from the code._

**Calibration:** Ask how abstract vs. concrete (Abstract / Grounded / Heavily Grounded). Recommend based on concept.

Go wide across:

1. Angles and framings — different ways to approach the concept (informed by how the code actually works)
2. Analogies and metaphors — what familiar things does this resemble? (Test these against the code — a metaphor that breaks at the edges can mislead)
3. Mental models — what internal picture should the reader build? (Grounded in the actual implementation, not a simplified fiction)
4. Historical/evolutionary context — how did this come to be? (Visible in the code through deprecated patterns, comments, naming evolution)
5. Contrasts — what is this _not_? (Adjacent concepts in the codebase help here)
6. Misconceptions to address (informed by edge cases in tests and common misuse patterns you found)
7. Connections to other concepts
8. Wild cards — surprising angles, thought experiments

Aim for 2–4 ideas per category.

**Important:** Every analogy and mental model you propose should hold up against the code you've read. Flag if an analogy is intentionally simplified ("This analogy works for the core concept but breaks down when you get to X — the doc should acknowledge that").

**Gate:** Human indicates which approaches resonate.

**Artifact:** Conceptual Approaches Bank.

## Phase 5: Curate

_Mode: Explanation architect — design for clarity and "aha" moments._

- Choose the best primary angle for this audience and depth.
- Select the most illuminating analogies and mental models.
- Map the conceptual flow — what order should ideas unfold?
- Decide what context to include (history, trade-offs, background).
- Identify which misconceptions to address explicitly.
- Determine what to leave out.
- Flag where readers might get lost and plan how to keep them.
- Plan where code examples, diagrams, or concrete illustrations will appear — and what specific code patterns or behaviors from the codebase they'll draw on.
- Recommend a structure with rationale.

**Gate:** Human agrees on angle, flow, and structure.

**Artifact:** Explanation Structure.

## Phase 6: Outline

_Mode: Outline engineer — structure the skeleton, work fast, iterate in layers._

**Protocol:**

1. Present a high-level outline — top-level sections as simple bullets.
2. Wait for approval.
3. Break all sections one level deeper. For sections that explain specific code behavior, note which code/tests/patterns you'll draw from.
4. Wait for approval.
5. Repeat until leaf sections are small enough to write directly (a few paragraphs each).
6. Present the full consolidated outline.
7. Coherence check — does the flow work end-to-end? Gaps? Redundancies? Does the outline cover the nuances you found in the Deep Dive?
8. Wait for final approval.

**Artifact:** Full Recursive Outline.

## Phase 7: Speedrun

_Mode: Rapid drafter — write fast, fill the skeleton, grounded in code reality._

- Work through the outline in order, filling each leaf section.
- Label sections with their outline position.
- Write fast and rough. Placeholder language is acceptable. Awkward phrasing is fine.
- **Do not polish.** No refining sentences, perfecting word choices, or smoothing transitions. That is Phase 8's job.
- **Ground every technical claim.** When explaining how something works, write from what you read in the code, not from general knowledge. If you're describing behavior, you should be able to point to the code or test that demonstrates it.
- If unsure about a detail, write `[VERIFY: ...]` and keep moving.
- If you realize you need to check something in the code to write a section accurately, do it. A quick read is better than a wrong paragraph.

**Artifact:** Raw Draft.

## Phase 8: Polish

_Mode: Quality editor — tighten, refine, ensure it reads as a coherent whole._

1. **Spotlight:** Identify the 3–5 weakest sections. Present assessment.
2. **Reader simulation:** Read as the target reader. Note where you'd get confused, where attention drifts, where something feels unexplained.
3. **Accuracy check:** Re-read key technical claims against the code. Verify that:
   - Described behaviors match the actual implementation
   - Examples and code patterns are accurate and idiomatic
   - Edge cases and caveats you found in the Deep Dive are properly reflected
   - No nuances were lost in the simplification from code to explanation
4. **Edit:**
   - Fix weakest sections first.
   - Check coherence — does the thread hold beginning to end?
   - Tighten language — apply writing standards, cut filler.
   - Smooth transitions.
   - Ensure mental model builds progressively.
   - Suggest where diagrams or examples would help.
   - Resolve `[VERIFY]` flags — go back to the code for each one.

**Artifact:** Final Explanation, placed in the correct `docs/learn/` or `src/docs/learn/` directory.
