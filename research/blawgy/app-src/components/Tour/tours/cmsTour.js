export const CMS_TOUR_STEPS = [
    {
        id: 'cms-intro',
        title: 'Connect Your Blog Platform',
        content: "Let's get your CMS connected so Blawgy can automatically publish articles to your blog. No more copy-pasting!",
        targetSelector: null,
        route: '/settings/cms-connect',
        position: 'center'
    },
    {
        id: 'platform-select',
        title: 'Choose Your Platform',
        content: 'Select your blogging platform. We support WordPress, Webflow, Shopify, Wix, Ghost, and custom API connections.',
        targetSelector: '[data-tour="platform-select"]',
        route: '/settings/cms-connect',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'credentials-form',
        title: 'Enter Your Credentials',
        content: "Fill in your platform credentials. Don't worry - we store these securely and only use them to publish your content.",
        targetSelector: '[data-tour="credentials-form"]',
        route: '/settings/cms-connect',
        position: 'right',
        spotlightPadding: 12
    },
    {
        id: 'test-connection',
        title: 'Test Your Connection',
        content: "After entering your credentials, click 'Test Connection' to make sure everything is working correctly before saving.",
        targetSelector: '[data-tour="test-connection-btn"]',
        route: '/settings/cms-connect',
        position: 'left',
        spotlightPadding: 4
    },
    {
        id: 'cms-complete',
        title: 'CMS Connected!',
        content: "Once connected, your articles will automatically publish to your blog on schedule. You can always come back here to update your settings.",
        targetSelector: null,
        route: '/settings/cms-connect',
        position: 'center'
    }
];

export const cmsTourConfig = {
    id: 'cms',
    name: 'CMS Connection',
    description: 'Learn how to connect your blog platform',
    steps: CMS_TOUR_STEPS,
    autoStart: false
};
