/* ── Commit · sample workspace ──────────────────────────────────────────
   Loaded on demand ("Load sample workspace" in Settings, or the empty-
   state button) so a fresh account can see the full experience.        */
import type { Category, Goal, Project, Task } from "@/types";
import { daysAgo, daysAhead, pad, todayISO } from "@/utils/date";
import { uid } from "@/utils/constants";

export const seedCategories: Category[] = [
  { id: "cat_career",   name: "Career",     color: "#3D52A0", icon: "Briefcase" },
  { id: "cat_school",   name: "School",     color: "#8A5CB8", icon: "GraduationCap" },
  { id: "cat_health",   name: "Health",     color: "#4E9B6E", icon: "HeartPulse" },
  { id: "cat_finance",  name: "Finance",    color: "#B08A3D", icon: "Wallet" },
  { id: "cat_cyber",    name: "ServeCyber", color: "#3D8AA0", icon: "Shield" },
  { id: "cat_personal", name: "Personal",   color: "#C77B3F", icon: "Sparkles" },
  { id: "cat_family",   name: "Family",     color: "#B85C8A", icon: "Users" },
  { id: "cat_travel",   name: "Travel",     color: "#3DA08A", icon: "Plane" },
  { id: "cat_content",  name: "Content",    color: "#C0455E", icon: "PenLine" },
  { id: "cat_home",     name: "Home",       color: "#7091E6", icon: "Home" },
].map((c, i) => ({ ...c, sortIndex: i }));

export const seedGoals: Goal[] = [
  { id: "goal_aws", name: "Pass AWS Certification", description: "Earn the Solutions Architect Associate credential.", categoryId: "cat_career", targetDate: daysAhead(42),
    milestones: [
      { id: "m1", title: "Finish core video course", done: true },
      { id: "m2", title: "Complete 3 practice exams above 80%", done: false },
      { id: "m3", title: "Book the exam", done: false },
    ] },
  { id: "goal_gt", name: "Graduate Georgetown", description: "Complete the master's program with a 3.8+ GPA.", categoryId: "cat_school", targetDate: daysAhead(220),
    milestones: [
      { id: "m4", title: "Finish spring semester", done: true },
      { id: "m5", title: "Submit capstone proposal", done: false },
      { id: "m6", title: "Defend capstone", done: false },
    ] },
  { id: "goal_save", name: "Save $10,000", description: "Build the emergency fund to five figures.", categoryId: "cat_finance", targetDate: daysAhead(160),
    milestones: [
      { id: "m7", title: "Reach $2,500", done: true },
      { id: "m8", title: "Reach $5,000", done: true },
      { id: "m9", title: "Reach $10,000", done: false },
    ] },
  { id: "goal_sc", name: "Launch ServeCyber", description: "Ship the site, first offer, and first three clients.", categoryId: "cat_cyber", targetDate: daysAhead(75),
    milestones: [
      { id: "m10", title: "Brand + domain", done: true },
      { id: "m11", title: "Website live", done: false },
      { id: "m12", title: "First client signed", done: false },
    ] },
  { id: "goal_home", name: "Buy a Home", description: "Get pre-approved and close on a first home.", categoryId: "cat_home", targetDate: daysAhead(330),
    milestones: [
      { id: "m13", title: "Credit above 740", done: true },
      { id: "m14", title: "Down payment saved", done: false },
      { id: "m15", title: "Pre-approval letter", done: false },
    ] },
].map((g, i) => ({ ...g, sortIndex: i }));

export const seedProjects: Project[] = [
  { id: "proj_aws",  name: "AWS Certification",   description: "Study plan, practice exams, booking.", categoryId: "cat_career", goalId: "goal_aws",  targetDate: daysAhead(40) },
  { id: "proj_ms",   name: "Master's Degree",     description: "Coursework and capstone.",             categoryId: "cat_school", goalId: "goal_gt",   targetDate: daysAhead(210) },
  { id: "proj_site", name: "ServeCyber Website",  description: "Design, build, launch.",               categoryId: "cat_cyber",  goalId: "goal_sc",   targetDate: daysAhead(30) },
  { id: "proj_apt",  name: "Apartment Search",    description: "Shortlist, tour, apply.",              categoryId: "cat_home",   goalId: "goal_home", targetDate: daysAhead(60) },
  { id: "proj_conf", name: "Conference Planning", description: "Talk proposal, travel, logistics.",    categoryId: "cat_travel", goalId: null,        targetDate: daysAhead(50) },
].map((p, i) => ({ ...p, sortIndex: i }));

function t(over: Partial<Task>): Task {
  return {
    id: uid("task"), title: "", description: "", notes: "", priority: "Medium",
    difficulty: "Medium", categoryId: "cat_personal", projectId: null, goalId: null,
    deadline: null, startDate: null, duration: 60, recurring: "None", tags: [],
    status: "Not Started", subtasks: [], createdAt: daysAgo(10), completedAt: null,
    ...over,
  };
}

/* completedAt strings carry an hour so analytics can find the productive hour */
const done = (dAgo: number, hour: number) => `${daysAgo(dAgo)}T${pad(hour)}:00:00`;

export const seedTasks: Task[] = [
  /* --- Today, open --- */
  t({ title: "Take AWS practice exam #2", description: "Full 65-question timed run.", priority: "Critical", difficulty: "Hard",
      categoryId: "cat_career", projectId: "proj_aws", goalId: "goal_aws", deadline: todayISO(), duration: 130,
      tags: ["exam", "study"], status: "In Progress",
      subtasks: [{ id: uid("s"), title: "Timed run", done: true }, { id: uid("s"), title: "Review wrong answers", done: false }] }),
  t({ title: "Write homepage hero copy", description: "Headline + subhead for ServeCyber landing page.", priority: "High", difficulty: "Medium",
      categoryId: "cat_cyber", projectId: "proj_site", goalId: "goal_sc", deadline: todayISO(), duration: 45, tags: ["writing"] }),
  t({ title: "Gym — push day", priority: "Medium", difficulty: "Easy", categoryId: "cat_health", deadline: todayISO(),
      duration: 60, recurring: "Daily", tags: ["fitness"] }),
  t({ title: "Read capstone research papers", description: "Annotate the two assigned papers.", priority: "Medium", difficulty: "Medium",
      categoryId: "cat_school", projectId: "proj_ms", goalId: "goal_gt", deadline: todayISO(), duration: 90, tags: ["reading"] }),
  t({ title: "Transfer $250 to savings", priority: "High", difficulty: "Easy", categoryId: "cat_finance", goalId: "goal_save",
      deadline: todayISO(), duration: 5, recurring: "Weekly", tags: ["money"] }),

  /* --- Today, already completed --- */
  t({ title: "Morning review & plan the day", priority: "Medium", difficulty: "Easy", categoryId: "cat_personal",
      deadline: todayISO(), duration: 15, recurring: "Daily", status: "Completed", completedAt: done(0, 8), tags: ["routine"] }),
  t({ title: "Reply to program advisor", priority: "High", difficulty: "Easy", categoryId: "cat_school", projectId: "proj_ms",
      goalId: "goal_gt", deadline: todayISO(), duration: 15, status: "Completed", completedAt: done(0, 9) }),
  t({ title: "Sketch pricing page layout", priority: "Medium", difficulty: "Medium", categoryId: "cat_cyber", projectId: "proj_site",
      goalId: "goal_sc", deadline: todayISO(), duration: 40, status: "Completed", completedAt: done(0, 10), tags: ["design"] }),

  /* --- Overdue --- */
  t({ title: "Email 3 apartment listings to tour", priority: "High", difficulty: "Easy", categoryId: "cat_home",
      projectId: "proj_apt", goalId: "goal_home", deadline: daysAgo(2), duration: 20, tags: ["housing"] }),

  /* --- Upcoming --- */
  t({ title: "Book conference flights", priority: "High", difficulty: "Easy", categoryId: "cat_travel", projectId: "proj_conf",
      deadline: daysAhead(1), duration: 30, tags: ["travel"] }),
  t({ title: "Draft capstone proposal outline", priority: "Critical", difficulty: "Hard", categoryId: "cat_school",
      projectId: "proj_ms", goalId: "goal_gt", deadline: daysAhead(2), duration: 120, tags: ["writing"] }),
  t({ title: "Build services page", priority: "High", difficulty: "Hard", categoryId: "cat_cyber", projectId: "proj_site",
      goalId: "goal_sc", deadline: daysAhead(3), duration: 150, tags: ["dev"] }),
  t({ title: "Schedule two apartment tours", priority: "Medium", difficulty: "Easy", categoryId: "cat_home", projectId: "proj_apt",
      goalId: "goal_home", deadline: daysAhead(4), duration: 20 }),
  t({ title: "AWS practice exam #3", priority: "High", difficulty: "Hard", categoryId: "cat_career", projectId: "proj_aws",
      goalId: "goal_aws", deadline: daysAhead(6), duration: 130, tags: ["exam"] }),
  t({ title: "Film a launch teaser", priority: "Low", difficulty: "Medium", categoryId: "cat_content", deadline: daysAhead(7),
      duration: 60, tags: ["video"] }),
  t({ title: "Family dinner — pick a place", priority: "Low", difficulty: "Easy", categoryId: "cat_family", deadline: daysAhead(5), duration: 10 }),
  t({ title: "Compare renter's insurance quotes", priority: "Medium", difficulty: "Medium", categoryId: "cat_finance",
      projectId: "proj_apt", deadline: daysAhead(9), duration: 45 }),
  t({ title: "Submit conference talk proposal", priority: "Medium", difficulty: "Medium", categoryId: "cat_career",
      projectId: "proj_conf", deadline: daysAhead(12), duration: 90, tags: ["speaking"] }),

  /* --- Completed history (past two weeks) --- */
  t({ title: "Finish IAM + networking modules", categoryId: "cat_career", projectId: "proj_aws", goalId: "goal_aws",
      difficulty: "Hard", status: "Completed", completedAt: done(1, 20), createdAt: daysAgo(6), duration: 120 }),
  t({ title: "Set up ServeCyber repo + CI", categoryId: "cat_cyber", projectId: "proj_site", goalId: "goal_sc",
      difficulty: "Medium", status: "Completed", completedAt: done(1, 15), createdAt: daysAgo(5), duration: 60 }),
  t({ title: "AWS practice exam #1", categoryId: "cat_career", projectId: "proj_aws", goalId: "goal_aws",
      difficulty: "Hard", status: "Completed", completedAt: done(2, 19), createdAt: daysAgo(8), duration: 130 }),
  t({ title: "Meal prep for the week", categoryId: "cat_health", difficulty: "Medium", status: "Completed",
      completedAt: done(2, 11), createdAt: daysAgo(3), duration: 90 }),
  t({ title: "Pay credit card statement", categoryId: "cat_finance", difficulty: "Easy", status: "Completed",
      completedAt: done(3, 9), createdAt: daysAgo(4), duration: 5 }),
  t({ title: "Outline website sitemap", categoryId: "cat_cyber", projectId: "proj_site", goalId: "goal_sc",
      difficulty: "Medium", status: "Completed", completedAt: done(3, 14), createdAt: daysAgo(6), duration: 45 }),
  t({ title: "Week 6 problem set", categoryId: "cat_school", projectId: "proj_ms", goalId: "goal_gt",
      difficulty: "Hard", status: "Completed", completedAt: done(4, 21), createdAt: daysAgo(7), duration: 150 }),
  t({ title: "Long run — 8km", categoryId: "cat_health", difficulty: "Medium", status: "Completed",
      completedAt: done(4, 7), createdAt: daysAgo(5), duration: 55 }),
  t({ title: "Shortlist 10 apartments", categoryId: "cat_home", projectId: "proj_apt", goalId: "goal_home",
      difficulty: "Medium", status: "Completed", completedAt: done(5, 18), createdAt: daysAgo(9), duration: 60 }),
  t({ title: "Publish study-notes thread", categoryId: "cat_content", difficulty: "Easy", status: "Completed",
      completedAt: done(6, 12), createdAt: daysAgo(7), duration: 30 }),
  t({ title: "Storage + databases modules", categoryId: "cat_career", projectId: "proj_aws", goalId: "goal_aws",
      difficulty: "Hard", status: "Completed", completedAt: done(6, 20), createdAt: daysAgo(11), duration: 120 }),
  t({ title: "Compare conference hotels", categoryId: "cat_travel", projectId: "proj_conf", difficulty: "Easy",
      status: "Completed", completedAt: done(7, 16), createdAt: daysAgo(9), duration: 30 }),
  t({ title: "Midterm essay draft", categoryId: "cat_school", projectId: "proj_ms", goalId: "goal_gt",
      difficulty: "Epic", status: "Completed", completedAt: done(8, 22), createdAt: daysAgo(13), duration: 240 }),
  t({ title: "Logo + brand palette", categoryId: "cat_cyber", projectId: "proj_site", goalId: "goal_sc",
      difficulty: "Medium", status: "Completed", completedAt: done(9, 13), createdAt: daysAgo(12), duration: 90 }),
  t({ title: "Automate savings transfer", categoryId: "cat_finance", goalId: "goal_save", difficulty: "Easy",
      status: "Completed", completedAt: done(10, 10), createdAt: daysAgo(12), duration: 15 }),
  t({ title: "Call parents", categoryId: "cat_family", difficulty: "Easy", status: "Completed",
      completedAt: done(11, 19), createdAt: daysAgo(12), duration: 30 }),
  t({ title: "Compute + security modules", categoryId: "cat_career", projectId: "proj_aws", goalId: "goal_aws",
      difficulty: "Hard", status: "Completed", completedAt: done(12, 20), createdAt: daysAgo(16), duration: 120 }),
  t({ title: "Declutter desk + cable run", categoryId: "cat_home", difficulty: "Easy", status: "Completed",
      completedAt: done(13, 17), createdAt: daysAgo(14), duration: 40 }),
];
