export const IMAGE_SETTINGS_TOUR_STEPS = [
    {
        id: 'image-intro',
        title: 'Image Settings',
        content: "Control how images are generated for your blog posts. You can choose styles, add guidelines, and make sure images match your brand.",
        targetSelector: null,
        route: '/settings/image-style',
        position: 'center'
    },
    {
        id: 'image-type',
        title: 'Image Type',
        content: 'Choose between AI-generated images, stock photos, or no images at all. AI images are unique to your content!',
        targetSelector: '[data-tour="image-type-select"]',
        route: '/settings/image-style',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'style-guidelines',
        title: 'Style Guidelines',
        content: 'Add custom guidelines for how images should look. For example: "minimalist, professional, blue color scheme" or "warm, friendly, lifestyle photography".',
        targetSelector: '[data-tour="style-guidelines"]',
        route: '/settings/image-style',
        position: 'bottom',
        spotlightPadding: 8
    },
    {
        id: 'image-complete',
        title: 'Images Configured!',
        content: 'Your image settings are ready. All future articles will use these preferences. You can always come back to adjust them.',
        targetSelector: null,
        route: '/settings/image-style',
        position: 'center'
    }
];

export const imageSettingsTourConfig = {
    id: 'imageSettings',
    name: 'Image Settings',
    description: 'Learn how to customize your article images',
    steps: IMAGE_SETTINGS_TOUR_STEPS,
    autoStart: false
};
