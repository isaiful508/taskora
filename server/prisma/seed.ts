import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function requiredSeedValue(name: string, value: string | undefined, minLength = 1): string {
  if (!value || value.trim().length < minLength) {
    throw new Error(`Set ${name} to a value with at least ${minLength} characters before seeding.`);
  }
  return value;
}

const mentorEmail = requiredSeedValue("MENTOR_EMAIL", process.env.MENTOR_EMAIL).trim();
const mentorPassword = requiredSeedValue("MENTOR_PASSWORD", process.env.MENTOR_PASSWORD, 12);
const studentDemoPassword = requiredSeedValue(
  "STUDENT_DEMO_PASSWORD",
  process.env.STUDENT_DEMO_PASSWORD,
  12,
);

const MENTOR = {
  name: "Admin Mentor",
  email: mentorEmail,
  password: mentorPassword,
  role: "MENTOR" as const,
};

const STUDENTS = [
  "Ayesha Rahman",
  "Tanvir Hasan",
  "Nusrat Jahan",
  "Rafiul Islam",
  "Sadia Akter",
  "Imran Hossain",
  "Farzana Parvin",
  "Shakib Ahmed",
  "Mehjabin Chowdhury",
  "Arif Billah",
  "Tasnim Rahman",
  "Zubair Alam",
  "Sumaiya Khatun",
  "Fahim Reza",
  "Rumana Begum",
  "Kamrul Islam",
];

const SUBMISSIONS = [
  {
    projectName: "Campus Market",
    repoUrl: "https://github.com/demo/campus-market",
    liveUrl: "https://campus-market.vercel.app",
    description:
      "A campus marketplace where students can buy and sell used books, electronics and furniture with chat-based negotiation.",
    status: "APPROVED" as const,
  },
  {
    projectName: "DevBoard",
    repoUrl: "https://github.com/demo/devboard",
    liveUrl: "https://devboard.vercel.app",
    description:
      "A Kanban-style task board for developers with markdown support, GitHub issue import and keyboard-first navigation.",
    status: "PENDING" as const,
  },
  {
    projectName: "RecipeBox",
    repoUrl: "https://github.com/demo/recipebox",
    liveUrl: "https://recipebox.vercel.app",
    description:
      "Save and organise recipes from the web with automatic ingredient parsing, meal planning and shopping list export.",
    status: "REJECTED" as const,
  },
  {
    projectName: "FitTrack Lite",
    repoUrl: "https://github.com/demo/fittrack-lite",
    liveUrl: null,
    description:
      "A lightweight workout logger with progressive overload tracking, rest timers and weekly volume charts.",
    status: "PENDING" as const,
  },
  {
    projectName: "QuietHours",
    repoUrl: "https://github.com/demo/quiethours",
    liveUrl: "https://quiethours.vercel.app",
    description:
      "A focus timer and ambient noise mixer that logs deep-work sessions and blocks distracting sites during sprints.",
    status: "APPROVED" as const,
  },
  {
    projectName: "Invoice Ninja Mini",
    repoUrl: "https://github.com/demo/invoice-ninja-mini",
    liveUrl: "https://invoice-mini.vercel.app",
    description:
      "Generate branded invoices and quotes in seconds, track payment status and export monthly summaries as PDF.",
    status: "REJECTED" as const,
  },
  {
    projectName: "Lost & Found",
    repoUrl: "https://github.com/demo/lost-and-found",
    liveUrl: null,
    description:
      "Campus lost-and-found board where students post missing items and found items are matched by tags and location.",
    status: "PENDING" as const,
  },
  {
    projectName: "Markdown Notes API",
    repoUrl: "https://github.com/demo/md-notes-api",
    liveUrl: null,
    description:
      "A REST API for markdown notes with full-text search, tag filtering, folder hierarchy and JWT-based auth.",
    status: "APPROVED" as const,
  },
  {
    projectName: "Bus Tracker BD",
    repoUrl: "https://github.com/demo/bus-tracker-bd",
    liveUrl: "https://bus-tracker.vercel.app",
    description:
      "Live bus tracking for city routes with crowd-sourced delay reports, ETA predictions and stop reminders.",
    status: "PENDING" as const,
  },
  {
    projectName: "Habit Garden",
    repoUrl: "https://github.com/demo/habit-garden",
    liveUrl: "https://habit-garden.vercel.app",
    description:
      "Grow a virtual garden by keeping habits alive — miss a habit and watch a plant wilt. Streaks, reminders and weekly reports.",
    status: "REJECTED" as const,
  },
  {
    projectName: "Snippet Vault",
    repoUrl: "https://github.com/demo/snippet-vault",
    liveUrl: null,
    description:
      "A personal snippet manager with syntax highlighting, language filters, favourites and one-copy clipboard actions.",
    status: "APPROVED" as const,
  },
  {
    projectName: "Evently",
    repoUrl: "https://github.com/demo/evently",
    liveUrl: "https://evently.vercel.app",
    description:
      "Create and share campus events with RSVP tracking, calendar export and a simple organizer dashboard.",
    status: "PENDING" as const,
  },
  {
    projectName: "PDF Summarizer",
    repoUrl: "https://github.com/demo/pdf-summarizer",
    liveUrl: "https://pdf-summarizer.vercel.app",
    description:
      "Upload a PDF and get a structured summary with key headings, extractable quotes and a downloadable outline.",
    status: "APPROVED" as const,
  },
  {
    projectName: "DevJokes CLI",
    repoUrl: "https://github.com/demo/devjokes-cli",
    liveUrl: null,
    description:
      "A tiny CLI that serves a random programming joke on every command with offline caching and a contribute mode.",
    status: "PENDING" as const,
  },
  {
    projectName: "Portfolio Spark",
    repoUrl: "https://github.com/demo/portfolio-spark",
    liveUrl: "https://portfolio-spark.vercel.app",
    description:
      "A developer portfolio generator that turns a GitHub profile into a themed site with projects, stats and a blog.",
    status: "APPROVED" as const,
  },
  {
    projectName: "Splitwise Lite",
    repoUrl: "https://github.com/demo/splitwise-lite",
    liveUrl: "https://splitwise-lite.vercel.app",
    description:
      "Split shared expenses with friends, settle up in multiple currencies and see a running balance per group.",
    status: "PENDING" as const,
  },
];

// Two students demonstrate the "rejected → resubmit" flow with a rejected history row.
const HISTORY = [
  {
    studentIndex: 0,
    projectName: "Campus Market (v1)",
    repoUrl: "https://github.com/demo/campus-market-v1",
    liveUrl: null,
    description:
      "First attempt at the campus marketplace. Rejected because the repo was empty and the live link was broken.",
    status: "REJECTED" as const,
    daysAgo: 25,
  },
  {
    studentIndex: 2,
    projectName: "RecipeBox (v1)",
    repoUrl: "https://github.com/demo/recipebox-v1",
    liveUrl: null,
    description:
      "First attempt at the recipe manager. Rejected for missing README and no deployment.",
    status: "REJECTED" as const,
    daysAgo: 22,
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();

  const mentorHash = await bcrypt.hash(MENTOR.password, 12);
  await prisma.user.create({
    data: { name: MENTOR.name, email: MENTOR.email, passwordHash: mentorHash, role: MENTOR.role },
  });

  const passwordHash = await bcrypt.hash(studentDemoPassword, 12);
  const students = [];
  for (let i = 0; i < STUDENTS.length; i++) {
    const slug = STUDENTS[i].toLowerCase().replace(/[^a-z]+/g, ".");
    students.push(
      await prisma.user.create({
        data: {
          name: STUDENTS[i],
          email: `${slug}@student.dev`,
          passwordHash,
          role: "STUDENT",
        },
      }),
    );
  }

  for (const h of HISTORY) {
    const createdAt = new Date(Date.now() - h.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.submission.create({
      data: {
        studentId: students[h.studentIndex].id,
        projectName: h.projectName,
        repoUrl: h.repoUrl,
        liveUrl: h.liveUrl,
        description: h.description,
        status: h.status,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  for (let i = 0; i < SUBMISSIONS.length; i++) {
    const s = SUBMISSIONS[i];
    const daysAgo = Math.floor(Math.random() * 14) + 1;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.submission.create({
      data: {
        studentId: students[i].id,
        projectName: s.projectName,
        repoUrl: s.repoUrl,
        liveUrl: s.liveUrl,
        description: s.description,
        status: s.status,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log(`   Mentor:  ${MENTOR.email}`);
  console.log(`   Students: ${students.length} accounts (password from STUDENT_DEMO_PASSWORD)`);
  console.log(`   Submissions: ${SUBMISSIONS.length + HISTORY.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
