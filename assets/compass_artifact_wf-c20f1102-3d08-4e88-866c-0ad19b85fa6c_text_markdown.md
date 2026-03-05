# Interview prep: AI Innovation role at bet365 Denver

**Matthew Ramirez leads bet365's Innovations function from Denver, bringing a decade-plus background in AR/VR/AI and emerging-technology commercialization — not a traditional sportsbook hire.** His team sits at the intersection of a newly formed AgentOps AI division, a Platform Innovation Hub, and a company processing 6 billion HTTP requests daily across 96 sports. bet365's $175M+ investment in its Denver headquarters, combined with a potential $12 billion IPO or sale, makes this a pivotal moment for the company's AI ambitions. Understanding Ramirez's unusual career arc, bet365's proprietary-first engineering culture, and the competitive landscape where Kambi now prices 50%+ of bets via AI will allow you to ask questions that demonstrate genuine strategic understanding.

---

## Who is Matthew Ramirez and what does he care about

Matt Ramirez's LinkedIn describes his current role as "Driving innovation at Bet365." His career arc is unconventional for sports betting — he spent roughly a decade building immersive technology solutions in education and consulting before moving to bet365. At **Jisc** (UK's higher-education technology body), he was Senior Innovation Developer for Digital Futures, leading the award-winning SCARLET augmented reality projects and setting up Jisc's R&D consultancy in immersive technologies. At the **University of Manchester Medical School**, he served as Lead Technical Consultant, implementing a Virtual Healthcare Hub integrating AR/VR/AI. He then joined **EY**, where he led the academy development pillar of a multi-million-pound global learning product, defined innovation roadmaps for immersive technology, and — notably — represented EY on the **global Metaverse Standards Forum** as a founding member of EY's Metaverse community.

His recent LinkedIn posts reveal sophisticated AI thinking that goes well beyond management platitudes. One post argued that **"just add more data" is the laziest advice in AI**, citing information-theoretic limits on what any model can learn. Another explored how high-dimensional embeddings "might already be breaking the laws of geometry." These posts signal that the Innovations team is grappling with fundamental ML challenges — model capacity, representation quality, and the diminishing returns of scale — not just deploying off-the-shelf tools.

He has also published academic and professional articles on AR in education (Ariadne Issue 71, AR(t) Magazine, Times Higher Education), spoken at global conferences including CILIPSW, Jisc Digital Festival, and InsideAR Munich, and recently participated in a **Manchester Digital panel** in 2025. He advised startups including **Metaio** (later acquired by Apple) and has worked with Epson, HP, and the NHS. He holds a ResearchGate profile with publications on immersive technologies.

**Key interview insight**: Ramirez is a technologist-innovator who builds from first principles, not a sports-betting lifer. Questions about how he's adapting emerging-technology frameworks (from education and consulting) to a real-time, high-stakes betting environment will land well. His information-theory post is an invitation to discuss the fundamental limits of prediction in sports — where does adding more data actually help, and where does the signal run out?

---

## bet365's AI and engineering infrastructure runs deep

bet365 operates a **fully proprietary, end-to-end technology stack** — odds compilation, risk management, payments, CRM, and front-end UX are all built in-house. Head of Platform Innovation **Alan Reed** has stated the philosophy bluntly: "We prefer to do things in-house, because it is a strategy that has worked for us." This distinguishes bet365 from operators like Caesars (which licenses Kambi's platform) and even from DraftKings, which acquired its AI pricing capabilities through the **Sports IQ** and **Simplebet** purchases.

The core platform runs on **Erlang** (adopted in 2012, replacing Java) for real-time odds delivery and the InPlay engine, achieving a **10x increase in users per node** and supporting 2 million+ concurrent users. Newer services, including the flagship **Bet Builder**, are written in **Go** and deployed on **Google Kubernetes Engine (GKE)** on Google Cloud Platform. The Bet Builder processes **millions of requests per minute**, and a core team of just three engineers migrated it from on-prem to GCP. Each sporting fixture gets a custom-built runtime environment with predictive load balancing — infrastructure is pre-warmed before major events like Premier League kickoffs or penalty shootouts.

The data layer includes **Google BigQuery** as the cloud data warehouse (replacing legacy SQL Server), **Apache Kafka** for real-time streaming, **Riak KV** (a distributed NoSQL store whose IP bet365 acquired and open-sourced after Basho's collapse in 2017), and **Ab Initio** for ETL. For ML, job postings require **TensorFlow and PyTorch** proficiency, and the Platform Innovation team has built **in-house GenAI tools using RAG** for legacy code comprehension, database visualization, and data warehouse migration acceleration. The company maintains **29 public repositories on GitHub**, including the Go JSON encoder `jingo` (734 stars) and various Erlang/Riak libraries.

The newly formed **AgentOps department** in Denver is hiring aggressively for AI Team Leaders ($125K–$160K) and AI & Automation Technical Leads ($125K–$155K). Its mission: "Empower business functions through the strategic design, development, deployment, and lifecycle management of advanced AI-powered solutions." The emphasis on AI agent governance, security frameworks, and lifecycle management signals that bet365 is moving beyond experimental GenAI toward production-grade agentic systems. AI Software Engineer roles in Denver ($90K–$130K) emphasize rapid prototyping, feature engineering, and "cutting-edge techniques."

**Key interview insight**: bet365's in-house-everything culture means the Innovations team likely has unusual freedom to build from scratch. Ask about how the team decides what to build versus what to buy — and how they evaluate when an emerging technology has crossed from "interesting experiment" to "meaningful, material, and lasting" platform contribution (Reed's exact criteria for the Platform Innovation Hub).

---

## The Denver bet is a $175 million commitment

bet365 opened its US headquarters at **One Platte, 1701 Platte Street, Denver** on September 30, 2024, with approximately 50 employees on two floors totaling **120,000 square feet** renovated at a cost of **$40 million**. In July 2025, the company purchased the entire building outright for **$135 million** — its first major owned property outside the UK. The Colorado Economic Development Commission approved up to **$14.1 million** in performance-based Job Growth Incentive Tax Credits over eight years, contingent on bet365 creating nearly **1,000 new jobs** in Denver.

bet365 chose Denver for its **tech talent pipeline, central time zone, quality of life, and culture of innovation**. The company has a partnership with **Kroenke Sports & Entertainment** (owners of the Nuggets, Avalanche, and Broncos) for Colorado market access. Teams being built in Denver span customer service, trading, software development, AI/ML, marketing, product design, legal, and finance, with approximately **24–31 active job postings** as of early 2026.

The US expansion is broader than Denver. bet365 is now **live in 16 US states** (up from 2 in 2022), including major markets like New Jersey, Pennsylvania, Ohio, Illinois, and North Carolina. The company holds an estimated **2.5% US market share** overall but performs significantly better in individual states — roughly **9.2% in Ohio** and **5.4% in Indiana**. Leadership reportedly targets **10% US market share**. In FY 2024–25, group revenue hit **£4.04 billion (~$5.45 billion)**, though profit fell 44% to £348.7 million as the company deliberately invested heavily in US and Latin American expansion. As a private company controlled by founder **Denise Coates** (58% stake, estimated $12.6 billion fortune), bet365 can absorb short-term losses without public-market pressure.

The Coates family is reportedly exploring options including a **$12 billion sale or US IPO**, with Blackstone, Apollo, and CVC Capital Partners named as potential buyers. Preparatory moves include exiting China in March 2025 and separating Stoke City F.C. from the core business. At $12B, bet365 would be the **third-largest pure-play iGaming stock** behind Flutter/FanDuel and DraftKings.

**Key interview insight**: The Denver build-out is clearly a long-term, high-conviction bet. Ask about how the Innovations team's work connects to the US growth thesis — is the team primarily building for US-specific product needs (state-by-state regulatory complexity, American sports coverage), or is it a global innovation center that happens to be in Denver? The potential IPO also raises interesting questions about how innovation priorities might shift under public-market scrutiny.

---

## Data partnerships power a multi-provider strategy

bet365 uses **all three major sports data providers** simultaneously, each for different purposes — a notable strategic choice versus competitors who tend to rely on one primary provider:

- **Genius Sports**: Long-term partner providing exclusive official data for the English Premier League (through 2029), NFL, CFL, AHL, NASCAR, and NCAA. The partnership includes exploratory use of Genius's **Second Spectrum AI tracking technology** for "next-generation betting products" powered by real-time player tracking.
- **Stats Perform / Opta**: bet365 was a launch partner for the **Opta Fast Player Statistics Feed**, pushing high-frequency in-play statistics (shots, passes, tackles) for automated pricing and fast settlement of player prop markets. Coverage expanded in 2024–25 to **7,000+ Opta-powered matches per year** across 19 additional competitions.
- **Sportradar**: Provides live match trackers and holds exclusive betting data rights for UEFA, NHL, NBA, and MLB, which bet365 accesses through Sportradar's distribution network.

Additional partnerships include **ALT Sports Data** (alternative sports like X Games, Formula 1, World Surf League — announced March 2025), **PA Betting Services** (UK/Ireland racing and football), **BetMakers** (fixed-odds horse racing — bet365 was the first major US sportsbook to offer this), and **iGameMedia/THEO Technologies** for ultra-low-latency streaming. The streaming partnership achieved a **fixed 2-second latency** using THEO's High Efficiency Streaming Protocol (HESP), versus the industry standard 7–8 seconds with HLS. This perfectly synchronizes video and data streams — critical for in-play betting where stale video creates arbitrage opportunities.

bet365's in-play betting accounts for **over 70% of handle**, and the company offers **600,000+ live markets daily** across **1 million+ streaming events annually**. The Bet Builder pricing engine uses computationally intensive simulation methods (likely Monte Carlo) to calculate correlated prices for same-game combinations, with each fixture having its own unique demand "fingerprint." Critical pricing algorithms remain **entirely in-house** — third-party data feeds are inputs, but the models and trading IP are proprietary.

**Key interview insight**: The Second Spectrum AI tracking partnership with Genius Sports is particularly interesting for an innovation role. Ask about how computer vision-derived tracking data changes the types of markets that can be offered — and whether the Innovations team is working on novel market types that weren't possible before real-time spatial data existed. The multi-provider strategy also raises questions about data fusion and how heterogeneous feeds are unified into a coherent pricing model.

---

## How competitors are raising the AI stakes

The competitive landscape has shifted dramatically. **Kambi** — the pure B2B sportsbook platform powering 53+ operators — announced in early 2026 that **over 50% of all bets across its network are now fully AI-traded**, up from 28% in 2023. Their COO described the shift as moving from "machine-assisted human trading to human-assisted machine trading." Kambi's breakthrough is a **universal core ML model** that learns any sport by simply feeding it data, without sport-specific feature engineering. They're positioning the 2026 FIFA World Cup as the first major event to be fully AI-traded.

**DraftKings** pursued aggressive vertical integration through acquisition, buying **Simplebet** (~$120–195M) for micro-betting ML that processes transactions in 250 milliseconds, and **Sports IQ Analytics** (~$50–70M) for AI-powered oddsmaking. They now offer **517 live betting options per game** (up from 124 in 2022) and are planning a dedicated market-making division. CTO Zach Maybury declared at the March 2026 Investor Day: "AI is not a side initiative. It is a company-wide force multiplier."

**Flutter/FanDuel** launched **AceAI**, a generative AI betting assistant built on Amazon Bedrock that reduces complex parlay construction from "hours to seconds." They use Tecton's feature platform for their "Omni ML" system, acquired NumberFire for predictive analytics, and built a custom LLM for back-office finance automation. Their "Your Way" product allows virtually limitless customizable betting options using sophisticated AI pricing. With **52% US online market share** and $820M in annual R&D spend, their scale advantage is formidable.

**Entain/BetMGM** acquired **Angstrom Sports** for up to £203M, gaining **play-by-play simulation-based pricing** — a fundamentally different approach from historical-data-only models. Post-integration, active same-game-parlay customers jumped 40% year-over-year.

**Key interview insight**: bet365's competitive position is unique — they're the only major operator that has built virtually everything in-house over 20+ years, while competitors have assembled their AI capabilities through acquisitions. Ask how the Innovations team thinks about the build-vs-acquire tradeoff for AI capabilities, and whether bet365's in-house culture creates advantages (tighter integration, deeper institutional knowledge) or disadvantages (slower time-to-market) versus DraftKings' acquisition-heavy approach.

---

## The technical frontier that matters for this role

Several AI/ML trends are particularly relevant for an innovation role at bet365:

**Calibration trumps accuracy.** A 2024 paper by Walsh & Joshi demonstrated that calibration-based model selection yields **+34.69% ROI versus −35.17% for accuracy-based selection** on NBA data. This aligns directly with Ramirez's LinkedIn post about information-theoretic limits — the question isn't whether a model is "accurate" but whether its probability estimates are well-calibrated enough to identify genuine edges over the market.

**Computer vision is generating entirely new data types.** Companies like **ReSpo.Vision** turn any match video into structured performance data using AI — no GPS or hardware needed. **KINEXON** provides millisecond-accurate player tracking using UWB sensors. **Second Spectrum** (already in bet365's ecosystem via Genius Sports) provides spatiotemporal data that enables markets impossible to price from box scores alone — fatigue indicators, spatial patterns, defensive formations. The CV-in-sports market grew 29.8% year-over-year to $3.1 billion in 2025.

**Transformer architectures are entering sports prediction.** A 2025 paper (arXiv 2511.18730) applies transformers with axial attention for in-game player-level predictions across 58,000+ football matches. **Google DeepMind's TacticAI** (2024) uses geometric deep learning for football tactics. Graph neural networks for modeling team dynamics and diffusion models for multi-agent motion prediction are identified as key research frontiers.

**Regulatory pressure is building.** The **SAFE Bet Act** (March 2025) would ban AI-driven microbets and personalized targeting. The **EU AI Act** (effective February 2025) classifies manipulative AI as prohibited. Multiple US states are considering AI-specific gambling legislation. The **UNLV AiR Hub** launched in 2025 specifically to research AI risks in gambling. For an innovations team, navigating the line between cutting-edge AI and responsible deployment is becoming a core strategic challenge.

**Reinforcement learning for dynamic pricing** is an active research area. Academic work explores RL-based market making that protects against strategic manipulation by informed bettors, and XGBoost-trained agents for profitable in-play wager placement. Red Bull F1 already uses RL for real-time pit-stop optimization — similar approaches could optimize live betting market management.

---

## Ten questions that demonstrate deep understanding

These questions are designed to show strategic thinking about bet365's specific position, Ramirez's background, and the competitive landscape:

1. **On information-theoretic limits**: "Your LinkedIn post about information theory setting hard limits on what models can learn resonated with me. In sports betting, where does the signal genuinely run out — at what point are we just fitting to noise, and how does the Innovations team think about that boundary?"

2. **On the universal model question**: "Kambi has publicly discussed building a universal core model that learns any sport from data alone, without sport-specific feature engineering. Does bet365's in-house approach allow for something architecturally different — and do you think sport-specific models or universal models will win long-term?"

3. **On build versus acquire**: "DraftKings assembled their AI pricing stack through acquisitions — Simplebet and Sports IQ. bet365 has historically built everything in-house. How does the Innovations team evaluate whether to build a new AI capability versus partnering or acquiring?"

4. **On Second Spectrum and novel markets**: "The Genius Sports partnership includes Second Spectrum AI tracking data. What new types of betting markets become possible when you have real-time spatial data that didn't exist five years ago — and how far along is that work?"

5. **On the AgentOps vision**: "I noticed the new AgentOps department in Denver focused on AI agents and automated workflows. How does that team interact with the Innovations function — is AgentOps more operationally focused while Innovations is more exploratory, or is the boundary fluid?"

6. **On embedding quality**: "Your post about high-dimensional embeddings breaking geometric laws was fascinating. In practice, how does the team evaluate representation quality when you're embedding heterogeneous data — player tracking, market data, weather, social signals — into a shared space?"

7. **On calibration versus accuracy**: "Recent research shows calibration-based model selection dramatically outperforms accuracy-based selection for betting profitability. How does the team think about calibration in production systems where the data distribution shifts constantly during live events?"

8. **On regulatory headwinds**: "The SAFE Bet Act proposes banning AI-driven microbets, and the EU AI Act creates new compliance requirements. How does the Innovations team factor regulatory risk into its roadmap — does it constrain what you explore, or does it create opportunities for responsible-AI differentiation?"

9. **On the Denver innovation thesis**: "bet365 has spent $175M+ building the Denver presence. Is the Innovations team chartered to solve US-specific problems, or is this a global innovation center — and how do you manage the collaboration with the UK-based Platform Innovation Hub?"

10. **On emerging from stealth**: "bet365 has historically been very private about its technology — no patents, limited public technical content. As the company potentially approaches a public listing, does the Innovations team's relationship with the broader AI community change? Will we see more published research, conference talks, or open-source contributions?"