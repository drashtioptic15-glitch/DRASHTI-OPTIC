'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Trash2,
  Receipt,
  Eye,
  CheckCircle2,
  Sparkles,
  Banknote,
  CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Category, Item, Customer, Prescription } from '@/types';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import PrescriptionPowerInput from '@/components/ui/PrescriptionPowerInput';
import { toast } from 'sonner';

interface CartItem {
  itemId: string;
  name: string;
  categoryName: string;
  brand: string;
  sku: string;
  unitPrice: number;
  availableStock: number;
  quantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountPercentage: number;
  total: number;
}

export default function AddSalePage() {
  const router = useRouter();

  // State: Customer
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // State: Prescription (Section 2 - Upside of Grand Total)
  const [customerPrescriptions, setCustomerPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [sendPrescriptionToPdf, setSendPrescriptionToPdf] = useState(true);
  const [prescriptionData, setPrescriptionData] = useState({
    rightEye: { sph: '', cyl: '', axis: '', vn: '6/', add: '', pd: '' },
    leftEye: { sph: '', cyl: '', axis: '', vn: '6/', add: '', pd: '' },
    doctor: '',
    notes: '',
  });

  // State: Product Catalog & Dynamic Price in Section 3
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemObj, setSelectedItemObj] = useState<Item | null>(null);
  const [addUnitPrice, setAddUnitPrice] = useState<number | string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);

  // State: Cart / Items Table
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');

  // State: Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [onlineAmount, setOnlineAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online' | 'UPI' | 'Card' | 'Split'>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Data Fetch (Categories)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const catRes = await api.get('/categories');
        if (catRes.data.success) {
          setCategories(catRes.data.data);
        }
      } catch (err: any) {
        toast.error('Failed to load categories');
      }
    };
    fetchInitial();
  }, []);

  // 2. Fetch Items when Category changes
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const url = selectedCategoryId === 'all' ? '/items' : `/items/category/${selectedCategoryId}`;
        const res = await api.get(url);
        if (res.data.success) {
          const list = res.data.data;
          setItemsList(list);
          if (list.length > 0) {
            setSelectedItemId(list[0]._id);
            setSelectedItemObj(list[0]);
            setAddUnitPrice(list[0].sellingPrice);
          } else {
            setSelectedItemId('');
            setSelectedItemObj(null);
            setAddUnitPrice('');
          }
        }
      } catch (err: any) {
        toast.error('Failed to load products for category');
      }
    };
    fetchItems();
  }, [selectedCategoryId]);

  // Update selected item object and editable price when item dropdown changes
  const handleItemSelectChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const found = itemsList.find((i) => i._id === itemId) || null;
    setSelectedItemObj(found);
    if (found) {
      setAddUnitPrice(found.sellingPrice);
    } else {
      setAddUnitPrice('');
    }
  };

  // 3. Customer Autocomplete Search
  const handleCustomerSearchChange = (query: string) => {
    setCustomerSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!query.trim()) {
      setCustomerSearchResults([]);
      return;
    }

    setIsSearchingCustomers(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/customers/search?query=${encodeURIComponent(query.trim())}`);
        if (res.data.success) {
          setCustomerSearchResults(res.data.data);
        }
      } catch (err) {
        console.error('Customer search error', err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 250);
  };

  // Select customer from search results
  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomerId(cust._id);
    setCustomerData({
      name: cust.name,
      mobile: cust.mobile,
      alternateMobile: cust.alternateMobile || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
    });
    setCustomerSearchResults([]);
    setCustomerSearchQuery('');

    // Fetch customer prescriptions
    try {
      const pRes = await api.get(`/customers/${cust._id}/prescriptions`);
      if (pRes.data.success && pRes.data.data.length > 0) {
        setCustomerPrescriptions(pRes.data.data);
        const latestP = pRes.data.data[0];
        setPrescriptionData({
          rightEye: {
            sph: latestP.rightEye?.sph || '',
            cyl: latestP.rightEye?.cyl || '',
            axis: latestP.rightEye?.axis || '',
            vn: latestP.rightEye?.vn || '6/',
            add: latestP.rightEye?.add || '',
            pd: latestP.rightEye?.pd || '',
          },
          leftEye: {
            sph: latestP.leftEye?.sph || '',
            cyl: latestP.leftEye?.cyl || '',
            axis: latestP.leftEye?.axis || '',
            vn: latestP.leftEye?.vn || '6/',
            add: latestP.leftEye?.add || '',
            pd: latestP.leftEye?.pd || '',
          },
          doctor: latestP.doctor || '',
          notes: latestP.notes || '',
        });
        setSelectedPrescriptionId(latestP._id);
        setSendPrescriptionToPdf(true);
      }
    } catch (e) {
      console.warn('Could not fetch prescriptions', e);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerData({
      name: '',
      mobile: '',
      alternateMobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    });
    setCustomerPrescriptions([]);
    setSelectedPrescriptionId(null);
    setPrescriptionData({
      rightEye: { sph: '', cyl: '', axis: '', vn: '6/', add: '', pd: '' },
      leftEye: { sph: '', cyl: '', axis: '', vn: '6/', add: '', pd: '' },
      doctor: '',
      notes: '',
    });
  };

  // Add Item to Billing Table with Owner-Editable Unit Price
  const handleAddItemToCart = () => {
    if (!selectedItemObj) {
      toast.error('Please select an item to add');
      return;
    }

    if (addQuantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const unitPrice =
      addUnitPrice !== '' && !isNaN(Number(addUnitPrice))
        ? Math.max(0, Number(addUnitPrice))
        : selectedItemObj.sellingPrice;

    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex((c) => c.itemId === selectedItemObj._id);

    if (existingIndex > -1) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + addQuantity;

      const updated = [...cartItems];
      const baseTotal = unitPrice * newQty;
      let discAmount = 0;
      if (existing.discountType === 'percentage') {
        discAmount = (baseTotal * existing.discountPercentage) / 100;
      } else {
        discAmount = Math.min(baseTotal, existing.discountAmount);
      }

      updated[existingIndex] = {
        ...existing,
        unitPrice,
        quantity: newQty,
        discountAmount: discAmount,
        total: Math.max(0, baseTotal - discAmount),
      };
      setCartItems(updated);
      toast.success(`Updated ${selectedItemObj.name} in invoice`);
    } else {
      const baseTotal = unitPrice * addQuantity;
      const catName = typeof selectedItemObj.category === 'object' ? selectedItemObj.category.name : '';

      const newItem: CartItem = {
        itemId: selectedItemObj._id,
        name: selectedItemObj.name,
        categoryName: catName,
        brand: selectedItemObj.brand || '',
        sku: selectedItemObj.sku || '',
        unitPrice: unitPrice,
        availableStock: 99999,
        quantity: addQuantity,
        discountType: 'fixed',
        discountValue: 0,
        discountAmount: 0,
        discountPercentage: 0,
        total: baseTotal,
      };

      setCartItems([...cartItems, newItem]);
      toast.success(`Added ${selectedItemObj.name}`);
    }

    setAddQuantity(1);
  };

  // Update Cart Item (Quantity, Owner-Edited Unit Price, or Discounts)
  const handleUpdateCartItem = (
    index: number,
    updates: Partial<CartItem> & {
      newDiscType?: 'percentage' | 'fixed';
      newDiscVal?: number;
      newUnitPrice?: number;
    }
  ) => {
    const updated = [...cartItems];
    const current = updated[index];
    if (!current) return;

    const item = { ...current, ...updates };

    // Update Unit Price if edited in row
    if (updates.newUnitPrice !== undefined) {
      item.unitPrice = Math.max(0, Number(updates.newUnitPrice) || 0);
    } else if (updates.unitPrice !== undefined) {
      item.unitPrice = Math.max(0, Number(updates.unitPrice) || 0);
    }

    const qty = Math.max(1, Math.min(item.availableStock, Number(item.quantity) || 1));
    item.quantity = qty;

    const baseTotal = item.unitPrice * qty;

    if (updates.newDiscType !== undefined || updates.newDiscVal !== undefined) {
      const dType = updates.newDiscType || item.discountType;
      const dVal = Number(updates.newDiscVal !== undefined ? updates.newDiscVal : item.discountValue) || 0;

      item.discountType = dType;
      item.discountValue = dVal;

      if (dType === 'percentage') {
        const p = Math.min(100, Math.max(0, dVal));
        item.discountPercentage = p;
        item.discountAmount = (baseTotal * p) / 100;
      } else {
        const amt = Math.min(baseTotal, Math.max(0, dVal));
        item.discountAmount = amt;
        item.discountPercentage = baseTotal > 0 ? (amt / baseTotal) * 100 : 0;
      }
    } else {
      // Re-calculate discount on price or quantity change
      if (item.discountType === 'percentage') {
        item.discountAmount = (baseTotal * item.discountPercentage) / 100;
      } else {
        item.discountAmount = Math.min(baseTotal, item.discountAmount);
        item.discountPercentage = baseTotal > 0 ? (item.discountAmount / baseTotal) * 100 : 0;
      }
    }

    item.total = Math.max(0, baseTotal - item.discountAmount);
    updated[index] = item;
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
  };

  // ================= Calculations =================
  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalItemDiscount = cartItems.reduce((acc, item) => acc + item.discountAmount, 0);
  const totalAfterItemDisc = Math.max(0, subtotal - totalItemDiscount);

  let overallDiscountAmount = 0;
  if (overallDiscountType === 'percentage') {
    const p = Math.min(100, Math.max(0, Number(overallDiscountValue) || 0));
    overallDiscountAmount = (totalAfterItemDisc * p) / 100;
  } else {
    overallDiscountAmount = Math.min(totalAfterItemDisc, Math.max(0, Number(overallDiscountValue) || 0));
  }

  const netTaxableAmount = Math.max(0, totalAfterItemDisc - overallDiscountAmount);
  const taxAmount = (netTaxableAmount * (Number(taxRate) || 0)) / 100;
  const grandTotal = Math.round((netTaxableAmount + taxAmount) * 100) / 100;

  // Calculated counterpart values for dual discount display
  const overallDiscountEquivalentPercent =
    totalAfterItemDisc > 0 ? ((overallDiscountAmount / totalAfterItemDisc) * 100).toFixed(1) : '0';
  const overallDiscountEquivalentRupees = overallDiscountAmount.toFixed(2);

  // Toggle overall discount mode with conversion
  const handleToggleOverallDiscountType = (newType: 'percentage' | 'fixed') => {
    if (newType === overallDiscountType) return;
    if (overallDiscountValue > 0 && totalAfterItemDisc > 0) {
      if (newType === 'percentage') {
        const pct = Math.min(100, Math.round(((overallDiscountValue / totalAfterItemDisc) * 100) * 100) / 100);
        setOverallDiscountValue(pct);
      } else {
        const amt = Math.round(((totalAfterItemDisc * overallDiscountValue) / 100) * 100) / 100;
        setOverallDiscountValue(amt);
      }
    }
    setOverallDiscountType(newType);
  };

  // Toggle item discount mode with conversion
  const handleToggleItemDiscountType = (index: number, newType: 'percentage' | 'fixed') => {
    const item = cartItems[index];
    if (!item || item.discountType === newType) return;
    const baseTotal = item.unitPrice * item.quantity;
    let newDiscVal = item.discountValue;
    if (item.discountValue > 0 && baseTotal > 0) {
      if (newType === 'percentage') {
        newDiscVal = Math.min(100, Math.round(((item.discountAmount / baseTotal) * 100) * 100) / 100);
      } else {
        newDiscVal = Math.round(item.discountAmount * 100) / 100;
      }
    }
    handleUpdateCartItem(index, { newDiscType: newType, newDiscVal });
  };

  // Open Payment Confirmation Popup
  const handleOpenPaymentModal = () => {
    if (!customerData.name.trim() || !customerData.mobile.trim()) {
      toast.error('Please enter customer Name and Mobile Number');
      return;
    }

    if (customerData.mobile.trim().length < 10) {
      toast.error('Customer mobile number must be at least 10 digits');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    setCashAmount(grandTotal);
    setOnlineAmount(0);
    setPaymentMethod('Cash');
    setIsPaymentModalOpen(true);
  };

  // Live calculation of due in payment modal
  const totalPaid = Math.max(0, Number(cashAmount) || 0) + Math.max(0, Number(onlineAmount) || 0);
  const dueAmount = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);

  // Submit Final Sale
  const handleFinalSaveSale = async () => {
    if (totalPaid > grandTotal) {
      toast.error(`Total payments (₹${totalPaid}) cannot exceed Grand Total (₹${grandTotal})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        customerData,
        prescriptionId: selectedPrescriptionId,
        prescriptionData: prescriptionData,
        includePrescription: sendPrescriptionToPdf,
        items: cartItems.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          discountType: c.discountType,
          discountValue: c.discountValue,
        })),
        overallDiscountType,
        overallDiscountValue,
        taxRate,
        cashAmount: Number(cashAmount) || 0,
        onlineAmount: Number(onlineAmount) || 0,
        paymentMethod:
          Number(cashAmount) > 0 && Number(onlineAmount) > 0 ? 'Split' : paymentMethod,
        notes: invoiceNotes,
        invoiceDate: new Date(),
      };

      const res = await api.post('/sales', payload);

      if (res.data.success) {
        const inv = res.data.data;
        const wa = res.data.whatsapp;

        toast.success(`Invoice #${inv.invoiceNumber} created successfully!`);

        if (wa?.success) {
          toast.success('Invoice PDF sent to customer WhatsApp!');
        } else if (wa?.status === 'Not Configured') {
          toast.info('Invoice saved. Configure WhatsApp API in Settings for auto-dispatch.');
        }

        setIsPaymentModalOpen(false);
        router.push(`/sales/${inv._id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-600 shrink-0" />
            <span>Fast Billing Counter</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Create invoice, attach prescription, compute discounts, and send WhatsApp PDF.
          </p>
        </div>

        <div>
          <Badge variant="brand" size="sm">
            Invoice: INV-2026-AUTO
          </Badge>
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Customer Info & Products / Eyewear Table */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          {/* SECTION 1: CUSTOMER SELECTION & DETAILS */}
          <div className="optic-card p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-brand-600 text-[10px] flex items-center justify-center font-black">
                  1
                </span>
                <span>Customer Information</span>
              </h3>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Clear Customer
                </button>
              )}
            </div>

            {/* Search Autocomplete Bar */}
            <div className="relative mb-3">
              <div className="relative">
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => handleCustomerSearchChange(e.target.value)}
                  placeholder="Search existing customer by Name, Mobile, or ID..."
                  className="optic-input pr-8 pl-3 py-1.5 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Autocomplete Dropdown */}
              {customerSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {customerSearchResults.map((cust) => (
                    <button
                      key={cust._id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full p-2.5 text-left hover:bg-rose-50/60 flex items-center justify-between transition-colors text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{cust.name}</p>
                        <p className="text-slate-500 font-mono text-[11px]">
                          📱 {cust.mobile} {cust.city ? `• ${cust.city}` : ''}
                        </p>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {cust.customerId}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="optic-input py-1.5 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Mobile (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerData.mobile}
                  onChange={(e) => setCustomerData({ ...customerData, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="optic-input py-1.5 text-xs font-medium font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Alternate Mobile</label>
                <input
                  type="tel"
                  value={customerData.alternateMobile}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, alternateMobile: e.target.value })
                  }
                  placeholder="Optional"
                  className="optic-input py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email Address</label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  placeholder="Optional"
                  className="optic-input py-1.5 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Address & City</label>
                <input
                  type="text"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  placeholder="Flat/House, Street, Area, City"
                  className="optic-input py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PRODUCTS & EYEWEAR ITEMS (WITH EDITABLE PRICE) */}
          <div className="optic-card p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-brand-600 text-[10px] flex items-center justify-center font-black">
                  3
                </span>
                <span>Products & Eyewear Items</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Editable unit prices at bill time
              </span>
            </div>

            {/* Product Selector Row (Responsive layout for Tablet & Desktop) */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                {/* Category Dropdown */}
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Category</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="optic-select py-1.5 text-xs"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Dropdown */}
                <div className="col-span-2 sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Product Item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelectChange(e.target.value)}
                    className="optic-select py-1.5 text-xs truncate"
                  >
                    {itemsList.length > 0 ? (
                      itemsList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} {item.brand ? `(${item.brand})` : ''} - ₹{item.sellingPrice}
                        </option>
                      ))
                    ) : (
                      <option value="">No items available</option>
                    )}
                  </select>
                </div>

                {/* Editable Unit Price Before Adding */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                    <span>Price (₹)</span>
                    {selectedItemObj && Number(addUnitPrice) !== selectedItemObj.sellingPrice && (
                      <span className="text-[9px] text-amber-600 font-bold">Custom</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={addUnitPrice}
                    onChange={(e) => setAddUnitPrice(e.target.value)}
                    placeholder="0"
                    className="optic-input py-1.5 text-right font-bold text-xs text-slate-900 focus:ring-brand-500"
                    title="Owner can edit selling price for this invoice"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-1 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5 text-center">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="optic-input py-1.5 text-center px-1 font-bold text-xs"
                  />
                </div>

                {/* Add Button */}
                <div className="col-span-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    disabled={!selectedItemObj}
                    className="optic-btn-primary w-full py-1.5 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Selected item metadata strip */}
              {selectedItemObj && (
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <span>
                    <strong>SKU:</strong> {selectedItemObj.sku || 'N/A'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>MRP:</strong> ₹{selectedItemObj.sellingPrice}
                  </span>
                  {selectedItemObj.brand && (
                    <>
                      <span>•</span>
                      <span>
                        <strong>Brand:</strong> {selectedItemObj.brand}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart Table (Scrollable & Responsive) */}
            <div className="table-responsive">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2 px-2.5">Item Description</th>
                    <th className="py-2 px-1 text-center w-14">Qty</th>
                    <th className="py-2 px-1 text-right w-24">Price (₹)</th>
                    <th className="py-2 px-1 text-center w-28">Discount</th>
                    <th className="py-2 px-2 text-right w-20">Total</th>
                    <th className="py-2 px-1 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.length > 0 ? (
                    cartItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-2.5">
                          <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.categoryName} {item.brand ? `• ${item.brand}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateCartItem(index, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-12 px-1 py-1 text-center font-bold bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:ring-1 focus:ring-brand-500"
                          />
                        </td>
                        {/* Editable Unit Price inside Table */}
                        <td className="py-2.5 px-1 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <span className="text-slate-400 font-semibold text-[10px]">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateCartItem(index, {
                                  newUnitPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-18 px-1 py-1 text-right font-bold bg-slate-50 border border-slate-200 rounded-md text-xs focus:bg-white focus:ring-1 focus:ring-brand-500"
                              title="Click to edit unit price"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                value={item.discountValue || ''}
                                onChange={(e) =>
                                  handleUpdateCartItem(index, {
                                    newDiscVal: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                className="w-12 px-1 py-1 text-center font-bold bg-slate-50 border border-slate-200 rounded-md text-xs"
                              />
                              <div className="inline-flex rounded p-0.5 bg-slate-200 shadow-inner">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemDiscountType(index, 'percentage')}
                                  className={`px-1 py-0.2 text-[9px] font-black rounded transition-all ${
                                    item.discountType === 'percentage'
                                      ? 'bg-brand-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="%"
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemDiscountType(index, 'fixed')}
                                  className={`px-1 py-0.2 text-[9px] font-black rounded transition-all ${
                                    item.discountType === 'fixed'
                                      ? 'bg-brand-600 text-white shadow-sm'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="₹"
                                >
                                  ₹
                                </button>
                              </div>
                            </div>
                            {item.discountValue > 0 && item.unitPrice * item.quantity > 0 && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 whitespace-nowrap">
                                {item.discountType === 'fixed'
                                  ? `${((item.discountAmount / (item.unitPrice * item.quantity)) * 100).toFixed(0)}% off`
                                  : `₹${item.discountAmount.toFixed(0)} off`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-extrabold text-slate-900">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                        No items added to invoice yet. Select a product above, modify price if needed, and click Add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Section 2 (Prescription Matrix) & Invoice Summary */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* SECTION 2: OPTICAL EYE PRESCRIPTION (MATRIX FORMAT) */}
          <div className="optic-card p-3.5 sm:p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-brand-600 text-[10px] flex items-center justify-center font-black">
                  2
                </span>
                <span>Optical Eye Prescription</span>
              </h3>

              {/* Send Prescription to PDF Toggle Button */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-[10px] font-bold text-slate-600 pl-1">Send to PDF:</span>
                <button
                  type="button"
                  onClick={() => setSendPrescriptionToPdf(true)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                    sendPrescriptionToPdf
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Include optical power details on the invoice PDF"
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setSendPrescriptionToPdf(false)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                    !sendPrescriptionToPdf
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Generate invoice PDF without optical power details"
                >
                  NO
                </button>
              </div>
            </div>

            {/* Prescription Table Grid Matrix (Space-saving & aligned) */}
            <div className="bg-slate-50/90 rounded-xl border border-slate-200 p-2 space-y-2">
              {/* Right Eye (OD) Row */}
              <div>
                <p className="text-[10px] font-bold text-brand-600 mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> RIGHT EYE (O.D.)
                </p>
                <div className="grid grid-cols-6 gap-1">
                  <PrescriptionPowerInput
                    label="SPH"
                    type="sph"
                    value={prescriptionData.rightEye.sph}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, sph: val },
                      })
                    }
                    placeholder="-1.50"
                  />
                  <PrescriptionPowerInput
                    label="CYL"
                    type="cyl"
                    value={prescriptionData.rightEye.cyl}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, cyl: val },
                      })
                    }
                    placeholder="-0.50"
                  />
                  <PrescriptionPowerInput
                    label="AXIS"
                    type="axis"
                    value={prescriptionData.rightEye.axis}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, axis: val },
                      })
                    }
                    placeholder="90"
                  />
                  <PrescriptionPowerInput
                    label="V/N"
                    type="vn"
                    value={prescriptionData.rightEye.vn || ''}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, vn: val },
                      })
                    }
                    placeholder="6/"
                  />
                  <PrescriptionPowerInput
                    label="ADD"
                    type="add"
                    value={prescriptionData.rightEye.add}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, add: val },
                      })
                    }
                    placeholder="+1.25"
                  />
                  <PrescriptionPowerInput
                    label="PD"
                    type="pd"
                    value={prescriptionData.rightEye.pd}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        rightEye: { ...prescriptionData.rightEye, pd: val },
                      })
                    }
                    placeholder="31"
                  />
                </div>
              </div>

              {/* Left Eye (OS) Row */}
              <div className="pt-1.5 border-t border-slate-200/60">
                <p className="text-[10px] font-bold text-brand-600 mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> LEFT EYE (O.S.)
                </p>
                <div className="grid grid-cols-6 gap-1">
                  <PrescriptionPowerInput
                    label="SPH"
                    type="sph"
                    value={prescriptionData.leftEye.sph}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, sph: val },
                      })
                    }
                    placeholder="-1.75"
                  />
                  <PrescriptionPowerInput
                    label="CYL"
                    type="cyl"
                    value={prescriptionData.leftEye.cyl}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, cyl: val },
                      })
                    }
                    placeholder="-0.75"
                  />
                  <PrescriptionPowerInput
                    label="AXIS"
                    type="axis"
                    value={prescriptionData.leftEye.axis}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, axis: val },
                      })
                    }
                    placeholder="85"
                  />
                  <PrescriptionPowerInput
                    label="V/N"
                    type="vn"
                    value={prescriptionData.leftEye.vn || ''}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, vn: val },
                      })
                    }
                    placeholder="6/"
                  />
                  <PrescriptionPowerInput
                    label="ADD"
                    type="add"
                    value={prescriptionData.leftEye.add}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, add: val },
                      })
                    }
                    placeholder="+1.25"
                  />
                  <PrescriptionPowerInput
                    label="PD"
                    type="pd"
                    value={prescriptionData.leftEye.pd}
                    onChange={(val) =>
                      setPrescriptionData({
                        ...prescriptionData,
                        leftEye: { ...prescriptionData.leftEye, pd: val },
                      })
                    }
                    placeholder="31"
                  />
                </div>
              </div>

              {/* Doctor & Notes Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    Doctor / Optometrist
                  </label>
                  <input
                    type="text"
                    value={prescriptionData.doctor}
                    onChange={(e) =>
                      setPrescriptionData({ ...prescriptionData, doctor: e.target.value })
                    }
                    placeholder="Dr. Name"
                    className="optic-input py-1 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Prescription Notes</label>
                  <input
                    type="text"
                    value={prescriptionData.notes}
                    onChange={(e) =>
                      setPrescriptionData({ ...prescriptionData, notes: e.target.value })
                    }
                    placeholder="Blue cut / AR"
                    className="optic-input py-1 text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* INVOICE SUMMARY & ACTIONS */}
          <div className="optic-card p-3.5 sm:p-4 border-brand-200/50 shadow-md">
            <h3 className="text-xs font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Invoice Summary</span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
              </span>
            </h3>

            {/* Calculations Breakdown */}
            <div className="py-2.5 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              {totalItemDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="font-medium">Item Discounts</span>
                  <span className="font-semibold">- {formatCurrency(totalItemDiscount)}</span>
                </div>
              )}

              {/* Overall Extra Discount Card */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">Extra Discount</span>
                  {/* % and ₹ Toggle Buttons */}
                  <div className="inline-flex rounded p-0.5 bg-slate-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleToggleOverallDiscountType('percentage')}
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded transition-all ${
                        overallDiscountType === 'percentage'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      % Discount
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleOverallDiscountType('fixed')}
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded transition-all ${
                        overallDiscountType === 'fixed'
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ₹ Discount
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1 text-[11px] font-black text-slate-500">
                      {overallDiscountType === 'percentage' ? '%' : '₹'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={overallDiscountValue || ''}
                      onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-0.5 text-right text-xs font-black bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="text-right">
                    {overallDiscountValue > 0 && totalAfterItemDisc > 0 ? (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                        {overallDiscountType === 'fixed'
                          ? `${overallDiscountEquivalentPercent}%`
                          : `₹${overallDiscountEquivalentRupees}`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold px-1">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* GST / Tax Rate */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700">GST / Tax (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate || ''}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 px-1.5 py-0.5 text-right text-xs bg-slate-50 border border-slate-200 rounded-md font-bold"
                />
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Tax Amount ({taxRate}%)</span>
                  <span className="font-semibold text-slate-900">+ {formatCurrency(taxAmount)}</span>
                </div>
              )}

              {/* Grand Total Card Banner */}
              <div className="pt-1.5 border-t border-slate-200">
                <div className="p-3 rounded-xl bg-gradient-to-br from-brand-600 to-rose-700 text-white shadow-md shadow-brand-600/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-100">Grand Total</p>
                    <p className="text-xl sm:text-2xl font-black tracking-tight">{formatCurrency(grandTotal)}</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-rose-200" />
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Invoice Notes / Remarks</label>
                <textarea
                  rows={1}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="e.g. Complimentary microfiber cloth included"
                  className="optic-input py-1 text-xs resize-none"
                />
              </div>
            </div>

            {/* SAVE SALE BUTTON */}
            <button
              type="button"
              onClick={handleOpenPaymentModal}
              disabled={cartItems.length === 0 || !customerData.name || !customerData.mobile}
              className="optic-btn-primary w-full py-2.5 text-xs font-extrabold shadow-lg shadow-brand-600/30 mt-1 disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>SAVE SALE & COLLECT PAYMENT</span>
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT CONFIRMATION POPUP / MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Complete Payment & Issue Invoice"
        subtitle={`Invoice Grand Total: ${formatCurrency(grandTotal)}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Customer Summary Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">{customerData.name}</p>
              <p className="text-slate-500 font-mono text-[11px]">📱 {customerData.mobile}</p>
            </div>
            <Badge variant="brand" size="sm">
              WhatsApp Enabled
            </Badge>
          </div>

          {/* Payment Split Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash Received
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCashAmount(grandTotal);
                    setOnlineAmount(0);
                    setPaymentMethod('Cash');
                  }}
                  className="text-[11px] text-brand-600 font-semibold hover:underline"
                >
                  Set Full Cash
                </button>
              </label>
              <input
                type="number"
                min="0"
                max={grandTotal}
                value={cashAmount}
                onChange={(e) => setCashAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="optic-input font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-600" /> Online / UPI / Card
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOnlineAmount(grandTotal);
                    setCashAmount(0);
                    setPaymentMethod('UPI');
                  }}
                  className="text-[11px] text-brand-600 font-semibold hover:underline"
                >
                  Set Full Online
                </button>
              </label>
              <input
                type="number"
                min="0"
                max={grandTotal}
                value={onlineAmount}
                onChange={(e) => setOnlineAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="optic-input font-bold text-sm"
              />
            </div>
          </div>

          {/* Live Due Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Grand Total</span>
              <span className="text-white font-bold">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Total Received (Cash + Online)</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-slate-300">Balance Due</p>
                <p className={`text-lg font-black ${dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(dueAmount)}
                </p>
              </div>
              <Badge
                variant={dueAmount === 0 ? 'success' : totalPaid > 0 ? 'warning' : 'danger'}
                size="sm"
              >
                {dueAmount === 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partial Payment' : 'Unpaid (Due)'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSubmitting}
              className="optic-btn-secondary flex-1 py-2.5 text-xs font-semibold"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleFinalSaveSale}
              disabled={isSubmitting || totalPaid > grandTotal}
              className="optic-btn-primary flex-1 py-2.5 text-xs font-extrabold shadow-lg shadow-brand-600/30"
            >
              {isSubmitting ? (
                <span>Generating Invoice & PDF...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Save Sale</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
