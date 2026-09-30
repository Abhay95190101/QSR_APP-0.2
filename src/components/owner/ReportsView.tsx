import React, { useState, useMemo, useEffect } from 'react';
import { OrderRecord, StoreProfile } from '../../types';
import { safeStorage } from '../../utils/safeStorage';

interface ReportsViewProps {
  orders: OrderRecord[];
  storeProfile: StoreProfile;
  onShowToast: (msg: string) => void;
}

type DateFilterType = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all' | 'specific' | 'range';

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  storeProfile,
  onShowToast,
}) => {
  const currency = storeProfile.currencySymbol || '₹';

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Date Filter States
  const [filterType, setFilterType] = useState<DateFilterType>('today');
  const [specificDate, setSpecificDate] = useState<string>(yesterdayStr);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Load all-time historical orders from local storage archive + server
  const [archivedOrders, setArchivedOrders] = useState<OrderRecord[]>(() => {
    return safeStorage.getItem<OrderRecord[]>('sb_all_time_orders_archive', []);
  });

  // Fetch all orders archive from server on load
  useEffect(() => {
    fetch('/api/reports/all-orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setArchivedOrders((prev) => {
            const map = new Map<string, OrderRecord>();
            prev.forEach((o) => {
              if (o && o.id && o.id !== 'ord-101') map.set(o.id, o);
            });
            data.orders.forEach((o: OrderRecord) => {
              if (o && o.id && o.id !== 'ord-101') map.set(o.id, o);
            });
            const combined = Array.from(map.values());
            safeStorage.setItem('sb_all_time_orders_archive', combined);
            return combined;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Automatically record incoming orders to the permanent all-time archive
  useEffect(() => {
    if (orders && orders.length > 0) {
      setArchivedOrders((prev) => {
        const map = new Map<string, OrderRecord>();
        // Add existing archive
        prev.forEach((o) => {
          if (o && o.id && o.id !== 'ord-101') map.set(o.id, o);
        });
        // Add or update current live orders
        orders.forEach((o) => {
          if (o && o.id && o.id !== 'ord-101') {
            const existing = map.get(o.id);
            map.set(o.id, {
              ...existing,
              ...o,
              createdDate: o.createdDate || existing?.createdDate || todayStr,
            });
          }
        });
        const combined = Array.from(map.values());
        safeStorage.setItem('sb_all_time_orders_archive', combined);
        return combined;
      });
    }
  }, [orders, todayStr]);

  // Load historical day end summaries if available
  const historicalDayEnds = useMemo(() => {
    return safeStorage.getItem<any[]>('sb_historical_day_ends', []);
  }, []);

  // Normalizes an order's date to YYYY-MM-DD safely
  const getOrderDate = (order: OrderRecord): string => {
    try {
      if (!order) return todayStr;
      if (order.createdDate && order.createdDate.length >= 10) return order.createdDate.slice(0, 10);
      if (order.timestamp && order.timestamp > 0) {
        const d = new Date(order.timestamp);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      const match = typeof order.id === 'string' ? order.id.match(/ord-(\d{10,14})/) : null;
      if (match && match[1]) {
        const ts = parseInt(match[1], 10);
        if (!isNaN(ts) && ts > 0) {
          const d = new Date(ts);
          if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
          }
        }
      }
    } catch {
      // safe fallback
    }
    return todayStr;
  };

  // Filter orders based on active date option (from both live and archived ledger)
  const filteredOrders = useMemo(() => {
    const combinedList = [...orders, ...archivedOrders];
    const uniqueOrders = Array.from(
      new Map(
        combinedList
          .filter((o): o is OrderRecord => Boolean(o && o.id && o.id !== 'ord-101'))
          .map((o) => [o.id, o])
      ).values()
    );

    return uniqueOrders.filter((order) => {
      const ordDate = getOrderDate(order);

      // Date matching
      let matchesDate = true;
      if (filterType === 'all') matchesDate = true;
      else if (filterType === 'today') matchesDate = ordDate === todayStr;
      else if (filterType === 'yesterday') matchesDate = ordDate === yesterdayStr;
      else if (filterType === 'specific') matchesDate = ordDate === specificDate;
      else if (filterType === 'last7') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        matchesDate = ordDate >= sevenDaysAgo && ordDate <= todayStr;
      } else if (filterType === 'thisMonth') {
        const thisMonthPrefix = todayStr.slice(0, 7);
        matchesDate = ordDate.startsWith(thisMonthPrefix);
      } else if (filterType === 'range') {
        if (startDate && endDate) {
          matchesDate = ordDate >= startDate && ordDate <= endDate;
        } else if (startDate) matchesDate = ordDate >= startDate;
        else if (endDate) matchesDate = ordDate <= endDate;
      }

      if (!matchesDate) return false;

      // Status matching
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Search query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (order.orderNumber || '').toLowerCase().includes(q);
        const tblMatch = `table ${order.tableNumber}`.includes(q) || `#${order.tableNumber}`.includes(q) || String(order.tableNumber) === q;
        const guestMatch = (order.customerName || '').toLowerCase().includes(q);
        const zoneMatch = (order.diningZone || '').toLowerCase().includes(q);
        const itemMatch = (order.items || []).some((i) => (i.name || '').toLowerCase().includes(q));
        if (!numMatch && !tblMatch && !guestMatch && !zoneMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, archivedOrders, filterType, specificDate, startDate, endDate, todayStr, yesterdayStr, statusFilter, searchQuery]);

  // Derived financial metrics from filtered orders
  const settledOrders = filteredOrders.filter((o) => o.status === 'settled');
  const openOrders = filteredOrders.filter((o) => o.status !== 'settled');

  const totalRevenue = settledOrders.reduce((sum, o) => sum + (o?.bill?.total || 0), 0);
  const totalSubtotal = settledOrders.reduce((sum, o) => sum + (o?.bill?.subtotal || 0), 0);
  const totalTax = settledOrders.reduce((sum, o) => sum + (o?.bill?.tax || 0), 0);
  const totalServiceCharge = settledOrders.reduce((sum, o) => sum + (o?.bill?.serviceCharge || 0), 0);
  const totalDiscounts = settledOrders.reduce((sum, o) => sum + (o?.bill?.discount || 0), 0);
  const averageTicket = settledOrders.length > 0 ? totalRevenue / settledOrders.length : 0;

  // Total items sold in filtered orders
  const totalItemsSold = filteredOrders.reduce((sum, ord) => {
    return sum + (ord.items || []).reduce((iSum, item) => iSum + (item?.quantity || 1), 0);
  }, 0);

  // Payment Breakdown
  const upiSettled = settledOrders
    .filter((o) => (o?.bill?.paymentMethod || '').toLowerCase().includes('upi'))
    .reduce((sum, o) => sum + (o?.bill?.total || 0), 0);
  const cashSettled = Math.max(0, totalRevenue - upiSettled);
  const upiPercent = totalRevenue > 0 ? Math.round((upiSettled / totalRevenue) * 100) : 0;
  const cashPercent = totalRevenue > 0 ? Math.max(0, 100 - upiPercent) : 0;

  // Top Selling Items in the filtered period
  const itemSalesMap = new Map<string, { name: string; qty: number; total: number; basePrice: number }>();
  filteredOrders.forEach((ord) => {
    if (!ord || !Array.isArray(ord.items)) return;
    ord.items.forEach((item) => {
      if (!item) return;
      const itemName = item.name || 'Special Item';
      const existing = itemSalesMap.get(itemName) || { name: itemName, qty: 0, total: 0, basePrice: item.basePrice || 0 };
      existing.qty += item.quantity || 1;
      existing.total += item.totalPrice || ((item.basePrice || 0) * (item.quantity || 1));
      itemSalesMap.set(itemName, existing);
    });
  });
  const topSellingItems = Array.from(itemSalesMap.values()).sort((a, b) => b.qty - a.qty);

  // Friendly formatted label describing the current date selection
  const getDateSelectionLabel = (): string => {
    switch (filterType) {
      case 'today':
        return `Today (${todayStr})`;
      case 'yesterday':
        return `Yesterday (${yesterdayStr})`;
      case 'last7':
        return 'Last 7 Days';
      case 'thisMonth':
        return `This Month (${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})`;
      case 'specific':
        return `Specific Date: ${specificDate}`;
      case 'range':
        return `Date Range: ${startDate} to ${endDate}`;
      case 'all':
        return 'All Time History';
      default:
        return 'Selected Date';
    }
  };

  // Helper to safely escape CSV cell value according to RFC 4180
  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Professional Excel / CSV Export
  const handleExportCSV = () => {
    const dateLabel = getDateSelectionLabel();
    const csvLines: string[] = [];

    // 1. Executive Title & Store Meta
    csvLines.push(`${escapeCSV(storeProfile.name)} - OFFICIAL FINANCIAL SALES & AUDIT REPORT`);
    csvLines.push(`Report Period: ${escapeCSV(dateLabel)}`);
    csvLines.push(`Generated On: ${escapeCSV(new Date().toLocaleString())}`);
    csvLines.push(`Store Address: ${escapeCSV(storeProfile.address + (storeProfile.city ? ', ' + storeProfile.city : ''))}`);
    if (storeProfile.gstin) csvLines.push(`GSTIN: ${escapeCSV(storeProfile.gstin)}`);
    if (storeProfile.fssaiNumber) csvLines.push(`FSSAI Reg: ${escapeCSV(storeProfile.fssaiNumber)}`);
    csvLines.push(`Currency: ${escapeCSV(currency)}`);
    csvLines.push('');

    // 2. Financial Summary KPI Table
    csvLines.push('=== EXECUTIVE FINANCIAL SUMMARY ===');
    csvLines.push(['Metric', 'Value'].map(escapeCSV).join(','));
    csvLines.push(['Total Filtered Orders', filteredOrders.length].map(escapeCSV).join(','));
    csvLines.push(['Settled (Paid) Orders', settledOrders.length].map(escapeCSV).join(','));
    csvLines.push(['Open / Pending Orders', openOrders.length].map(escapeCSV).join(','));
    csvLines.push(['Total Items Sold (Qty)', totalItemsSold].map(escapeCSV).join(','));
    csvLines.push([`Gross Sales Subtotal (${currency})`, totalSubtotal.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Discounts Given (${currency})`, totalDiscounts.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Net GST Tax (${currency})`, totalTax.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Service Charge (${currency})`, totalServiceCharge.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Total Net Settled Revenue (${currency})`, totalRevenue.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`UPI / QR Digital Collections (${currency})`, upiSettled.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Cash Collections (${currency})`, cashSettled.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push([`Average Order Value (${currency})`, averageTicket.toFixed(2)].map(escapeCSV).join(','));
    csvLines.push('');

    // 3. Top Selling Menu Items
    if (topSellingItems.length > 0) {
      csvLines.push('=== TOP SELLING MENU ITEMS ===');
      csvLines.push(['Item Name', 'Quantity Sold', `Total Sales (${currency})`].map(escapeCSV).join(','));
      topSellingItems.forEach((item) => {
        csvLines.push([item.name, item.qty, item.total.toFixed(2)].map(escapeCSV).join(','));
      });
      csvLines.push('');
    }

    // 4. Comprehensive Itemized Order Ledger
    csvLines.push('=== ITEMIZED ORDER TRANSACTION LEDGER ===');
    const headers = [
      'Order #',
      'Table',
      'Dining Zone',
      'Date',
      'Time',
      'Guest Name',
      'Items Ordered (Summary)',
      'Status',
      'Payment Status',
      'Payment Method',
      `Subtotal (${currency})`,
      `Discount (${currency})`,
      `GST Tax (${currency})`,
      `Service Charge (${currency})`,
      `Grand Total (${currency})`,
    ];
    csvLines.push(headers.map(escapeCSV).join(','));

    filteredOrders.forEach((o) => {
      const itemsSummary = (o.items || [])
        .map((i) => `${i.quantity || 1}x ${i.name || 'Item'}`)
        .join('; ');

      const row = [
        o.orderNumber || o.id,
        `Table #${o.tableNumber}`,
        o.diningZone || 'General',
        getOrderDate(o),
        o.createdAt || '',
        o.customerName || 'Dining Guest',
        itemsSummary,
        o.status,
        o.paymentStatus || (o.status === 'settled' ? 'settled' : 'pending'),
        o.bill?.paymentMethod || (o.status === 'settled' ? 'Paid' : 'Pending'),
        (o.bill?.subtotal || 0).toFixed(2),
        (o.bill?.discount || 0).toFixed(2),
        (o.bill?.tax || 0).toFixed(2),
        (o.bill?.serviceCharge || 0).toFixed(2),
        (o.bill?.total || 0).toFixed(2),
      ];
      csvLines.push(row.map(escapeCSV).join(','));
    });

    // Add UTF-8 BOM so Excel correctly parses ₹ and characters
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filenameSafe = dateLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${storeProfile.name.replace(/\s+/g, '_')}_Sales_Report_${filenameSafe}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(`Exported sales report for ${dateLabel} (.csv)`);
  };

  const handlePrintPDF = () => {
    setShowPrintModal(true);
  };

  const executeSystemPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner & Export Actions */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-black/[0.04] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">analytics</span>
            </div>
            <h2 className="font-headline-md text-base sm:text-lg font-black text-on-surface">
              Financial Sales &amp; Date Reports
            </h2>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Audit store accounting, dish performance, and settlement archives with clean Excel &amp; PDF downloads.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            title="Download formatted Excel (.csv) report"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            <span>Download Excel (.csv)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            title="Print or save PDF sales summary report"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* DATE SELECTOR BAR */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-black/[0.04] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">calendar_month</span>
            Select Date Period:
          </span>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs flex-wrap sm:flex-nowrap">
            {[
              { id: 'today', label: 'Today', icon: 'today' },
              { id: 'yesterday', label: 'Yesterday', icon: 'history' },
              { id: 'specific', label: 'Select Date', icon: 'event' },
              { id: 'last7', label: 'Last 7 Days', icon: 'date_range' },
              { id: 'thisMonth', label: 'This Month', icon: 'calendar_month' },
              { id: 'range', label: 'Custom Range', icon: 'date_range' },
              { id: 'all', label: 'All Time', icon: 'all_inclusive' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setFilterType(p.id as DateFilterType);
                  if (p.id === 'yesterday') {
                    onShowToast(`Showing sales report for Yesterday (${yesterdayStr})`);
                  } else if (p.id === 'today') {
                    onShowToast(`Showing sales report for Today (${todayStr})`);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 active:scale-95 ${
                  filterType === p.id
                    ? 'bg-primary text-on-primary shadow-sm font-black'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Specific Date Picker */}
        {filterType === 'specific' && (
          <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-black/5 flex items-center gap-3 animate-in fade-in text-xs flex-wrap">
            <label className="font-extrabold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">event</span>
              <span>Pick Specific Date:</span>
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                onShowToast(`Showing report for ${e.target.value}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-black/10 text-on-surface font-black text-xs outline-none"
            />
            <span className="text-on-surface-variant text-[11px]">
              Displaying sales data for <strong>{specificDate}</strong>
            </span>
          </div>
        )}

        {/* Interactive Date Range Picker */}
        {filterType === 'range' && (
          <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-black/5 flex items-center gap-3 animate-in fade-in text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-black/10 text-on-surface font-bold text-xs outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-black/10 text-on-surface font-bold text-xs outline-none"
              />
            </div>
            <span className="text-on-surface-variant text-[11px]">
              Displaying orders between <strong>{startDate}</strong> and <strong>{endDate}</strong>
            </span>
          </div>
        )}

        {/* Active Report Header Banner */}
        <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">assessment</span>
            <span className="font-black text-xs sm:text-sm">
              Active Report: {getDateSelectionLabel()}
            </span>
          </div>
          <div className="text-xs font-bold flex items-center gap-2">
            <span>Orders: {filteredOrders.length}</span>
            <span>•</span>
            <span className="font-black text-emerald-800">Sales: {currency}{totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Settled Revenue */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-black/[0.04]">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-[11px] uppercase font-black">Settled Revenue</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
          </div>
          <div className="font-headline-md text-xl sm:text-2xl font-black text-emerald-800">
            {currency}{totalRevenue.toFixed(2)}
          </div>
          <span className="text-[10px] text-on-surface-variant mt-1 block">
            From {settledOrders.length} settled of {filteredOrders.length} orders
          </span>
        </div>

        {/* Orders Placed & Ticket Size */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-black/[0.04]">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-[11px] uppercase font-black">Total Orders</span>
            <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
          </div>
          <div className="font-headline-md text-xl sm:text-2xl font-black text-on-surface">
            {filteredOrders.length}
          </div>
          <span className="text-[10px] text-on-surface-variant mt-1 block">
            Avg Ticket: <strong className="text-on-surface">{currency}{averageTicket.toFixed(2)}</strong>
          </span>
        </div>

        {/* GST & Service Charge */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-black/[0.04]">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-[11px] uppercase font-black">GST &amp; Taxes</span>
            <span className="material-symbols-outlined text-amber-700 text-lg">account_balance</span>
          </div>
          <div className="font-headline-md text-xl sm:text-2xl font-black text-on-surface">
            {currency}{totalTax.toFixed(2)}
          </div>
          <span className="text-[10px] text-on-surface-variant mt-1 block">
            Service Charge: {currency}{totalServiceCharge.toFixed(2)}
          </span>
        </div>

        {/* UPI vs Cash Split */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-black/[0.04]">
          <div className="flex items-center justify-between text-on-surface-variant mb-1">
            <span className="text-[11px] uppercase font-black">Payment Modes</span>
            <span className="material-symbols-outlined text-blue-600 text-lg">qr_code_2</span>
          </div>
          <div className="text-xs font-bold text-on-surface flex justify-between mb-1">
            <span>UPI: {currency}{upiSettled.toFixed(0)} ({upiPercent}%)</span>
            <span>Cash: {currency}{cashSettled.toFixed(0)} ({cashPercent}%)</span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden flex">
            <div style={{ width: `${upiPercent}%` }} className="bg-blue-600 h-full" title="UPI" />
            <div style={{ width: `${cashPercent}%` }} className="bg-emerald-600 h-full" title="Cash" />
          </div>
        </div>
      </div>

      {/* Top Dishes & Items Sold Section */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-black/[0.04] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">restaurant</span>
            <h3 className="font-headline-md text-sm font-black text-on-surface">
              Top Selling Dishes ({topSellingItems.length} items sold)
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant font-bold">
            Total Items: {totalItemsSold}
          </span>
        </div>

        {topSellingItems.length === 0 ? (
          <div className="text-center py-6 text-on-surface-variant text-xs">
            No dishes recorded for {getDateSelectionLabel()}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {topSellingItems.slice(0, 9).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-surface-container/40 border border-black/[0.03] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-on-surface truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    {item.qty} portions sold
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-black text-on-surface block">{currency}{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Itemized Orders Table & Search Filter */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-black/[0.04] overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-headline-md text-sm font-black text-on-surface">
              Detailed Order Transactions ({filteredOrders.length})
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              Period: {getDateSelectionLabel()}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search order, table, guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5 w-44 sm:w-56"
              />
              <span className="material-symbols-outlined text-on-surface-variant absolute left-2 top-2 text-[14px]">
                search
              </span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold outline-none border border-black/5"
            >
              <option value="all">All Statuses</option>
              <option value="settled">Settled Only</option>
              <option value="served">Served</option>
              <option value="preparing">Preparing</option>
              <option value="received">Received</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant text-xs space-y-2">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 block">
              receipt_long
            </span>
            <p className="font-bold text-on-surface">No individual orders found for {getDateSelectionLabel()}.</p>
            <p className="text-[11px] text-on-surface-variant max-w-sm mx-auto">
              Select another date above or check the past Day-End archive below for daily shift settlements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container/50 text-[10px] font-black uppercase text-on-surface-variant border-b border-black/[0.04]">
                <tr>
                  <th className="py-2.5 px-4">Order #</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Guest Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-on-surface">{ord.orderNumber || ord.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-primary">#{ord.tableNumber}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {getOrderDate(ord)} {ord.createdAt}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface">{ord.customerName || 'Dining Guest'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        ord.status === 'settled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'served'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant font-medium">
                      {ord.bill?.paymentMethod || (ord.status === 'settled' ? 'Paid' : 'Pending')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-on-surface">
                      {currency}{(ord.bill?.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Day End Records Section */}
      {historicalDayEnds.length > 0 && (
        <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-black/[0.04] space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700 text-lg">history_toggle_off</span>
            <h4 className="font-headline-md text-sm font-black text-on-surface">
              Past Day-End Settlement Archive
            </h4>
          </div>

          <div className="divide-y divide-black/[0.04] text-xs">
            {historicalDayEnds.slice(0, 10).map((snap: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">{snap.dateFormatted || snap.date}</span>
                  <span className="text-[11px] text-on-surface-variant">
                    {snap.totalOrders} total orders • {snap.settledCount} settled bills
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-800 block">
                    {currency}{(snap.totalRevenue || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    UPI: {currency}{(snap.upiRevenue || 0).toFixed(2)} • Cash: {currency}{(snap.cashRevenue || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dedicated Clean Printable Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white text-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <span className="font-bold text-sm text-gray-700">Print Preview &amp; PDF Export</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={executeSystemPrint}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Printable Restaurant Sheet Content */}
            <div className="space-y-5 print:p-0">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">
                  {storeProfile.name}
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {storeProfile.address} {storeProfile.city ? `, ${storeProfile.city}` : ''} • Phone: {storeProfile.phone}
                </p>
                {storeProfile.gstin && (
                  <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                    GSTIN: {storeProfile.gstin} {storeProfile.fssaiNumber ? `| FSSAI: ${storeProfile.fssaiNumber}` : ''}
                  </p>
                )}
                <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-gray-100 text-xs font-black uppercase text-gray-800">
                  Official Sales &amp; Financial Summary Report: {getDateSelectionLabel()}
                </div>
              </div>

              {/* Financial KPI Summary Table */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Revenue</span>
                  <span className="text-lg font-black text-emerald-700 block mt-0.5">
                    {currency}{totalRevenue.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-500">From {settledOrders.length} settled orders</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Taxes Collected (GST)</span>
                  <span className="text-lg font-black text-gray-800 block mt-0.5">
                    {currency}{totalTax.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-500">Service: {currency}{totalServiceCharge.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Collection Split</span>
                  <span className="text-xs font-black text-blue-700 block mt-0.5">
                    UPI: {currency}{upiSettled.toFixed(2)}
                  </span>
                  <span className="text-xs font-black text-emerald-700 block">
                    Cash: {currency}{cashSettled.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Top Dishes */}
              {topSellingItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-700 mb-2">
                    Top Selling Dishes
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {topSellingItems.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex justify-between border-b pb-1">
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        <span className="font-bold text-gray-600">{item.qty} sold ({currency}{item.total.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Transaction List */}
              <div>
                <h4 className="text-xs font-black uppercase text-gray-700 mb-2">
                  Order Breakdown ({filteredOrders.length} total orders)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b bg-gray-50 font-bold text-gray-600">
                      <tr>
                        <th className="py-1.5 px-2">Order #</th>
                        <th className="py-1.5 px-2">Table</th>
                        <th className="py-1.5 px-2">Time</th>
                        <th className="py-1.5 px-2">Guest</th>
                        <th className="py-1.5 px-2">Status</th>
                        <th className="py-1.5 px-2">Method</th>
                        <th className="py-1.5 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.slice(0, 30).map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-1.5 px-2 font-bold">{ord.orderNumber || ord.id}</td>
                          <td className="py-1.5 px-2">#{ord.tableNumber}</td>
                          <td className="py-1.5 px-2">{ord.createdAt}</td>
                          <td className="py-1.5 px-2">{ord.customerName || 'Guest'}</td>
                          <td className="py-1.5 px-2 uppercase text-[9px] font-bold">{ord.status}</td>
                          <td className="py-1.5 px-2">{ord.bill?.paymentMethod || 'Paid'}</td>
                          <td className="py-1.5 px-2 text-right font-bold">{currency}{(ord.bill?.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredOrders.length > 30 && (
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                      (Showing first 30 of {filteredOrders.length} orders in print view)
                    </p>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t flex justify-between text-xs text-gray-600">
                <div>
                  <p className="font-bold">Prepared By: Master Owner / Manager</p>
                  <p className="text-[10px] text-gray-400">POS Verification Code: #OK-{Date.now().toString().slice(-4)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Authorized Store Seal / Signature</p>
                  <div className="w-32 border-b border-gray-400 mt-6 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
