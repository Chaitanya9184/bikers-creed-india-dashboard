
export enum ClubRole {
  RIDER = 'Rider',
  MARSHAL = 'Marshal',
}

export enum RideRole {
  LEAD = 'Lead',
  SWEEP = 'Sweep',
  RP = 'RP',
  RIDER = 'Rider',
}

export enum SubscriptionType {
  NONE = 'None',
  ANNUAL = 'Annual',
  LIFETIME = 'Lifetime',
}

export type AchievementCategory = 'Kms' | 'Leads' | 'Sweeps' | 'RPs' | 'Rides';

export interface Achievement {
  id?: string;
  threshold: number;
  label: string;
  category: AchievementCategory;
  icon?: string;
}

export interface User {
  id: string; // Phone number
  name: string;
  avatarUrl: string;
  clubRole: ClubRole;
  totalRides: number;
  totalKms: number;
  leads: number;
  sweeps: number;
  rps: number;
  password?: string;
  // Biker Profile Fields
  about?: string;
  dreamRide?: string;
  bikeModel?: string;
  favDestination?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  // Personalized Fields
  ridingStyle?: string;
  experienceYears?: string;
  favGearBrand?: string;
  rideMemory?: string;
  // Subscription fields
  subscriptionType: SubscriptionType;
  subscriptionExpiry?: string; // ISO string
  paymentStatus: 'Paid' | 'Pending';
}

export interface ClubSettings {
  upiId: string;
  gpayQrUrl: string;
  annualFee: number;
  lifetimeFee: number;
  // Global Branding
  brandName: string;
  brandSubName: string;
  logoUrl?: string;
  primaryColor: string;
  // Section Specific Styles
  dashboardBg: string;
  headerBg: string;
  headerText: string;
  cardBg: string;
  cardBorder: string;
  // Granular Typography
  globalFont: string;
  headingFont: string;
  navFont: string;
  statFont: string;
  buttonFont: string;
  inputFont: string;
  achievementFont: string;
  cardHeaderFont: string;
  sectionHeaderFont: string;
  // Deep Section Colors
  buttonBg: string;
  buttonText: string;
  statColor: string;
  // Achievements
  achievements: Achievement[];
}

export interface MerchandiseItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  description: string;
}

export interface Ride {
  id: string;
  title: string;
  summary: string;
  notes?: string; 
  date: string; 
  startTime: string; 
  endTime: string; 
  durationDays: number;
  terrainTypes: string[]; 
  customTerrain?: string;
  marshalId: string;
  mapLink: string;
  status: 'upcoming' | 'completed';
  feedbackLink?: string;
  driveLink?: string; 
}

export interface RideParticipant {
  rideId: string;
  userId: string;
  role: RideRole;
  attended: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  createdBy: string;
  isActive: boolean;
}

export interface UserVote {
  pollId: string;
  userId: string;
  optionId: string;
}
