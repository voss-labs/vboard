// Mock fixtures for UI work — types match plan.md schema.
// Replaced with real DB queries once Phase 1 ships.

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  memberCount: number;
};

export type PostVisibility = "public" | "vit_only";
export type LocationVisibility = "public" | "after_approval";
export type PostStatus = "draft" | "published" | "cancelled" | "completed" | "hidden";

export type Post = {
  id: string;
  slug: string;
  communityId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  imageUrl?: string;
  visibility: PostVisibility;
  isPinned: boolean;
  status: PostStatus;
  isEvent: boolean;
  startsAt?: Date;
  endsAt?: Date;
  location?: string;
  locationVisibility?: LocationVisibility;
  registrationOpensAt?: Date;
  registrationClosesAt?: Date;
  capacity?: number;
  requiresApproval: boolean;
  registrationCount: number;
  createdAt: Date;
};

export const communities: Community[] = [
  {
    id: "c1",
    slug: "coding-club",
    name: "Coding Club VIT",
    description:
      "The student programming community at VIT. Hackathons, study groups, and open source projects.",
    memberCount: 142,
  },
  {
    id: "c2",
    slug: "gdg-vit",
    name: "GDG on Campus VIT",
    description:
      "Google Developer Groups chapter at Vidyalankar. Workshops on Android, Web, AI, and Cloud.",
    memberCount: 218,
  },
  {
    id: "c3",
    slug: "drama-society",
    name: "Drama Society",
    description:
      "Stage plays, monologues, improv nights. Theatre for everyone, no audition needed to join.",
    memberCount: 84,
  },
  {
    id: "c4",
    slug: "chess-club",
    name: "Chess Club",
    description: "Weekly rapid tournaments, blitz nights, openings study.",
    memberCount: 56,
  },
  {
    id: "c5",
    slug: "ieee-vit",
    name: "IEEE Student Branch",
    description:
      "Engineering, ethics, and electrical projects. Industry talks and paper presentation training.",
    memberCount: 173,
  },
];

const today = new Date();
function daysFromNow(n: number, hour = 10, minute = 0) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const posts: Post[] = [
  {
    id: "p1",
    slug: "build-with-gemma-4",
    communityId: "c2",
    authorId: "u1",
    authorName: "Aarav Mehta",
    title: "Build with Gemma 4",
    body: "Hands-on workshop on building with Google's Gemma 4 open models. We'll fine-tune a small model on a custom dataset and deploy it. Bring a laptop with Python set up.",
    imageUrl: undefined,
    visibility: "public",
    isPinned: true,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(3, 11, 0),
    endsAt: daysFromNow(3, 13, 30),
    location: "Seminar Hall, B-Wing",
    locationVisibility: "public",
    registrationOpensAt: daysFromNow(-2),
    registrationClosesAt: daysFromNow(2, 22, 0),
    capacity: 60,
    requiresApproval: false,
    registrationCount: 41,
    createdAt: daysFromNow(-7),
  },
  {
    id: "p2",
    slug: "monsoon-monologues",
    communityId: "c3",
    authorId: "u2",
    authorName: "Riya Kulkarni",
    title: "Monsoon Monologues — Open Mic Night",
    body: "Bring a piece. Three minutes max. We provide the lights, you bring the words. First-timers actively encouraged.",
    visibility: "vit_only",
    isPinned: false,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(6, 18, 0),
    endsAt: daysFromNow(6, 21, 0),
    location: "Black Box Theatre",
    locationVisibility: "after_approval",
    registrationOpensAt: daysFromNow(-3),
    registrationClosesAt: daysFromNow(5, 22, 0),
    capacity: 40,
    requiresApproval: true,
    registrationCount: 18,
    createdAt: daysFromNow(-5),
  },
  {
    id: "p3",
    slug: "recruitment-coding-club",
    communityId: "c1",
    authorId: "u3",
    authorName: "Devansh Shah",
    title: "Coding Club is recruiting",
    body: "We're opening core team applications for SE and TE students. Five roles: maintainers, event leads, content, design, sponsorships. Application form drops Friday.",
    visibility: "vit_only",
    isPinned: false,
    status: "published",
    isEvent: false,
    requiresApproval: false,
    registrationCount: 0,
    createdAt: daysFromNow(-1),
  },
  {
    id: "p4",
    slug: "blitz-tournament-may",
    communityId: "c4",
    authorId: "u4",
    authorName: "Karthik Iyer",
    title: "Blitz Tournament — May Edition",
    body: "5+0 Swiss, six rounds, prize pool of 3000 INR. Bring your own clock if possible. Last month's winner: Aanya, 6/6.",
    visibility: "public",
    isPinned: false,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(10, 16, 0),
    endsAt: daysFromNow(10, 20, 0),
    location: "Library Reading Room",
    locationVisibility: "public",
    registrationOpensAt: daysFromNow(-4),
    registrationClosesAt: daysFromNow(9, 22, 0),
    capacity: 32,
    requiresApproval: false,
    registrationCount: 24,
    createdAt: daysFromNow(-4),
  },
  {
    id: "p5",
    slug: "intro-to-react-server-components",
    communityId: "c1",
    authorId: "u3",
    authorName: "Devansh Shah",
    title: "Intro to React Server Components",
    body: "Two-hour primer on RSCs: what they are, when to use them, why they matter. Bring questions, we'll keep it interactive.",
    visibility: "public",
    isPinned: false,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(14, 17, 0),
    endsAt: daysFromNow(14, 19, 0),
    location: "Computer Lab 3",
    locationVisibility: "public",
    registrationOpensAt: daysFromNow(-1),
    registrationClosesAt: daysFromNow(13, 22, 0),
    capacity: 50,
    requiresApproval: false,
    registrationCount: 12,
    createdAt: daysFromNow(-2),
  },
  {
    id: "p6",
    slug: "paper-presentation-training",
    communityId: "c5",
    authorId: "u5",
    authorName: "Sneha Pawar",
    title: "Paper Presentation — Training Session",
    body: "How to write, structure, and present an IEEE-grade paper. Aimed at TE/BE students preparing for conference submissions. Faculty mentor: Dr. Kulkarni.",
    visibility: "vit_only",
    isPinned: false,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(7, 14, 0),
    endsAt: daysFromNow(7, 16, 0),
    location: "Auditorium",
    locationVisibility: "public",
    registrationOpensAt: daysFromNow(-5),
    registrationClosesAt: daysFromNow(6, 22, 0),
    capacity: 100,
    requiresApproval: false,
    registrationCount: 67,
    createdAt: daysFromNow(-6),
  },
  {
    id: "p7",
    slug: "open-source-saturday",
    communityId: "c1",
    authorId: "u3",
    authorName: "Devansh Shah",
    title: "Open Source Saturday",
    body: "Casual hack session — bring a project, fix a bug in someone else's, or pair on something new. Coffee provided. No agenda, no slides.",
    visibility: "public",
    isPinned: false,
    status: "published",
    isEvent: true,
    startsAt: daysFromNow(2, 10, 0),
    endsAt: daysFromNow(2, 16, 0),
    location: "Innovation Lab",
    locationVisibility: "public",
    registrationOpensAt: daysFromNow(-7),
    registrationClosesAt: daysFromNow(1, 22, 0),
    capacity: 30,
    requiresApproval: false,
    registrationCount: 22,
    createdAt: daysFromNow(-8),
  },
  {
    id: "p8",
    slug: "drama-society-welcome",
    communityId: "c3",
    authorId: "u2",
    authorName: "Riya Kulkarni",
    title: "Drama Society — welcome to first-years",
    body: "Reading session this Friday for anyone who wants to try acting. We pick a short scene, you read with someone, no judgement. First-years especially welcome.",
    visibility: "vit_only",
    isPinned: false,
    status: "published",
    isEvent: false,
    requiresApproval: false,
    registrationCount: 0,
    createdAt: daysFromNow(0),
  },
];

export function getCommunityById(id: string): Community | undefined {
  return communities.find((c) => c.id === id);
}

export function getCommunityBySlug(slug: string): Community | undefined {
  return communities.find((c) => c.slug === slug);
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsForCommunity(communityId: string): Post[] {
  return posts.filter((p) => p.communityId === communityId);
}

export function getEvents(): Post[] {
  return posts.filter((p) => p.isEvent && p.status === "published");
}
