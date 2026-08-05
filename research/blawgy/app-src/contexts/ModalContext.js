import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useImpersonation } from './ImpersonationContext';
import ImageStyleModal from '../components/ImageStyleModal';
import BulkGenerateModal from '../components/BulkGenerateModal';
import PremiseApprovalModal from '../components/PremiseApprovalModal';
import SupportModal from '../components/SupportModal';
import AdminModal from '../components/admin/AdminModal';
import SubscriptionModal from '../components/subscriptionModal';
import ConnectSiteModal from '../components/ConnectSiteModal';

const ModalContext = createContext();

export function useModals() {
    return useContext(ModalContext);
}

export const ModalProvider = ({ children }) => {
    const [showImageStyleModal, setShowImageStyleModal] = useState(false);
    const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [onCloseBulkGenerate, setOnCloseBulkGenerate] = useState(null);
    const [showConnectSiteModal, setShowConnectSiteModal] = useState(false);
    const [pendingPremises, setPendingPremises] = useState(null);
    const { currentEmail, currentSite, impersonatedSite, user, siteSettings, currentSubscription } = useImpersonation();
    const { isAdmin = false } = user || {};

    // Detect pending premises in localStorage when returning from Stripe checkout
    useEffect(() => {
        if (!currentSubscription?.isActive) return;
        const stored = localStorage.getItem('blawgy_pending_premises');
        if (!stored) return;
        try {
            const data = JSON.parse(stored);
            // Check staleness (24 hour expiry)
            const savedAt = new Date(data.savedAt);
            if (Date.now() - savedAt.getTime() > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('blawgy_pending_premises');
                return;
            }
            // Check site matches
            if (data.site && currentSite && data.site !== currentSite) return;
            setPendingPremises(data);
        } catch (e) {
            localStorage.removeItem('blawgy_pending_premises');
        }
    }, [currentSubscription?.isActive, currentSite]);

    const handleBulkGenerate = async (count, frequency, isPremiseGeneration = false, approvedPremises = null) => {
        try {
            const response = await apiClient.post('/generate-bulk-articles', {
                email: impersonatedSite ? undefined : currentEmail,
                site: impersonatedSite ? currentSite : undefined,
                count,
                frequency,
                isPremiseGeneration,
                approvedPremises
            });

            if (response.data.success) {
                if (isPremiseGeneration) {
                    return response.data.premises;
                }
            }
        } catch (error) {
            console.error('Error generating bulk articles:', error);
        }
    };

    const value = {
        showImageStyleModal,
        setShowImageStyleModal,
        showBulkGenerateModal,
        setShowBulkGenerateModal,
        showSubscriptionModal,
        setShowSubscriptionModal,
        handleBulkGenerate,
        showSupportModal,
        setShowSupportModal,
        showAdminPanel,
        setShowAdminPanel,
        onCloseBulkGenerate,
        setOnCloseBulkGenerate,
        showConnectSiteModal,
        setShowConnectSiteModal,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}

            {showImageStyleModal && (
                <ImageStyleModal
                    email={currentEmail}
                    settings={siteSettings}
                    onClose={() => setShowImageStyleModal(false)}
                />
            )}

            {showBulkGenerateModal && (
                <BulkGenerateModal
                    isOpen={showBulkGenerateModal}
                    onClose={() => {
                        setShowBulkGenerateModal(false);
                        setOnCloseBulkGenerate(true);
                    }}
                    onGenerate={handleBulkGenerate}
                    email={currentEmail}
                    impersonatedSite={siteSettings}
                    user={user}
                    onRequireSubscription={() => {
                        setShowBulkGenerateModal(false);
                        setShowSubscriptionModal(true);
                    }}
                />
            )}

            {/* Standalone approval modal for returning from Stripe checkout with pending premises */}
            {pendingPremises && currentSubscription?.isActive && (
                <PremiseApprovalModal
                    isOpen={true}
                    premises={pendingPremises.premises}
                    onClose={() => {
                        setPendingPremises(null);
                        localStorage.removeItem('blawgy_pending_premises');
                    }}
                    onApprove={async (approvedPremises) => {
                        await handleBulkGenerate(null, pendingPremises.frequency, false, approvedPremises);
                        localStorage.removeItem('blawgy_pending_premises');
                        setPendingPremises(null);
                        setOnCloseBulkGenerate(true);
                    }}
                    frequency={pendingPremises.frequency}
                />
            )}

            {showSupportModal && (
                <SupportModal
                    onClose={() => setShowSupportModal(false)}
                />
            )}

            {showAdminPanel && (
                <AdminModal
                    onClose={() => setShowAdminPanel(false)}
                    email={isAdmin ? currentEmail : null}
                />
            )}

            {showSubscriptionModal && (
                <SubscriptionModal
                    open={showSubscriptionModal}
                    user={user}
                    onOpenChange={setShowSubscriptionModal}
                    onClose={() => setShowSubscriptionModal(false)}
                />
            )}

            {showConnectSiteModal && (
                <ConnectSiteModal
                    isOpen={showConnectSiteModal}
                    onClose={() => setShowConnectSiteModal(false)}
                    user={user}
                />
            )}
        </ModalContext.Provider>
    );
};