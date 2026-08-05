export const MAIN_TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Blawgy!',
        content: "Let's take a quick tour to help you get the most out of your AI-powered blog. This will only take about 2 minutes.",
        targetSelector: null,
        route: '/dashboard',
        position: 'center'
    },
    {
        id: 'dashboard-overview',
        title: 'Your Article Command Center',
        content: "This is where all your blog posts live. You can see what's scheduled, what's been generated, and what's already published. Your content pipeline at a glance!",
        targetSelector: '[data-tour="articles-table"]',
        route: '/dashboard',
        position: 'bottom',
        spotlightPadding: 12
    },
    {
        id: 'article-status-tabs',
        title: 'Filter by Status',
        content: 'Quickly filter your articles by status. See scheduled posts, ones being processed, freshly generated drafts, or your published content.',
        targetSelector: '[data-tour="status-tabs"]',
        route: '/dashboard',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'bulk-schedule',
        title: 'Bulk Schedule Articles',
        content: "This is the magic button! Click here to schedule multiple articles at once. Our AI will research, write, and publish them automatically on your chosen dates.",
        targetSelector: '[data-tour="bulk-schedule-btn"]',
        route: '/dashboard',
        position: 'left',
        spotlightPadding: 4
    },
    {
        id: 'article-builder',
        title: 'Write',
        content: 'Want more control? Write lets you craft one article yourself, step by step. Perfect for cornerstone content.',
        targetSelector: '[data-tour="article-builder-btn"]',
        route: '/dashboard',
        position: 'right',
        spotlightPadding: 4
    },
    {
        id: 'keyword-finder',
        title: 'Topics Worth Writing',
        content: 'Topics pulls real search-volume data so you know what your audience is actually typing into Google. Add the winners and they land on your content plan automatically.',
        targetSelector: '[data-tour="keyword-finder-nav"]',
        route: '/dashboard',
        position: 'right',
        spotlightPadding: 4
    },
    {
        id: 'settings-nav',
        title: "Let's Check Your Settings",
        content: "Now let's head to Settings where you can customize how Blawgy writes for your brand. This is where the magic happens!",
        targetSelector: '[data-tour="settings-nav"]',
        route: '/dashboard',
        position: 'right',
        spotlightPadding: 4
    },
    {
        id: 'settings-overview',
        title: 'Customize Your Content',
        content: 'Here you can set up your business description, add keywords to target, and tell Blawgy about your competitors. The more context you give, the better your articles!',
        targetSelector: '[data-tour="settings-tabs"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'cms-connection',
        title: 'Connect Your Blog Platform',
        content: 'Connect your WordPress, Webflow, Shopify, or other CMS to auto-publish articles directly to your blog. No copy-pasting needed!',
        targetSelector: '[data-tour="cms-tab"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 4
    },
    {
        id: 'image-settings',
        title: 'Customize Your Images',
        content: 'Choose how images are generated for your articles. Pick between stock photos, AI-generated art, or a custom style that matches your brand.',
        targetSelector: '[data-tour="image-tab"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 4
    },
    {
        id: 'tour-complete',
        title: "You're All Set!",
        content: "You now know the essentials! Start creating amazing content by clicking 'Bulk Schedule' or explore more features on your own. Happy blogging!",
        targetSelector: null,
        route: '/settings/site-settings',
        position: 'center',
        triggerConfetti: true
    }
];

export const mainTourConfig = {
    id: 'main',
    name: 'Getting Started',
    description: 'Learn the basics of Blawgy',
    steps: MAIN_TOUR_STEPS,
    autoStart: true
};
