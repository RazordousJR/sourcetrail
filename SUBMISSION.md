# SourceTrail — submission working copy

## Pitch
One source changes. Trace every article and claim that needs a second look with a local Relate evidence graph.

## Inspiration
Independent publishers reuse evidence across articles, but a checklist cannot show where a withdrawn source has travelled. A claim might cite a digest that cites an earlier report. SourceTrail makes that hidden chain visible before another story goes to proof.

## What it does
SourceTrail connects articles, claims and sources in a persistent local graph. An editor changes a source's status once and sees affected articles, claim-level reasons, and indirect citation paths. Unrelated stories stay clear. Restoring a source does not silently reinstate previous reviews: the editor must record a fresh evidence review. Updates and reviews remain in the local history after a restart.

## How we built it
The app uses Node.js, plain browser JavaScript and CSS, and the official @relate/relate embedded client. Relate stores Article, Claim, Source and Event nodes in a directory graph. Parameterized Cypher traverses up to eight CITES hops to find dependencies, marks evidence stale, and prevents clearing an evidence review while an upstream source is flagged. Transactions keep source updates, invalidations and history consistent. No cloud service or model API is used at runtime.

## Challenges
Source availability and evidence review are different states. A source may be available again while the editor's earlier review is still invalid. We preserve that distinction on the evidence relationship, including when the change occurred upstream of an intermediate digest.

## Accomplishments
The complete withdrawal-to-review flow runs against the actual Relate engine. Process-restart tests verify persistence; graph tests verify indirect propagation and isolation of an unrelated story. The interface provides a source register, claim-level review, an interactive graph and a saved event history.

## What we learned
Connected context is useful even without an LLM. Traversing the evidence graph exposes dependencies that text similarity and per-article checklists cannot express reliably.

## What's next
Add article/claim import and editing, explicit reviewer identities, source revision comparisons, and richer provenance for citation paths beyond the current eight-hop limit.

## Built with
Relate by Neo4j, Node.js, JavaScript, Cypher, HTML, CSS. Development assistance: OpenAI Codex.

## AI and third-party disclosure
OpenAI Codex assisted with design, implementation, synthetic data, testing, documentation and submission copy. No prior-project code was reused. All demo stories, sources and names in the workspace are synthetic. Relate and its platform package are Apache-2.0; Koffi is MIT; optional Google Fonts are SIL OFL. SourceTrail is MIT licensed. No runtime AI calls, paid cloud services, stock imagery or music.

## Release status
- Relate registration: verified completed on 15 November 2026; user confirmed "done".
- Working local integration and persistent graph: verified.
- Graph integration tests: 4 passing.
- Chrome withdrawal/indirect-impact flow: verified.
- Public repo: https://github.com/RazordousJR/sourcetrail ; topics relate and relate-neo4j-hackathon verified.
- Pristine persistent directory store included at fixtures/editorial/; inspect read-only with npm run inspect.
- GitHub Actions Ubuntu/Node 22 integration run 43681931004 passed.
- Devpost draft created: submission 1305071, project 1549912, preview https://devpost.com/software/sourcetrail . Name and pitch saved. Story, repo link and Relate tag prepared in the project-details form, awaiting demo video link before saving this step.
- Video: demo/sourcetrail-demo.mp4, 69-second silent presentation using actual Chrome screenshots, with timed English commentary. Fully decoded and a frame from every scene visually checked; real-time playback not reviewed.
- YouTube channel Hamzah Asyrani already exists. Upload dialog open, no file uploaded. Its notice says submission acknowledges Terms of Service and Community Guidelines. Explicit action-time approval requested to upload Unlisted; awaiting user response.
- Final submission: not submitted.
