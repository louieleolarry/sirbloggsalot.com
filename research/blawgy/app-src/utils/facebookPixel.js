import ReactPixel from 'react-facebook-pixel';

const pixelOptions = {
    autoConfig: true,
    debug: false
};

let isPixelInitialized = false;

const FacebookPixel = {
    init: () => {
        if (typeof window !== 'undefined' && !isPixelInitialized) {
            ReactPixel.init("745350350934623", pixelOptions);
            isPixelInitialized = true;
        }
    },
    pageView: () => {
        if (isPixelInitialized) {
            ReactPixel.pageView();
        }
    },
    trackSignup: (userData = {}) => {
        if (isPixelInitialized) {
            ReactPixel.track('StartTrial', {
                content_name: 'new_user',
                ...userData
            });
            ReactPixel.track('CompleteRegistration', {
                content_name: 'signup',
                status: 'success',
                ...userData
            });
        }
    },
    trackPayment: (paymentData = {}) => {
        if (isPixelInitialized) {
            ReactPixel.track('Purchase', {
                value: paymentData.amount || 0,
                currency: 'USD',
                content_type: 'subscription',
            });
        }
    }
};

export default FacebookPixel;