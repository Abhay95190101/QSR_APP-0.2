import React, { useState, useRef, useEffect } from 'react';
import { StoreProfile, MenuItem, OrderRecord, LanguageCode, StaffUser, UserProfile } from '../../types';
import { OwnerDashboard } from './OwnerDashboard';
import { MenuManagement } from './MenuManagement';
import { OrderManager } from './OrderManager';
import { ReportsView } from './ReportsView';
import { StoreProfileSettings } from './StoreProfileSettings';
import { OwnerTableQRGenerator } from './OwnerTableQRGenerator';
import { RecentTableOrdersTab } from './RecentTableOrdersTab';
import { DayEndModal } from './DayEndModal';
import { StaffUserManager } from './StaffUserManager';
import { StoreRegistrationModal } from './StoreRegistrationModal';
import { playOrderNotificationChime, subscribeToRingingState, stopContinuousOrderRinging } from '../../utils/sound';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../../utils/i18n';

interface OwnerPortalProps {
  storeProfile: StoreProfile;
  menuItems: MenuItem[];
  categories: string[];
  orders: OrderRecord[];
  staffUsers?: StaffUser[];
  onUpdateStaffUsers?: (users: StaffUser[]) => void;
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onUpdateStoreProfile: (profile: StoreProfile) => void;
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
  onAddItem?: (item: MenuItem) => void;
  onAddMenuItem?: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onRemoveMenuItem: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: any) => void;
  onModifyBill: (orderId: string, discount: number, serviceCharge: number, notes?: string) => void;
  onSettleBill: (orderId: string, method: any) => void;
  onRefreshOrders: () => void;
  onSimulateCustomerScan: (tableNumber: number, zone: string) => void;
  onLockPortal?: () => void;
  onLogout?: () => void;
  onShowToast: (msg: string) => void;
  currentUserProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export type OwnerTab = 'home' | 'orders' | 'recent-orders' | 'menu' | 'qr' | 'reports' | 'profile' | 'staff';

export const OwnerPortal: React.FC<OwnerPortalProps> = ({
  storeProfile,
  menuItems,
  categories,
  orders,
  staffUsers = [],
  onUpdateStaffUsers = () => {},
  currentLanguage,
  onSelectLanguage,
  onUpdateStoreProfile,
  onAddCategory,
  onRemoveCategory,
  onAddItem,
  onAddMenuItem,
  onUpdateMenuItem,
  onRemoveMenuItem,
  onToggleAvailability,
  onUpdateOrderStatus,
  onModifyBill,
  onSettleBill,
  onRefreshOrders,
  onSimulateCustomerScan,
  onLockPortal,
  onLogout,
  onShowToast,
  currentUserProfile,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const [showDayEndModal, setShowDayEndModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [isRinging, setIsRinging] = useState<boolean>(false);

  // Subscribe to audio ringing state for live bell animation
  useEffect(() => {
    const unsub = subscribeToRingingState((active) => {
      setIsRinging(active);
    });
    return () => unsub();
  }, []);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out any legacy test orders and deduplicate
  const realOrders = Array.from(
    new Map(
      orders
        .filter((o) => o && o.id && o.id !== 'ord-101')
        .map((o) => [o.id, o])
    ).values()
  );

  const pendingOrders = realOrders.filter((o) => o.status === 'received' || o.status === 'preparing');
  const pendingCount = pendingOrders.length;

  const t = UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS.en;
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const navItems = [
    { id: 'home' as OwnerTab, label: t.home, icon: 'dashboard' },
    { id: 'orders' as OwnerTab, label: t.orderAndKitchen, icon: 'outdoor_grill', badge: pendingCount },
    { id: 'recent-orders' as OwnerTab, label: 'Table Orders', icon: 'table_restaurant' },
    { id: 'menu' as OwnerTab, label: t.menuAndItems, icon: 'lunch_dining' },
    { id: 'qr' as OwnerTab, label: t.qrGenerator, icon: 'qr_code_2' },
    { id: 'reports' as OwnerTab, label: t.reports, icon: 'bar_chart' },
    { id: 'staff' as OwnerTab, label: 'Staff & Team', icon: 'badge' },
    { id: 'profile' as OwnerTab, label: t.profile, icon: 'storefront' },
  ];

  const handleSelectNav = (tabId: OwnerTab) => {
    setActiveTab(tabId);
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col justify-between selection:bg-primary-fixed selection:text-on-primary-fixed pb-20 sm:pb-24 overflow-x-hidden">
      {/* Top Mobile-Friendly Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-black/[0.06] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-2">
            {/* Left: 3-Line Menu Hamburger */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                title="Open Navigation Menu"
                aria-label="Toggle navigation menu"
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0 transition-colors active:scale-95 shadow-xs"
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isDrawerOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* 1. Language Dropdown */}
              <div className="relative" ref={langRef}>
                <button
                  type="button"
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  title="Change Language"
                  className="px-2 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-extrabold flex items-center gap-1 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">translate</span>
                  <span className="text-[11px] hidden sm:inline">{currentLangObj.nativeLabel}</span>
                </button>

                {isLanguageMenuOpen && (
                  <div className="absolute right-0 top-11 w-44 bg-surface-container-lowest rounded-2xl shadow-xl border border-black/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                      Language
                    </div>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          onSelectLanguage(lang.code);
                          setIsLanguageMenuOpen(false);
                          onShowToast(`Language: ${lang.nativeLabel}`);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                          currentLanguage === lang.code
                            ? 'bg-primary/10 text-primary font-black'
                            : 'hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        <span>{lang.nativeLabel}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Live Notifications Bell with Authentic Kitchen Ringing Animation */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    if (isRinging) {
                      stopContinuousOrderRinging();
                    }
                  }}
                  title={isRinging ? '🚨 Live Order Ringing! Tap to view & silence' : 'Live Order Alerts'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative active:scale-95 ${
                    isRinging
                      ? 'bg-primary text-on-primary ring-4 ring-primary/30 shadow-lg shadow-primary/30 animate-pulse'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isRinging ? 'animate-bell-ringing text-amber-300' : ''
                    }`}
                  >
                    {isRinging ? 'notifications_active' : 'notifications'}
                  </span>
                  {pendingCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-surface ${
                        isRinging ? 'bg-amber-300 text-black font-black animate-bounce' : 'bg-primary text-on-primary animate-pulse'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 top-11 w-72 sm:w-80 bg-surface-container-lowest rounded-2xl shadow-2xl border border-black/10 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">outdoor_grill</span>
                        <span className="font-bold text-xs text-on-surface">Kitchen Orders</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isRinging && (
                          <button
                            type="button"
                            onClick={() => stopContinuousOrderRinging()}
                            className="text-[9px] bg-error/10 hover:bg-error/20 text-error px-1.5 py-0.5 rounded-lg font-bold flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[12px]">volume_off</span>
                            Silence
                          </button>
                        )}
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                          {pendingCount} Pending
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {pendingOrders.length > 0 ? (
                        pendingOrders.map((ord) => (
                          <div
                            key={ord.id}
                            onClick={() => {
                              setActiveTab('orders');
                              setIsNotificationsOpen(false);
                            }}
                            className="p-2 rounded-xl bg-surface-container/60 hover:bg-surface-container cursor-pointer transition-colors border border-black/[0.03]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-on-surface">
                                🔔 Table #{ord.tableNumber} - {ord.orderNumber}
                              </span>
                              <span className="text-[9px] text-primary font-bold">
                                {ord.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                              {(ord.items || []).map((i) => `${i?.quantity || 1}x ${i?.name || 'Item'}`).join(', ')}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-on-surface-variant text-xs">
                          <span className="material-symbols-outlined text-2xl text-emerald-600 block mb-1">
                            check_circle
                          </span>
                          All orders caught up!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Customer View Button */}
              <button
                type="button"
                onClick={() => onSimulateCustomerScan(1, 'Main Dining Room')}
                title="Preview Customer Dine-In Menu & QR Ordering"
                className="px-2.5 py-1.5 rounded-xl bg-primary text-on-primary hover:opacity-95 text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span className="text-[11px] font-bold hidden sm:inline">Customer View</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-surface-container-lowest h-full shadow-2xl p-4 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">restaurant</span>
                  </div>
                  <span className="font-bold text-sm text-on-surface truncate max-w-[140px]">
                    {storeProfile.name}
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* User Account Info in Drawer */}
              {currentUserProfile && (
                <div className="p-3 rounded-2xl bg-surface-container border border-black/5 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={currentUserProfile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserProfile.userId}`}
                      alt="User"
                      className="w-9 h-9 rounded-full object-cover bg-white border border-black/10"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-on-surface truncate">
                        {currentUserProfile.displayName || currentUserProfile.userId}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-mono truncate">
                        @{currentUserProfile.userId} • <span className="capitalize text-primary font-bold">{currentUserProfile.role || 'Staff'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      activeTab === item.id
                        ? 'bg-primary text-on-primary font-black shadow-xs'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === item.id ? 'bg-white text-primary' : 'bg-primary text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Footer Actions with Log Out Button */}
            <div className="pt-4 border-t border-black/[0.06] space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowDayEndModal(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">nightlight_round</span>
                <span>Day-End Settlement</span>
              </button>

              {/* Log Out Button in 3-Line Menu Bottom */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (onLogout) {
                    onLogout();
                  } else if (onLockPortal) {
                    onLockPortal();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-error/10 hover:bg-error text-error hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'home' && (
          <OwnerDashboard
            storeProfile={storeProfile}
            orders={realOrders}
            menuItems={menuItems}
            onNavigateTab={setActiveTab}
            onSimulateCustomerScan={onSimulateCustomerScan}
            onShowToast={onShowToast}
            onUpdateStatus={onUpdateOrderStatus}
            onModifyBill={onModifyBill}
            onSettleBill={onSettleBill}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManager
            orders={realOrders}
            storeProfile={storeProfile}
            onUpdateStatus={onUpdateOrderStatus}
            onModifyBill={onModifyBill}
            onSettleBill={onSettleBill}
            onRefreshOrders={onRefreshOrders}
            onShowToast={onShowToast}
          />
        )}

        {activeTab === 'recent-orders' && (
          <RecentTableOrdersTab
            orders={realOrders}
            storeProfile={storeProfile}
            onUpdateStatus={onUpdateOrderStatus}
            onModifyBill={onModifyBill}
            onSettleBill={onSettleBill}
            onShowToast={onShowToast}
            onSimulateCustomerScan={onSimulateCustomerScan}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManagement
            categories={categories}
            items={menuItems}
            onAddCategory={onAddCategory}
            onRemoveCategory={onRemoveCategory}
            onAddItem={onAddItem || onAddMenuItem!}
            onUpdateItem={onUpdateMenuItem}
            onRemoveItem={onRemoveMenuItem}
            onToggleAvailability={onToggleAvailability}
            currency={storeProfile.currencySymbol}
            onShowToast={onShowToast}
          />
        )}

        {activeTab === 'qr' && (
          <OwnerTableQRGenerator
            storeProfile={storeProfile}
            onShowToast={onShowToast}
            onSimulateCustomerScan={onSimulateCustomerScan}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            orders={realOrders}
            storeProfile={storeProfile}
            onShowToast={onShowToast}
          />
        )}

        {activeTab === 'profile' && (
          <StoreProfileSettings
            profile={storeProfile}
            onUpdateProfile={onUpdateStoreProfile}
            staffUsers={staffUsers}
            onUpdateStaffUsers={onUpdateStaffUsers}
            onShowToast={onShowToast}
          />
        )}

        {activeTab === 'staff' && (
          <StaffUserManager
            storeProfile={storeProfile}
            staffUsers={staffUsers}
            onUpdateStaffUsers={onUpdateStaffUsers}
            onShowToast={onShowToast}
          />
        )}
      </main>

      {/* Manual Day End Closing Modal */}
      <DayEndModal
        isOpen={showDayEndModal}
        onClose={() => setShowDayEndModal(false)}
        orders={realOrders}
        storeProfile={storeProfile}
        onShowToast={onShowToast}
      />

      {/* Store Registration Modal */}
      <StoreRegistrationModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        storeProfile={storeProfile}
        onSaveProfile={onUpdateStoreProfile}
        onShowToast={onShowToast}
      />

      {/* Fixed Native-Style Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-black/[0.08] shadow-2xl py-1.5 px-3 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {/* 1. Home Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'home'
                ? 'text-primary font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'home' ? 'fill-1' : ''}`}>
              dashboard
            </span>
            <span className="text-[10px] tracking-tight mt-0.5 font-bold">Home</span>
          </button>

          {/* 2. Kitchen Orders Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'orders'
                ? 'text-primary font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="relative">
              <span className={`material-symbols-outlined text-[20px] ${activeTab === 'orders' ? 'fill-1' : ''}`}>
                outdoor_grill
              </span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary text-on-primary text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-bold">Kitchen</span>
          </button>

          {/* 3. QR Standees Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'qr'
                ? 'text-primary font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'qr' ? 'fill-1' : ''}`}>
              qr_code_2
            </span>
            <span className="text-[10px] tracking-tight mt-0.5 font-bold">Table QR</span>
          </button>

          {/* 4. Profile / Settings Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'text-primary font-black'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'profile' ? 'fill-1' : ''}`}>
              storefront
            </span>
            <span className="text-[10px] tracking-tight mt-0.5 font-bold">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
