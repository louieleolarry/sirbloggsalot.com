export const PAGES_TOUR_STEPS = [
    {
        id: 'pages-welcome',
        title: 'Generate local SEO pages at scale',
        content: "Pages lets you clone one WordPress page and spin up dozens of localized variants — perfect for ranking in every town you serve. Quick tour?",
        targetSelector: null,
        route: '/pages',
        position: 'center'
    },
    {
        id: 'pages-template',
        title: 'Pick the page you want to clone',
        content: "Start with one strong page. We'll copy its layout, then rewrite the content for each target you give us. Search and pick from your existing WordPress pages.",
        targetSelector: '[data-tour="pages-template"]',
        route: '/pages',
        position: 'right',
        spotlightPadding: 8
    },
    {
        id: 'pages-configure',
        title: 'Set your keyword and title format',
        content: "Pick a purpose, set the base keyword (like 'dispensary' or 'roofing'), and a suffix that ends every SEO title. These become part of every generated page.",
        targetSelector: '[data-tour="pages-configure"]',
        route: '/pages',
        position: 'right',
        spotlightPadding: 8
    },
    {
        id: 'pages-targets',
        title: 'Type one target per line',
        content: "Drop in a list of locations, services, or anything else you want pages for — one per line. If it's local, use the nearby towns finder to grab every town within range.",
        targetSelector: '[data-tour="pages-targets"]',
        route: '/pages',
        position: 'right',
        spotlightPadding: 8
    },
    {
        id: 'pages-preview',
        title: 'See exactly what will be created',
        content: "Live preview shows every title, slug, and SEO title before you commit. If a page already exists, we flag the collision so you don't accidentally clobber anything.",
        targetSelector: '[data-tour="pages-preview"]',
        route: '/pages',
        position: 'left',
        spotlightPadding: 8
    },
    {
        id: 'pages-generate',
        title: 'Hit go. Done.',
        content: "When the preview looks good, click Generate. We'll publish them to WordPress as drafts (or whatever status you picked). One click, dozens of new ranked pages.",
        targetSelector: '[data-tour="pages-generate"]',
        route: '/pages',
        position: 'left',
        spotlightPadding: 8
    },
    {
        id: 'pages-complete',
        title: "That's it — go build your local empire",
        content: "Most customers create their first batch in under 5 minutes. Start small (5-10 towns), check the output, then scale. You can run Pages as many times as you want.",
        targetSelector: null,
        route: '/pages',
        position: 'center',
        triggerConfetti: true
    }
];

export const pagesTourConfig = {
    id: 'pages',
    name: 'Pages — Programmatic SEO',
    description: 'Clone one page into dozens of localized variants',
    steps: PAGES_TOUR_STEPS,
    autoStart: true
};
