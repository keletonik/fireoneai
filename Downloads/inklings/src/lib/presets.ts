// Preset conversation starters for Inklings
// Safe, non-copyrighted ideas to inspire creativity

export interface Preset {
  id: string;
  label: string;
  prompt: string;
  emoji: string;
}

export const presets: Preset[] = [
  // Animals
  {
    id: "bunny-garden",
    label: "Bunny in a garden",
    emoji: "🐰",
    prompt: "A friendly cartoon rabbit eating a carrot in a vegetable garden with flowers and butterflies",
  },
  {
    id: "kitty-bow",
    label: "Kitty with a bow",
    emoji: "🎀",
    prompt: "An adorable kawaii-style cat wearing a big sparkly bow, sitting and smiling with big eyes",
  },
  {
    id: "playful-puppy",
    label: "Playful puppy",
    emoji: "🐕",
    prompt: "A happy cartoon puppy playing with a ball in a sunny park with trees",
  },
  {
    id: "wise-owl",
    label: "Owl at night",
    emoji: "🦉",
    prompt: "A wise owl sitting on a tree branch at night with stars, moon and fireflies",
  },
  
  // Fantasy
  {
    id: "friendly-dragon",
    label: "Dragon and castle",
    emoji: "🐉",
    prompt: "A friendly baby dragon flying over a fairytale castle with towers and colorful flags",
  },
  {
    id: "magical-unicorn",
    label: "Magical unicorn",
    emoji: "🦄",
    prompt: "A beautiful unicorn with a flowing sparkly mane standing under a rainbow in a flower meadow",
  },
  {
    id: "forest-fairy",
    label: "Forest fairy",
    emoji: "🧚",
    prompt: "A tiny fairy with butterfly wings sitting on a mushroom in an enchanted forest",
  },
  {
    id: "mermaid-sea",
    label: "Mermaid princess",
    emoji: "🧜‍♀️",
    prompt: "A beautiful mermaid swimming with tropical fish, seahorse and coral in the ocean",
  },
  
  // Adventure
  {
    id: "space-rocket",
    label: "Rocket to space",
    emoji: "🚀",
    prompt: "A rocket ship blasting off into space with planets, stars and a smiling astronaut waving",
  },
  {
    id: "pirate-ship",
    label: "Pirate adventure",
    emoji: "🏴‍☠️",
    prompt: "A pirate ship sailing on the ocean with treasure chests, a friendly parrot and palm tree island",
  },
  {
    id: "dinosaur-world",
    label: "Dinosaur world",
    emoji: "🦕",
    prompt: "A friendly long-neck dinosaur in a prehistoric jungle with palm trees and a volcano",
  },
  {
    id: "superhero-city",
    label: "Superhero",
    emoji: "🦸",
    prompt: "A cartoon superhero with a cape flying through the city skyline with clouds",
  },
  
  // Nature
  {
    id: "butterfly-garden",
    label: "Butterfly garden",
    emoji: "🦋",
    prompt: "A beautiful garden full of different butterflies, flowers, and a friendly bee",
  },
  {
    id: "underwater-world",
    label: "Under the sea",
    emoji: "🐠",
    prompt: "An underwater scene with tropical fish, octopus, starfish, and coral reef",
  },
  {
    id: "treehouse-fun",
    label: "Treehouse",
    emoji: "🌳",
    prompt: "A cozy treehouse in a big oak tree with a rope ladder, tire swing and birds",
  },
  
  // Characters
  {
    id: "princess-castle",
    label: "Princess",
    emoji: "👸",
    prompt: "A princess in a beautiful sparkly gown in a rose garden with birds and butterflies",
  },
  {
    id: "robot-friend",
    label: "Friendly robot",
    emoji: "🤖",
    prompt: "A cute friendly robot with big round eyes and antenna in a futuristic city",
  },
  {
    id: "teddy-picnic",
    label: "Teddy bear picnic",
    emoji: "🧸",
    prompt: "Teddy bears having a picnic in the park with cupcakes, balloons and a picnic blanket",
  },
];

// Get random selection of presets for display
export function getRandomPresets(count: number = 8): Preset[] {
  const shuffled = [...presets].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
