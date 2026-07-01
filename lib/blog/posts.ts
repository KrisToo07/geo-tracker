import postsData from './posts.json';

export interface PostSection {
  heading: string;
  body: string;
}
export interface Post {
  slug: string;
  title: string;
  description: string;
  sections: PostSection[];
}

export const POSTS = postsData as Post[];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

// Every article for the blog index + sitemap — includes the original hand-written guide,
// which lives at its own static route.
export const ALL_ARTICLES: { slug: string; title: string; description: string }[] = [
  {
    slug: 'how-to-check-if-ai-recommends-your-brand',
    title: 'How to Check if ChatGPT, Perplexity & Gemini Recommend Your Brand',
    description:
      'Buyers now ask AI for recommendations instead of Googling. Here is how to check whether ChatGPT, Perplexity, and Gemini mention your brand — and how to track it.',
  },
  ...POSTS.map((p) => ({ slug: p.slug, title: p.title, description: p.description })),
];
