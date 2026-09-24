import { Achievement, ConversationStarter } from '../types.ts';

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  {
    id: '1',
    text: "What's the weirdest food combination you secretly enjoy?",
    category: 'weird',
  },
  {
    id: '2',
    text: "If you became completely invisible for 24 hours, what's the first thing you'd do?",
    category: 'funny',
  },
  {
    id: '3',
    text: "What is your most useless, bizarre superpower or talent?",
    category: 'funny',
  },
  {
    id: '4',
    text: "What is the funniest or most embarrassing thing that happened to you recently?",
    category: 'funny',
  },
  {
    id: '5',
    text: "Honest answer: could you survive 7 days without your smartphone?",
    category: 'would-you-rather',
  },
  {
    id: '6',
    text: "If you were arrested with zero explanation, what would your best friends assume you did?",
    category: 'funny',
  },
  {
    id: '7',
    text: "Settle this high-stakes debate: is cereal secretly a cold breakfast soup?",
    category: 'weird',
  },
  {
    id: '8',
    text: "If animals suddenly started talking, which animal would be the most arrogant?",
    category: 'funny',
  },
  {
    id: '9',
    text: "Pineapple on pizza: culinary masterpiece or immediate prison sentence? 🍕",
    category: 'would-you-rather',
  },
  {
    id: '10',
    text: "What's the absolute worst piece of advice you've ever followed with confidence?",
    category: 'funny',
  },
  {
    id: '11',
    text: "Would you rather have infinite chai/coffee or never have to sleep again?",
    category: 'would-you-rather',
  },
  {
    id: '12',
    text: "If your life was a movie right now, what would the sarcastic title be?",
    category: 'deep',
  },
];

export const FUNNY_MOTIVATIONS = [
  "Bro, you're on fire 🔥",
  "Only a bit more chats! Don't disappear 😂",
  "Your keyboard is working harder than you right now 😭",
  "10K milestone is getting closer 👀",
  "Chat Champion loading... 🏆",
  "Rs. 2 empire in progress, don't give up! 💰",
  "Even Shakespeare didn't type this many words ✍️",
  "Thumbs of steel detected! Keep chatting ⚡",
  "Your social battery is suspiciously high today 🔋",
  "One message closer to billionaire status (in spirit) 🚀",
];

export const FUNNY_LOADING_MESSAGES = [
  "Waking up the server with a hot cup of kadak chai... ☕",
  "Polishing your Rs. 2 reward coins with microfiber cloth... 💰",
  "Teaching our bots how to laugh properly... 😂",
  "Detecting if your keyboard needs emergency ice... 🧊",
  "Counting the infinite 'lol's and 'bruh's... 💬",
  "Checking if someone just sent a spicy meme... 🌶️",
];

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_chat',
    title: 'First Chat 🥉',
    icon: '🥉',
    description: 'Sent your very first verified message on ChatKaro!',
    requirementType: 'chats',
    targetCount: 1,
    unlocked: false,
    xpReward: 50,
  },
  {
    id: 'chats_100',
    title: '100 Chats 🔥',
    icon: '🔥',
    description: 'Passed 100 valid messages! Warming up the thumbs.',
    requirementType: 'chats',
    targetCount: 100,
    unlocked: false,
    xpReward: 150,
  },
  {
    id: 'chats_500',
    title: '500 Chats 😂',
    icon: '😂',
    description: '500 conversations verified. Certified conversationalist!',
    requirementType: 'chats',
    targetCount: 500,
    unlocked: false,
    xpReward: 300,
  },
  {
    id: 'chats_1000',
    title: '1,000 Chats ⚡',
    icon: '⚡',
    description: '1,000 messages! Lightning fingers in action.',
    requirementType: 'chats',
    targetCount: 1000,
    unlocked: false,
    xpReward: 600,
  },
  {
    id: 'chats_5000',
    title: '5,000 Chats 🚀',
    icon: '🚀',
    description: 'Halfway to 10K glory! Legend in the making.',
    requirementType: 'chats',
    targetCount: 5000,
    unlocked: false,
    xpReward: 1500,
  },
  {
    id: 'chats_10000',
    title: '10,000 Chats 👑',
    icon: '👑',
    description: 'BROOOO! The holy grail of chatting unlocked!',
    requirementType: 'chats',
    targetCount: 10000,
    unlocked: false,
    xpReward: 5000,
  },
  {
    id: 'reward_unlocked',
    title: 'Reward Unlocked 💰',
    icon: '💰',
    description: 'Unlocked and claimed your verified Rs. 2 reward!',
    requirementType: 'reward',
    targetCount: 1,
    unlocked: false,
    xpReward: 1000,
  },
  {
    id: 'spicy_starter',
    title: 'Ice Breaker 🧊',
    icon: '🧊',
    description: 'Used a funny conversation starter to revive a chat!',
    requirementType: 'starter',
    targetCount: 1,
    unlocked: false,
    xpReward: 100,
  },
  {
    id: 'streak_3',
    title: 'Streak Master 🎯',
    icon: '🎯',
    description: 'Kept your chat streak alive for 3 days running!',
    requirementType: 'streak',
    targetCount: 3,
    unlocked: false,
    xpReward: 250,
  },
];

export const LEVEL_TIERS = [
  { level: 1, title: 'Newbie', minXp: 0, badge: '🌱' },
  { level: 2, title: 'Chat Starter', minXp: 100, badge: '💬' },
  { level: 3, title: 'Talkative', minXp: 350, badge: '🗣️' },
  { level: 4, title: 'Social Butterfly', minXp: 800, badge: '🦋' },
  { level: 5, title: 'Chat Addict 😂', minXp: 1600, badge: '🔥' },
  { level: 6, title: 'Conversation Master', minXp: 3200, badge: '⚡' },
  { level: 7, title: 'Chat Legend 👑', minXp: 6000, badge: '👑' },
];

export function getLevelForXp(xp: number) {
  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (xp >= tier.minXp) {
      current = tier;
    } else {
      break;
    }
  }
  const nextTier = LEVEL_TIERS.find((t) => t.level === current.level + 1);
  return {
    ...current,
    nextLevelXp: nextTier ? nextTier.minXp : current.minXp,
    progressToNext: nextTier
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((xp - current.minXp) / (nextTier.minXp - current.minXp)) * 100
            )
          )
        )
      : 100,
  };
}
