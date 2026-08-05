import { mainTourConfig } from './mainTour';
import { settingsTourConfig } from './settingsTour';
import { cmsTourConfig } from './cmsTour';
import { imageSettingsTourConfig } from './imageSettingsTour';
import { webhooksTourConfig } from './webhooksTour';
import { pagesTourConfig } from './pagesTour';
import { aiMentionsTourConfig } from './aiMentionsTour';
import { seoAnalysisTourConfig } from './seoAnalysisTour';

// Combine all tour configurations
export const TOUR_CONFIGS = {
    main: mainTourConfig,
    settings: settingsTourConfig,
    cms: cmsTourConfig,
    imageSettings: imageSettingsTourConfig,
    webhooks: webhooksTourConfig,
    pages: pagesTourConfig,
    aiMentions: aiMentionsTourConfig,
    seoAnalysis: seoAnalysisTourConfig
};

// Export individual configs for direct import
export {
    mainTourConfig,
    settingsTourConfig,
    cmsTourConfig,
    imageSettingsTourConfig,
    webhooksTourConfig,
    pagesTourConfig,
    aiMentionsTourConfig,
    seoAnalysisTourConfig
};

// Helper to get all available tours (for tour menu)
export const getAvailableTours = () => {
    return Object.values(TOUR_CONFIGS).map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        stepCount: config.steps.length
    }));
};
