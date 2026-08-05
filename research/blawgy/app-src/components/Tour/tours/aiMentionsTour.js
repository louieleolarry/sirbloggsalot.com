export const AI_MENTIONS_TOUR_STEPS = [
    {
        id: 'ai-mentions-welcome',
        title: "Welcome to Pro+. This is where Blawgy gets real.",
        content: "AI Mentions is the part of the product free customers don't see. You're now tracking where ChatGPT, Claude, Gemini, Perplexity, and Google AI cite your site in real conversations. Quick tour of what just unlocked?",
        targetSelector: null,
        route: '/ai-mentions',
        position: 'center'
    },
    {
        id: 'ai-mentions-stats',
        title: "Your AI footprint at a glance",
        content: "This strip is the whole summary in one row: total citations across LLMs, the AI search volume you're already reaching, and which platform loves you most.",
        targetSelector: '[data-tour="ai-mentions-stats"]',
        route: '/ai-mentions',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'ai-mentions-platforms',
        title: "Which AI tools cite you most",
        content: "Every AI model has different favorites. This split shows whether ChatGPT, Claude, Gemini, or Perplexity is your biggest source, so you know where to double down.",
        targetSelector: '[data-tour="ai-mentions-platforms"]',
        route: '/ai-mentions',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'ai-mentions-top-pages',
        title: "Your pages doing the heavy lifting",
        content: "These are the specific URLs AI is quoting back to people right now. Make more content like this, it's what's working.",
        targetSelector: '[data-tour="ai-mentions-top-pages"]',
        route: '/ai-mentions',
        position: 'right',
        spotlightPadding: 8
    },
    {
        id: 'ai-mentions-competitors',
        title: "Stack yourself against the big names",
        content: "See who else AI is citing in your niche. If your competitors are showing up here more than you, that's a roadmap to close the gap.",
        targetSelector: '[data-tour="ai-mentions-competitors"]',
        route: '/ai-mentions',
        position: 'left',
        spotlightPadding: 8
    },
    {
        id: 'ai-mentions-queries',
        title: "The actual questions you're winning on",
        content: "Open the detail panel to see every prompt people are asking AI, and where you show up in the answer. It's sorted by AI search volume, so the biggest wins float to the top.",
        targetSelector: '[data-tour="ai-mentions-queries"]',
        route: '/ai-mentions',
        position: 'left',
        spotlightPadding: 8,
        // Lives inside the "See detail" drawer; AiMentions opens the drawer when
        // the tour reaches a step flagged with openDrawer.
        openDrawer: true
    },
    {
        id: 'ai-mentions-trend',
        title: "Watch your footprint grow",
        content: "We snapshot your AI mentions weekly, so this trend fills in over time. It's your proof that the work is compounding.",
        targetSelector: '[data-tour="ai-mentions-trend"]',
        route: '/ai-mentions',
        position: 'left',
        spotlightPadding: 8,
        openDrawer: true
    },
    {
        id: 'ai-mentions-refresh',
        title: "Pull fresh data anytime",
        content: "Results are cached to keep things fast and your costs predictable. Tap Refresh to force a re-scan when you want the latest.",
        targetSelector: '[data-tour="ai-mentions-refresh"]',
        route: '/ai-mentions',
        position: 'left',
        spotlightPadding: 8
    },
    {
        id: 'ai-mentions-complete',
        title: "Be the answer when AI gets asked.",
        content: "That's the whole game now. This dashboard updates so you can watch your AI footprint grow. Welcome to Pro+, go own your niche.",
        targetSelector: null,
        route: '/ai-mentions',
        position: 'center',
        triggerConfetti: true
    }
];

export const aiMentionsTourConfig = {
    id: 'aiMentions',
    name: 'AI Mentions (Pro+)',
    description: 'See where AI is citing you, across every major model',
    steps: AI_MENTIONS_TOUR_STEPS,
    autoStart: true
};
