/**
 * Single source of truth for personal data shown across apps.
 * Grep for PLACEHOLDER to find everything that still needs real values.
 */
export const profile = {
  name: "Ayush Rai",
  initials: "AR",
  headline: "Software Engineer at Cloud Victor",
  location: "Jaipur, India",
  bio: "Software engineer at Cloud Victor, where I build cloud cost tooling, event-driven systems, and AI developer platforms. This is my corner of the internet: essays, projects, and experiments.",
  email: "contact@ayush-gzip.dev",

  githubUsername: "ayush-gzip",
  githubUrl: "https://github.com/ayush-gzip",
  linkedinUrl: "https://www.linkedin.com/in/ayush-rai-815110108",

  // Snapshot of the real profile (2026-09-09); the github command fetches live
  // data from api.github.com on open and only falls back to this offline.
  githubStats: {
    repos: 9,
    followers: 1,
    following: 1,
  },

  fallbackRepos: [
    { name: "context-find", description: "Search and resume Claude Code and Codex conversations across every directory and machine.", language: "TypeScript", stars: 0 },
    { name: "meet-alert", description: "Chrome extension that buzzes you when your name is called in Google Meet.", language: "JavaScript", stars: 0 },
    { name: "comic-read", description: "", language: "JavaScript", stars: 0 },
    { name: "neovim-config", description: "", language: "Lua", stars: 0 },
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Cloud Victor",
      period: "Apr 2025 - Present",
      summary:
        "Building AWS cost analyzers, event-driven onboarding systems, and the backend behind OpenClaw-as-a-Service. Led company-wide adoption of AI-assisted development tooling.",
    },
    {
      role: "Software Engineer Intern",
      company: "Fynarfin",
      period: "May 2024 - Sep 2024",
      summary:
        "Built REST APIs for the Open Payments Protocol with Spring and integrated Mojaloop rails, cutting cross-border payment costs by 3-5%.",
    },
  ],

  education: [
    {
      school: "Bennett University",
      degree: "B.Tech, Computer Science (CGPA 9.1)",
      period: "2021 - 2025",
    },
  ],
};
