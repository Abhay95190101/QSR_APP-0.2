import React, { useState } from 'react';
import { OrderRecord, StoreProfile } from '../../types';
import { printThermalReceipt } from '../../utils/printer';

interface RecentTableOrdersTabProps {
  orders: OrderRecord[];
  storeProfile: StoreProfile;
  onUpdateStatus: (orderId: string, status: any) => void;
  onModifyBill: (orderId: string, discount: number, serviceCharge: number, notes?: string) => void;
  onSettleBill: (orderId: string, method: any) => void;
  onShowToast: (msg: string) => void;
  onSimulateCustomerScan?: (tableNumber: number, zone: string) => void;
}

export const RecentTableOrdersTab: React.FC<RecentTableOrdersTabProps> = ({
  orders,
  storeProfile,
  onUpdateStatus,
  onModifyBill,
  onSettleBill,
  onShowToast,
  onSimulateCustomerScan,
}) => {
  const [tableFilter, setTableFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBillModal, setShowBillModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const handlePrintReceipt = () => {
    if (selectedOrder) {
      printThermalReceipt(selectedOrder, storeProfile, onShowToast);
    } else {
      window.print();
    }
  };

  const currency = storeProfile.currencySymbol || '₹';

  // Deduplicate orders safely
  const uniqueOrders = Array.from(
    new Map(
      orders
        .filter((o): o is OrderRecord => Boolean(o && o.id))
        .map((o) => [o.id, o])
    ).values()
  );

  // Distinct table numbers
  const tableNumbers = Array.from(new Set(uniqueOrders.map((o) => o.tableNumber || 1))).sort((a, b) => a - b);

  const filteredOrders = uniqueOrders.filter((ord) => {
    if (!ord) return false;
    const ordTableStr = (ord.tableNumber || '').toString();
    const matchTable = tableFilter === 'All' || ordTableStr === tableFilter;
    const matchStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'active'
        ? ord.status === 'received' || ord.status === 'preparing'
        : ord.status === statusFilter;

    const searchLower = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      (ord.orderNumber && ord.orderNumber.toLowerCase().includes(searchLower)) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchLower)) ||
      (ord.diningZone && ord.diningZone.toLowerCase().includes(searchLower)) ||
      (Array.isArray(ord.items) && ord.items.some((i) => i && i.name && i.name.toLowerCase().includes(searchLower)));

    return matchTable && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-black/[0.04] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">table_restaurant</span>
            </div>
            <h2 className="font-headline-md text-base sm:text-lg font-black text-on-surface">
              Recent Table Orders
            </h2>
          </div>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Dine-in table order history, live guest requests, item breakdowns &amp; settlement records
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-semibold">
            {uniqueOrders.length} Total Orders Recorded
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            {uniqueOrders.filter((o) => o.status === 'settled').length} Bills Settled
          </span>
        </div>
      </div>

      {/* Filters Bar: Tables, Statuses, Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-surface-container-lowest p-3 rounded-2xl border border-black/[0.04]">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table, item, customer..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs outline-none border border-black/5"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {[
            { id: 'All', label: 'All' },
            { id: 'active', label: 'Cooking / In Kitchen' },
            { id: 'served', label: 'Served to Table' },
            { id: 'settled', label: 'Settled & Paid' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === st.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Table Number Selector */}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          <span className="text-on-surface-variant font-bold">Filter Table:</span>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-surface-container text-on-surface text-xs font-bold border border-black/5 outline-none"
          >
            <option value="All">All Tables</option>
            {tableNumbers.map((num) => (
              <option key={num} value={num.toString()}>
                Table #{num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-xs border border-dashed border-black/10">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
            dinner_dining
          </span>
          <h4 className="font-headline-md text-sm font-bold text-on-surface">No Table Orders Found</h4>
          <p className="text-xs text-on-surface-variant mt-1">
            Try adjusting your search query or table filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const isCooking = ord.status === 'received' || ord.status === 'preparing';
            const isServed = ord.status === 'served';
            const isSettled = ord.status === 'settled';

            return (
              <div
                key={ord.id}
                className={`bg-surface-container-lowest rounded-2xl p-4 shadow-xs border transition-all flex flex-col justify-between ${
                  isCooking
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : isServed
                    ? 'border-emerald-300'
                    : 'border-black/[0.04] opacity-90'
                }`}
              >
                <div>
                  {/* Table Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/[0.05]">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
                        #{ord.tableNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-headline-md text-sm font-black text-on-surface">
                            {ord.orderNumber}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant block">
                          {ord.diningZone} • {ord.createdAt}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                        ord.status === 'received'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : ord.status === 'preparing'
                          ? 'bg-primary text-on-primary'
                          : ord.status === 'served'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  {/* Customer Name */}
                  <div className="text-xs text-on-surface pt-2 pb-1 flex items-center justify-between">
                    <span className="font-semibold text-on-surface-variant">
                      Customer: <strong className="text-on-surface">{ord.customerName || 'Dining Guest'}</strong>
                    </span>
                    {onSimulateCustomerScan && (
                      <button
                        onClick={() => onSimulateCustomerScan(ord.tableNumber, ord.diningZone)}
                        className="text-[10px] text-primary hover:underline font-bold"
                        title="Simulate Table QR Scan"
                      >
                        Scan View →
                      </button>
                    )}
                  </div>

                  {/* Ordered Items List */}
                  <div className="py-2 space-y-1.5 border-t border-black/[0.03]">
                    {(ord.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-on-surface mr-1">{item?.quantity || 1}×</span>
                          <span className="font-medium text-on-surface">{item?.name || 'Item'}</span>
                          {item?.customizationSummary && (
                            <span className="text-[10px] text-primary block truncate">
                              • {item.customizationSummary}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-on-surface whitespace-nowrap">
                          {currency}{(item?.totalPrice || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bill Breakdown & Actions */}
                <div className="pt-2.5 border-t border-black/[0.05] mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">Total Bill:</span>
                    <span className="font-headline-md text-sm font-black text-primary">
                      {currency}{(ord?.bill?.total || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
                    {ord.status === 'received' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(ord.id, 'preparing');
                          onShowToast(`Order ${ord.orderNumber} sent to Cooking`);
                        }}
                        className="py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs active:scale-95"
                      >
                        Fire Up Grill
                      </button>
                    )}
                    {ord.status === 'preparing' && (
                      <button
                        onClick={() => {
                          onUpdateStatus(ord.id, 'served');
                          onShowToast(`Order ${ord.orderNumber} marked as Served to Table #${ord.tableNumber}`);
                        }}
                        className="col-span-2 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs active:scale-95"
                      >
                        Mark as Served ✓
                      </button>
                    )}
                    {ord.status === 'served' && (
                      <button
                        onClick={() => {
                          onSettleBill(ord.id, 'UPI / Online QR');
                          onShowToast(`Order ${ord.orderNumber} settled via UPI!`);
                        }}
                        className="col-span-2 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs active:scale-95"
                      >
                        Settle Digital Bill ✓
                      </button>
                    )}
                    {ord.status === 'settled' && (
                      <div className="col-span-2 space-y-1.5">
                        <div className="text-center text-[11px] text-emerald-700 font-bold bg-emerald-50 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 border border-emerald-100">
                          <span className="material-symbols-outlined text-[15px]">verified</span>
                          ✓ Bill Settled ({ord.bill.paymentMethod || 'Paid'})
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(ord);
                            setShowBillModal(true);
                          }}
                          className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all border border-black/5 active:scale-95 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          View &amp; Print Bill
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Receipt & Bill View Modal */}
      {showBillModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 shadow-2xl relative my-auto animate-in zoom-in-95">
            {/* Printable Receipt Area */}
            <div id="restaurant-table-bill-print" className="text-center font-mono text-xs">
              <div className="flex items-center justify-center gap-1 mb-1">
                {storeProfile.logoUrl ? (
                  <img src={storeProfile.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-base">restaurant</span>
                )}
                <h3 className="font-headline-md text-base text-on-surface font-extrabold">{storeProfile.name}</h3>
              </div>
              <p className="text-[11px] text-on-surface-variant">{storeProfile.address}</p>
              <p className="text-[10px] text-on-surface-variant">Phone: {storeProfile.phone}</p>
              <div className="border-t border-dashed border-black/30 my-2" />

              <div className="flex justify-between font-bold text-[11px] mb-1">
                <span>Receipt: {selectedOrder.orderNumber}</span>
                <span>Table #{selectedOrder.tableNumber}</span>
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant mb-2">
                <span>{selectedOrder.createdAt}</span>
                <span>Zone: {selectedOrder.diningZone}</span>
              </div>

              {/* Items List */}
              <div className="space-y-1 text-left border-y border-dashed border-black/30 py-2 my-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">
                      {item.quantity}× {item.name}
                    </span>
                    <span>{currency}{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Math & Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currency}{selectedOrder.bill.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.bill.discount > 0 && (
                  <div className="flex justify-between text-primary font-bold">
                    <span>Discount:</span>
                    <span>-{currency}{selectedOrder.bill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({storeProfile.taxRate}%):</span>
                  <span>{currency}{selectedOrder.bill.tax.toFixed(2)}</span>
                </div>
                {selectedOrder.bill.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span>{currency}{selectedOrder.bill.serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-black/30 my-1 pt-1 flex justify-between font-extrabold text-sm text-on-surface">
                  <span>GRAND TOTAL:</span>
                  <span className="text-primary">{currency}{selectedOrder.bill.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment & Settlement Status */}
              <div className="mt-3 p-2 bg-surface-container-low rounded text-[10px]">
                <p className="font-bold text-emerald-800 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  Settled via {selectedOrder.bill.paymentMethod || 'Online'}
                </p>
                {storeProfile.upiId && (
                  <p className="text-on-surface-variant text-[9px] mt-0.5">UPI ID: {storeProfile.upiId}</p>
                )}
              </div>

              <p className="text-[10px] text-on-surface-variant mt-2 italic">
                Thank you for dining with {storeProfile.name}!
              </p>
            </div>

            {/* Modal Controls */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowBillModal(false)}
                className="flex-1 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 rounded-full bg-primary hover:opacity-95 text-on-primary text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">print</span>
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
