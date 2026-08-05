export const WEBHOOKS_TOUR_STEPS = [
    {
        id: 'webhooks-intro',
        title: 'Webhooks',
        content: 'Webhooks let you connect Blawgy to other tools in your workflow. Get notified when articles are published or integrate with your own systems.',
        targetSelector: null,
        route: '/settings/webhooks',
        position: 'center'
    },
    {
        id: 'webhook-url',
        title: 'Webhook URL',
        content: "Enter the URL where you want to receive notifications. This could be a Zapier webhook, your own server, or any service that accepts HTTP requests.",
        targetSelector: '[data-tour="webhook-url"]',
        route: '/settings/webhooks',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'webhook-events',
        title: 'Choose Events',
        content: 'Select which events should trigger your webhook. Common choices are "article published" or "article generated".',
        targetSelector: '[data-tour="webhook-events"]',
        route: '/settings/webhooks',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'webhooks-complete',
        title: 'Webhooks Ready!',
        content: "Your webhook is configured. Now you'll automatically receive notifications when the selected events occur. Great for automation!",
        targetSelector: null,
        route: '/settings/webhooks',
        position: 'center'
    }
];

export const webhooksTourConfig = {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Learn how to set up webhooks for integrations',
    steps: WEBHOOKS_TOUR_STEPS,
    autoStart: false
};
