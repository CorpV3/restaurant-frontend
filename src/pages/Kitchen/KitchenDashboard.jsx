import { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheck, FiX, FiRefreshCw, FiLogOut, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { orderAPI, inventoryAPI, menuAPI } from '../../services/api';

const UNITS = ['pieces', 'kg', 'g', 'L', 'ml', 'portions', 'bottles', 'boxes', 'bags'];
const CATEGORIES = ['meat', 'vegetables', 'dairy', 'bakery', 'spices', 'beverages', 'seafood', 'frozen', 'other'];

function generateBatchNo() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BT-${d}-${r}`;
}

function printLabelBrowser(item) {
  const exp = new Date(item.expires_at);
  const prep = new Date(item.prepared_at || Date.now());
  const w = window.open('', '_blank', 'width=360,height=280');
  w.document.write(`<!DOCTYPE html><html><head><title>Label - ${item.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; padding:12px; width:280px; border:2px solid #000; }
    .name { font-size:16px; font-weight:bold; border-bottom:1px solid #000; padding-bottom:4px; margin-bottom:6px; }
    .batch { font-size:18px; font-weight:bold; letter-spacing:3px; text-align:center; margin:6px 0; padding:4px; border:1px dashed #555; }
    .row { font-size:11px; margin:3px 0; display:flex; justify-content:space-between; }
    .label { color:#555; }
    @media print { body { border:none; } }
  </style></head><body>
  <div class="name">${item.name}</div>
  <div class="batch">${item.batch_number || 'NO BATCH'}</div>
  <div class="row"><span class="label">Prepared:</span><span>${prep.toLocaleDateString()} ${prep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span class="label">Expires:</span><span>${exp.toLocaleDateString()} ${exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span class="label">Quantity:</span><span>${item.quantity} portions</span></div>
  <script>setTimeout(() => { window.print(); window.close(); }, 300);</script>
  </body></html>`);
  w.document.close();
}

// ─── Kitchen Orders Tab ───────────────────────────────────────────────────────

function KitchenTab({ orders, refreshing, onRefresh, onUpdateStatus, onCancel }) {
  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-300',
    confirmed: 'bg-orange-50 border-orange-300',
    preparing: 'bg-blue-50 border-blue-300',
    ready: 'bg-green-50 border-green-300',
  };

  const getNextStatus = (s) => ({ pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'served' }[s]);
  const getButtonText = (s) => ({ pending: 'Confirm Order', confirmed: 'Start Preparing', preparing: 'Mark as Ready', ready: 'Mark as Served' }[s]);
  const getButtonColor = (s) => ({ pending: 'bg-orange-600 hover:bg-orange-700', confirmed: 'bg-blue-600 hover:bg-blue-700', preparing: 'bg-green-600 hover:bg-green-700', ready: 'bg-purple-600 hover:bg-purple-700' }[s]);

  const formatTime = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <>
      <div className="flex gap-6 mb-6">
        {[
          { label: 'New', count: pendingOrders.length, color: 'bg-yellow-400' },
          { label: 'Preparing', count: preparingOrders.length, color: 'bg-blue-500' },
          { label: 'Ready', count: readyOrders.length, color: 'bg-green-500' },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-4 h-4 ${color} rounded`}></div>
            <span className="font-semibold text-gray-700">{label}: {count}</span>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">No active orders</p>
          <p className="text-gray-400 text-sm mt-2">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`${statusColors[order.status] || 'bg-gray-50 border-gray-300'} ${order.order_type === 'ONLINE' || order.order_type === 'online' ? 'ring-4 ring-green-400' : ''} border-4 rounded-xl p-6 bg-white shadow-lg relative`}
            >
              {(order.order_type === 'ONLINE' || order.order_type === 'online') && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
                  🚗 UBER EATS
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{order.order_number}</h3>
                  <p className="text-lg font-semibold text-gray-700">
                    {order.order_type === 'online' ? '🍔 Online Delivery'
                      : order.order_type === 'takeaway' ? '🥡 Takeaway'
                      : order.table_id ? `Table` : 'Table'}
                  </p>
                  {order.customer_name && <p className="text-sm text-gray-600">{order.customer_name}</p>}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FiClock />
                  <span className="font-semibold text-sm">{formatTime(order.created_at)}</span>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-bold">×{item.quantity}</span>
                    </div>
                    {item.special_instructions && (
                      <p className="text-sm text-red-600 font-medium">Note: {item.special_instructions}</p>
                    )}
                  </div>
                ))}
              </div>

              {order.delivery_address && (
                <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-xs font-bold text-green-700 mb-1">📍 DELIVERY ADDRESS</p>
                  <p className="text-sm font-semibold text-green-900">{order.delivery_address}</p>
                </div>
              )}
              {order.special_instructions && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">Order Note: {order.special_instructions}</p>
                </div>
              )}

              <div className="mb-4 flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-gray-900">£{order.total?.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onUpdateStatus(order.id, getNextStatus(order.status))}
                  className={`w-full ${getButtonColor(order.status)} text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 text-lg`}
                >
                  <FiCheck /> {getButtonText(order.status)}
                </button>
                {order.status === 'ready' && (
                  <div className="bg-green-100 text-green-800 font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-sm border-2 border-green-300">
                    <FiCheck /> Ready for Pickup
                  </div>
                )}
                <button
                  onClick={() => onCancel(order.id)}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <FiX /> Cancel Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ restaurantId }) {
  const [activeSection, setActiveSection] = useState('ingredients');
  const [ingredients, setIngredients] = useState([]);
  const [prepared, setPrepared] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showIngModal, setShowIngModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [editIngredient, setEditIngredient] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ingRes, prepRes, alertRes] = await Promise.all([
        inventoryAPI.listItems(restaurantId),
        inventoryAPI.listPrepared(restaurantId),
        inventoryAPI.getAlerts(restaurantId),
      ]);
      setIngredients(ingRes.data || []);
      setPrepared(prepRes.data || []);
      setAlerts(alertRes.data || { low_stock: [], expiring_soon: [], expired: [] });
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalAlerts = alerts.low_stock.length + alerts.expiring_soon.length + alerts.expired.length;
  const filteredIng = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredPrep = prepared.filter(i => i.status !== 'consumed' && i.name.toLowerCase().includes(search.toLowerCase()));

  const sections = [
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'prepared', label: 'Prepared Food' },
    { key: 'alerts', label: `Alerts${totalAlerts > 0 ? ` (${totalAlerts})` : ''}` },
  ];

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Ingredients', value: ingredients.length, icon: FiPackage, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Batches', value: prepared.filter(p => p.status === 'active').length, icon: FiCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Alerts', value: totalAlerts, icon: FiAlertTriangle, color: 'text-orange-600 bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color}`}><s.icon size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border">
        {/* Section tabs */}
        <div className="flex border-b">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === s.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
          <div className="ml-auto px-4 py-2 flex items-center gap-2">
            <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <FiRefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : activeSection === 'ingredients' ? (
            <IngredientsSection
              items={filteredIng}
              search={search}
              onSearch={setSearch}
              onAdd={() => { setEditIngredient(null); setShowIngModal(true); }}
              onEdit={(i) => { setEditIngredient(i); setShowIngModal(true); }}
              onAdjust={(i) => { setAdjustTarget(i); setShowAdjustModal(true); }}
              onDelete={async (id) => {
                if (!confirm('Delete this ingredient?')) return;
                try { await inventoryAPI.deleteItem(restaurantId, id); fetchAll(); toast.success('Deleted'); }
                catch { toast.error('Failed to delete'); }
              }}
            />
          ) : activeSection === 'prepared' ? (
            <PreparedSection
              items={filteredPrep}
              search={search}
              onSearch={setSearch}
              onAdd={() => setShowPrepModal(true)}
              onPrintLabel={printLabelBrowser}
              onConsume={async (id) => {
                try { await inventoryAPI.updatePrepared(restaurantId, id, { status: 'consumed' }); fetchAll(); toast.success('Marked as consumed'); }
                catch { toast.error('Failed to update'); }
              }}
              onDelete={async (id) => {
                if (!confirm('Delete this item?')) return;
                try { await inventoryAPI.deletePrepared(restaurantId, id); fetchAll(); toast.success('Deleted'); }
                catch { toast.error('Failed to delete'); }
              }}
            />
          ) : (
            <AlertsSection alerts={alerts} onRefresh={fetchAll} />
          )}
        </div>
      </div>

      {/* Ingredient Modal */}
      {showIngModal && (
        <IngredientModal
          item={editIngredient}
          onClose={() => setShowIngModal(false)}
          onSave={async (data) => {
            try {
              if (editIngredient) {
                await inventoryAPI.updateItem(restaurantId, editIngredient.id, data);
              } else {
                await inventoryAPI.createItem(restaurantId, data);
              }
              toast.success(editIngredient ? 'Updated' : 'Added');
              setShowIngModal(false); fetchAll();
            } catch { toast.error('Failed to save'); }
          }}
        />
      )}

      {/* Adjust Modal */}
      {showAdjustModal && adjustTarget && (
        <AdjustModal
          item={adjustTarget}
          onClose={() => setShowAdjustModal(false)}
          onSave={async (qty, reason) => {
            try {
              await inventoryAPI.adjustStock(restaurantId, adjustTarget.id, { quantity_change: qty, reason });
              toast.success('Stock adjusted'); setShowAdjustModal(false); fetchAll();
            } catch { toast.error('Failed to adjust'); }
          }}
        />
      )}

      {/* Add Prepared Modal */}
      {showPrepModal && (
        <AddPreparedModal
          onClose={() => setShowPrepModal(false)}
          onSave={async (data) => {
            try {
              await inventoryAPI.createPrepared(restaurantId, data);
              toast.success('Batch added'); setShowPrepModal(false); fetchAll();
            } catch { toast.error('Failed to add batch'); }
          }}
        />
      )}
    </div>
  );
}

function IngredientsSection({ items, search, onSearch, onAdd, onEdit, onAdjust, onDelete }) {
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search ingredients..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
        <button onClick={onAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">+ Add</button>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No ingredients found</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border ${item.quantity <= (item.min_threshold ?? item.reorder_level ?? 0) ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600 capitalize">{item.category}</span>
                  {item.quantity <= (item.min_threshold ?? item.reorder_level ?? 0) && <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-700">Low Stock</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{item.quantity} {item.unit} · Reorder at {item.min_threshold ?? item.reorder_level ?? 0} {item.unit}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onAdjust(item)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Adjust</button>
                <button onClick={() => onEdit(item)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm">Edit</button>
                <button onClick={() => onDelete(item.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreparedSection({ items, search, onSearch, onAdd, onPrintLabel, onConsume, onDelete }) {
  const now = new Date();
  const statusBadge = (item) => {
    if (item.status === 'expired' || new Date(item.expires_at) < now) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>;
    if (item.status === 'offer') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Offer</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>;
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search prepared food..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
        <button onClick={onAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">+ Add Batch</button>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No prepared food batches found</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  {statusBadge(item)}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Batch: {item.batch_number || '—'} · Qty: {item.quantity} ·
                  Exp: {new Date(item.expires_at).toLocaleDateString()} {new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onPrintLabel(item)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm flex items-center gap-1">
                  🖨 Label
                </button>
                <button onClick={() => onConsume(item.id)} className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm">Consumed</button>
                <button onClick={() => onDelete(item.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsSection({ alerts, onRefresh }) {
  const total = alerts.low_stock.length + alerts.expiring_soon.length + alerts.expired.length;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-gray-700">{total} active alert{total !== 1 ? 's' : ''}</p>
        <button onClick={onRefresh} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><FiRefreshCw size={12} /> Refresh</button>
      </div>
      {total === 0 && <p className="text-center text-gray-400 py-8">No alerts — all stock levels are fine</p>}
      {alerts.low_stock.length > 0 && (
        <div>
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Low Stock ({alerts.low_stock.length})</p>
          {alerts.low_stock.map(i => (
            <div key={i.id} className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-2">
              <p className="font-semibold text-gray-900">{i.name}</p>
              <p className="text-sm text-orange-700">{i.quantity} {i.unit} remaining (reorder at {i.min_threshold ?? i.reorder_level ?? 0})</p>
            </div>
          ))}
        </div>
      )}
      {alerts.expiring_soon.length > 0 && (
        <div>
          <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">Expiring Soon ({alerts.expiring_soon.length})</p>
          {alerts.expiring_soon.map(i => (
            <div key={i.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-2">
              <p className="font-semibold text-gray-900">{i.name}</p>
              <p className="text-sm text-yellow-700">Expires: {new Date(i.expires_at).toLocaleString()} · Batch: {i.batch_number || '—'}</p>
            </div>
          ))}
        </div>
      )}
      {alerts.expired.length > 0 && (
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Expired ({alerts.expired.length})</p>
          {alerts.expired.map(i => (
            <div key={i.id} className="p-3 bg-red-50 border border-red-200 rounded-xl mb-2">
              <p className="font-semibold text-gray-900">{i.name}</p>
              <p className="text-sm text-red-700">Expired: {new Date(i.expires_at).toLocaleString()} · Batch: {i.batch_number || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Order History Tab ────────────────────────────────────────────────────────

function OrderHistoryTab({ restaurantId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await orderAPI.list(restaurantId, params);
      const all = res.data || [];
      const history = all.filter(o => ['completed', 'cancelled', 'served'].includes(o.status));
      history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(history);
      setPage(0);
    } catch {
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, statusFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = orders.filter(o =>
    !search ||
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.items?.some(i => i.item_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE);

  const statusColor = {
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    served: 'bg-blue-100 text-blue-700',
  };

  const totalRevenue = filtered.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
  const cashTotal = filtered.filter(o => o.status === 'completed' && o.payment_method === 'cash').reduce((s, o) => s + (o.total || 0), 0);
  const cardTotal = filtered.filter(o => o.status === 'completed' && o.payment_method === 'card').reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: filtered.filter(o => o.status === 'completed').length, sub: 'completed' },
          { label: 'Cash Revenue', value: `£${cashTotal.toFixed(2)}`, sub: `${filtered.filter(o => o.payment_method === 'cash' && o.status === 'completed').length} orders` },
          { label: 'Card Revenue', value: `£${cardTotal.toFixed(2)}`, sub: `${filtered.filter(o => o.payment_method === 'card' && o.status === 'completed').length} orders` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search order, customer, item..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="served">Served</option>
        </select>
        <button onClick={fetchHistory} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center gap-1">
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-2">
          {paginated.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(e => e === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div>
                    <p className="font-bold text-gray-900 font-mono">{order.order_number}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {order.customer_name ? ` · ${order.customer_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="capitalize">{order.order_type || 'table'}</span>
                    {order.payment_method && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{order.payment_method}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="font-bold text-gray-900">£{order.total?.toFixed(2)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                  <span className="text-gray-400 text-sm">{expandedId === order.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedId === order.id && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="grid grid-cols-3 gap-4 mt-3 mb-4 text-sm">
                    <div><span className="text-gray-400 text-xs">Subtotal</span><br /><span className="font-semibold">£{order.subtotal?.toFixed(2)}</span></div>
                    <div><span className="text-gray-400 text-xs">VAT (20%)</span><br /><span className="font-semibold">£{order.tax?.toFixed(2)}</span></div>
                    <div><span className="text-gray-400 text-xs">Total</span><br /><span className="font-bold text-gray-900">£{order.total?.toFixed(2)}</span></div>
                    {order.discount_amount > 0 && (
                      <div><span className="text-gray-400 text-xs">Discount</span><br /><span className="font-semibold text-green-600">-£{order.discount_amount?.toFixed(2)}</span></div>
                    )}
                    {order.completed_at && (
                      <div><span className="text-gray-400 text-xs">Completed</span><br /><span className="font-semibold">{new Date(order.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                    )}
                    {order.refunded_at && (
                      <div><span className="text-gray-400 text-xs">Refunded</span><br /><span className="font-semibold text-red-600">£{order.refund_amount?.toFixed(2)}</span></div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-start gap-3">
                          <span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">×{item.quantity}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            {item.special_instructions && <p className="text-sm text-red-500 mt-0.5">Note: {item.special_instructions}</p>}
                          </div>
                        </div>
                        <span className="text-gray-600 font-semibold">£{((item.item_price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {order.special_instructions && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">Order note: {order.special_instructions}</p>
                    </div>
                  )}
                  {order.refunded_at && order.refund_reason && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">Refund reason: {order.refund_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length > paginated.length && (
            <div className="text-center pt-4">
              <button onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                Load more ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared Modals ────────────────────────────────────────────────────────────

function IngredientModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '', quantity: item?.quantity ?? 0, unit: item?.unit || 'pieces',
    category: item?.category || 'other', min_threshold: item?.min_threshold ?? item?.reorder_level ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{item ? 'Edit Ingredient' : 'Add Ingredient'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Name *"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.quantity} onChange={e => f('quantity', parseFloat(e.target.value) || 0)} placeholder="Quantity"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            <select value={form.unit} onChange={e => f('unit', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={e => f('category', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            <input type="number" value={form.min_threshold} onChange={e => f('min_threshold', parseFloat(e.target.value) || 0)} placeholder="Reorder level"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
          <button disabled={!form.name || saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ item, onClose, onSave }) {
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Adjust Stock</h3>
            <p className="text-sm text-gray-500">{item.name} — {item.quantity} {item.unit}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Change amount (negative to reduce)</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => q - 1)} className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-700 text-xl font-bold hover:bg-gray-100">−</button>
              <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-center font-bold text-lg focus:outline-none focus:border-blue-500" />
              <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-xl border-2 border-gray-300 text-gray-700 text-xl font-bold hover:bg-gray-100">+</button>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              New total: <span className={`font-bold ${(item.quantity + qty) < 0 ? 'text-red-500' : 'text-gray-900'}`}>{item.quantity + qty} {item.unit}</span>
            </p>
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
          <button disabled={qty === 0 || saving} onClick={async () => { setSaving(true); await onSave(qty, reason); setSaving(false); }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold">
            {saving ? 'Saving...' : 'Adjust'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPreparedModal({ onClose, onSave }) {
  const now = new Date();
  const exp = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const toLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    name: '', quantity: 1, batch_number: generateBatchNo(),
    prepared_at: toLocal(now), expires_at: toLocal(exp), notes: '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Add Prepared Batch</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Item name *"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.quantity} onChange={e => f('quantity', parseFloat(e.target.value) || 1)} placeholder="Quantity"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            <input value={form.batch_number} onChange={e => f('batch_number', e.target.value)} placeholder="Batch No."
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Prepared At</label>
            <input type="datetime-local" value={form.prepared_at} onChange={e => f('prepared_at', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Expires At</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => f('expires_at', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Notes (optional)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
          <button disabled={!form.name || saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold">
            {saving ? 'Saving...' : 'Add Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main KitchenDashboard ────────────────────────────────────────────────────

export default function KitchenDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchOrders = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const response = await orderAPI.list(user.restaurant_id, { limit: 100 });
      const activeOrders = response.data.filter(
        order => !['completed', 'cancelled', 'served'].includes(order.status)
      );
      setOrders(activeOrders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success(`Order ${newStatus}!`);
      fetchOrders();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await orderAPI.cancel(orderId);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const TABS = [
    { key: 'orders', label: 'Orders', badge: orders.length > 0 ? orders.length : null },
    { key: 'inventory', label: 'Inventory' },
    { key: 'history', label: 'Order History' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kitchen Console</h1>
            {user && <p className="text-sm text-gray-500 mt-0.5">Logged in as: <span className="font-semibold">{user.email || user.username}</span></p>}
          </div>
          <div className="flex gap-2">
            {tab === 'orders' && (
              <button onClick={() => fetchOrders(true)} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 font-semibold">
                <FiRefreshCw className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">
              <FiLogOut /> Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4">
          {TABS.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                tab === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
              {badge && (
                <span className={`text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ${tab === key ? 'bg-white text-blue-600' : 'bg-orange-500 text-white'}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {tab === 'orders' && (
          <KitchenTab
            orders={orders}
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            onUpdateStatus={updateOrderStatus}
            onCancel={cancelOrder}
          />
        )}
        {tab === 'inventory' && <InventoryTab restaurantId={user?.restaurant_id} />}
        {tab === 'history' && <OrderHistoryTab restaurantId={user?.restaurant_id} />}
      </div>
    </div>
  );
}
