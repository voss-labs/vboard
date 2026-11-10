import type { CommunityRole } from "@/lib/rbac"
import {
  countWords,
  type RegistrationAnswers,
  type RegistrationQuestion,
} from "@/lib/registration-form"
import { daysFromNow, type Post } from "./fixtures"

type DemoPost = Omit<Post, "id" | "authorId">

const event = (
  p: Pick<DemoPost, "slug" | "communityId" | "authorName" | "title" | "body"> &
    Partial<DemoPost>
): DemoPost => ({
  visibility: "public",
  isPinned: false,
  status: "published",
  isEvent: true,
  locationVisibility: "public",
  requiresApproval: false,
  registrationCount: 0,
  createdAt: daysFromNow(-14),
  ...p,
})

const INTERVIEW_QUESTIONS: RegistrationQuestion[] = [
  {
    id: "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11",
    type: "choice",
    label: "Which role do you want to interview for?",
    required: true,
    options: [
      "Actor",
      "Script writer",
      "Music and percussion",
      "Direction",
      "Backstage and props",
    ],
  },
  {
    id: "8a2d4e61-9c3f-4b5a-a7d2-1e0f3c5b7d22",
    type: "text",
    label: "Tell us about yourself",
    required: true,
    minWords: 30,
    maxWords: 300,
  },
]

const ABOUT_SENTENCES = [
  "I have been part of my school drama team since the eighth standard and performed in two annual day productions.",
  "Street theatre interests me because it reaches people who would never buy a ticket to an auditorium show.",
  "Last year I helped write a short skit on road safety for our society's cultural evening.",
  "I am comfortable performing in Marathi, Hindi and English, and I enjoy switching between them on stage.",
  "I play the dholki and have accompanied folk performances at two inter-college festivals.",
  "Balancing rehearsals with lab submissions taught me to plan my week carefully and show up on time.",
  "I would like to learn how a script changes once it meets a live crowd on a college lawn.",
  "My friends say I am the loudest voice in any room, which I hope finally becomes useful here.",
  "I can commit to evening rehearsals on weekdays and full days on weekends through the circuit.",
]

export function demoAnswers(
  questions: RegistrationQuestion[],
  i: number
): RegistrationAnswers {
  const answers: RegistrationAnswers = {}
  for (const q of questions) {
    if (q.type === "choice") {
      answers[q.id] = q.options[i % q.options.length]
      continue
    }
    let text = ""
    for (
      let n = 0;
      n < ABOUT_SENTENCES.length && countWords(text) < q.minWords + 10;
      n++
    )
      text =
        `${text} ${ABOUT_SENTENCES[(i + n * 2) % ABOUT_SENTENCES.length]}`.trim()
    answers[q.id] = text.split(" ").slice(0, q.maxWords).join(" ")
  }
  return answers
}

export const demoPosts: DemoPost[] = [
  event({
    slug: "hackathon-night-2",
    communityId: "c1",
    authorName: "Devansh Shah",
    title: "Hackathon Night 2.0",
    body: "Twelve hours, teams of four, one problem statement revealed at 8 pm. Dinner and midnight chai on the house.",
    startsAt: daysFromNow(-10, 20, 0),
    endsAt: daysFromNow(-9, 8, 0),
    location: "Main Auditorium",
    capacity: 80,
    registrationCount: 58,
    createdAt: daysFromNow(-30),
  }),
  event({
    slug: "flutter-forward-watch-party",
    communityId: "c2",
    authorName: "Aarav Mehta",
    title: "Flutter Forward watch party",
    body: "Live stream of the keynote on the big screen, followed by a Q&A with a Google Developer Expert.",
    startsAt: daysFromNow(-5, 17, 0),
    endsAt: daysFromNow(-5, 19, 30),
    location: "Seminar Hall, B-Wing",
    capacity: 60,
    registrationCount: 40,
    createdAt: daysFromNow(-20),
  }),
  event({
    slug: "dsa-study-circle-week-3",
    communityId: "c1",
    authorName: "Sneha Iyer",
    title: "DSA Study Circle — Week 3: Graphs",
    body: "BFS, DFS and shortest paths with live problem solving. Bring the week 2 homework.",
    startsAt: daysFromNow(2, 16, 0),
    endsAt: daysFromNow(2, 18, 0),
    location: "Lab 602",
    registrationCount: 15,
    createdAt: daysFromNow(-4),
  }),
  event({
    slug: "street-play-auditions",
    communityId: "c3",
    authorName: "Riya Kulkarni",
    title: "Street Play Auditions",
    body: "Auditions for the inter-college street play circuit. Prepare a two-minute piece in any language.",
    visibility: "vit_only",
    startsAt: daysFromNow(6, 15, 0),
    endsAt: daysFromNow(6, 18, 0),
    location: "Drama Room, 4th floor",
    locationVisibility: "after_approval",
    capacity: 25,
    requiresApproval: true,
    registrationQuestions: INTERVIEW_QUESTIONS,
    registrationCount: 21,
    createdAt: daysFromNow(-3),
  }),
  event({
    slug: "cloud-study-jam",
    communityId: "c2",
    authorName: "Aarav Mehta",
    title: "Cloud Study Jam",
    body: "Postponed: the lab booking fell through. We will announce a new date soon.",
    status: "cancelled",
    startsAt: daysFromNow(9, 11, 0),
    endsAt: daysFromNow(9, 13, 0),
    location: "Lab 604",
    capacity: 40,
    registrationCount: 12,
    createdAt: daysFromNow(-8),
  }),
  event({
    slug: "circuit-design-workshop",
    communityId: "c5",
    authorName: "Sneha Pawar",
    title: "PCB and circuit design workshop",
    body: "From schematic to a fabricated two-layer board in KiCad. Seats are limited to the lab's workstations.",
    startsAt: daysFromNow(12, 10, 0),
    endsAt: daysFromNow(12, 16, 0),
    location: "Electronics Lab 3",
    capacity: 30,
    requiresApproval: true,
    registrationCount: 26,
    registrationClosesAt: daysFromNow(10, 23, 0),
    createdAt: daysFromNow(-6),
  }),
  event({
    slug: "simul-vs-im",
    communityId: "c4",
    authorName: "Karthik Iyer",
    title: "Simultaneous exhibition vs an International Master",
    body: "One IM, twenty boards, one evening. First come, first seated.",
    startsAt: daysFromNow(18, 17, 30),
    endsAt: daysFromNow(18, 20, 30),
    location: "Library Reading Hall",
    capacity: 20,
    registrationCount: 9,
    createdAt: daysFromNow(-2),
  }),
  event({
    slug: "ieee-membership-drive",
    communityId: "c5",
    authorName: "Sneha Pawar",
    title: "IEEE membership drive is open",
    body: "Student membership unlocks Xplore access, conference discounts and the branch's paid workshops. Visit the desk outside the staff room this week.",
    isEvent: false,
    createdAt: daysFromNow(-1),
  }),
  event({
    slug: "blitz-night-results",
    communityId: "c4",
    authorName: "Karthik Iyer",
    title: "Blitz night results",
    body: "Congratulations to Tanmay Gupta (9/10) and Kavya Patil (8.5/10). Full standings on the notice board.",
    isEvent: false,
    createdAt: daysFromNow(-6),
  }),
]

export const demoDrafts: {
  communityId: string
  authorName: string
  title: string
  body: string
}[] = [
  {
    communityId: "c1",
    authorName: "Sneha Iyer",
    title: "Hacktoberfest kickoff",
    body: "Draft: first-PR workshop and repo list for Hacktoberfest.",
  },
  {
    communityId: "c2",
    authorName: "Aarav Mehta",
    title: "Solution Challenge info session",
    body: "Draft: team formation, problem statements, and the judging timeline.",
  },
]

export const TEAM_FILL: { slug: string; role: CommunityRole; count: number }[] =
  [
    { slug: "coding-club", role: "organizer", count: 2 },
    { slug: "gdg-vit", role: "organizer", count: 1 },
    { slug: "gdg-vit", role: "organizer", count: 2 },
    { slug: "drama-society", role: "organizer", count: 1 },
    { slug: "drama-society", role: "organizer", count: 1 },
    { slug: "chess-club", role: "organizer", count: 1 },
    { slug: "ieee-vit", role: "organizer", count: 1 },
    { slug: "ieee-vit", role: "organizer", count: 2 },
  ]
