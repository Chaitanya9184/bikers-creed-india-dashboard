
import { createClient } from '@supabase/supabase-js';
import { ClubRole, RideRole } from '../types';
import type { Ride, RideParticipant, User, ClubSettings, Poll, Achievement, MerchandiseItem } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://ppjozfvzzvopfentyeew.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_B9Qwi942R_JIZukc4lHZyA_ToS64oHv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BRAND_GREEN = '#a4e636';
const LEGACY_RED_HEX = '#e11d47';

const sanitizeColor = (color: string | undefined) => {
  if (!color) return BRAND_GREEN;
  const c = color.trim().toLowerCase();
  if (
    c === LEGACY_RED_HEX.toLowerCase() || 
    c === '#e11d47' || 
    c === 'rgb(225, 29, 71)' || 
    c.includes('225, 29, 71') ||
    c === '#ff0000' ||
    c === 'red'
  ) {
    return BRAND_GREEN;
  }
  return color;
};

export const api = {
  // --- AUTHENTICATION ---
  login: async (id: string, password: string): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('password', password)
      .maybeSingle();

    if (error) throw new Error(`Authentication failed: ${error.message}`);
    if (!data) throw new Error('Authentication failed: Invalid Credentials');
    return data as User;
  },

  // --- MEMBER MANAGEMENT ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []) as User[];
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<{ success: boolean }> => {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);
    if (error) throw error;
    return { success: true };
  },

  addRider: async (riderData: Omit<User, 'totalRides' | 'leads' | 'sweeps' | 'rps' | 'totalKms'>): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...riderData, totalRides: 0, totalKms: 0, leads: 0, sweeps: 0, rps: 0 }])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as User;
  },

  // --- RIDE / EXPEDITION MANAGEMENT ---
  getRides: async (): Promise<Ride[]> => {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as Ride[];
  },

  getRideParticipants: async (rideId?: string): Promise<RideParticipant[]> => {
    let query = supabase.from('ride_participants').select('*');
    if (rideId) query = query.eq('rideId', rideId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as RideParticipant[];
  },

  createRide: async (rideData: Omit<Ride, 'id' | 'status'>): Promise<Ride> => {
    const { data, error } = await supabase
      .from('rides')
      .insert([{ ...rideData, status: 'upcoming' }])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as Ride;
  },

  updateRide: async (rideId: string, rideData: Partial<Ride>): Promise<{ success: boolean }> => {
    const { error } = await supabase
      .from('rides')
      .update(rideData)
      .eq('id', rideId);
    if (error) throw error;
    return { success: true };
  },

  deleteRide: async (rideId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('rides').delete().eq('id', rideId);
    if (error) throw error;
    return { success: true };
  },

  // --- CLUB SETTINGS ---
  getClubSettings: async (): Promise<ClubSettings> => {
    const { data, error } = await supabase
      .from('club_settings')
      .select('*')
      .maybeSingle();

    const defaults: ClubSettings = { 
      brandName: 'BIKERS', 
      brandSubName: 'CREED', 
      primaryColor: BRAND_GREEN, 
      logoUrl: '',
      achievements: [
        { threshold: 1000, label: "Iron Butt", category: 'Kms' },
        { threshold: 5, label: "First Lead", category: 'Leads' },
        { threshold: 10, label: "Road Master", category: 'Leads' },
        { threshold: 10, label: "Guardian", category: 'Sweeps' },
        { threshold: 5, label: "Tactician", category: 'RPs' },
        { threshold: 25, label: "Veteran", category: 'Rides' }
      ],
      upiId: '',
      gpayQrUrl: '',
      annualFee: 0,
      lifetimeFee: 0,
      dashboardBg: '#000000',
      headerBg: '#000000',
      headerText: '#ffffff',
      cardBg: '#0a0a0a',
      cardBorder: '#262626',
      globalFont: 'Montserrat',
      headingFont: 'Bebas Neue',
      navFont: 'Bebas Neue',
      statFont: 'Bebas Neue',
      buttonFont: 'Bebas Neue',
      inputFont: 'Montserrat',
      achievementFont: 'Bebas Neue',
      cardHeaderFont: 'Bebas Neue',
      sectionHeaderFont: 'Bebas Neue',
      buttonBg: BRAND_GREEN,
      buttonText: '#000000',
      statColor: BRAND_GREEN
    };

    if (error || !data) return defaults;

    return {
      ...data,
      primaryColor: sanitizeColor(data.primaryColor),
      buttonBg: sanitizeColor(data.buttonBg),
      statColor: sanitizeColor(data.statColor),
      dashboardBg: data.dashboardBg || '#000000',
      cardBg: data.cardBg || '#0a0a0a',
      headerBg: data.headerBg || '#000000',
      achievements: data.achievements || defaults.achievements,
      globalFont: data.globalFont || defaults.globalFont,
      headingFont: data.headingFont || defaults.headingFont,
      navFont: data.navFont || defaults.navFont,
      statFont: data.statFont || defaults.statFont,
      buttonFont: data.buttonFont || defaults.buttonFont,
      inputFont: data.inputFont || defaults.inputFont,
      achievementFont: data.achievementFont || defaults.achievementFont,
      cardHeaderFont: data.cardHeaderFont || defaults.cardHeaderFont,
      sectionHeaderFont: data.sectionHeaderFont || defaults.sectionHeaderFont
    } as ClubSettings;
  },

  updateClubSettings: async (settings: Partial<ClubSettings>): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('club_settings').upsert({ id: 1, ...settings });
    if (error) throw error;
    return { success: true };
  }
};
