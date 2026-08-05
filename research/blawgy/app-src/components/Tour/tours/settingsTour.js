export const SETTINGS_TOUR_STEPS = [
    {
        id: 'settings-intro',
        title: 'Settings Overview',
        content: 'This is your control center for customizing how Blawgy creates content. Each tab controls a different aspect of your blog.',
        targetSelector: '[data-tour="settings-tabs"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'site-settings-tab',
        title: 'Site Settings',
        content: 'Configure your domain, business description, and blog type. This context helps our AI write content that sounds like you.',
        targetSelector: '[data-tour="site-settings-content"]',
        route: '/settings/site-settings',
        position: 'right',
        spotlightPadding: 12
    },
    {
        id: 'products-tab',
        title: 'Products',
        content: 'Add your products or services here. Blawgy will naturally weave mentions of them into your articles when relevant.',
        targetSelector: '[data-tour="products-tab"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 4
    },
    {
        id: 'keywords-section',
        title: 'Target Keywords',
        content: 'Add keywords you want to rank for. Blawgy will create content optimized for these terms and track your competitors.',
        targetSelector: '[data-tour="keywords-section"]',
        route: '/settings/site-settings',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'settings-complete',
        title: 'Settings Mastered!',
        content: "Now you know how to customize your content settings. Explore the other tabs like CMS Connect, Image Style, and Webhooks for more options.",
        targetSelector: null,
        route: '/settings/site-settings',
        position: 'center'
    }
];

export const settingsTourConfig = {
    id: 'settings',
    name: 'Settings Tour',
    description: 'Learn how to customize your content settings',
    steps: SETTINGS_TOUR_STEPS,
    autoStart: false
};
