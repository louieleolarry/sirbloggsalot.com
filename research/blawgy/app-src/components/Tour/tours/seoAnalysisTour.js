export const SEO_ANALYSIS_TOUR_STEPS = [
    {
        id: 'seo-welcome',
        title: "Your full SEO command center — included with Pro+",
        content: "This is the enterprise-grade SEO suite most tools charge $200/mo for. Keyword rankings, competitor gaps, content planning, page health — all here. Quick tour?",
        targetSelector: null,
        route: '/seo-analysis',
        position: 'center'
    },
    {
        id: 'seo-stats',
        title: "Your domain at a glance",
        content: "Total keywords you rank for, top 10 rankings, estimated traffic value, and your overall SEO health score. The 4 numbers that actually matter.",
        targetSelector: '[data-tour="seo-stats"]',
        route: '/seo-analysis',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'seo-ranked-keywords',
        title: "Every keyword you currently rank for",
        content: "Position, search volume, difficulty, trend — for every keyword Google sees you on. Click any column to sort. This used to require an Ahrefs subscription.",
        targetSelector: '[data-tour="seo-ranked-keywords"]',
        route: '/seo-analysis',
        position: 'top',
        spotlightPadding: 8
    },
    {
        id: 'seo-tabs',
        title: "Three views, one goal",
        content: "Overview shows what you have. Keyword Ideas shows what to chase. Content Planner turns ideas into a publishing schedule. Let's check Keyword Ideas next.",
        targetSelector: '[data-tour="seo-tabs"]',
        route: '/seo-analysis',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'seo-opportunities',
        title: "Keywords you're SO close to ranking for",
        content: "Free wins live here. Low-difficulty, high-volume keywords that match your niche — most of them you could rank for with one solid article. Add the ones you like, then plan them.",
        targetSelector: '[data-tour="seo-opportunities"]',
        route: '/seo-analysis',
        position: 'top',
        spotlightPadding: 8
    },
    {
        id: 'seo-competitor-gaps',
        title: "What competitors rank for that you don't",
        content: "We find the keywords your competitors are ranking on but you aren't. Steal their playbook — every gap is content you should be writing.",
        targetSelector: '[data-tour="seo-competitor-gaps"]',
        route: '/seo-analysis',
        position: 'top',
        spotlightPadding: 8
    },
    {
        id: 'seo-run-scan',
        title: "Refresh on demand",
        content: "Scans run every 24h automatically. Tap Run Scan to force a fresh pull when you want the latest. New pages, new rankings, new opportunities.",
        targetSelector: '[data-tour="seo-run-scan"]',
        route: '/seo-analysis',
        position: 'left',
        spotlightPadding: 8
    },
    {
        id: 'seo-complete',
        title: "Welcome to Pro+ SEO.",
        content: "Most teams pay $200+/mo for this data. You've got it bundled in. Start with the Quick Wins, run them through Content Planner, and watch your rankings climb.",
        targetSelector: null,
        route: '/seo-analysis',
        position: 'center',
        triggerConfetti: true
    }
];

export const seoAnalysisTourConfig = {
    id: 'seoAnalysis',
    name: 'Rankings (Pro+)',
    description: 'Full SEO command center — rankings, opportunities, competitors',
    steps: SEO_ANALYSIS_TOUR_STEPS,
    autoStart: true
};
