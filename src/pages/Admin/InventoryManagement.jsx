import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiAlertTriangle, FiPackage, FiClock, FiTrendingUp, FiTrash2, FiEdit2, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { restaurantApi } from '../../services/api';

const TABS = ['Ingredients', 'Prepared Food', 'Recipes', 'Alerts'];

const UNITS = ['pieces', 'kg', 'g', 'L', 'ml', 'portions', 'bottles', 'boxes', 'bags'];
const CATEGORIES = ['meat', 'vegetables', 'dairy', 'bakery', 'spices', 'beverages', 'seafood', 'frozen', 'other'];

const categoryColors = {
  meat: 'bg-red-100 text-red-700',
  vegetables: 'bg-green-100 text-green-700',
  dairy: 'bg-yellow-100 text-yellow-700',
  bakery: 'bg-orange-100 text-orange-700',
  spices: 'bg-purple-100 text-purple-700',
  beverages: 'bg-blue-100 text-blue-700',
  seafood: 'bg-cyan-100 text-cyan-700',
  frozen: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

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

  // Modals
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showPreparedModal, setShowPreparedModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);

  const api = (path, opts = {}) =>
    restaurantApi({ url: `/api/v1/restaurants/${restaurantId}${path}`, ...opts });

  const fetchAll = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [ingRes, prepRes, recRes, alertRes, menuRes] = await Promise.all([
        api('/inventory/items'),
        api('/inventory/prepared'),
        api('/inventory/recipes'),
        api('/inventory/alerts'),
        restaurantApi.get(`/api/v1/restaurants/${restaurantId}/menu-items`),
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Track ingredients, prepared food and stock levels</p>
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
              } ${tab === 'Alerts' && totalAlerts > 0 ? 'relative' : ''}`}
            >
              {tab}
              {tab === 'Alerts' && totalAlerts > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalAlerts}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
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
                    await api(`/inventory/items/${id}`, { method: 'DELETE' });
                    fetchAll(); toast.success('Deleted');
                  }}
                />
              )}
              {activeTab === 'Prepared Food' && (
                <PreparedFoodTab
                  items={prepared}
                  onAdd={() => { setEditingItem(null); setShowPreparedModal(true); }}
                  onEdit={(item) => { setEditingItem(item); setShowPreparedModal(true); }}
                  onOffer={async (item) => {
                    const discount = prompt('Enter discount % (1-99):', '20');
                    if (!discount) return;
                    await api(`/inventory/prepared/${item.id}/offer?discount=${discount}`, { method: 'POST' });
                    fetchAll(); toast.success(`Offer applied: ${discount}% off`);
                  }}
                  onDelete={async (id) => {
                    if (!confirm('Delete this item?')) return;
                    await api(`/inventory/prepared/${id}`, { method: 'DELETE' });
                    fetchAll(); toast.success('Deleted');
                  }}
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
                    await api(`/inventory/recipes/${id}`, { method: 'DELETE' });
                    fetchAll(); toast.success('Removed');
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
            if (editingItem) {
              await api(`/inventory/items/${editingItem.id}`, { method: 'PATCH', data });
            } else {
              await api('/inventory/items', { method: 'POST', data });
            }
            setShowIngredientModal(false); fetchAll();
            toast.success(editingItem ? 'Updated' : 'Ingredient added');
          }}
        />
      )}
      {showPreparedModal && (
        <PreparedModal
          item={editingItem}
          menuItems={menuItems}
          onClose={() => setShowPreparedModal(false)}
          onSave={async (data) => {
            if (editingItem) {
              await api(`/inventory/prepared/${editingItem.id}`, { method: 'PATCH', data });
            } else {
              await api('/inventory/prepared', { method: 'POST', data });
            }
            setShowPreparedModal(false); fetchAll();
            toast.success(editingItem ? 'Updated' : 'Prepared food added');
          }}
        />
      )}
      {showRecipeModal && (
        <RecipeModal
          menuItems={menuItems}
          ingredients={ingredients}
          onClose={() => setShowRecipeModal(false)}
          onSave={async (data) => {
            await api('/inventory/recipes', { method: 'POST', data });
            setShowRecipeModal(false); fetchAll();
            toast.success('Recipe ingredient added');
          }}
        />
      )}
      {showAdjustModal && adjustTarget && (
        <AdjustModal
          item={adjustTarget}
          onClose={() => setShowAdjustModal(false)}
          onSave={async (data) => {
            await api(`/inventory/items/${adjustTarget.id}/adjust`, { method: 'POST', data });
            setShowAdjustModal(false); fetchAll();
            toast.success('Stock adjusted');
          }}
        />
      )}
    </div>
  );
}

// ─── Ingredients Tab ──────────────────────────────────────────────────────────
function IngredientsTab({ items, onAdd, onEdit, onAdjust, onDelete }) {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} ingredient{items.length !== 1 ? 's' : ''}</p>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus /> Add Ingredient
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
function PreparedFoodTab({ items, onAdd, onEdit, onOffer, onDelete }) {
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
          <FiPlus /> Add Prepared Food
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={FiClock} text="No prepared food tracked yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Prepared</th>
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
                    <td className="py-3 font-medium text-gray-900">{item.name}
                      {item.batch_number && <span className="ml-1 text-xs text-gray-400">#{item.batch_number}</span>}
                    </td>
                    <td className="py-3">{item.quantity} portions</td>
                    <td className="py-3 text-gray-500">{new Date(item.prepared_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={hoursLeft < 4 && item.status === 'active' ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {exp.toLocaleDateString()} {exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {hoursLeft > 0 && hoursLeft < 24 && <span className="ml-1 text-xs">({Math.round(hoursLeft)}h left)</span>}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                        {item.status}{item.status === 'offer' && item.offer_discount ? ` -${item.offer_discount}%` : ''}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {item.status === 'active' && (
                          <button onClick={() => onOffer(item)} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded hover:bg-orange-100">Offer</button>
                        )}
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

// ─── Recipes Tab ─────────────────────────────────────────────────────────────
function RecipesTab({ recipes, menuItems, ingredients, onAdd, onDelete }) {
  const menuById = Object.fromEntries(menuItems.map(m => [m.id, m]));
  const ingById = Object.fromEntries(ingredients.map(i => [i.id, i]));

  // Group by menu item
  const grouped = recipes.reduce((acc, r) => {
    const mid = r.menu_item_id;
    if (!acc[mid]) acc[mid] = [];
    acc[mid].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-gray-500">Bill of Materials — links menu items to ingredients</p>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <FiPlus /> Add Recipe Link
        </button>
      </div>
      {recipes.length === 0 ? (
        <EmptyState icon={FiTrendingUp} text="No recipes defined yet. Link menu items to ingredients to enable stock predictions." />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([menuItemId, items]) => {
            const mi = menuById[menuItemId];
            return (
              <div key={menuItemId} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 font-medium text-gray-800 text-sm">
                  📋 {mi?.name || 'Unknown item'}
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
function AlertsTab({ alerts, onRefresh }) {
  return (
    <div className="space-y-6">
      {alerts.low_stock.length > 0 && (
        <Section title="⚠️ Low Stock" color="orange">
          {alerts.low_stock.map(i => (
            <AlertRow key={i.id} text={`${i.name}`} sub={`${i.quantity} ${i.unit} remaining (min: ${i.min_threshold} ${i.unit})`} color="orange" />
          ))}
        </Section>
      )}
      {alerts.expiring_soon.length > 0 && (
        <Section title="🕐 Expiring Within 24h" color="yellow">
          {alerts.expiring_soon.map(i => (
            <AlertRow key={i.id} text={i.name} sub={`${i.quantity} portions — ${i.hours_left}h left`} color="yellow" />
          ))}
        </Section>
      )}
      {alerts.expired.length > 0 && (
        <Section title="❌ Expired" color="red">
          {alerts.expired.map(i => (
            <AlertRow key={i.id} text={i.name} sub={`${i.quantity} portions — expired ${new Date(i.expired_at).toLocaleString()}`} color="red" />
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

  return (
    <Modal title={item ? 'Edit Ingredient' : 'Add Ingredient'} onClose={onClose} onSave={() => onSave(form)}>
      <Field label="Name"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
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
        <Field label="Current Quantity"><input type="number" className="input" value={form.quantity} onChange={e => set('quantity', parseFloat(e.target.value))} /></Field>
        <Field label="Min Threshold (alert level)"><input type="number" className="input" value={form.min_threshold} onChange={e => set('min_threshold', parseFloat(e.target.value))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost per unit"><input type="number" className="input" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} /></Field>
        <Field label="Supplier"><input className="input" value={form.supplier} onChange={e => set('supplier', e.target.value)} /></Field>
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
    batch_number: item?.batch_number || '',
    expires_at: item ? item.expires_at.slice(0, 16) : defaultExpiry,
    notes: item?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={item ? 'Edit Prepared Food' : 'Add Prepared Food'} onClose={onClose} onSave={() => onSave({ ...form, expires_at: new Date(form.expires_at).toISOString() })}>
      <Field label="Name"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="Linked Menu Item (optional)">
        <select className="input" value={form.menu_item_id} onChange={e => set('menu_item_id', e.target.value)}>
          <option value="">— Not linked —</option>
          {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity (portions)"><input type="number" className="input" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value))} /></Field>
        <Field label="Batch #"><input className="input" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} /></Field>
      </div>
      <Field label="Expires At"><input type="datetime-local" className="input" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} /></Field>
      <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
    </Modal>
  );
}

function RecipeModal({ menuItems, ingredients, onClose, onSave }) {
  const [form, setForm] = useState({ menu_item_id: '', inventory_item_id: '', quantity_required: 1, unit: 'pieces' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selIng = ingredients.find(i => i.id === form.inventory_item_id);

  return (
    <Modal title="Add Recipe Ingredient" onClose={onClose} onSave={() => onSave(form)}>
      <Field label="Menu Item">
        <select className="input" value={form.menu_item_id} onChange={e => set('menu_item_id', e.target.value)}>
          <option value="">Select menu item...</option>
          {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Ingredient">
        <select className="input" value={form.inventory_item_id} onChange={e => { set('inventory_item_id', e.target.value); const ing = ingredients.find(i => i.id === e.target.value); if (ing) set('unit', ing.unit); }}>
          <option value="">Select ingredient...</option>
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity needed per dish"><input type="number" step="0.01" className="input" value={form.quantity_required} onChange={e => set('quantity_required', parseFloat(e.target.value))} /></Field>
        <Field label="Unit"><select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      {selIng && <p className="text-xs text-gray-500 mt-1">Current stock: {selIng.quantity} {selIng.unit}</p>}
    </Modal>
  );
}

function AdjustModal({ item, onClose, onSave }) {
  const [delta, setDelta] = useState(0);
  const [type, setType] = useState('stock_in');
  const [reason, setReason] = useState('');

  return (
    <Modal title={`Adjust Stock — ${item.name}`} onClose={onClose} onSave={() => onSave({ delta: type === 'stock_in' ? Math.abs(delta) : -Math.abs(delta), movement_type: type, reason })}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => setType('stock_in')} className={`py-2 rounded-lg text-sm font-medium border ${type === 'stock_in' ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-300'}`}>+ Add Stock</button>
        <button onClick={() => setType('waste')} className={`py-2 rounded-lg text-sm font-medium border ${type === 'waste' ? 'bg-red-600 text-white border-red-600' : 'text-gray-600 border-gray-300'}`}>− Remove / Waste</button>
      </div>
      <Field label={`Amount (${item.unit})`}><input type="number" step="0.01" className="input" value={delta} onChange={e => setDelta(parseFloat(e.target.value))} /></Field>
      <Field label="Reason (optional)"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. delivery received, spoilage..." /></Field>
      <p className="text-sm text-gray-500 mt-1">Current: <strong>{item.quantity} {item.unit}</strong> → New: <strong>{Math.max(0, item.quantity + (type === 'stock_in' ? Math.abs(delta) : -Math.abs(delta)))} {item.unit}</strong></p>
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
