import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiAlertTriangle, FiPackage, FiClock, FiTrendingUp, FiTrash2, FiEdit2,
  FiCheckCircle, FiXCircle, FiPrinter, FiInfo, FiBluetooth } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { inventoryAPI, menuAPI } from '../../services/api';

const TABS = ['Ingredients', 'Prepared Food', 'Discounts', 'Recipes', 'Alerts'];
const UNITS = ['pieces', 'kg', 'g', 'L', 'ml', 'portions', 'bottles', 'boxes', 'bags'];
const CATEGORIES = ['meat', 'vegetables', 'dairy', 'bakery', 'spices', 'beverages', 'seafood', 'frozen', 'other'];

const categoryColors = {
  meat: 'bg-red-100 text-red-700', vegetables: 'bg-green-100 text-green-700',
  dairy: 'bg-yellow-100 text-yellow-700', bakery: 'bg-orange-100 text-orange-700',
  spices: 'bg-purple-100 text-purple-700', beverages: 'bg-blue-100 text-blue-700',
  seafood: 'bg-cyan-100 text-cyan-700', frozen: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

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
    .warning { font-size:10px; text-align:center; margin-top:8px; padding:3px; background:#fff3cd; border:1px solid #ffc107; }
    @media print { body { border:none; } }
  </style></head><body>
  <div class="name">${item.name}</div>
  <div class="batch">${item.batch_number || 'NO BATCH'}</div>
  <div class="row"><span class="label">Prepared:</span><span>${prep.toLocaleDateString()} ${prep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span class="label">Expires:</span><span>${exp.toLocaleDateString()} ${exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span class="label">Quantity:</span><span>${item.quantity} portions</span></div>
  ${item.status === 'offer' ? `<div class="warning">⚠ OFFER - ${item.offer_discount}% OFF</div>` : ''}
  <script>setTimeout(() => { window.print(); window.close(); }, 300);</script>
  </body></html>`);
  w.document.close();
}

async function printLabelBluetooth(item) {
  if (!navigator.bluetooth) {
    toast.error('Web Bluetooth not supported — using browser print instead');
    printLabelBrowser(item);
    return;
  }
  const toastId = toast.loading('Searching for Bluetooth printer...');
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ],
    });
    toast.dismiss(toastId);
    toast.success(`Found: ${device.name || 'printer'}. Opening print dialog...`);
    // After connecting, fall through to browser print for the actual label
    // (protocol varies per printer model — browser handles final rendering)
    setTimeout(() => printLabelBrowser(item), 500);
  } catch (e) {
    toast.dismiss(toastId);
    if (e.name !== 'NotFoundError') {
      printLabelBrowser(item);
    }
  }
}

export default function InventoryManagement() {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurant_id;

  const [activeTab, setActiveTab] = useState('Ingredients');
  const [ingredients, setIngredients] = useState([]);
  const [prepared, setPrepared] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [], expired: [] });
  const [loading, setLoading] = useState(false);

  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showPreparedModal, setShowPreparedModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [offerTarget, setOfferTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [ingRes, prepRes, recRes, alertRes, menuRes] = await Promise.all([
        inventoryAPI.listItems(restaurantId),
        inventoryAPI.listPrepared(restaurantId),
        inventoryAPI.listRecipes(restaurantId),
        inventoryAPI.getAlerts(restaurantId),
        menuAPI.list(restaurantId),
      ]);
      setIngredients(ingRes.data);
      setPrepared(prepRes.data);
      setRecipes(recRes.data);
      setAlerts(alertRes.data);
      setMenuItems(menuRes.data?.items || menuRes.data || []);
    } catch (e) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalAlerts = alerts.low_stock.length + alerts.expiring_soon.length + alerts.expired.length;

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-600 mt-1">Track ingredients, prepared food and stock levels</p>
          </div>
          {totalAlerts > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              <FiAlertTriangle />
              {totalAlerts} alert{totalAlerts > 1 ? 's' : ''} need attention
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ingredients', value: ingredients.length, icon: FiPackage, color: 'text-blue-600 bg-blue-50' },
            { label: 'Prepared Items', value: prepared.filter(p => p.status === 'active').length, icon: FiCheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Low Stock', value: alerts.low_stock.length, icon: FiAlertTriangle, color: 'text-orange-600 bg-orange-50' },
            { label: 'Expiring Soon', value: alerts.expiring_soon.length, icon: FiClock, color: 'text-red-600 bg-red-50' },
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

        {/* Tabs */}
        <div className="bg-white rounded-xl border">
          <div className="flex border-b">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'Alerts' && totalAlerts > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalAlerts}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : (
              <>
                {activeTab === 'Ingredients' && (
                  <IngredientsTab
                    items={ingredients}
                    onAdd={() => { setEditingItem(null); setShowIngredientModal(true); }}
                    onEdit={(item) => { setEditingItem(item); setShowIngredientModal(true); }}
                    onAdjust={(item) => { setAdjustTarget(item); setShowAdjustModal(true); }}
                    onDelete={async (id) => {
                      if (!confirm('Delete this ingredient?')) return;
                      try {
                        await inventoryAPI.deleteItem(restaurantId, id);
                        fetchAll(); toast.success('Deleted');
                      } catch { toast.error('Failed to delete'); }
                    }}
                  />
                )}
                {activeTab === 'Prepared Food' && (
                  <PreparedFoodTab
                    items={prepared}
                    onAdd={() => { setEditingItem(null); setShowPreparedModal(true); }}
                    onEdit={(item) => { setEditingItem(item); setShowPreparedModal(true); }}
                    onOffer={(item) => { setOfferTarget(item); setShowOfferModal(true); }}
                    onPrintLabel={(item) => printLabelBrowser(item)}
                    onPrintBluetooth={(item) => printLabelBluetooth(item)}
                    onDelete={async (id) => {
                      if (!confirm('Delete this item?')) return;
                      try {
                        await inventoryAPI.deletePrepared(restaurantId, id);
                        fetchAll(); toast.success('Deleted');
                      } catch { toast.error('Failed to delete'); }
                    }}
                  />
                )}
                {activeTab === 'Discounts' && (
                  <DiscountsTab
                    items={prepared}
                    onOffer={(item) => { setOfferTarget(item); setShowOfferModal(true); }}
                    onRefresh={fetchAll}
                  />
                )}
                {activeTab === 'Recipes' && (
                  <RecipesTab
                    recipes={recipes}
                    menuItems={menuItems}
                    ingredients={ingredients}
                    onAdd={() => setShowRecipeModal(true)}
                    onDelete={async (id) => {
                      if (!confirm('Remove this recipe ingredient?')) return;
                      try {
                        await inventoryAPI.deleteRecipe(restaurantId, id);
                        fetchAll(); toast.success('Removed');
                      } catch { toast.error('Failed to remove'); }
                    }}
                  />
                )}
                {activeTab === 'Alerts' && (
                  <AlertsTab alerts={alerts} onRefresh={fetchAll} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showIngredientModal && (
          <IngredientModal
            item={editingItem}
            onClose={() => setShowIngredientModal(false)}
            onSave={async (data) => {
              try {
                if (editingItem) {
                  await inventoryAPI.updateItem(restaurantId, editingItem.id, data);
                } else {
                  await inventoryAPI.createItem(restaurantId, data);
                }
                setShowIngredientModal(false); fetchAll();
                toast.success(editingItem ? 'Updated' : 'Ingredient added');
              } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to save');
              }
            }}
          />
        )}
        {showPreparedModal && (
          <PreparedModal
            item={editingItem}
            menuItems={menuItems}
            onClose={() => setShowPreparedModal(false)}
            onSave={async (data) => {
              try {
                if (editingItem) {
                  await inventoryAPI.updatePrepared(restaurantId, editingItem.id, data);
                } else {
                  await inventoryAPI.createPrepared(restaurantId, data);
                }
                setShowPreparedModal(false); fetchAll();
                toast.success(editingItem ? 'Updated' : 'Prepared food added');
              } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to save');
              }
            }}
          />
        )}
        {showRecipeModal && (
          <RecipeModal
            menuItems={menuItems}
            ingredients={ingredients}
            onClose={() => setShowRecipeModal(false)}
            onSave={async (data) => {
              try {
                await inventoryAPI.createRecipe(restaurantId, data);
                setShowRecipeModal(false); fetchAll();
                toast.success('Recipe ingredient added');
              } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to save');
              }
            }}
          />
        )}
        {showAdjustModal && adjustTarget && (
          <AdjustModal
            item={adjustTarget}
            onClose={() => setShowAdjustModal(false)}
            onSave={async (data) => {
              try {
                await inventoryAPI.adjustStock(restaurantId, adjustTarget.id, data);
                setShowAdjustModal(false); fetchAll();
                toast.success('Stock adjusted');
              } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to adjust');
              }
            }}
          />
        )}
        {showOfferModal && offerTarget && (
          <OfferModal
            item={offerTarget}
            onClose={() => setShowOfferModal(false)}
            onSave={async ({ discount, offerPrice }) => {
              try {
                await inventoryAPI.convertToOffer(restaurantId, offerTarget.id, discount || null, offerPrice || null);
                setShowOfferModal(false); fetchAll();
                toast.success(`Offer applied${discount ? `: ${discount}% off` : ''}${offerPrice ? ` @ £${offerPrice}` : ''}`);
              } catch (e) {
                toast.error(e?.response?.data?.detail || 'Failed to apply offer');
              }
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Ingredients Tab ──────────────────────────────────────────────────────────
function IngredientsTab({ items, onAdd, onEdit, onAdjust, onDelete }) {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} ingredient{items.length !== 1 ? 's' : ''}</p>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus size={14} /> Add Ingredient
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={FiPackage} text="No ingredients yet. Add your first ingredient." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Stock</th>
                <th className="pb-2 font-medium">Min Level</th>
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow = item.min_threshold > 0 && item.quantity <= item.min_threshold;
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[item.category] || 'bg-gray-100 text-gray-700'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.quantity} {item.unit}
                      </span>
                      {isLow && <span className="ml-1 text-xs text-red-500">⚠ Low</span>}
                    </td>
                    <td className="py-3 text-gray-500">{item.min_threshold} {item.unit}</td>
                    <td className="py-3 text-gray-500">{item.supplier || '—'}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => onAdjust(item)} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">± Stock</button>
                        <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-blue-600"><FiEdit2 size={15} /></button>
                        <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-600"><FiTrash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Prepared Food Tab ────────────────────────────────────────────────────────
function PreparedFoodTab({ items, onAdd, onEdit, onOffer, onPrintLabel, onPrintBluetooth, onDelete }) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    offer: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
    consumed: 'bg-gray-100 text-gray-500',
  };
  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus size={14} /> Add Prepared Food
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={FiClock} text="No prepared food tracked yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Name / Batch</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Expires</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const now = new Date();
                const exp = new Date(item.expires_at);
                const hoursLeft = (exp - now) / 3600000;
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.batch_number && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{item.batch_number}</span>
                      )}
                    </td>
                    <td className="py-3">{item.quantity} portions</td>
                    <td className="py-3">
                      <span className={hoursLeft < 4 && item.status === 'active' ? 'text-red-600 font-semibold' : hoursLeft < 24 && item.status === 'active' ? 'text-orange-600' : 'text-gray-700'}>
                        {exp.toLocaleDateString()} {exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {hoursLeft > 0 && hoursLeft < 24 && <span className="ml-1 text-xs">({Math.round(hoursLeft)}h left)</span>}
                        {hoursLeft <= 0 && <span className="ml-1 text-xs text-red-500">(expired)</span>}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                        {item.status}{item.status === 'offer' && item.offer_discount ? ` -${item.offer_discount}%` : ''}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {item.status === 'active' && (
                          <button onClick={() => onOffer(item)} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100 border border-orange-200">
                            % Offer
                          </button>
                        )}
                        <button onClick={() => onPrintLabel(item)} title="Print label" className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100 border border-gray-200 flex items-center gap-1">
                          <FiPrinter size={11} /> Label
                        </button>
                        <button onClick={() => onPrintBluetooth(item)} title="Print via Bluetooth" className="text-xs bg-blue-50 text-blue-700 px-1.5 py-1 rounded hover:bg-blue-100 border border-blue-200">
                          <FiBluetooth size={11} />
                        </button>
                        <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-blue-600 p-1"><FiEdit2 size={14} /></button>
                        <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-600 p-1"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Discounts Tab ───────────────────────────────────────────────────────────
function DiscountsTab({ items, onOffer, onRefresh }) {
  const now = new Date();

  const expiringSoon = items.filter(i =>
    i.status === 'active' && new Date(i.expires_at) > now &&
    (new Date(i.expires_at) - now) / 3600000 <= 48
  );
  const activeOffers = items.filter(i => i.status === 'offer');
  const expired = items.filter(i => i.status === 'expired');

  const hoursLeft = (exp) => Math.max(0, (new Date(exp) - now) / 3600000);

  return (
    <div className="space-y-6">
      {/* Expiring Soon - needs discount */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">⏰ Expiring Soon — Apply Offer</h3>
          <span className="text-xs text-gray-500">Items expiring within 48h</span>
        </div>
        {expiringSoon.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No items expiring within 48h</p>
        ) : (
          <div className="space-y-2">
            {expiringSoon.map(item => {
              const h = hoursLeft(item.expires_at);
              return (
                <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg border ${h < 8 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.name}</span>
                      {item.batch_number && <span className="text-xs font-mono text-gray-400">{item.batch_number}</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {item.quantity} portions · Expires in <strong className={h < 8 ? 'text-red-600' : 'text-orange-600'}>{Math.round(h)}h</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => onOffer(item)}
                    className="ml-4 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 whitespace-nowrap"
                  >
                    Set Offer
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Offers */}
      {activeOffers.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">🏷️ Active Offers</h3>
          <div className="space-y-2">
            {activeOffers.map(item => {
              const h = hoursLeft(item.expires_at);
              return (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{item.name}</span>
                      {item.batch_number && <span className="text-xs font-mono text-gray-400">{item.batch_number}</span>}
                      {item.offer_discount && (
                        <span className="text-sm font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                          -{item.offer_discount}% OFF
                        </span>
                      )}
                      {item.offer_price != null && (
                        <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          £{item.offer_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {item.quantity} portions · {h > 0 ? `${Math.round(h)}h left` : 'Expired'}
                    </div>
                  </div>
                  <button
                    onClick={() => onOffer(item)}
                    className="ml-4 px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                  >
                    Edit Offer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">❌ Expired Items</h3>
          <div className="space-y-2">
            {expired.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200 opacity-70">
                <div>
                  <span className="font-medium text-gray-700">{item.name}</span>
                  {item.batch_number && <span className="ml-2 text-xs font-mono text-gray-400">{item.batch_number}</span>}
                  <div className="text-sm text-gray-500">{item.quantity} portions · expired {new Date(item.expires_at).toLocaleDateString()}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">Expired</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiringSoon.length === 0 && onOffer.length === 0 && expired.length === 0 && (
        <EmptyState icon={FiCheckCircle} text="No discount activity. All prepared food is fresh." />
      )}
    </div>
  );
}

// ─── Recipes Tab ─────────────────────────────────────────────────────────────
function RecipesTab({ recipes, menuItems, ingredients, onAdd, onDelete }) {
  const menuById = Object.fromEntries(menuItems.map(m => [m.id, m]));
  const ingById = Object.fromEntries(ingredients.map(i => [i.id, i]));
  const grouped = recipes.reduce((acc, r) => {
    if (!acc[r.menu_item_id]) acc[r.menu_item_id] = [];
    acc[r.menu_item_id].push(r);
    return acc;
  }, {});

  return (
    <div>
      {/* Explanation banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <FiInfo size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">What is the Recipes tab?</p>
          <p>This links each <strong>menu item</strong> to the <strong>ingredients it uses</strong>. For example: "Chicken Burger" uses 150g chicken patty + 1 bun + 20g sauce.</p>
          <p className="mt-1">Once linked, the <strong>Predictions</strong> feature in Analytics can calculate how much stock you need to buy — e.g. "Friday needs 30 burgers → buy 4.5kg chicken patties".</p>
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">Bill of Materials — links menu items to ingredients</p>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus size={14} /> Link Ingredient to Menu Item
        </button>
      </div>
      {recipes.length === 0 ? (
        <EmptyState icon={FiTrendingUp} text="No recipes defined. Link menu items to ingredients to enable stock predictions." />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([menuItemId, items]) => {
            const mi = menuById[menuItemId];
            return (
              <div key={menuItemId} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-medium text-gray-800 text-sm">
                  📋 {mi?.name || 'Unknown menu item'}
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(r => {
                      const ing = ingById[r.inventory_item_id];
                      return (
                        <tr key={r.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">{ing?.name || r.inventory_item_id}</td>
                          <td className="px-4 py-2 text-gray-600">{r.quantity_required} {r.unit}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[ing?.category] || 'bg-gray-100 text-gray-600'}`}>
                              {ing?.category || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => onDelete(r.id)} className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────
function AlertsTab({ alerts }) {
  return (
    <div className="space-y-6">
      {alerts.low_stock.length > 0 && (
        <Section title="⚠️ Low Stock">
          {alerts.low_stock.map(i => (
            <AlertRow key={i.id} text={i.name} sub={`${i.quantity} ${i.unit} remaining (min: ${i.min_threshold} ${i.unit})`} color="orange" />
          ))}
        </Section>
      )}
      {alerts.expiring_soon.length > 0 && (
        <Section title="🕐 Expiring Within 24h">
          {alerts.expiring_soon.map(i => (
            <AlertRow key={i.id} text={i.name} sub={`${i.quantity} portions — ${i.hours_left}h left`} color="yellow" />
          ))}
        </Section>
      )}
      {alerts.expired.length > 0 && (
        <Section title="❌ Expired">
          {alerts.expired.map(i => (
            <AlertRow key={i.id} text={i.name} sub={`${i.quantity} portions — expired ${new Date(i.expired_at || i.expires_at).toLocaleString()}`} color="red" />
          ))}
        </Section>
      )}
      {alerts.low_stock.length === 0 && alerts.expiring_soon.length === 0 && alerts.expired.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FiCheckCircle size={40} className="mx-auto mb-2 text-green-400" />
          <p>All good! No alerts at this time.</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function AlertRow({ text, sub, color }) {
  const colors = { orange: 'bg-orange-50 border-orange-200 text-orange-800', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800', red: 'bg-red-50 border-red-200 text-red-800' };
  return (
    <div className={`flex justify-between items-center px-4 py-2 rounded-lg border ${colors[color]}`}>
      <span className="font-medium">{text}</span>
      <span className="text-sm opacity-80">{sub}</span>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function IngredientModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'other',
    quantity: item?.quantity ?? 0,
    unit: item?.unit || 'pieces',
    min_threshold: item?.min_threshold ?? 0,
    cost_per_unit: item?.cost_per_unit || '',
    supplier: item?.supplier || '',
    notes: item?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    onSave(form);
  };

  return (
    <Modal title={item ? 'Edit Ingredient' : 'Add Ingredient'} onClose={onClose} onSave={handleSave}>
      <Field label="Name *"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chicken Breast" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Unit">
          <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current Quantity"><input type="number" min="0" step="0.01" className="input" value={form.quantity} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Min Threshold (alert level)"><input type="number" min="0" step="0.01" className="input" value={form.min_threshold} onChange={e => set('min_threshold', parseFloat(e.target.value) || 0)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost per unit"><input type="number" min="0" step="0.01" className="input" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} placeholder="0.00" /></Field>
        <Field label="Supplier"><input className="input" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" /></Field>
      </div>
      <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </Modal>
  );
}

function PreparedModal({ item, menuItems, onClose, onSave }) {
  const defaultExpiry = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);
  const [form, setForm] = useState({
    name: item?.name || '',
    menu_item_id: item?.menu_item_id || '',
    quantity: item?.quantity || 1,
    batch_number: item?.batch_number || generateBatchNo(),
    expires_at: item?.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : defaultExpiry,
    notes: item?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.expires_at) { toast.error('Expiry date is required'); return; }
    const payload = {
      ...form,
      menu_item_id: form.menu_item_id || null,
      quantity: parseInt(form.quantity) || 1,
      expires_at: new Date(form.expires_at).toISOString(),
    };
    onSave(payload);
  };

  return (
    <Modal title={item ? 'Edit Prepared Food' : 'Add Prepared Food'} onClose={onClose} onSave={handleSave}>
      <Field label="Name *"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Grilled Chicken (batch)" /></Field>
      <Field label="Linked Menu Item (optional)">
        <select className="input" value={form.menu_item_id} onChange={e => set('menu_item_id', e.target.value)}>
          <option value="">— Not linked to a menu item —</option>
          {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity (portions)"><input type="number" min="1" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></Field>
        <Field label="Batch #">
          <div className="flex gap-1">
            <input className="input flex-1 font-mono text-sm" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} />
            <button type="button" onClick={() => set('batch_number', generateBatchNo())} className="px-2 text-xs bg-gray-100 border rounded hover:bg-gray-200 text-gray-600 whitespace-nowrap">
              ↺ New
            </button>
          </div>
        </Field>
      </div>
      <Field label="Expires At *"><input type="datetime-local" className="input" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} /></Field>
      <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </Modal>
  );
}

function OfferModal({ item, onClose, onSave }) {
  const [discount, setDiscount] = useState(item.offer_discount || 20);
  const [offerPrice, setOfferPrice] = useState(item.offer_price != null ? String(item.offer_price) : '');
  const [mode, setMode] = useState(item.offer_price != null ? 'price' : 'percent');
  const exp = new Date(item.expires_at);
  const now = new Date();
  const hoursLeft = Math.max(0, (exp - now) / 3600000);

  const handleSave = () => {
    if (mode === 'percent') {
      if (!discount || discount < 1 || discount > 99) { toast.error('Discount must be 1–99%'); return; }
      onSave({ discount, offerPrice: null });
    } else {
      const price = parseFloat(offerPrice);
      if (!offerPrice || isNaN(price) || price < 0) { toast.error('Enter a valid offer price'); return; }
      onSave({ discount: null, offerPrice: price });
    }
  };

  return (
    <Modal title="Set Offer / Discount" onClose={onClose} onSave={handleSave}>
      {/* Item info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="font-semibold text-gray-900">{item.name}</p>
        {item.batch_number && <p className="text-xs text-gray-500 font-mono">{item.batch_number}</p>}
        <p className="text-sm text-gray-600 mt-1">{item.quantity} portions remaining</p>
      </div>

      {/* Expiry warning */}
      <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${hoursLeft < 4 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
        <FiClock size={14} />
        <span>Expires {exp.toLocaleDateString()} {exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {hoursLeft > 0 && ` · ${Math.round(hoursLeft)}h left`}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMode('percent')}
          className={`py-2 rounded-lg text-sm font-medium border ${mode === 'percent' ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          % Discount
        </button>
        <button onClick={() => setMode('price')}
          className={`py-2 rounded-lg text-sm font-medium border ${mode === 'price' ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          £ Fixed Price
        </button>
      </div>

      {mode === 'percent' ? (
        <>
          <Field label="Discount %">
            <div className="flex items-center gap-3">
              <input type="range" min="5" max="80" step="5" value={discount}
                onChange={e => setDiscount(parseInt(e.target.value))} className="flex-1" />
              <div className="flex items-center border rounded-lg overflow-hidden">
                <input type="number" min="1" max="99" value={discount}
                  onChange={e => setDiscount(parseInt(e.target.value) || 1)}
                  className="w-14 text-center py-1.5 text-sm font-bold focus:outline-none" />
                <span className="px-2 text-sm text-gray-500 bg-gray-50">%</span>
              </div>
            </div>
          </Field>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map(d => (
              <button key={d} onClick={() => setDiscount(d)}
                className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${discount === d ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {d}% off
              </button>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{discount}% OFF</p>
          </div>
        </>
      ) : (
        <>
          <Field label="Offer Price (£)">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <span className="px-3 text-gray-500 bg-gray-50 border-r py-2">£</span>
              <input type="number" min="0" step="0.01" value={offerPrice}
                onChange={e => setOfferPrice(e.target.value)}
                placeholder="e.g. 3.99"
                className="flex-1 px-3 py-2 text-sm font-bold focus:outline-none" />
            </div>
          </Field>
          {offerPrice && !isNaN(parseFloat(offerPrice)) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 mb-1">Offer price set to</p>
              <p className="text-2xl font-bold text-green-700">£{parseFloat(offerPrice).toFixed(2)}</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function RecipeModal({ menuItems, ingredients, onClose, onSave }) {
  const [form, setForm] = useState({ menu_item_id: '', inventory_item_id: '', quantity_required: 1, unit: 'pieces' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selIng = ingredients.find(i => i.id === form.inventory_item_id);

  const handleSave = () => {
    if (!form.menu_item_id) { toast.error('Select a menu item'); return; }
    if (!form.inventory_item_id) { toast.error('Select an ingredient'); return; }
    if (!form.quantity_required || form.quantity_required <= 0) { toast.error('Enter a valid quantity'); return; }
    onSave(form);
  };

  return (
    <Modal title="Link Ingredient to Menu Item" onClose={onClose} onSave={handleSave}>
      <Field label="Menu Item *">
        <select className="input" value={form.menu_item_id} onChange={e => set('menu_item_id', e.target.value)}>
          <option value="">Select menu item...</option>
          {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Ingredient *">
        <select className="input" value={form.inventory_item_id} onChange={e => {
          set('inventory_item_id', e.target.value);
          const ing = ingredients.find(i => i.id === e.target.value);
          if (ing) set('unit', ing.unit);
        }}>
          <option value="">Select ingredient...</option>
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qty needed per dish *"><input type="number" step="0.01" min="0.01" className="input" value={form.quantity_required} onChange={e => set('quantity_required', parseFloat(e.target.value))} /></Field>
        <Field label="Unit"><select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      {selIng && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">Current stock: <strong>{selIng.quantity} {selIng.unit}</strong></p>}
    </Modal>
  );
}

function AdjustModal({ item, onClose, onSave }) {
  const [delta, setDelta] = useState('');
  const [type, setType] = useState('stock_in');
  const [reason, setReason] = useState('');
  const numDelta = parseFloat(delta) || 0;
  const newQty = type === 'stock_in' ? item.quantity + numDelta : Math.max(0, item.quantity - numDelta);

  return (
    <Modal title={`Adjust Stock — ${item.name}`} onClose={onClose} onSave={() => {
      if (!numDelta || numDelta <= 0) { toast.error('Enter a valid amount'); return; }
      onSave({ delta: type === 'stock_in' ? numDelta : -numDelta, movement_type: type, reason });
    }}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => setType('stock_in')} className={`py-2 rounded-lg text-sm font-medium border ${type === 'stock_in' ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-300'}`}>+ Add Stock</button>
        <button onClick={() => setType('waste')} className={`py-2 rounded-lg text-sm font-medium border ${type === 'waste' ? 'bg-red-600 text-white border-red-600' : 'text-gray-600 border-gray-300'}`}>− Remove / Waste</button>
      </div>
      <Field label={`Amount (${item.unit})`}><input type="number" step="0.01" min="0.01" className="input" value={delta} onChange={e => setDelta(e.target.value)} placeholder="0" /></Field>
      <Field label="Reason (optional)"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. delivery received, spoilage..." /></Field>
      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
        Current: <strong>{item.quantity} {item.unit}</strong>
        <span className="mx-2">→</span>
        New: <strong className={newQty < item.quantity ? 'text-red-600' : 'text-green-600'}>{newQty.toFixed(2)} {item.unit}</strong>
      </div>
    </Modal>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiXCircle size={20} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>;
}
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Icon size={40} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
