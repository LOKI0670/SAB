export interface PolaroidMemory {
  id: string;
  image: string;
  caption: string;
  date?: string;
  rotation?: number; // subtle degree tilt for Polaroid aesthetic
}

export interface GiftConfig {
  recipientName: string;
  birthdayDate: string;
  cardGreeting: string;
  loveLetter: {
    salutation: string;
    subtitle: string;
    paragraphs: string[];
    closing: string;
    signature: string;
  };
  memories: PolaroidMemory[];
  audio: {
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number; // 0.0 to 1.0 (e.g. 0.5 = 50%)
    soundEffectsEnabled: boolean;
  };
  background?: {
    type: 'ambient' | 'image' | 'video';
    url?: string; // e.g. "/background/bg.jpg" or "/background/bg.mp4"
    blurPx?: number;
    dimOpacity?: number;
  };
}

export const giftConfig: GiftConfig = {
  // 1. Recipient Info
  recipientName: "Bruhhh", // Easily change to her actual name or nickname
  birthdayDate: "December 15",
  cardGreeting: "happy birthday!",

  // 2. Heartfelt Birthday Letter
  loveLetter: {
    salutation: "To My OG BROSKI,",
    subtitle: "...",
    paragraphs: [
      "SUP MAN, hope u doin' gud! Happy Birthday nd stay blessed, man! Alsoooo, I'm SORRY for what I did that day. I really didn't mean to do that. Unakku dhaan theriyume, upset aagitena paithiyam maari pannuvan nu.",
      "I know I should've respected her decision, but seriously, I js wanted to make her happy, and I ended up creating a fuckin' tragedy. Nd I srsly regret what I did.",
      "I know u guys aren't gonna forgive me for what I did coz it's actually unforgivable. But I'm SORRY, and I mean it. Yen munnadiye sry sollalanu laam kekadha (I js dunno, like, endha moonja vechitu poi sorry solrathu nu). Naan laam Tena kaal la vizha sonna kooda yosikaama vizhundhuruvan, coz IK what I did was wrong nd yeah u don't have to reply for this js take care of her, ik she is capable of doin things on her own but some times edhachum bad decision eduthutu regret pannitu irupanga so adha mattum pathuko ."
    ],
    closing: "Once again Happy Birthday nd SORRY,",
    signature: "Take Care nd Bye"
  },

  // 3. Romantic Memories & Polaroids (Ready for photos)
  memories: [
    {
      id: "mem-1",
      image: "./memories/mem-1.jpg",
      caption: "Yo First Baby Pic",
      date: "15/12/2006",
      rotation: -3
    },
    {
      id: "mem-2",
      image: "./memories/mem-2.jpg",
      caption: "Our First Hangout",
      date: "18/07/2025",
      rotation: 2
    },
    {
      id: "mem-3",
      image: "./memories/mem-3.jpg",
      caption: "Our Last Pic in School wid these mfs",
      date: "27/06/2026",
      rotation: -2
    },
    {
      id: "mem-4",
      image: "./memories/mem-4.jpg",
      caption: "Our Last Pic",
      date: "1/07/2026",
      rotation: 4
    }
  ],

  // 4. Audio settings
  audio: {
    backgroundMusicUrl: "./audio/bgm.m4a",
    backgroundMusicVolume: 0.5,
    soundEffectsEnabled: true
  },

  // 5. Outer Background (animated ambient orbs by default, or set type: 'image' / 'video' with a file in public/background/)
  background: {
    type: 'image',
    url: './background/bg.jpg',
    blurPx: 1,
    dimOpacity: 0.25
  }
};
