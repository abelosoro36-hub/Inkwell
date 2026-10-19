export type Plan = 'free' | 'active' | 'review' | 'eligible' | 'premium'

export interface Writer {
  id: number
  name: string
  color: string
  project: string
  genre: string
  words: number
  status: 'writing' | 'editing' | 'reviewing'
}

export interface Task {
  id: number
  title: string
  client: string
  type: string
  pay: number
  words: number
  due: string
  premium?: boolean
}

export const WRITERS: Writer[] = [
  { id: 1, name: 'Amara Okafor', color: '#f26a3d', project: 'The Salt Road', genre: 'Novel', words: 1840, status: 'writing' },
  { id: 2, name: 'Leo Martins', color: '#1f8a8a', project: 'Tides of Tomorrow', genre: 'Sci-fi', words: 920, status: 'editing' },
  { id: 3, name: 'Wanjiru Kamau', color: '#6b5bd6', project: 'Letters from Nairobi', genre: 'Essay', words: 2310, status: 'writing' },
  { id: 4, name: 'Sofia Rossi', color: '#d6457a', project: 'Quiet Kitchens', genre: 'Memoir', words: 640, status: 'reviewing' },
  { id: 5, name: 'Dev Patel', color: '#3b82c4', project: 'Zero Day Podcast Script', genre: 'Script', words: 1475, status: 'writing' },
  { id: 6, name: 'Hana Sato', color: '#c9951f', project: 'Moonlit Haiku Cycle', genre: 'Poetry', words: 210, status: 'editing' },
]

export const FEATURES = [
  { icon: '✍️', title: 'Distraction-free editor', text: 'A calm page with focus mode, word goals and autosave so you only think about the next sentence.' },
  { icon: '👥', title: 'Live co-writing', text: 'See collaborators’ cursors in real time, split chapters between authors and write side by side.' },
  { icon: '💬', title: 'Inline feedback', text: 'Editors and beta readers comment on any line. Resolve notes as you revise.' },
  { icon: '🕒', title: 'Version history', text: 'Every draft is saved. Compare changes and bring back any earlier version in one click.' },
  { icon: '🔥', title: 'Goals and streaks', text: 'Daily word targets, streak counters and sprints with other writers keep you moving.' },
  { icon: '🚀', title: 'Publish anywhere', text: 'Share a private link, post to your public page, or export to TXT, DOCX and EPUB.' },
]

export const TASKS: Task[] = [
  { id: 1, title: 'Blog post: remote work habits', client: 'BrightLeaf Co.', type: 'Blog', pay: 24, words: 800, due: '2 days' },
  { id: 2, title: 'Product descriptions (10 items)', client: 'Kito Gear', type: 'Copywriting', pay: 30, words: 1000, due: '3 days' },
  { id: 3, title: 'Case study: logistics startup', client: 'FreightNest', type: 'Case study', pay: 55, words: 1500, due: '5 days', premium: true },
  { id: 4, title: 'Newsletter: monthly roundup', client: 'Greenfold', type: 'Email', pay: 18, words: 500, due: '1 day' },
  { id: 5, title: 'Whitepaper: AI in healthcare', client: 'MedBridge', type: 'Whitepaper', pay: 120, words: 3000, due: '7 days', premium: true },
  { id: 6, title: 'Essay editing and proofreading', client: 'Campus Hub', type: 'Editing', pay: 20, words: 2000, due: '2 days' },
]

export const PANEL = [
  { name: 'Grace Njeri', role: 'Lead editor', skin: '#8d5a3b', hair: '#1b1b1b', shirt: '#f26a3d', bg: '#fde4da', variant: 2 },
  { name: 'Marcus Bell', role: 'Quality reviewer', skin: '#e0ac86', hair: '#4a3020', shirt: '#1f8a8a', bg: '#d6eeee', variant: 0 },
  { name: 'Aisha Rahman', role: 'Style coach', skin: '#c68b63', hair: '#2a1a12', shirt: '#6b5bd6', bg: '#e6e2fa', variant: 1 },
  { name: 'Tom Larsen', role: 'Fact-check lead', skin: '#f1c9a5', hair: '#b5832d', shirt: '#3b82c4', bg: '#dbe9f6', variant: 0 },
]