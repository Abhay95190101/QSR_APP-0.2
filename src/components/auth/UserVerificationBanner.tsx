import React from 'react';
import { UserProfile } from '../../types';

interface UserVerificationBannerProps {
  userProfile: UserProfile | null;
  onOpenAuthModal: () => void;
}

export const UserVerificationBanner: React.FC<UserVerificationBannerProps> = ({
  userProfile,
  onOpenAuthModal,
}) => {
  if (!userProfile) {
    return null;
  }

  const isUnverified = !userProfile.emailVerified && !userProfile.phoneVerified;

  if (!isUnverified) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs flex items-center justify-between gap-2 max-w-xl mx-auto animate-in fade-in">
      <div className="flex items-center gap-1.5 text-amber-900 truncate">
        <span className="material-symbols-outlined text-[16px] text-amber-700 flex-shrink-0">
          warning
        </span>
        <span className="truncate">
          Your account is unverified. Verify your Gmail or Mobile number to secure your ID.
        </span>
      </div>
      <button
        onClick={onOpenAuthModal}
        className="px-2.5 py-1 rounded-full bg-amber-700 text-white font-bold text-[11px] flex-shrink-0 hover:bg-amber-800 transition-colors"
      >
        Verify Now
      </button>
    </div>
  );
};
