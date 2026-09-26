/**
 * All mock data for the UI prototype. Every company, person, score and
 * transcript here is invented demonstration content, not real records.
 */

export type Role = "interviewee" | "interviewer";
export type InterviewType = "ai" | "human";

export interface Person {
  id: string;
  name: string;
  initials: string;
  headline: string;
  email?: string;
}

/* ------------------------------------------------------------------ */
/* Current user                                                        */
/* ------------------------------------------------------------------ */

export const currentUser = {
  id: "u_sam",
  name: "Sam Rivera",
  firstName: "Sam",
  initials: "SR",
  email: "sam.rivera@example.com",
  headline: "Product designer, 4 years",
  isAdmin: true,
  defaultRole: "interviewee" as Role,
  recordingConsent: true,
  shareResumeWithMatches: true,
  discoverable: true,
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  href: string;
}

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "Your results are filed",
    body: "Northwind Logistics · AI interview scored 4.2 of 5.",
    time: "2h ago",
    unread: true,
    href: "/history/iv_1041",
  },
  {
    id: "n2",
    title: "Priya left you feedback",
    body: "Halcyon Health mock interview.",
    time: "Yesterday",
    unread: true,
    href: "/history/iv_1038",
  },
  {
    id: "n3",
    title: "Jordan Blake sent a friend request",
    body: "Accept to invite each other to interviews.",
    time: "2 days ago",
    unread: false,
    href: "/friends?tab=requests",
  },
  {
    id: "n4",
    title: "Resume parsed",
    body: "12 skills and 3 roles found. Check they look right.",
    time: "Sep 1",
    unread: false,
    href: "/resume",
  },
];

/* ------------------------------------------------------------------ */
/* Resume                                                              */
/* ------------------------------------------------------------------ */

export interface Experience {
  id: string;
  title: string;
  company: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ParsedResume {
  fileName: string;
  fileSize: string;
  pages: number;
  uploadedAt: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: { school: string; degree: string; year: string }[];
}

export const userResume: ParsedResume = {
  fileName: "sam-rivera-resume-2026.pdf",
  fileSize: "184 KB",
  pages: 2,
  uploadedAt: "Sep 1, 2026",
  summary:
    "Product designer with four years shipping logistics and fintech tools. Strongest at turning messy operational workflows into calm, fast interfaces.",
  skills: [
    "Interaction design",
    "Design systems",
    "Figma",
    "Prototyping",
    "User research",
    "Usability testing",
    "Information architecture",
    "Accessibility (WCAG 2.2)",
    "HTML & CSS",
    "Workshop facilitation",
    "Journey mapping",
    "Data visualization",
  ],
  experience: [
    {
      id: "e1",
      title: "Product Designer",
      company: "Parcelwise",
      start: "2023",
      end: "Present",
      bullets: [
        "Redesigned the dispatcher console used by 400 depot staff; cut route-assignment time from 6 to 2 minutes.",
        "Built the shared component library adopted by four product teams.",
      ],
    },
    {
      id: "e2",
      title: "UX Designer",
      company: "Ledgerline",
      start: "2021",
      end: "2023",
      bullets: [
        "Owned onboarding for small-business accounts; completion rose from 54% to 71%.",
        "Ran 30+ moderated usability sessions and shared a monthly insights digest.",
      ],
    },
    {
      id: "e3",
      title: "Design Intern",
      company: "City Transit Lab",
      start: "2020",
      end: "2021",
      bullets: ["Prototyped a multilingual trip planner kiosk for three stations."],
    },
  ],
  education: [{ school: "Riverside State University", degree: "B.A. Interaction Design", year: "2020" }],
};

/** The candidate an interviewer sees in the call's side panel. */
export const candidateResume: ParsedResume & { name: string; initials: string; target: string } = {
  name: "Dani Morales",
  initials: "DM",
  target: "Product Designer · Halcyon Health",
  fileName: "dani-morales-cv.pdf",
  fileSize: "212 KB",
  pages: 2,
  uploadedAt: "Sep 20, 2026",
  summary:
    "Designer moving from agency work into in-house health tech. Four years of patient-facing mobile work; wants to go deeper on research.",
  skills: ["Mobile design", "Figma", "Service design", "Accessibility", "Prototyping", "Stakeholder workshops"],
  experience: [
    {
      id: "c1",
      title: "Senior Designer",
      company: "Brightloop Studio",
      start: "2022",
      end: "Present",
      bullets: [
        "Led design for a clinic booking app with 80k monthly patients.",
        "Introduced accessibility reviews into the studio's delivery process.",
      ],
    },
    {
      id: "c2",
      title: "Designer",
      company: "Brightloop Studio",
      start: "2020",
      end: "2022",
      bullets: ["Shipped five client apps across retail and healthcare."],
    },
  ],
  education: [{ school: "Lakeshore College of Art", degree: "BFA Communication Design", year: "2020" }],
};

/* ------------------------------------------------------------------ */
/* Question generation                                                 */
/* ------------------------------------------------------------------ */

export type QuestionSource = "company" | "job" | "general";

export interface Question {
  id: string;
  text: string;
  source: QuestionSource;
  note?: string;
  sourceUrl?: string; // the page a candidate reported it on
}

export const sourceLabel: Record<QuestionSource, string> = {
  company: "Company research",
  job: "Job description",
  general: "Common for this role",
};

export const aiSetupDefaults = {
  company: "Northwind Logistics",
  jobTitle: "Senior Product Designer",
  jobDescription:
    "Northwind is hiring a Senior Product Designer for the Driver Experience team. You'll own the end-to-end design of our driver mobile app, partner with operations on route and delivery tooling, and help grow our design system. You have 4+ years of product design experience, a portfolio of shipped mobile work, and comfort running research with frontline workers.",
};

/** Suggested questions an interviewer receives for the matched candidate. */
export const suggestedQuestions: Question[] = [
  { id: "s1", text: "Why Halcyon Health, and why move in-house now?", source: "company" },
  {
    id: "s2",
    text: "Halcyon's patient app serves older adults. Tell me about a time you designed for low digital confidence.",
    source: "company",
  },
  {
    id: "s3",
    text: "Walk me through the clinic booking app. What was hardest to get right?",
    source: "job",
  },
  { id: "s4", text: "How do you make accessibility part of delivery instead of a final check?", source: "job" },
  {
    id: "s5",
    text: "Tell me about a disagreement with a clinician or subject expert. How did it resolve?",
    source: "company",
  },
  { id: "s6", text: "How do you decide what to research when time is short?", source: "general" },
  { id: "s7", text: "Show me how you'd measure whether a redesign worked.", source: "general" },
  { id: "s8", text: "What would your first 90 days look like?", source: "general" },
];

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

export const matchPartners: Record<Role, Person & { role: Role; matchedOn: string[]; interviewsDone: number }> = {
  // When you practice as the interviewee, you're matched with an interviewer.
  interviewee: {
    id: "u_priya",
    name: "Priya Natarajan",
    initials: "PN",
    headline: "Design lead, 9 years in health tech",
    role: "interviewer",
    matchedOn: ["Product design", "Healthcare", "Design systems"],
    interviewsDone: 23,
  },
  // When you practice as the interviewer, you're matched with a candidate.
  interviewer: {
    id: "u_dani",
    name: "Dani Morales",
    initials: "DM",
    headline: "Senior designer, applying to Halcyon Health",
    role: "interviewee",
    matchedOn: ["Product design", "Mobile", "Accessibility"],
    interviewsDone: 4,
  },
};

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

export interface CallSession {
  id: string;
  type: InterviewType;
  company: string;
  jobTitle: string;
  partner: Person;
  historyId: string;
}

export const callSessions: Record<string, CallSession> = {
  "ai-northwind": {
    id: "ai-northwind",
    type: "ai",
    company: "Northwind Logistics",
    jobTitle: "Senior Product Designer",
    partner: { id: "ai", name: "AI interviewer", initials: "AI", headline: "Asks company-specific questions" },
    historyId: "iv_1041",
  },
  "live-halcyon": {
    id: "live-halcyon",
    type: "human",
    company: "Halcyon Health",
    jobTitle: "Product Designer",
    partner: {
      id: "u_priya",
      name: "Priya Natarajan",
      initials: "PN",
      headline: "Design lead, 9 years in health tech",
    },
    historyId: "iv_1038",
  },
};

export const aiCaptions = [
  "Thanks for joining, Sam. We'll spend about 25 minutes on your work and on Northwind's Driver Experience team.",
  "Northwind's drivers work with gloves on, in bad light, often mid-delivery. How would you design a proof-of-delivery screen for those conditions?",
  "You mentioned a large tap target. What would you cut from the screen to make room for it?",
];

export const devices = {
  cameras: ["FaceTime HD Camera", "Logitech C920", "OBS Virtual Camera"],
  microphones: ["MacBook Pro Microphone", "AirPods Pro", "Blue Yeti"],
  speakers: ["MacBook Pro Speakers", "AirPods Pro"],
};

export const reportReasons = [
  "Inappropriate or offensive behaviour",
  "Harassment or discrimination",
  "Didn't show up or left immediately",
  "Spam, recruiting or selling",
  "Recording or sharing without consent",
  "Something else",
];

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export interface InterviewSummary {
  id: string;
  date: string;
  dateLabel: string;
  type: InterviewType;
  company: string;
  jobTitle: string;
  partner: string;
  yourRole: Role;
  /** Out of 5. Null when you were the interviewer or scoring hasn't run. */
  score: number | null;
  duration: string;
}

export const interviews: InterviewSummary[] = [
  {
    id: "iv_1041",
    date: "2026-09-22",
    dateLabel: "Sep 22, 2026",
    type: "ai",
    company: "Northwind Logistics",
    jobTitle: "Senior Product Designer",
    partner: "AI interviewer",
    yourRole: "interviewee",
    score: 4.2,
    duration: "28:14",
  },
  {
    id: "iv_1038",
    date: "2026-09-18",
    dateLabel: "Sep 18, 2026",
    type: "human",
    company: "Halcyon Health",
    jobTitle: "Product Designer",
    partner: "Priya Natarajan",
    yourRole: "interviewee",
    score: 3.6,
    duration: "34:02",
  },
  {
    id: "iv_1035",
    date: "2026-09-15",
    dateLabel: "Sep 15, 2026",
    type: "human",
    company: "Parcelwise",
    jobTitle: "Product Designer",
    partner: "Jordan Blake",
    yourRole: "interviewer",
    score: null,
    duration: "30:40",
  },
  {
    id: "iv_1033",
    date: "2026-09-12",
    dateLabel: "Sep 12, 2026",
    type: "ai",
    company: "Tessellate",
    jobTitle: "Design Systems Lead",
    partner: "AI interviewer",
    yourRole: "interviewee",
    score: 3.1,
    duration: "22:51",
  },
  {
    id: "iv_1029",
    date: "2026-09-05",
    dateLabel: "Sep 5, 2026",
    type: "human",
    company: "Kestrel Bank",
    jobTitle: "UX Designer",
    partner: "Jordan Blake",
    yourRole: "interviewee",
    score: 3.9,
    duration: "31:17",
  },
  {
    id: "iv_1022",
    date: "2026-08-29",
    dateLabel: "Aug 29, 2026",
    type: "ai",
    company: "Parcelwise",
    jobTitle: "Product Designer",
    partner: "AI interviewer",
    yourRole: "interviewee",
    score: 2.8,
    duration: "19:36",
  },
];

export interface TranscriptTurn {
  id: string;
  speaker: string;
  isYou: boolean;
  time: string;
  text: string;
}

export interface Dimension {
  name: string;
  score: number;
  rationale: string;
}

export interface InterviewDetail extends InterviewSummary {
  summary: string;
  keyMoments: { time: string; text: string }[];
  transcript: TranscriptTurn[];
  analysis: {
    overall: number;
    dimensions: Dimension[];
    strengths: string[];
    improvements: { point: string; tryThis: string }[];
  } | null;
  feedback: {
    from: string;
    ratings: { communication: number; technical: number; confidence: number };
    comments: string;
  } | null;
  people: (Person & { contact: string; isFriend: boolean; requested?: boolean })[];
}

const northwindTranscript: TranscriptTurn[] = [
  {
    id: "t1",
    speaker: "AI interviewer",
    isYou: false,
    time: "00:04",
    text: "Thanks for joining, Sam. We'll spend about 25 minutes on your work and on Northwind's Driver Experience team. Ready?",
  },
  { id: "t2", speaker: "Sam", isYou: true, time: "00:12", text: "Ready. Thanks for having me." },
  {
    id: "t3",
    speaker: "AI interviewer",
    isYou: false,
    time: "00:15",
    text: "Northwind's drivers work with gloves on, in bad light, often mid-delivery. How would you design a proof-of-delivery screen for those conditions?",
  },
  {
    id: "t4",
    speaker: "Sam",
    isYou: true,
    time: "00:31",
    text: "I'd start from the moment of delivery, not the screen. The driver has a parcel in one hand, so everything has to work one-handed with the thumb. I'd make the capture button enormous, bottom of the screen, and let the photo itself be the proof so there's no typing.",
  },
  {
    id: "t5",
    speaker: "AI interviewer",
    isYou: false,
    time: "01:48",
    text: "You mentioned a large tap target. What would you cut from the screen to make room for it?",
  },
  {
    id: "t6",
    speaker: "Sam",
    isYou: true,
    time: "02:02",
    text: "The recipient name and the address can move to the previous step, since the driver has already confirmed them. Notes go behind a single tap. At Parcelwise we removed three fields from the depot handover and errors actually dropped.",
  },
  {
    id: "t7",
    speaker: "AI interviewer",
    isYou: false,
    time: "03:40",
    text: "Operations wants a feature that adds two taps for drivers. How do you handle that conversation?",
  },
  {
    id: "t8",
    speaker: "Sam",
    isYou: true,
    time: "03:55",
    text: "Um, I'd, I think I'd want to understand what they need the data for first. Usually there's a way to capture it passively, like from GPS or the scan itself, so the driver doesn't pay for it.",
  },
  {
    id: "t9",
    speaker: "AI interviewer",
    isYou: false,
    time: "05:21",
    text: "How have you contributed to a design system that other teams depend on?",
  },
  {
    id: "t10",
    speaker: "Sam",
    isYou: true,
    time: "05:36",
    text: "I built the component library at Parcelwise. Four teams use it now. The key was that I sat with engineers to ship the components in code, not just Figma, so adoption was the easy path.",
  },
  {
    id: "t11",
    speaker: "AI interviewer",
    isYou: false,
    time: "07:10",
    text: "Why Northwind, and why the Driver Experience team specifically?",
  },
  {
    id: "t12",
    speaker: "Sam",
    isYou: true,
    time: "07:24",
    text: "Because the users are people I've designed for before, depot staff and drivers, and I like work where a second saved matters to someone's day.",
  },
];

const halcyonTranscript: TranscriptTurn[] = [
  {
    id: "h1",
    speaker: "Priya Natarajan",
    isYou: false,
    time: "00:06",
    text: "Hi Sam, I'll play the hiring manager at Halcyon Health. Let's start with why you're interested in us.",
  },
  {
    id: "h2",
    speaker: "Sam",
    isYou: true,
    time: "00:20",
    text: "Healthcare is where interface clarity matters most. A confusing booking screen isn't an annoyance there, it's a missed appointment.",
  },
  {
    id: "h3",
    speaker: "Priya Natarajan",
    isYou: false,
    time: "01:35",
    text: "Our patient app serves a lot of older adults. Tell me about a time you designed for low digital confidence.",
  },
  {
    id: "h4",
    speaker: "Sam",
    isYou: true,
    time: "01:52",
    text: "At Ledgerline many small-business owners were new to online banking. We added a guided first-run with real examples and a phone-a-person option, and completion went from 54 to 71 percent.",
  },
  {
    id: "h5",
    speaker: "Priya Natarajan",
    isYou: false,
    time: "04:10",
    text: "How do you make accessibility part of delivery instead of a final check?",
  },
  {
    id: "h6",
    speaker: "Sam",
    isYou: true,
    time: "04:24",
    text: "I'd have to think about that. I usually run an audit before launch.",
  },
];

const details: Record<string, Omit<InterviewDetail, keyof InterviewSummary>> = {
  iv_1041: {
    summary:
      "A confident, specific interview. Your answers about the proof-of-delivery screen and the design system used concrete numbers and tied back to Northwind's drivers. The operations question was the weak spot: you found a good answer but took a while to get there.",
    keyMoments: [
      { time: "00:31", text: "Strong opening: started from the driver's situation, not the screen." },
      { time: "02:02", text: "Backed a design choice with a real result from Parcelwise." },
      { time: "03:55", text: "Hesitant start on the stakeholder question." },
    ],
    transcript: northwindTranscript,
    analysis: {
      overall: 4.2,
      dimensions: [
        {
          name: "Communication",
          score: 4.4,
          rationale: "Clear structure and plain language. One answer opened with filler words.",
        },
        {
          name: "Technical depth",
          score: 4.1,
          rationale: "Good design reasoning with trade-offs; could name how you'd test the one-handed flow.",
        },
        {
          name: "Confidence",
          score: 3.8,
          rationale: "Steady on familiar ground, less so when challenged on stakeholder pressure.",
        },
        {
          name: "Company fit",
          score: 4.5,
          rationale: "Tied most answers to Northwind's drivers and the Driver Experience team.",
        },
      ],
      strengths: [
        "Started answers from the user's real situation (gloves, bad light, one hand).",
        "Used numbers from your own work: 400 depot staff, 6 to 2 minutes, four teams.",
        "Your 'why Northwind' answer was specific to the team, not the company in general.",
      ],
      improvements: [
        {
          point: "Slow start on the operations trade-off question (03:55).",
          tryThis: "Lead with your position in one sentence, then explain: \"I'd push back, and here's how.\"",
        },
        {
          point: "No mention of how you'd validate the delivery screen.",
          tryThis: "Add one line on testing: a ride-along or a gloves-on usability session.",
        },
        {
          point: "Design system answer skipped governance.",
          tryThis: "Say how contributions get reviewed and who decides what enters the library.",
        },
      ],
    },
    feedback: null,
    people: [],
  },
  iv_1038: {
    summary:
      "A warm, well-motivated interview with a strong story about designing for low digital confidence. The accessibility question exposed a gap: your answer described a final audit rather than an ongoing practice.",
    keyMoments: [
      { time: "00:20", text: "Clear, personal motivation for healthcare." },
      { time: "01:52", text: "Ledgerline story with a measurable result." },
      { time: "04:24", text: "Accessibility answer was thin." },
    ],
    transcript: halcyonTranscript,
    analysis: {
      overall: 3.6,
      dimensions: [
        { name: "Communication", score: 4.0, rationale: "Concise, human answers that were easy to follow." },
        {
          name: "Technical depth",
          score: 3.2,
          rationale: "Research story was solid; accessibility practice was underexplained.",
        },
        { name: "Confidence", score: 3.6, rationale: "Composed overall, but deflected one hard question." },
        { name: "Company fit", score: 3.7, rationale: "Motivation fits; could reference Halcyon's patients more." },
      ],
      strengths: [
        "Clear reason for choosing healthcare that an interviewer will remember.",
        "Quantified outcome from the Ledgerline onboarding work.",
      ],
      improvements: [
        {
          point: "Accessibility answer described a single pre-launch audit.",
          tryThis: "Describe checks at each stage: design review, component library, QA, and testing with assistive tech.",
        },
        {
          point: "\"I'd have to think about that\" ended the answer.",
          tryThis: "Buy time out loud: \"Let me walk through how I'd approach it,\" then reason step by step.",
        },
      ],
    },
    feedback: {
      from: "Priya Natarajan",
      ratings: { communication: 4, technical: 3, confidence: 4 },
      comments:
        "Great energy and a really memorable 'why healthcare' answer. For Halcyon you'll get the accessibility question for sure, so have a concrete process ready. Your Ledgerline story is your best material; use it earlier.",
    },
    people: [
      {
        id: "u_priya",
        name: "Priya Natarajan",
        initials: "PN",
        headline: "Design lead, 9 years in health tech",
        contact: "priya.n@example.com",
        isFriend: false,
      },
    ],
  },
};

export function getInterview(id: string): InterviewDetail | null {
  const base = interviews.find((i) => i.id === id);
  if (!base) return null;
  const extra = details[id];
  if (extra) return { ...base, ...extra };
  // Interviews without a hand-written record still render every tab.
  return {
    ...base,
    summary: `A ${base.type === "ai" ? "AI" : "live"} practice interview for ${base.jobTitle} at ${base.company}.`,
    keyMoments: [],
    transcript: halcyonTranscript.slice(0, 2).map((t) => ({
      ...t,
      speaker: t.isYou ? "Sam" : base.partner,
    })),
    analysis:
      base.score === null
        ? null
        : {
            overall: base.score,
            dimensions: [
              { name: "Communication", score: base.score, rationale: "Scored across all answers." },
              { name: "Technical depth", score: base.score - 0.2, rationale: "Scored across all answers." },
              { name: "Confidence", score: base.score + 0.1, rationale: "Scored across all answers." },
            ],
            strengths: ["Answered every question."],
            improvements: [{ point: "Add specifics from your own work.", tryThis: "Name one number per story." }],
          },
    feedback: null,
    people:
      base.type === "human"
        ? [
            {
              id: "u_jordan",
              name: base.partner,
              initials: base.partner
                .split(" ")
                .map((p) => p[0])
                .join(""),
              headline: "Practice partner",
              contact: "jordan.blake@example.com",
              isFriend: true,
            },
          ]
        : [],
  };
}

export const lastInterview = interviews[0];

/* ------------------------------------------------------------------ */
/* Friends                                                             */
/* ------------------------------------------------------------------ */

export interface Friend extends Person {
  sharedInterviews: number;
  status?: "online" | "away" | "offline";
}

export const friends: Friend[] = [
  {
    id: "u_jordan",
    name: "Jordan Blake",
    initials: "JB",
    headline: "UX designer · applying to fintech",
    sharedInterviews: 3,
    status: "online",
  },
  {
    id: "u_mei",
    name: "Mei Lin",
    initials: "ML",
    headline: "Frontend engineer · 6 years",
    sharedInterviews: 1,
    status: "away",
  },
  {
    id: "u_tomas",
    name: "Tomás Ferreira",
    initials: "TF",
    headline: "Product manager · Parcelwise",
    sharedInterviews: 2,
    status: "offline",
  },
  {
    id: "u_ada",
    name: "Ada Nwosu",
    initials: "AN",
    headline: "Researcher · switching to product",
    sharedInterviews: 0,
    status: "online",
  },
];

export interface FriendRequest extends Person {
  direction: "incoming" | "outgoing";
  sent: string;
  mutual: number;
}

export const friendRequests: FriendRequest[] = [
  {
    id: "u_kai",
    name: "Kai Andersen",
    initials: "KA",
    headline: "Design student · Riverside State",
    direction: "incoming",
    sent: "2 days ago",
    mutual: 2,
  },
  {
    id: "u_rosa",
    name: "Rosa Delgado",
    initials: "RD",
    headline: "Service designer · 5 years",
    direction: "incoming",
    sent: "4 days ago",
    mutual: 0,
  },
  {
    id: "u_priya",
    name: "Priya Natarajan",
    initials: "PN",
    headline: "Design lead, 9 years in health tech",
    direction: "outgoing",
    sent: "Yesterday",
    mutual: 1,
  },
];

export const peopleDirectory: (Person & { mutual: number })[] = [
  { id: "u_lena", name: "Lena Fischer", initials: "LF", headline: "Product designer · Berlin", mutual: 1 },
  { id: "u_omar", name: "Omar Haddad", initials: "OH", headline: "Staff engineer · interviews often", mutual: 3 },
  { id: "u_june", name: "June Park", initials: "JP", headline: "UX writer · 3 years", mutual: 0 },
  { id: "u_theo", name: "Theo Mensah", initials: "TM", headline: "Design manager · health tech", mutual: 2 },
  { id: "u_ines", name: "Inês Costa", initials: "IC", headline: "Researcher · fintech", mutual: 0 },
  { id: "u_ravi", name: "Ravi Iyer", initials: "RI", headline: "Product manager · logistics", mutual: 1 },
];

export interface InterviewInvite {
  id: string;
  from: Person;
  /** The role *you* would play if you accept. */
  yourRole: Role;
  company: string;
  jobTitle: string;
  sent: string;
}

export const interviewInvites: InterviewInvite[] = [
  {
    id: "inv_1",
    from: { id: "u_jordan", name: "Jordan Blake", initials: "JB", headline: "UX designer · applying to fintech" },
    yourRole: "interviewer",
    company: "Kestrel Bank",
    jobTitle: "Senior UX Designer",
    sent: "1h ago",
  },
  {
    id: "inv_2",
    from: { id: "u_mei", name: "Mei Lin", initials: "ML", headline: "Frontend engineer · 6 years" },
    yourRole: "interviewee",
    company: "Tessellate",
    jobTitle: "Design Systems Lead",
    sent: "Yesterday",
  },
];

/* ------------------------------------------------------------------ */
/* Admin reports                                                       */
/* ------------------------------------------------------------------ */

export type ReportStatus = "open" | "in_review" | "actioned" | "dismissed";

export interface Report {
  id: string;
  reporter: string;
  reported: string;
  reason: string;
  details: string;
  date: string;
  callId: string;
  status: ReportStatus;
}

export const reports: Report[] = [
  {
    id: "r_208",
    reporter: "Kai Andersen",
    reported: "user_4471",
    reason: "Inappropriate or offensive behaviour",
    details: "Made repeated comments about my accent instead of asking questions.",
    date: "Sep 24, 2026",
    callId: "call_9921",
    status: "open",
  },
  {
    id: "r_207",
    reporter: "Mei Lin",
    reported: "user_3302",
    reason: "Spam, recruiting or selling",
    details: "Spent the call pitching a paid coaching course.",
    date: "Sep 23, 2026",
    callId: "call_9874",
    status: "open",
  },
  {
    id: "r_205",
    reporter: "Jordan Blake",
    reported: "user_2289",
    reason: "Didn't show up or left immediately",
    details: "Joined, turned off camera and left after 30 seconds.",
    date: "Sep 21, 2026",
    callId: "call_9790",
    status: "in_review",
  },
  {
    id: "r_201",
    reporter: "Ada Nwosu",
    reported: "user_1904",
    reason: "Recording or sharing without consent",
    details: "Said they were screen-recording to post clips online.",
    date: "Sep 18, 2026",
    callId: "call_9655",
    status: "actioned",
  },
  {
    id: "r_198",
    reporter: "Tomás Ferreira",
    reported: "user_4471",
    reason: "Something else",
    details: "Audio kept cutting out; not sure if it was intentional.",
    date: "Sep 15, 2026",
    callId: "call_9512",
    status: "dismissed",
  },
];

export const reportStatusLabel: Record<ReportStatus, string> = {
  open: "Open",
  in_review: "In review",
  actioned: "Actioned",
  dismissed: "Dismissed",
};
