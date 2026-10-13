import {
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarCheck2,
  FolderKanban,
  Headphones,
  Image,
  Layers,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  PenLine,
  ScrollText,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Short line shown on the placeholder page until the feature ships. */
  blurb: string
  /** Roadmap day the feature is scheduled for. */
  day: number
}

export const NAV_MAIN: NavItem[] = [
  { to: '/', label: 'Focus', icon: LayoutDashboard, blurb: 'Timer and your year at a glance.', day: 1 },
  { to: '/log', label: 'Log', icon: ScrollText, blurb: 'Every session with notes, subjects and images.', day: 2 },
  { to: '/stats', label: 'Insights', icon: BarChart3, blurb: 'Trends, rhythm, streaks and best days.', day: 2 },
  { to: '/arena', label: 'Arena', icon: Trophy, blurb: 'Leaderboards and country totals.', day: 5 },
  { to: '/goals', label: 'Goals', icon: CalendarCheck2, blurb: 'Daily and weekly targets with progress.', day: 4 },
  { to: '/sounds', label: 'Sounds', icon: Headphones, blurb: 'Ambient soundscapes for deep work.', day: 4 },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, blurb: 'A lightweight to-do list tied to sessions.', day: 4 },
  { to: '/moments', label: 'Moments', icon: Image, blurb: 'A visual journal of what you studied.', day: 4 },
]

export const NAV_LEARN: NavItem[] = [
  { to: '/cards', label: 'Flashcards', icon: Layers, blurb: 'Spaced repetition that schedules reviews for you.', day: 3 },
  { to: '/recall', label: 'Quick recall', icon: Brain, blurb: 'Answer from memory, then check yourself.', day: 3 },
  { to: '/brain-dump', label: 'Brain dump', icon: PenLine, blurb: 'Write everything you remember, then compare.', day: 3 },
  { to: '/explain', label: 'Explain it', icon: Lightbulb, blurb: 'Teach a topic in plain words to find the gaps.', day: 3 },
  { to: '/sketch', label: 'Sketch', icon: BookOpenCheck, blurb: 'A canvas for diagrams and mind maps.', day: 3 },
  { to: '/projects', label: 'Projects', icon: FolderKanban, blurb: 'Group sessions and materials by course or exam.', day: 4 },
]

export const NAV_FOOT: NavItem[] = [
  { to: '/more', label: 'More', icon: Sparkles, blurb: 'Extra tools and experiments.', day: 5 },
  { to: '/settings', label: 'Settings', icon: Settings, blurb: 'Timer, sounds, theme and data.', day: 2 },
  { to: '/account', label: 'Account', icon: UserRound, blurb: 'Plan, billing and sign out.', day: 1 },
]

export const ALL_NAV = [...NAV_MAIN, ...NAV_LEARN, ...NAV_FOOT]
