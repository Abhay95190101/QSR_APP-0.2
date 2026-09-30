import React, { useState } from 'react';
import { StoreProfile } from '../../types';

interface StoreRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeProfile: StoreProfile;
  onSaveProfile: (profile: StoreProfile) => void;
  onShowToast: (msg: string) => void;
}

export const StoreRegistrationModal: React.FC<StoreRegistrationModalProps> = ({
  isOpen,
  onClose,
  storeProfile,
  onSaveProfile,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<StoreProfile>({ ...storeProfile });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onShowToast('Please enter your Restaurant / Store Name.');
      return;
    }
    if (!formData.phone.trim()) {
      onShowToast('Please enter contact phone number.');
      return;
    }

    setIsSaving(true);
    const updated: StoreProfile = {
      ...formData,
      currencySymbol: '₹',
      name: formData.name.trim(),
    };

    onSaveProfile(updated);
    onShowToast(`🎉 "${updated.name}" successfully registered & updated!`);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-surface-container-lowest text-on-surface w-full max-w-xl rounded-3xl shadow-2xl border border-black/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-5 text-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-white">app_registration</span>
            </div>
            <div>
              <h2 className="font-headline-md text-base sm:text-lg font-black leading-tight text-white">
                Register Store / Restaurant
              </h2>
              <p className="text-xs text-white/80">
                Configure your official restaurant branding &amp; QR menu details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Restaurant Name */}
          <div>
            <label className="font-extrabold text-on-surface block mb-1">
              Store / Restaurant Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Spice Kitchen & Grill"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-[10px] text-on-surface-variant block mt-0.5">
              This name will be shown to customers when scanning the Table QR code.
            </span>
          </div>

          {/* Tagline & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Tagline / Cuisine Type
              </label>
              <input
                type="text"
                placeholder="e.g. Authentic North Indian & Tandoori"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                UPI ID (for Bill QR Payments) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. restaurant@upi or 9876543210@paytm"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-xs outline-none"
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-extrabold text-on-surface block mb-1">
                Store Address
              </label>
              <input
                type="text"
                placeholder="Shop 12, Main Road, Market Complex"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                City / State
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Maharashtra"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Contact Phone / WhatsApp <span className="text-error">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Official Email
              </label>
              <input
                type="email"
                placeholder="contact@myrestaurant.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
              />
            </div>
          </div>

          {/* Taxes, Charges & UPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                UPI Payment Virtual Address (VPA) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9987504251@upi or yourname@oksbi"
                value={formData.upiId || ''}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20 text-primary"
              />
              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                Customer table QR payments and bill settlement will be credited here.
              </span>
            </div>

            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                UPI Payee / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. SS Café and Restaurant"
                value={formData.upiMerchantName || ''}
                onChange={(e) => setFormData({ ...formData, upiMerchantName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-black/10 text-on-surface text-xs outline-none"
              />
              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                Payee name displayed on customer's UPI payment apps.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                GST Tax %
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="28"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-bold text-xs outline-none"
              />
            </div>
            <div>
              <label className="font-extrabold text-on-surface block mb-1">
                Service %
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={formData.serviceCharge}
                onChange={(e) => setFormData({ ...formData, serviceCharge: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-bold text-xs outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="font-extrabold text-on-surface block mb-1">
                GSTIN / FSSAI (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-black/10 text-on-surface font-mono text-xs outline-none uppercase"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{isSaving ? 'Registering...' : 'Save & Register Store'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
