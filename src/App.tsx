import { useState, useEffect, useRef } from 'react';
import {
  StoreProfile,
  MenuItem,
  OrderRecord,
  OrderStatus,
  LanguageCode,
  StaffUser,
  UserProfile,
} from './types';
import {
  DEFAULT_STORE_PROFILE,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_STAFF_USERS,
} from './data/storeData';
import { OwnerPortal } from './components/owner/OwnerPortal';
import { CustomerApp } from './components/customer/CustomerApp';
import { QRScanGateway } from './components/QRScanGateway';
import { StoreLoginGate } from './components/auth/StoreLoginGate';
import { AuthModal } from './components/auth/AuthModal';
import { Toast } from './components/Toast';
import { playOrderNotificationChime, startContinuousOrderRinging, stopContinuousOrderRinging } from './utils/sound';
import { api } from './services/api';
import { safeStorage } from './utils/safeStorage';
import { subscribeToAuth, logoutUser } from './services/firebase';

function dedupeOrders(list: OrderRecord[]): OrderRecord[] {
  const seen = new Set<string>();
  const result: OrderRecord[] = [];
  for (const item of list) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export default function App() {
  // Store Profile State (Sanitizes currency to INR ₹, prevents quota crashes, and ensures registered UPI ID)
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() => {
    try {
      const saved = safeStorage.getItem<StoreProfile | null>('sb_store_profile', null);
      if (saved && saved.name && !saved.name.includes('Sizzle') && !saved.upiId?.includes('sizzlebun')) {
        const activeUpi = (saved.upiId === '9987504251@upi' || !saved.upiId) 
          ? DEFAULT_STORE_PROFILE.upiId 
          : saved.upiId;

        return {
          ...DEFAULT_STORE_PROFILE,
          ...saved,
          upiId: activeUpi,
          logoUrl: saved.logoUrl && saved.logoUrl.startsWith('data:image') ? saved.logoUrl : DEFAULT_STORE_PROFILE.logoUrl,
          currencySymbol: saved.currencySymbol === '$' ? '₹' : (saved.currencySymbol || '₹'),
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_STORE_PROFILE;
  });

  // Language State
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    const saved = safeStorage.getRaw('sb_app_language', 'en') as LanguageCode;
    return saved && ['en', 'hi', 'mr', 'bn', 'gu', 'ta', 'te'].includes(saved) ? saved : 'en';
  });

  const handleSelectLanguage = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    safeStorage.setItem('sb_app_language', lang);
  };

  // User Authentication & Profile State
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(() => {
    return safeStorage.getItem<UserProfile | null>('sb_current_user_profile', null);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'profile'>('signin');

  // Sync with Firebase Auth state in real-time
  useEffect(() => {
    const unsubscribe = subscribeToAuth((_user, profile) => {
      if (profile) {
        setCurrentUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, []);

  // Menu Categories State
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = safeStorage.getItem<string[]>('sb_menu_categories', INITIAL_CATEGORIES);
    if (Array.isArray(saved) && saved.length > 0 && !saved.includes('Smashburgers')) {
      return saved;
    }
    return INITIAL_CATEGORIES;
  });

  // Menu Items State
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = safeStorage.getItem<MenuItem[]>('sb_menu_items', INITIAL_MENU_ITEMS);
    if (Array.isArray(saved) && saved.length > 0 && !saved.some(i => i.id === 'truffle-ember-smash')) {
      return saved;
    }
    return INITIAL_MENU_ITEMS;
  });

  // Orders State (live synced with server & broadcast, deduplicated)
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    const saved = safeStorage.getItem<OrderRecord[]>('sb_orders', []);
    const list = Array.isArray(saved) ? saved.filter((o) => o && o.id && o.id !== 'ord-101') : [];
    return dedupeOrders(list);
  });

  // Tracks known order IDs to detect newly arrived live orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Staff and Managers state
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    return safeStorage.getItem<StaffUser[]>('sb_staff_users', INITIAL_STAFF_USERS);
  });

  useEffect(() => {
    safeStorage.setItem('sb_staff_users', staffUsers);
  }, [staffUsers]);

  // Customer Dine-In specific state
  const [customerTable, setCustomerTable] = useState<number | null>(null);
  const [customerZone, setCustomerZone] = useState<string>('Main Dining Room');

  // Owner authentication & store registration state
  const [isStoreRegistered, setIsStoreRegistered] = useState<boolean>(() => {
    const reg = safeStorage.getRaw('sb_store_registered', 'false');
    return reg === 'true';
  });
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(true);
  const [isOwnerTesting, setIsOwnerTesting] = useState<boolean>(false);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 4000);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'profile' = 'signin') => {
    setAuthModalMode(currentUserProfile ? 'profile' : mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUserProfile(profile);
    safeStorage.setItem('sb_current_user_profile', profile);
  };

  const handleUserSignOut = async () => {
    try {
      await logoutUser();
    } catch {
      // fallback
    }
    setCurrentUserProfile(null);
    safeStorage.removeItem('sb_current_user_profile');
    setIsOwnerAuthenticated(false);
    showToast('You have been logged out.');
  };

  const handleStoreRegisteredOrLoggedIn = (profile: StoreProfile) => {
    setStoreProfile(profile);
    safeStorage.setItem('sb_store_profile', profile);
    safeStorage.setItem('sb_store_registered', 'true');
    setIsStoreRegistered(true);
    setIsOwnerAuthenticated(true);
    api.updateProfile(profile).catch(() => {});
  };

  const handleUpdateStoreProfile = (profile: StoreProfile) => {
    setStoreProfile(profile);
    safeStorage.setItem('sb_store_profile', profile);
    api.updateProfile(profile).then(() => {
      showToast('Store profile & UPI ID updated successfully!');
    }).catch(() => {});
  };

  // Sync state to localStorage for offline resilience
  useEffect(() => {
    safeStorage.setItem('sb_store_profile', storeProfile);
  }, [storeProfile]);

  useEffect(() => {
    safeStorage.setItem('sb_menu_categories', categories);
  }, [categories]);

  useEffect(() => {
    safeStorage.setItem('sb_menu_items', menuItems);
  }, [menuItems]);

  useEffect(() => {
    safeStorage.setItem('sb_orders', orders);
  }, [orders]);

  // Check URL query parameters on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get('table');
      const zn = params.get('zone');

      if (tbl) {
        // Customer scanned Table QR Code
        setCustomerTable(parseInt(tbl, 10));
        if (zn) setCustomerZone(decodeURIComponent(zn));
        setIsOwnerTesting(false);
      }
    }
  }, []);

  // --- Real-time Order Sync & Kitchen Bell Ringing ---
  useEffect(() => {
    let isMounted = true;

    // Helper to process incoming orders from server or broadcast
    const syncOrdersWithChime = (freshOrders: OrderRecord[]) => {
      if (!Array.isArray(freshOrders)) return;

      // Detect brand new orders that were not previously known
      const incomingNewOrders: OrderRecord[] = [];
      freshOrders.forEach((ord) => {
        if (!knownOrderIdsRef.current.has(ord.id)) {
          knownOrderIdsRef.current.add(ord.id);
          incomingNewOrders.push(ord);
        }
      });

      // If initial load already completed and new order arrived -> start ringing & alert!
      if (incomingNewOrders.length > 0 && isInitialLoadDoneRef.current) {
        startContinuousOrderRinging();
        const latest = incomingNewOrders[0];
        showToast(`🔔 LIVE ORDER RECEIVED! Table #${latest.tableNumber} - ${latest.orderNumber}`);
      }

      setOrders(dedupeOrders(freshOrders));
    };

    // Initial load from server
    api.getProfile().then((serverProfile) => {
      if (!isMounted) return;
      if (serverProfile && serverProfile.name) {
        setStoreProfile(serverProfile);
        safeStorage.setItem('sb_store_profile', serverProfile);
      }
    }).catch(() => {});

    api.getOrders().then((serverOrders) => {
      if (!isMounted) return;
      if (serverOrders && serverOrders.length > 0) {
        serverOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        setOrders(dedupeOrders(serverOrders));
      }
      isInitialLoadDoneRef.current = true;
    }).catch(() => {
      isInitialLoadDoneRef.current = true;
    });

    // Polling every 1200ms to detect orders placed from phones/scans in real-time
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const liveOrders = await api.getOrders();
        if (isMounted && liveOrders) {
          syncOrdersWithChime(liveOrders);
        }
      } catch {
        // Keep polling
      }
    }, 1200);

    // Cross-tab / Window instantaneous broadcast listener (0ms latency)
    const unsubscribeBroadcast = api.onBroadcast((type, payload) => {
      if (type === 'PROFILE_UPDATED' && payload) {
        setStoreProfile(payload);
        safeStorage.setItem('sb_store_profile', payload);
      } else if (type === 'NEW_ORDER' && payload) {
        const newOrder = payload as OrderRecord;
        if (!knownOrderIdsRef.current.has(newOrder.id)) {
          knownOrderIdsRef.current.add(newOrder.id);
          startContinuousOrderRinging();
          showToast(`🔔 NEW LIVE ORDER! Table #${newOrder.tableNumber} - ${newOrder.orderNumber}`);
          setOrders((prev) => dedupeOrders([newOrder, ...prev]));
        }
      } else if (type === 'ORDER_STATUS_CHANGED' || type === 'ORDER_SETTLED' || type === 'ORDER_BILL_MODIFIED') {
        api.getOrders().then((o) => isMounted && setOrders(dedupeOrders(o))).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubscribeBroadcast();
    };
  }, []);

  // Monitor unaccepted orders to automatically stop ringing once accepted or rejected
  useEffect(() => {
    const unacceptedOrders = orders.filter((o) => o.status === 'received');
    if (unacceptedOrders.length === 0) {
      stopContinuousOrderRinging();
    }
  }, [orders]);

  // --- Menu Handlers ---
  const handleAddCategory = (newCat: string) => {
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${newCat}" added.`);
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
    showToast(`Category "${cat}" removed.`);
  };

  const handleAddMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => [item, ...prev]);
    showToast(`"${item.name}" added to menu.`);
  };

  const handleUpdateMenuItem = (updated: MenuItem) => {
    setMenuItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showToast(`"${updated.name}" updated.`);
  };

  const handleRemoveMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Menu item removed.');
  };

  const handleToggleAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextVal = !item.isAvailable;
          showToast(`"${item.name}" marked ${nextVal ? 'Available' : 'Sold Out'}.`);
          return { ...item, isAvailable: nextVal };
        }
        return item;
      })
    );
  };

  // --- Order & Bill Handlers ---
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : o
      )
    );
    api.updateOrderStatus(orderId, status).catch(() => {});
  };

  const handleModifyBill = (
    orderId: string,
    discount: number,
    serviceCharge: number,
    notes?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const taxable = Math.max(0, o.bill.subtotal - discount);
          const tax = (taxable * storeProfile.taxRate) / 100;
          const total = taxable + tax + serviceCharge;
          return {
            ...o,
            bill: {
              ...o.bill,
              discount,
              serviceCharge,
              tax,
              total,
              notes,
            },
          };
        }
        return o;
      })
    );
    api.modifyBill(orderId, discount, serviceCharge, notes).catch(() => {});
  };

  const handleSettleBill = (
    orderId: string,
    paymentMethod: 'UPI / Online QR' | 'Cash at Counter' | 'Card / Pos' | 'Waived'
  ) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'settled',
              paymentStatus: 'settled',
              bill: {
                ...o.bill,
                settledAt: timeNow,
                paymentMethod,
              },
            }
          : o
      )
    );
    api.settleBill(orderId, paymentMethod).catch(() => {});
  };

  const handleRefreshOrders = async () => {
    try {
      const fresh = await api.getOrders();
      if (fresh) {
        setOrders(fresh);
        showToast('Orders refreshed from live kitchen.');
      }
    } catch {
      showToast('Offline fallback used.');
    }
  };

  // Customer places order from scanned menu
  const handlePlaceCustomerOrder = async (newOrder: OrderRecord) => {
    if (currentUserProfile) {
      newOrder.customerName = currentUserProfile.displayName || currentUserProfile.userId;
    }
    knownOrderIdsRef.current.add(newOrder.id);
    setOrders((prev) => dedupeOrders([newOrder, ...prev]));
    playOrderNotificationChime();
    showToast(`🔔 New Order Alert: Table #${newOrder.tableNumber} - ${newOrder.orderNumber}`);
    await api.createOrder(newOrder);
  };

  // Owner tests customer menu from inside Owner Portal
  const handleOwnerTestScan = (tblNum: number, zn: string) => {
    setCustomerTable(tblNum);
    setCustomerZone(zn);
    setIsOwnerTesting(true);
    showToast(`Opening customer preview for Table #${tblNum}`);
  };

  // Owner PIN login verification
  const handleOwnerLogin = (pin: string): boolean => {
    const validPin = storeProfile.ownerPin || '1234';
    if (pin === validPin) {
      setIsOwnerAuthenticated(true);
      sessionStorage.setItem('sb_owner_authenticated', 'true');
      setCustomerTable(null);
      setIsOwnerTesting(false);
      showToast('Owner Portal unlocked.');
      return true;
    }
    return false;
  };

  // Owner logs out / locks portal
  const handleLockOwnerPortal = () => {
    setIsOwnerAuthenticated(false);
    sessionStorage.removeItem('sb_owner_authenticated');
    setIsOwnerTesting(false);
    showToast('Owner Portal locked.');
  };

  // Customer active order for their table
  const customerActiveOrder = customerTable
    ? orders.find((o) => o.tableNumber === customerTable && o.status !== 'settled') ||
      orders.find((o) => o.tableNumber === customerTable) ||
      null
    : null;

  return (
    <div className="min-h-screen bg-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {customerTable !== null ? (
        /* CUSTOMER DINE-IN MENU (Accessed via QR scan) */
        <CustomerApp
          storeProfile={storeProfile}
          menuItems={menuItems}
          categories={categories}
          tableNumber={customerTable}
          diningZone={customerZone}
          activeOrder={customerActiveOrder}
          onPlaceCustomerOrder={handlePlaceCustomerOrder}
          onUpdateCustomerOrderStatus={handleUpdateOrderStatus}
          isOwnerTesting={isOwnerTesting}
          onReturnToOwner={isOwnerTesting ? () => setCustomerTable(null) : undefined}
          onShowToast={showToast}
          currentLanguage={currentLanguage}
          onSelectLanguage={handleSelectLanguage}
          currentUserProfile={currentUserProfile}
          onOpenAuthModal={() => handleOpenAuth('signin')}
        />
      ) : !currentUserProfile ? (
        /* LOGIN GATE BEFORE ENTERING THE APP */
        <StoreLoginGate
          storeProfile={storeProfile}
          onLoginSuccess={(profile) => {
            handleAuthSuccess(profile);
            setIsOwnerAuthenticated(true);
          }}
          onShowToast={showToast}
        />
      ) : (
        /* MAIN OWNER MANAGEMENT PORTAL & DASHBOARD */
        <OwnerPortal
          storeProfile={storeProfile}
          menuItems={menuItems}
          categories={categories}
          orders={orders}
          staffUsers={staffUsers}
          onUpdateStaffUsers={setStaffUsers}
          currentLanguage={currentLanguage}
          onSelectLanguage={handleSelectLanguage}
          onUpdateStoreProfile={handleUpdateStoreProfile}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
          onAddMenuItem={handleAddMenuItem}
          onUpdateMenuItem={handleUpdateMenuItem}
          onRemoveMenuItem={handleRemoveMenuItem}
          onToggleAvailability={handleToggleAvailability}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onModifyBill={handleModifyBill}
          onSettleBill={handleSettleBill}
          onRefreshOrders={handleRefreshOrders}
          onSimulateCustomerScan={handleOwnerTestScan}
          onLockPortal={handleUserSignOut}
          onLogout={handleUserSignOut}
          onShowToast={showToast}
          currentUserProfile={currentUserProfile}
          onOpenAuthModal={() => handleOpenAuth(currentUserProfile ? 'profile' : 'signin')}
        />
      )}

      {/* Global Toast Component */}
      <Toast message={toastMessage} />
    </div>
  );
}
