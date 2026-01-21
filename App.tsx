
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClubRole, RideRole, SubscriptionType, type User, type Ride, type RideParticipant, type ClubSettings, type Achievement, type AchievementCategory } from './types';
import { api } from './services/api';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Spinner } from './components/ui/Spinner';

// --- UTILS ---

const BRAND_COLOR = '#a4e636';
const LEGACY_RED = '#e11d47';

const isSubscriptionActive = (user: User): boolean => {
  if (user.subscriptionType === SubscriptionType.LIFETIME) return true;
  if (!user.subscriptionExpiry) return false;
  return new Date(user.subscriptionExpiry) > new Date();
};

const TERRAIN_OPTIONS = ['Highway', 'Broken Roads', 'Off-roads', 'Mountains', 'Coastal', 'City'];

// --- ANIMATIONS ---

const SuccessCheckmark = () => (
  <div className="flex flex-col items-center justify-center space-y-4 py-12 animate-in fade-in zoom-in duration-500">
    <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center relative overflow-hidden">
      <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="3" 
          d="M5 13l4 4L19 7" 
          className="animate-[draw-check_0.6s_ease-out_forwards]"
          style={{ strokeDasharray: 50, strokeDashoffset: 50 }}
        />
      </svg>
    </div>
    <h3 className="text-2xl font-black text-white uppercase tracking-widest font-['Bebas_Neue']">Ride Initialized</h3>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes draw-check {
        to { stroke-dashoffset: 0; }
      }
    `}} />
  </div>
);

// --- COMPONENTS ---

const ConfirmationModal: React.FC<{ 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
  confirmText?: string;
  isDestructive?: boolean;
}> = ({ title, message, onConfirm, onCancel, confirmText = "Confirm", isDestructive = false }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
    <Card className="max-w-md w-full p-8 border-neutral-800 bg-neutral-900 rounded-3xl">
      <h3 className="text-xl font-black font-['Bebas_Neue'] uppercase mb-4 text-white">{title}</h3>
      <p className="text-neutral-400 text-sm leading-relaxed mb-8">{message}</p>
      <div className="flex gap-3">
        <Button onClick={onCancel} variant="secondary" className="flex-1 py-3 text-xs uppercase tracking-widest">Abort</Button>
        <Button 
          onClick={onConfirm} 
          variant={isDestructive ? "danger" : "primary"} 
          className="flex-1 py-3 text-xs uppercase tracking-widest"
        >
          {confirmText}
        </Button>
      </div>
    </Card>
  </div>
);

const CreateRideModal: React.FC<{ user: User, onClose: () => void, onSave: () => void }> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Ride, 'id' | 'status'>>({
    title: '',
    summary: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '06:00',
    endTime: '18:00',
    durationDays: 1,
    terrainTypes: [],
    marshalId: user.id,
    mapLink: '',
    driveLink: ''
  });
  const [marshals, setMarshals] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingMarshals, setLoadingMarshals] = useState(true);

  useEffect(() => {
    api.getUsers().then(users => {
      setMarshals(users.filter(u => u.clubRole === ClubRole.MARSHAL));
    }).finally(() => setLoadingMarshals(false));
  }, []);

  const handleChange = (field: keyof Omit<Ride, 'id' | 'status'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTerrainToggle = (terrain: string) => {
    const current = formData.terrainTypes || [];
    const updated = current.includes(terrain)
      ? current.filter(t => t !== terrain)
      : [...current, terrain];
    handleChange('terrainTypes', updated);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.summary) {
      alert("Protocol Error: Title and Summary are required for mission initialization.");
      return;
    }
    setSaving(true);
    try {
      await api.createRide(formData);
      setShowSuccess(true);
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (e) {
      alert("System Overload: Failed to initialize new expedition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create a New Ride" onClose={onClose} maxWidth="max-w-5xl">
      {showSuccess ? (
        <SuccessCheckmark />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4 p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(164,230,54,0.4)]" />
              <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue'] text-lg" style={{ fontFamily: 'var(--section-header-font)' }}>Ride Information</h4>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Ride Title</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => handleChange('title', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all placeholder:text-neutral-800" 
                placeholder="e.g. Himalayan Conquest 2025"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Ride summary</label>
              <textarea 
                value={formData.summary} 
                onChange={(e) => handleChange('summary', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary h-32 resize-none transition-all placeholder:text-neutral-800 text-sm" 
                placeholder="Brief mission objective and route overview..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Google Drive Link (Sharing Images)</label>
              <input 
                type="url" 
                value={formData.driveLink || ''} 
                onChange={(e) => handleChange('driveLink', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all placeholder:text-neutral-800" 
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Tactical Notes</label>
              <textarea 
                value={formData.notes || ''} 
                onChange={(e) => handleChange('notes', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary h-24 resize-none transition-all placeholder:text-neutral-800 text-sm italic" 
                placeholder="Specific instructions..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(164,230,54,0.4)]" />
              <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue'] text-lg" style={{ fontFamily: 'var(--section-header-font)' }}>Deployment Command</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Target Date</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => handleChange('date', e.target.value)} 
                  className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Duration (Days)</label>
                <input 
                  type="number" 
                  value={formData.durationDays} 
                  onChange={(e) => handleChange('durationDays', parseInt(e.target.value) || 1)} 
                  className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Start Time</label>
                <input 
                  type="time" 
                  value={formData.startTime} 
                  onChange={(e) => handleChange('startTime', e.target.value)} 
                  className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Return time</label>
                <input 
                  type="time" 
                  value={formData.endTime} 
                  onChange={(e) => handleChange('endTime', e.target.value)} 
                  className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Commanding Marshal</label>
              <select 
                value={formData.marshalId} 
                onChange={(e) => handleChange('marshalId', e.target.value)}
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all"
              >
                {loadingMarshals ? (
                  <option>Loading Command Staff...</option>
                ) : (
                  marshals.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Terrain Profiles</label>
              <div className="grid grid-cols-3 gap-2 p-3 bg-black/20 border border-neutral-800 rounded-xl">
                {TERRAIN_OPTIONS.map(t => (
                  <button 
                    key={t} 
                    onClick={() => handleTerrainToggle(t)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${formData.terrainTypes.includes(t) ? 'bg-primary text-black' : 'bg-neutral-900/50 text-neutral-600 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleCreate} disabled={saving} className="w-full py-5 text-xl tracking-[0.2em] rounded-2xl">
                {saving ? <Spinner /> : 'INITIALIZE RIDE'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

const RideEditorModal: React.FC<{ ride: Ride, onClose: () => void, onSave: () => void }> = ({ ride, onClose, onSave }) => {
  const [formData, setFormData] = useState<Ride>(JSON.parse(JSON.stringify(ride)));
  const [marshals, setMarshals] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingMarshals, setLoadingMarshals] = useState(true);

  useEffect(() => {
    api.getUsers().then(users => {
      setMarshals(users.filter(u => u.clubRole === ClubRole.MARSHAL));
    }).finally(() => setLoadingMarshals(false));
  }, []);

  const handleChange = (field: keyof Ride, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTerrainToggle = (terrain: string) => {
    const current = formData.terrainTypes || [];
    const updated = current.includes(terrain)
      ? current.filter(t => t !== terrain)
      : [...current, terrain];
    handleChange('terrainTypes', updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = { ...formData };
      await api.updateRide(ride.id, updateData);
      onSave();
      onClose();
    } catch (e) {
      alert("System Overload: Failed to update expedition briefing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Modify Ride Parameters" onClose={onClose} maxWidth="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4 p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(164,230,54,0.4)]" />
            <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue'] text-lg" style={{ fontFamily: 'var(--section-header-font)' }}>Ride Information</h4>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Ride Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => handleChange('title', e.target.value)} 
              className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all placeholder:text-neutral-800" 
              placeholder="e.g. Night Rider 2025"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Ride summary</label>
            <textarea 
              value={formData.summary} 
              onChange={(e) => handleChange('summary', e.target.value)} 
              className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary h-32 resize-none transition-all placeholder:text-neutral-800 text-sm" 
              placeholder="Mission summary..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Google Drive Link (Sharing Images)</label>
            <input 
              type="url" 
              value={formData.driveLink || ''} 
              onChange={(e) => handleChange('driveLink', e.target.value)} 
              className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all placeholder:text-neutral-800" 
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Tactical Notes</label>
            <textarea 
              value={formData.notes || ''} 
              onChange={(e) => handleChange('notes', e.target.value)} 
              className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary h-24 resize-none transition-all placeholder:text-neutral-800 text-sm italic" 
              placeholder="Specific notes..."
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(164,230,54,0.4)]" />
            <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue'] text-lg" style={{ fontFamily: 'var(--section-header-font)' }}>Deployment Command</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Target Date</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => handleChange('date', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Duration (Days)</label>
              <input 
                type="number" 
                value={formData.durationDays} 
                onChange={(e) => handleChange('durationDays', parseInt(e.target.value) || 1)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Start Time</label>
              <input 
                type="time" 
                value={formData.startTime} 
                onChange={(e) => handleChange('startTime', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Return time</label>
              <input 
                type="time" 
                value={formData.endTime} 
                onChange={(e) => handleChange('endTime', e.target.value)} 
                className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Assigned Commanding Marshal</label>
            <select 
              value={formData.marshalId} 
              onChange={(e) => handleChange('marshalId', e.target.value)}
              className="w-full bg-black/40 border border-neutral-800 p-4 rounded-xl text-white font-bold outline-none focus:border-primary transition-all"
            >
              {loadingMarshals ? (
                <option>Loading Command Staff...</option>
              ) : (
                marshals.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1.5 ml-1 font-['Bebas_Neue']">Terrain Profiles</label>
            <div className="grid grid-cols-3 gap-2 p-3 bg-black/20 border border-neutral-800 rounded-xl">
              {TERRAIN_OPTIONS.map(t => (
                <button 
                  key={t} 
                  onClick={() => handleTerrainToggle(t)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${formData.terrainTypes.includes(t) ? 'bg-primary text-black' : 'bg-neutral-900/50 text-neutral-600 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full py-5 text-xl tracking-[0.2em] rounded-2xl">
              {saving ? <Spinner /> : 'SYNC MISSION PARAMETERS'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const AchievementProgress: React.FC<{ user: User, settings: ClubSettings | null }> = ({ user, settings }) => {
  if (!settings || !settings.achievements) return null;

  const categories: AchievementCategory[] = ['Kms', 'Leads', 'Sweeps', 'RPs', 'Rides'];
  
  const getStatValue = (category: AchievementCategory) => {
    switch (category) {
      case 'Kms': return user.totalKms;
      case 'Leads': return user.leads;
      case 'Sweeps': return user.sweeps;
      case 'RPs': return user.rps;
      case 'Rides': return user.totalRides;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(164,230,54,0.5)]" />
        <h3 className="text-3xl font-black uppercase" style={{ fontFamily: 'var(--section-header-font)' }}>Achievement Progress</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(category => {
          const catValue = getStatValue(category);
          const catAchievements = settings.achievements
            .filter(a => a.category === category)
            .sort((a, b) => a.threshold - b.threshold);
          
          if (catAchievements.length === 0) return null;

          const nextAchievement = catAchievements.find(a => a.threshold > catValue) || catAchievements[catAchievements.length - 1];
          const prevThreshold = catAchievements.filter(a => a.threshold <= catValue).slice(-1)[0]?.threshold || 0;
          
          const progress = Math.min(100, Math.max(0, ((catValue - prevThreshold) / (nextAchievement.threshold - prevThreshold)) * 100));
          const isMaxed = catValue >= catAchievements[catAchievements.length - 1].threshold;

          return (
            <Card key={category} className="p-6 rounded-3xl border-neutral-800 bg-neutral-900/20">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">{category}</p>
                  <h4 className="text-2xl font-black text-white" style={{ fontFamily: 'var(--achievement-font)' }}>
                    {isMaxed ? 'MAXED OUT' : nextAchievement.label}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-primary font-black text-3xl" style={{ fontFamily: 'var(--stat-font)' }}>
                    {catValue}<span className="text-xs text-neutral-600 ml-1 uppercase">{category === 'Kms' ? 'KM' : 'COUNT'}</span>
                  </p>
                </div>
              </div>
              
              <div className="relative h-3 w-full bg-neutral-800 rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_rgba(164,230,54,0.4)] transition-all duration-1000 ease-out"
                  style={{ width: `${isMaxed ? 100 : progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                <span>{prevThreshold}</span>
                <span>{isMaxed ? 'LEGENDARY' : `${nextAchievement.threshold} FOR ${nextAchievement.label}`}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const AchievementEditor: React.FC<{ achievements: Achievement[], onUpdate: (a: Achievement[]) => void }> = ({ achievements, onUpdate }) => {
  const [items, setItems] = useState<Achievement[]>(achievements);

  const addItem = () => {
    const newItem: Achievement = { threshold: 0, label: 'New Honor', category: 'Kms' };
    const updated = [...items, newItem];
    setItems(updated);
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onUpdate(updated);
  };

  const updateItem = (index: number, field: keyof Achievement, value: any) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setItems(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']" style={{ fontFamily: 'var(--section-header-font)' }}>Achievement Registry</h4>
        <Button onClick={addItem} variant="secondary" className="px-4 py-1.5 text-[10px]">Grant New Honor</Button>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3 items-center p-3 bg-black/40 border border-neutral-800 rounded-xl">
            <div className="w-32">
              <select value={item.category} onChange={(e) => updateItem(idx, 'category', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-xs font-bold text-white outline-none focus:border-primary">
                <option value="Kms">Distance (Kms)</option>
                <option value="Leads">Lead Role</option>
                <option value="Sweeps">Sweep Role</option>
                <option value="RPs">Road Captain</option>
                <option value="Rides">Total Rides</option>
              </select>
            </div>
            <div className="flex-1">
              <input type="text" value={item.label} onChange={(e) => updateItem(idx, 'label', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-xs font-bold text-white placeholder-neutral-600 outline-none focus:border-primary" />
            </div>
            <div className="w-24">
              <input type="number" value={item.threshold} onChange={(e) => updateItem(idx, 'threshold', parseInt(e.target.value) || 0)} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-xs font-bold text-white outline-none focus:border-primary" />
            </div>
            <button onClick={() => removeItem(idx)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- BRANDING ---

const BrandingStyles: React.FC<{ settings: ClubSettings | null }> = ({ settings }) => {
  if (!settings) return null;
  const fonts = Array.from(new Set([
    settings.globalFont || 'Montserrat', 
    settings.headingFont || 'Bebas Neue',
    settings.navFont || 'Bebas Neue',
    settings.statFont || 'Bebas Neue',
    settings.buttonFont || 'Bebas Neue',
    settings.inputFont || 'Montserrat',
    settings.achievementFont || 'Bebas Neue',
    settings.cardHeaderFont || 'Bebas Neue',
    settings.sectionHeaderFont || 'Bebas Neue'
  ]));
  const fontImports = fonts.map(f => `@import url('https://fonts.googleapis.com/css2?family=${f.replace(/\s+/g, '+')}:wght@400;700;900&display=swap');`).join('\n');
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      ${fontImports}
      :root {
        --primary-color: ${settings.primaryColor || BRAND_COLOR};
        --dashboard-bg: ${settings.dashboardBg || '#000000'};
        --header-bg: ${settings.headerBg || '#000000'};
        --header-text: ${settings.headerText || '#ffffff'};
        --card-bg: ${settings.cardBg || '#0a0a0a'};
        --card-border: ${settings.cardBorder || '#222222'};
        --global-font: '${settings.globalFont || 'Montserrat'}', sans-serif;
        --heading-font: '${settings.headingFont || 'Bebas Neue'}', sans-serif;
        --nav-font: '${settings.navFont || 'Bebas Neue'}', sans-serif;
        --stat-font: '${settings.statFont || 'Bebas Neue'}', sans-serif;
        --button-font: '${settings.buttonFont || 'Bebas Neue'}', sans-serif;
        --input-font: '${settings.inputFont || 'Montserrat'}', sans-serif;
        --achievement-font: '${settings.achievementFont || 'Bebas Neue'}', sans-serif;
        --card-header-font: '${settings.cardHeaderFont || 'Bebas Neue'}', sans-serif;
        --section-header-font: '${settings.sectionHeaderFont || 'Bebas Neue'}', sans-serif;
        --button-bg: ${settings.buttonBg || BRAND_COLOR};
        --button-text: ${settings.buttonText || '#000000'};
        --stat-color: ${settings.statColor || BRAND_COLOR};
      }
      body { 
        font-family: var(--global-font); 
        background-color: var(--dashboard-bg); 
        color: white; 
        margin: 0; 
      }
      header {
        background-color: var(--header-bg);
        color: var(--header-text);
        font-family: var(--nav-font);
      }
      h1, h2, h3, h4, .creed-heading { 
        font-family: var(--heading-font); 
      }
      input, select, textarea {
        font-family: var(--input-font);
      }
      .text-primary { color: var(--primary-color); }
      .bg-primary { background-color: var(--primary-color); }
      .creed-gradient { background: radial-gradient(circle at 50% -20%, rgba(164, 230,54, 0.08) 0%, rgba(0,0,0,0) 70%); }
    `}} />
  );
};

const BrandingLogo: React.FC<{ settings: ClubSettings | null, className?: string }> = ({ settings, className = "w-8 h-8" }) => {
  if (settings?.logoUrl) {
    return (
      <div className={`${className} flex items-center justify-center overflow-hidden rounded-xl`}>
        <img src={settings.logoUrl} alt="Club Logo" className="w-full h-full object-contain" />
      </div>
    );
  }

  let primaryColor = settings?.primaryColor || BRAND_COLOR;
  if (primaryColor.toLowerCase() === LEGACY_RED.toLowerCase()) {
    primaryColor = BRAND_COLOR;
  }

  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="35" y="15" width="30" height="22" rx="2" fill={primaryColor} />
        <rect x="35" y="39" width="30" height="3" fill={primaryColor} opacity="0.8" />
        <rect x="35" y="44" width="30" height="3" fill={primaryColor} opacity="0.6" />
        <rect x="46" y="47" width="8" height="28" rx="1" fill={primaryColor} />
        <circle cx="50" cy="78" r="7" stroke={primaryColor} strokeWidth="4" />
        <path d="M28 20 C 15 20, 15 50, 28 50 M28 50 C 15 50, 15 80, 28 80" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" opacity="0.4" />
        <path d="M72 20 C 85 20, 85 50, 72 50 M72 50 C 85 50, 85 80, 72 80" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      </svg>
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode, maxWidth?: string }> = ({ title, onClose, children, maxWidth = "max-w-lg" }) => (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
    <div className={`bg-neutral-950 border-t sm:border border-neutral-800 w-full ${maxWidth} rounded-t-3xl sm:rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]`}>
      <div className="p-4 sm:p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
        <h3 className="text-[18px] font-black text-white uppercase tracking-[0.1em] font-['Bebas_Neue']">{title}</h3>
        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-0 overflow-y-auto h-full">{children}</div>
    </div>
  </div>
);

// --- MEMBER MANAGEMENT ---

const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMembers = useCallback(() => {
    setLoading(true);
    api.getUsers().then(setMembers).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleUpdate = async (member: User) => {
    try {
      await api.updateUser(member.id, member);
      alert('Member credentials updated.');
      setEditingMember(null);
      fetchMembers();
    } catch (e) { alert('Failed to update member.'); }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newRider: Omit<User, 'totalRides' | 'leads' | 'sweeps' | 'rps' | 'totalKms'> = {
      id: fd.get('id') as string,
      name: fd.get('name') as string,
      password: fd.get('password') as string,
      clubRole: fd.get('role') as ClubRole,
      avatarUrl: '',
      subscriptionType: SubscriptionType.NONE,
      paymentStatus: 'Pending'
    };
    try {
      await api.addRider(newRider);
      alert('Rider deployed to registry.');
      setShowAddForm(false);
      fetchMembers();
    } catch (e) { alert('Failed to add rider.'); }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.id.includes(search)
  );

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center gap-4">
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-black/40 border border-neutral-800 p-3 rounded-xl text-white text-sm outline-none focus:border-primary transition-all"
        />
        <Button onClick={() => setShowAddForm(true)} className="px-6 py-3 text-xs uppercase tracking-widest whitespace-nowrap">Add New Rider</Button>
      </div>

      {loading ? <div className="py-20 flex justify-center"><Spinner /></div> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMembers.map(m => (
            <div key={m.id} className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-2xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-black border border-neutral-800 flex items-center justify-center overflow-hidden">
                  <img src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`} alt="" />
                </div>
                <div>
                  <h5 className="text-white font-bold">{m.name}</h5>
                  <p className="text-[10px] text-neutral-500 font-mono">{m.id} • {m.clubRole}</p>
                </div>
              </div>
              <Button onClick={() => setEditingMember(m)} variant="secondary" className="px-4 py-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Edit Credentials</Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <Modal title="Deploy New Rider" onClose={() => setShowAddForm(false)}>
          <form onSubmit={handleAdd} className="space-y-6 p-6">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Rider Name</label>
              <input name="name" type="text" required className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Phone (Registry ID)</label>
              <input name="id" type="tel" required className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Encryption Key (Password)</label>
              <input name="password" type="text" required className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Club Role</label>
              <select name="role" className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none">
                <option value={ClubRole.RIDER}>Rider</option>
                <option value={ClubRole.MARSHAL}>Marshal</option>
              </select>
            </div>
            <Button type="submit" className="w-full py-4 text-sm tracking-widest">DEPLOY RIDER</Button>
          </form>
        </Modal>
      )}

      {editingMember && (
        <Modal title={`Modify ${editingMember.name}`} onClose={() => setEditingMember(null)}>
          <div className="space-y-6 p-6">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Full Name</label>
              <input 
                type="text" 
                value={editingMember.name} 
                onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Phone (Registry ID)</label>
              <input 
                type="tel" 
                value={editingMember.id} 
                onChange={(e) => setEditingMember({...editingMember, id: e.target.value})}
                className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Password</label>
              <input 
                type="text" 
                value={editingMember.password || ''} 
                onChange={(e) => setEditingMember({...editingMember, password: e.target.value})}
                className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none" 
              />
            </div>
            <Button onClick={() => handleUpdate(editingMember)} className="w-full py-4 text-sm tracking-widest">COMMIT OVERRIDES</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- DASHBOARD COMPONENTS ---

const AdminPanelContent: React.FC<{ settings: ClubSettings | null, onSettingsChange: (s: ClubSettings) => void }> = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState<ClubSettings | null>(settings);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'typography' | 'members' | 'achievements'>('branding');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof ClubSettings, value: any) => {
    if (!localSettings) return;
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuthorize = async () => {
    try {
      await api.updateClubSettings(localSettings!);
      alert('Registry Synchronized.');
      setShowConfirm(false);
    } catch (e) {
      alert("System Error: Failed to commit registry changes.");
    }
  };

  const ColorInput = ({ label, field }: { label: string, field: keyof ClubSettings }) => (
    <div>
      <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-2 font-['Bebas_Neue']">{label}</label>
      <div className="flex gap-2">
        <div className="w-10 h-10 rounded-xl border border-neutral-800 shrink-0" style={{ backgroundColor: localSettings?.[field] as string }} />
        <input type="text" value={localSettings?.[field] as string || ''} onChange={(e) => updateField(field, e.target.value)} className="w-full bg-black border border-neutral-800 p-2 rounded-xl text-white font-mono text-xs outline-none" />
      </div>
    </div>
  );

  const FontInput = ({ label, field, placeholder }: { label: string, field: keyof ClubSettings, placeholder: string }) => (
    <div>
      <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-2 font-['Bebas_Neue']">{label}</label>
      <input 
        type="text" 
        value={localSettings?.[field] as string || ''} 
        onChange={(e) => updateField(field, e.target.value)} 
        placeholder={placeholder}
        className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none text-sm placeholder:text-neutral-800" 
      />
    </div>
  );

  const NavItem = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all border ${activeTab === id ? 'bg-primary border-primary text-black' : 'bg-transparent border-transparent text-neutral-500 hover:text-white hover:bg-white/5'}`}
    >
      <div className="shrink-0">{icon}</div>
      <span className="font-['Bebas_Neue'] font-black uppercase tracking-widest text-lg">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row-reverse h-full max-h-[85vh]">
      {/* Sidebar - Right Side on Desktop */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-l border-neutral-800 bg-neutral-900/20 p-6 space-y-2 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar">
        <NavItem 
          id="branding" 
          label="Identity" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
        />
        <NavItem 
          id="typography" 
          label="Typography" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>} 
        />
        <NavItem 
          id="members" 
          label="Members" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
        />
        <NavItem 
          id="achievements" 
          label="Honors" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
        {activeTab === 'branding' && (
          <div className="p-8 space-y-12 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl space-y-6">
                <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']">Identity & Logo</h4>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                    {localSettings?.logoUrl ? (
                      <img src={localSettings.logoUrl} className="w-full h-full object-contain" alt="Preview" />
                    ) : (
                      <div className="text-neutral-800"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 8c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zm0 10c-2.733 0-5.061-1.478-6.266-3.665.429-1.241 1.644-2.135 3.1-2.29.569.589 1.352.955 2.216.955s1.647-.366 2.216-.955c1.456.154 2.671 1.049 3.1 2.29-1.205 2.187-3.533 3.665-6.266 3.665z"/></svg></div>
                    )}
                  </div>
                  <div className="space-y-3 flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full py-3 text-xs rounded-xl">Upload Mission Seal</Button>
                    {localSettings?.logoUrl && <button onClick={() => updateField('logoUrl', '')} className="text-[10px] text-red-500 font-black uppercase font-['Bebas_Neue'] ml-2">Remove Custom Logo</button>}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-2 font-['Bebas_Neue']">Club Name</label>
                    <input type="text" value={localSettings?.brandName || ''} onChange={(e) => updateField('brandName', e.target.value)} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white font-bold outline-none" />
                  </div>
                  <ColorInput label="Primary Accent" field="primaryColor" />
                </div>
              </div>

              <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl space-y-6">
                <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']">Dashboard Theme</h4>
                <div className="grid grid-cols-1 gap-4">
                  <ColorInput label="Background" field="dashboardBg" />
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput label="Header BG" field="headerBg" />
                    <ColorInput label="Header Text" field="headerText" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput label="Card BG" field="cardBg" />
                    <ColorInput label="Card Border" field="cardBorder" />
                  </div>
                </div>
              </div>
            </div>
            
            <Button onClick={() => setShowConfirm(true)} className="w-full py-5 text-xl tracking-[0.2em]">AUTHORIZE SYSTEM CHANGES</Button>
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="p-8 space-y-12 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl space-y-6">
                <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']">Global Fonts</h4>
                <div className="space-y-4">
                  <FontInput label="Global Body Font" field="globalFont" placeholder="e.g. Montserrat" />
                  <FontInput label="Primary Heading Font" field="headingFont" placeholder="e.g. Bebas Neue" />
                  <FontInput label="Navigation Font" field="navFont" placeholder="e.g. Montserrat" />
                </div>
              </div>

              <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl space-y-6">
                <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']">Dashboard Elements</h4>
                <div className="space-y-4">
                  <FontInput label="Section Header Font" field="sectionHeaderFont" placeholder="e.g. Bebas Neue" />
                  <FontInput label="Card Header Font" field="cardHeaderFont" placeholder="e.g. Montserrat" />
                  <FontInput label="Achievement Label Font" field="achievementFont" placeholder="e.g. Bebas Neue" />
                </div>
              </div>

              <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl space-y-6">
                <h4 className="text-primary font-black uppercase tracking-widest font-['Bebas_Neue']">Component Fonts</h4>
                <div className="space-y-4">
                  <FontInput label="Statistics Font" field="statFont" placeholder="e.g. Bebas Neue" />
                  <FontInput label="Button Font" field="buttonFont" placeholder="e.g. Bebas Neue" />
                  <FontInput label="Form/Input Font" field="inputFont" placeholder="e.g. Montserrat" />
                </div>
              </div>
            </div>

            <div className="p-6 border border-primary/20 bg-primary/5 rounded-2xl">
              <p className="text-xs text-neutral-400 italic leading-relaxed">
                Note: Ensure the font name exactly matches the name on <strong>fonts.google.com</strong>.
                The system will automatically load and cache these fonts for all mission members.
              </p>
            </div>

            <Button onClick={() => setShowConfirm(true)} className="w-full py-5 text-xl tracking-[0.2em]">SYNC TYPOGRAPHY REGISTRY</Button>
          </div>
        )}

        {activeTab === 'members' && <MemberManagement />}

        {activeTab === 'achievements' && (
          <div className="p-8 space-y-8">
            <AchievementEditor achievements={localSettings?.achievements || []} onUpdate={(a) => updateField('achievements', a)} />
            <Button onClick={() => setShowConfirm(true)} className="w-full py-5 text-xl tracking-[0.2em]">SYNCHRONIZE HONORS</Button>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmationModal 
          title="Security Authorization"
          message="You are about to modify global club parameters and typography registry. These changes will propagate to all member terminals immediately."
          onConfirm={handleAuthorize}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

const RiderControlModal: React.FC<{ user: User, onSave: (u: User) => void }> = ({ user, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>(user);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateUser(user.id, formData);
      onSave({ ...user, ...formData });
    } catch (e) { 
      alert("System Error: Failed to synchronize personal dossier."); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="p-6 space-y-10">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-3xl bg-neutral-900 border-2 border-neutral-800 overflow-hidden relative">
            <img src={formData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-full h-full object-cover" alt="" />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl"
          >
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
        </div>
        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Update Signature Frame</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Registry Core */}
        <div className="space-y-6">
          <h4 className="text-primary font-black uppercase tracking-widest text-sm" style={{ fontFamily: 'var(--section-header-font)' }}>Core Identity</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Rider Full Name</label>
              <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Registry ID (Phone)</label>
              <input type="tel" value={formData.id || ''} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Blood Group</label>
                <input type="text" value={formData.bloodGroup || ''} placeholder="O+ve" onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Emergency Link</label>
                <input type="tel" value={formData.emergencyContact || ''} placeholder="+91..." onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Biker Manifest */}
        <div className="space-y-6">
          <h4 className="text-primary font-black uppercase tracking-widest text-sm" style={{ fontFamily: 'var(--section-header-font)' }}>Biker Manifest</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Primary Machine (What do you ride?)</label>
              <input type="text" value={formData.bikeModel || ''} placeholder="e.g. BMW R 1250 GS" onChange={(e) => setFormData({...formData, bikeModel: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Dream Expedition</label>
              <input type="text" value={formData.dreamRide || ''} placeholder="Leh to Kanyakumari" onChange={(e) => setFormData({...formData, dreamRide: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Trophy Destination (Fav visited?)</label>
              <input type="text" value={formData.favDestination || ''} placeholder="Spiti Valley" onChange={(e) => setFormData({...formData, favDestination: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
          </div>
        </div>

        {/* Personal Trivia */}
        <div className="space-y-6 md:col-span-2">
          <h4 className="text-primary font-black uppercase tracking-widest text-sm" style={{ fontFamily: 'var(--section-header-font)' }}>Personal Trivia</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Riding Style</label>
              <select value={formData.ridingStyle || ''} onChange={(e) => setFormData({...formData, ridingStyle: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all">
                <option value="">Select Protocol</option>
                <option value="Cruiser">Cruiser - Relentless Pace</option>
                <option value="Aggressive">Aggressive - Apex Hunter</option>
                <option value="Tourer">Tourer - Mile Muncher</option>
                <option value="Offroad">Offroader - Dirt Soul</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Experience Level</label>
              <input type="text" value={formData.experienceYears || ''} placeholder="e.g. 10 Years" onChange={(e) => setFormData({...formData, experienceYears: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Favorite Gear Brand</label>
              <input type="text" value={formData.favGearBrand || ''} placeholder="e.g. Alpinestars" onChange={(e) => setFormData({...formData, favGearBrand: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 rounded-xl text-white outline-none focus:border-primary transition-all" />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Mission Log (Bio / About the rider)</label>
          <textarea 
            value={formData.about || ''} 
            onChange={(e) => setFormData({...formData, about: e.target.value})} 
            placeholder="Tell us about your motorcycling journey..."
            className="w-full bg-black border border-neutral-800 p-4 rounded-2xl text-white outline-none focus:border-primary h-24 resize-none transition-all placeholder:text-neutral-800 text-sm italic"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1 ml-1 font-['Bebas_Neue']">Favorite Ride Memory</label>
          <input 
            type="text"
            value={formData.rideMemory || ''} 
            onChange={(e) => setFormData({...formData, rideMemory: e.target.value})} 
            placeholder="That one sunset at the mountain top..."
            className="w-full bg-black border border-neutral-800 p-4 rounded-2xl text-white outline-none focus:border-primary transition-all placeholder:text-neutral-800 text-sm"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full py-5 text-xl tracking-[0.2em] rounded-2xl">
        {saving ? <Spinner /> : 'SYNC DOSSIER REGISTRY'}
      </Button>
    </div>
  );
};

const RideDetailsModal: React.FC<{ ride: Ride, user: User, onClose: () => void }> = ({ ride, user, onClose }) => {
  const [participants, setParticipants] = useState<RideParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAttendance, setPendingAttendance] = useState<RideParticipant | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parts, allUsers] = await Promise.all([
          api.getRideParticipants(ride.id),
          api.getUsers()
        ]);
        setParticipants(parts);
        setUsers(allUsers);
      } catch (e) {
        console.error("Failed to fetch ride details", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ride.id]);

  const toggleAttendance = (p: RideParticipant) => {
    if (user.clubRole !== ClubRole.MARSHAL) return;
    setPendingAttendance({ ...p, attended: !p.attended });
  };

  const handleConfirmAttendance = async () => {
    if (!pendingAttendance) return;
    try {
      setParticipants(prev => prev.map(p => p.userId === pendingAttendance.userId ? pendingAttendance : p));
      setPendingAttendance(null);
    } catch (e) {
      alert("Failed to update mission roster.");
    }
  };

  const getMarshalName = (userId: string) => users.find(u => u.id === userId)?.name || "Unknown";

  const leads = participants.filter(p => p.role === RideRole.LEAD);
  const sweeps = participants.filter(p => p.role === RideRole.SWEEP);
  const rps = participants.filter(p => p.role === RideRole.RP);
  const riders = participants.filter(p => p.role === RideRole.RIDER);

  return (
    <Modal title="Expedition Briefing" onClose={onClose} maxWidth="max-w-2xl">
      <div className="p-8 space-y-8 pb-12">
        <div className="space-y-4">
          <h4 className="text-primary font-black uppercase tracking-widest text-xl" style={{ fontFamily: 'var(--section-header-font)' }}>Mission Dossier</h4>
          <p className="text-neutral-400 italic leading-relaxed whitespace-pre-wrap">{ride.summary}</p>
          {ride.notes && (
            <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
              <p className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--card-header-font)' }}>Tactical Notes</p>
              <p className="text-sm text-neutral-300 italic">{ride.notes}</p>
            </div>
          )}
          {ride.driveLink && (
            <a 
              href={ride.driveLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 13.5l1.5-2.5h-3l1.5 2.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.09 13.91l-.1.17-.09.18-.08.19-.07.2-.06.21-.05.22-.04.23-.03.24-.02.25-.01.26-.01.27v.28h-.28l-.27-.01-.26-.01-.25-.02-.24-.03-.23-.04-.22-.05-.21-.06-.2-.07-.19-.08-.18-.09-.17-.1-.91-1.09h11.91l-1.09 1.09zM19.1 14H4.9l1.1-1.1c.39-.39 1.02-.39 1.41 0l.29.29h8.6l.29-.29c.39-.39 1.02-.39 1.41 0l1.1 1.1zM12 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>
              View Ride Images
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-primary font-black uppercase tracking-widest" style={{ fontFamily: 'var(--section-header-font)' }}>Terrain Analysis</h4>
            <div className="flex flex-wrap gap-2">
              {ride.terrainTypes.map(t => (
                <span key={t} className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-black uppercase tracking-widest">{t}</span>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-primary font-black uppercase tracking-widest" style={{ fontFamily: 'var(--section-header-font)' }}>Command Structure</h4>
            {loading ? <Spinner /> : (
              <div className="space-y-3">
                {[...leads, ...sweeps, ...rps].map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest block">{p.role}</span>
                      <div className="text-white font-bold">{getMarshalName(p.userId)}</div>
                    </div>
                    {user.clubRole === ClubRole.MARSHAL && (
                      <button 
                        onClick={() => toggleAttendance(p)}
                        className={`w-6 h-6 rounded flex items-center justify-center border transition-all ${p.attended ? 'bg-primary border-primary text-black' : 'border-neutral-800 text-neutral-800 hover:border-neutral-600'}`}
                      >
                        {p.attended && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-primary font-black uppercase tracking-widest" style={{ fontFamily: 'var(--section-header-font)' }}>Rider Manifest</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {riders.map(p => (
               <div key={p.userId} className="p-3 bg-neutral-900/30 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{getMarshalName(p.userId)}</span>
                  {user.clubRole === ClubRole.MARSHAL && (
                    <button 
                      onClick={() => toggleAttendance(p)}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${p.attended ? 'bg-primary border-primary text-black' : 'border-neutral-800 text-neutral-800 hover:border-neutral-600'}`}
                    >
                      {p.attended && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  )}
               </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex justify-between items-center text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">
          <span>Date: {new Date(ride.date).toLocaleDateString()}</span>
          <span>Time: {ride.startTime} - {ride.endTime}</span>
        </div>
      </div>

      {pendingAttendance && (
        <ConfirmationModal 
          title="Roster Update"
          message={`Are you sure you want to mark ${getMarshalName(pendingAttendance.userId)} as ${pendingAttendance.attended ? 'ATTENDED' : 'ABSENT'}?`}
          onConfirm={handleConfirmAttendance}
          onCancel={() => setPendingAttendance(null)}
        />
      )}
    </Modal>
  );
};

const StatOverview: React.FC<{ user: User }> = ({ user }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card className="p-6 text-center rounded-2xl border-neutral-800 overflow-hidden">
      <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-1">Total Distance</p>
      <p className="text-4xl font-black italic" style={{ color: 'var(--stat-color)', fontFamily: 'var(--stat-font)' }}>{user.totalKms}<span className="text-xs ml-1 uppercase not-italic text-neutral-600">KM</span></p>
    </Card>
    <Card className="p-6 text-center rounded-2xl border-neutral-800 overflow-hidden">
      <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-1">Leads</p>
      <p className="text-4xl font-black italic" style={{ color: 'var(--stat-color)', fontFamily: 'var(--stat-font)' }}>{user.leads}</p>
    </Card>
    <Card className="p-6 text-center rounded-2xl border-neutral-800 overflow-hidden">
      <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-1">Sweeps</p>
      <p className="text-4xl font-black italic" style={{ color: 'var(--stat-color)', fontFamily: 'var(--stat-font)' }}>{user.sweeps}</p>
    </Card>
    <Card className="p-6 text-center rounded-2xl border-neutral-800 overflow-hidden">
      <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-1">Road Captains</p>
      <p className="text-4xl font-black italic" style={{ color: 'var(--stat-color)', fontFamily: 'var(--stat-font)' }}>{user.rps}</p>
    </Card>
  </div>
);

const MarshalDashboard: React.FC<{ user: User, settings: ClubSettings | null, onSettingsChange: (s: ClubSettings) => void }> = ({ user, settings, onSettingsChange }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [deletingRide, setDeletingRide] = useState<Ride | null>(null);
  const [terrainFilter, setTerrainFilter] = useState<string | null>(null);

  const fetchRides = useCallback(() => {
    setLoading(true);
    api.getRides().then(setRides).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleDeleteRide = async () => {
    if (!deletingRide) return;
    try {
      await api.deleteRide(deletingRide.id);
      setDeletingRide(null);
      fetchRides();
    } catch (e) {
      alert("System failure: Could not scrub expedition data.");
    }
  };

  const filteredRides = terrainFilter 
    ? rides.filter(ride => ride.terrainTypes?.includes(terrainFilter))
    : rides;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(164,230,54,0.5)]" />
        <h3 className="text-3xl font-black tracking-tight uppercase" style={{ fontFamily: 'var(--section-header-font)' }}>Marshal Directive</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-primary/20 bg-primary/5 rounded-3xl overflow-hidden">
          <p className="text-neutral-400 italic text-lg leading-relaxed">
            Command center active. Leadership protocols enabled for <span className="text-primary font-bold">{user.name}</span>. 
            Review tactical briefings and coordinate upcoming expeditions from the ride manifest below.
          </p>
        </Card>

        <AchievementProgress user={user} settings={settings} />

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h4 className="text-xl font-black text-white uppercase tracking-widest" style={{ fontFamily: 'var(--section-header-font)' }}>Expedition Manifest</h4>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setTerrainFilter(null)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!terrainFilter ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800'}`}
              >
                All Terrains
              </button>
              {['Highway', 'Broken Roads', 'Off-roads'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTerrainFilter(t)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${terrainFilter === t ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800'}`}
                >
                  {t}
                </button>
              ))}
              <Button onClick={fetchRides} variant="secondary" className="px-4 py-2 text-[10px] rounded-full ml-2">Sync Manifest</Button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRides.map(ride => (
                <Card key={ride.id} className="p-6 rounded-3xl border-neutral-800 hover:border-primary/40 transition-colors group flex flex-col justify-between">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ride.status === 'upcoming' ? 'bg-[#a4e636]/10 text-[#a4e636]' : 'bg-neutral-800 text-neutral-500'}`}>
                        {ride.status}
                      </span>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-neutral-600 uppercase">
                          {new Date(ride.date).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => setDeletingRide(ride)}
                          className="p-1.5 text-neutral-700 hover:text-red-500 transition-colors"
                          title="Scrub Expedition"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                      <h5 className="text-2xl font-black text-white group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--card-header-font)' }}>{ride.title}</h5>
                      <div className="flex flex-wrap gap-1">
                        {ride.terrainTypes?.map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[8px] font-black uppercase tracking-tighter">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-neutral-500 text-sm line-clamp-2 italic">{ride.summary}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => setSelectedRide(ride)} variant="secondary" className="flex-1 py-3 rounded-xl text-[10px]">Examine Briefing</Button>
                    <Button onClick={() => setEditingRide(ride)} variant="primary" className="flex-1 py-3 rounded-xl text-[10px]">Edit Expedition</Button>
                  </div>
                </Card>
              ))}
              {filteredRides.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center border border-dashed border-neutral-800 rounded-3xl">
                  <p className="text-neutral-500 text-sm uppercase tracking-widest font-black font-['Bebas_Neue']">No rides matching the selected terrain profile.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedRide && <RideDetailsModal ride={selectedRide} user={user} onClose={() => setSelectedRide(null)} />}
      {editingRide && <RideEditorModal ride={editingRide} onClose={() => setEditingRide(null)} onSave={fetchRides} />}
      {deletingRide && (
        <ConfirmationModal 
          title="Mission Scrub Initiation"
          message={`You are about to permanently delete the expedition '${deletingRide.title}'. All briefing data and roster associations will be scrubbed from the central registry.`}
          onConfirm={handleDeleteRide}
          onCancel={() => setDeletingRide(null)}
          isDestructive={true}
          confirmText="Scrub Data"
        />
      )}
    </div>
  );
};

const RiderDashboard: React.FC<{ user: User, settings: ClubSettings | null }> = ({ user, settings }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const fetchRides = useCallback(() => {
    setLoading(true);
    api.getRides().then(setRides).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const upcomingRides = rides.filter(r => r.status === 'upcoming');

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(164,230,54,0.5)]" />
        <h3 className="text-3xl font-black tracking-tight uppercase" style={{ fontFamily: 'var(--section-header-font)' }}>Active Missions</h3>
      </div>
      
      {loading ? (
        <div className="py-20 flex justify-center"><Spinner /></div>
      ) : upcomingRides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingRides.map(ride => (
            <Card key={ride.id} className="p-6 rounded-3xl border-neutral-800 hover:border-primary/40 transition-colors group flex flex-col justify-between">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-neutral-600 uppercase">
                    {new Date(ride.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                  <h5 className="text-2xl font-black text-white group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--card-header-font)' }}>{ride.title}</h5>
                  <div className="flex flex-wrap gap-1">
                    {ride.terrainTypes?.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[8px] font-black uppercase tracking-tighter">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-neutral-500 text-sm line-clamp-2 italic">{ride.summary}</p>
              </div>
              <Button onClick={() => setSelectedRide(ride)} variant="primary" className="w-full py-3 rounded-xl text-[10px]">Examine Briefing</Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 border-neutral-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
          <div>
            <p className="text-white text-xl font-bold uppercase" style={{ fontFamily: 'var(--card-header-font)' }}>Stand By For Orders</p>
            <p className="text-neutral-500 italic text-sm">No current expedition briefings detected in your sector.</p>
          </div>
        </Card>
      )}

      {selectedRide && <RideDetailsModal ride={selectedRide} user={user} onClose={() => setSelectedRide(null)} />}

      <AchievementProgress user={user} settings={settings} />
    </div>
  );
};

const LoginSequence: React.FC<{ user: User, settings: ClubSettings | null, onComplete: () => void }> = ({ user, settings, onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const intervals = [800, 800, 800, 1200];
    let totalTime = 0;
    
    const timers = intervals.map((duration, index) => {
      totalTime += duration;
      return setTimeout(() => setStep(index + 1), totalTime);
    });

    const finalTimer = setTimeout(onComplete, totalTime + 1000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, [onComplete]);

  const steps = [
    { text: "MACHINING PISTONS...", icon: (
      <svg className="w-16 h-16 sm:w-32 sm:h-32 text-primary animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v4M7 6h10v4H7zM6 10h12v12H6z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="16" r="2" />
      </svg>
    )},
    { text: "SYNCING GEARBOX...", icon: (
      <svg className="w-16 h-16 sm:w-32 sm:h-32 text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animationDuration: '3s' }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )},
    { text: "IGNITING SPARK...", icon: (
      <div className="relative">
        <div className="absolute inset-0 bg-primary/40 blur-xl sm:blur-3xl animate-pulse scale-110 sm:scale-150 rounded-full" />
        <svg className="w-16 h-16 sm:w-32 sm:h-32 text-primary relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" className="animate-pulse" />
        </svg>
      </div>
    )},
    { text: "PROTOCOL ENGAGED...", icon: (
      <div className="scale-75 sm:scale-125 transition-transform duration-700">
        <BrandingLogo settings={settings} className="w-32 h-32 sm:w-48 sm:h-48 drop-shadow-[0_0_20px_rgba(164,230,54,0.6)] sm:drop-shadow-[0_0_40px_rgba(164,230,54,0.6)]" />
      </div>
    )}
  ];

  const current = steps[Math.min(step, steps.length - 1)];

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      <div className="relative z-10 flex flex-col items-center space-y-6 sm:space-y-12 w-full max-w-sm">
        <div className="h-24 sm:h-48 flex items-center justify-center">
          {current.icon}
        </div>
        <div className="text-center space-y-2 sm:space-y-4 w-full">
          <p className="text-[#a4e636] font-['Bebas_Neue'] text-xl sm:text-4xl tracking-[0.2em] sm:tracking-[0.4em] uppercase animate-pulse">
            {current.text}
          </p>
          <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(164,230,54,1)]" 
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRiderControlModal, setShowRiderControlModal] = useState(false);
  const [showCreateRideModal, setShowCreateRideModal] = useState(false);
  const [showEntrySequence, setShowEntrySequence] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { api.getClubSettings().then(setSettings).catch(console.error); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setError('');
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanPass = password.trim();
    try {
      if (!cleanPhone || !cleanPass) throw new Error("Credentials required.");
      const loggedInUser = await api.login(cleanPhone, cleanPass);
      setTempUser(loggedInUser); 
      setShowEntrySequence(true);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Access denied.'); 
    } finally { setLoading(false); }
  };

  const handleSettingsChange = (updated: ClubSettings) => { setSettings(updated); };
  
  const refreshMissions = () => setRefreshKey(prev => prev + 1);

  if (showEntrySequence && tempUser) return <LoginSequence user={tempUser} settings={settings} onComplete={() => { setUser(tempUser); setShowEntrySequence(false); }} />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-row bg-black relative overflow-hidden items-stretch">
        <BrandingStyles settings={settings} />
        
        {/* Left Side: Brand Hero - Logo consistently on the left */}
        <div className="w-[30%] sm:w-[40%] lg:w-1/2 flex flex-col items-center justify-center p-3 sm:p-12 lg:p-24 z-10 space-y-4 sm:space-y-12 text-center border-r border-neutral-800/30">
          <div className="relative">
            <div className="absolute inset-0 blur-[20px] sm:blur-[120px] bg-[#a4e636]/10 sm:bg-[#a4e636]/15 rounded-full animate-pulse" />
            <BrandingLogo 
              settings={settings} 
              className="w-12 h-12 sm:w-48 sm:h-48 lg:w-96 lg:h-96 relative z-10 drop-shadow-[0_0_10px_rgba(164,230,54,0.3)] sm:drop-shadow-[0_0_30px_rgba(164,230,54,0.4)] transition-transform hover:scale-105 duration-1000" 
            />
          </div>
          <div className="w-6 sm:w-24 h-0.5 sm:h-1 bg-[#a4e636] rounded-full shadow-[0_0_10px_rgba(164,230,54,0.4)] sm:shadow-[0_0_20px_rgba(164,230,54,0.6)]" />
        </div>

        {/* Right Side: Authentication Form - Login consistently on the right */}
        <div className="w-[70%] sm:w-[60%] lg:w-1/2 flex items-center justify-center p-2 sm:p-12 lg:p-32 z-10 bg-neutral-950/20">
          <Card className="w-full max-sm lg:max-w-md p-4 sm:p-10 lg:p-12 border-neutral-800 bg-neutral-900/40 backdrop-blur-3xl rounded-[1rem] lg:rounded-[4rem] shadow-2xl relative overflow-hidden">
            <div className="absolute -top-2 -right-2 lg:-top-8 lg:-right-8 w-6 h-6 lg:w-16 lg:h-16 bg-[#a4e636] rounded-lg rotate-12 flex items-center justify-center shadow-2xl border sm:border-4 border-black z-20">
              <svg className="w-3 h-3 lg:w-8 lg:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-4 lg:space-y-14 relative z-10">
              <div className="space-y-0.5 lg:space-y-2">
                <h3 className="text-sm sm:text-3xl lg:text-5xl font-black font-['Bebas_Neue'] uppercase text-white tracking-tight leading-none">Rider Login</h3>
                <div className="w-4 lg:w-12 h-0.5 sm:h-1 bg-primary/40 rounded-full" />
              </div>

              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-6 lg:space-y-10">
                <div className="space-y-1 lg:space-y-3">
                  <label className="block text-[8px] lg:text-[13px] font-black text-neutral-500 uppercase tracking-[0.15em] ml-1 sm:ml-2 font-['Bebas_Neue']">Phone number</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Enter phone number" 
                    className="w-full bg-black/60 border border-neutral-800 rounded-lg lg:rounded-2xl px-2 py-2 lg:px-6 lg:py-5 text-white font-bold outline-none focus:border-primary focus:bg-black/80 transition-all placeholder:text-neutral-800 text-[10px] sm:text-base" 
                    required 
                  />
                </div>

                <div className="space-y-1 lg:space-y-3">
                  <label className="block text-[8px] lg:text-[13px] font-black text-neutral-500 uppercase tracking-[0.15em] ml-1 sm:ml-2 font-['Bebas_Neue']">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full bg-black/60 border border-neutral-800 rounded-lg lg:rounded-2xl px-2 py-2 lg:px-6 lg:py-5 text-white font-bold outline-none focus:border-primary focus:bg-black/80 transition-all placeholder:text-neutral-800 tracking-[0.3em] text-[10px] sm:text-base" 
                    required 
                  />
                </div>

                {error && (
                  <div className="p-2 sm:p-4 bg-red-950/20 border border-red-900/40 rounded-lg lg:rounded-2xl text-center">
                    <p className="text-red-500 text-[8px] lg:text-xs font-bold uppercase tracking-wide">{error}</p>
                  </div>
                )}

                <div className="pt-1 lg:pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-2 lg:py-5 text-xs sm:text-lg lg:text-2xl rounded-lg lg:rounded-2xl shadow-[0_10px_30px_rgba(164,230,54,0.1)] hover:shadow-[0_20px_50px_rgba(164,230,54,0.2)]"
                  >
                    {loading ? <Spinner /> : 'Login Now'}
                  </Button>
                  
                  <p className="mt-2 lg:mt-8 text-center text-[7px] lg:text-[11px] text-neutral-500 uppercase tracking-[0.1em] lg:tracking-[0.25em] italic font-black font-['Montserrat'] opacity-60">
                    Excuses end where the road begins.
                  </p>
                </div>
              </form>
            </div>
          </Card>
        </div>

        {/* Dynamic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(164,230,54,0.02)_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_rgba(164,230,54,0.02)_0%,_transparent_50%)] pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors creed-gradient pb-10">
      <BrandingStyles settings={settings} />
      <header className="px-8 py-5 border-b border-white/5 flex justify-between items-center sticky top-0 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-3">
          <BrandingLogo settings={settings} className="w-12 h-12" />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRiderControlModal(true)} 
            className="p-2.5 text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-all border border-primary/20"
            title="Rider Control"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </button>
          
          {user.clubRole === ClubRole.MARSHAL && (
            <>
              <button 
                onClick={() => setShowCreateRideModal(true)} 
                className="p-2.5 text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-all border border-primary/20"
                title="Create Expedition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)} 
                className="p-2.5 text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-all border border-primary/20"
                title="Admin Control"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
              </button>
            </>
          )}
          
          <Button onClick={() => setUser(null)} variant="secondary" className="px-5 py-2.5 rounded-full text-xs uppercase tracking-widest font-black">Logout</Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-8 space-y-12">
        <section className="flex justify-between items-end">
          <div className="flex items-center gap-6">
            <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-24 h-24 rounded-2xl border-2 border-primary/20 object-cover bg-neutral-900 shadow-2xl" alt="" />
            <div>
              <p className="text-primary text-sm font-black uppercase tracking-widest" style={{ fontFamily: 'var(--card-header-font)' }}>{user.clubRole}</p>
              <h2 className="text-3xl sm:text-7xl font-black italic leading-tight" style={{ fontFamily: 'var(--heading-font)' }}>{user.name}</h2>
              {user.bikeModel && <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mt-1">Commanding: {user.bikeModel}</p>}
            </div>
          </div>
          <button onClick={() => setShowRiderControlModal(true)} className="hidden sm:block text-xs font-black text-neutral-500 hover:text-white uppercase tracking-widest bg-white/5 px-5 py-2.5 rounded-full border border-white/5" style={{ fontFamily: 'var(--card-header-font)' }}>Modify Dossier</button>
        </section>
        <StatOverview user={user} />
        {user.clubRole === ClubRole.MARSHAL ? (
          <MarshalDashboard 
            key={`marshal-${refreshKey}`} 
            user={user} 
            settings={settings} 
            onSettingsChange={handleSettingsChange} 
          />
        ) : (
          <RiderDashboard 
            key={`rider-${refreshKey}`} 
            user={user} 
            settings={settings} 
          />
        )}
      </main>
      {showSettingsModal && <Modal title="Admin Control" onClose={() => setShowSettingsModal(false)} maxWidth="max-w-6xl"><AdminPanelContent settings={settings} onSettingsChange={handleSettingsChange} /></Modal>}
      {showRiderControlModal && <Modal title="Rider Dossier Manifest" onClose={() => setShowRiderControlModal(false)} maxWidth="max-w-3xl"><RiderControlModal user={user} onSave={(u) => { setUser(u); setShowRiderControlModal(false); }} /></Modal>}
      {showCreateRideModal && <CreateRideModal user={user} onClose={() => setShowCreateRideModal(false)} onSave={refreshMissions} />}
    </div>
  );
};

export default App;
