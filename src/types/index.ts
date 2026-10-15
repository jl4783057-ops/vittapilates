export type UserRole = 'aluna' | 'admin';

export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'canceled';
export type SubscriptionPlan = 'Mensal' | 'Trimestral' | 'Anual';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionRenewalDate?: string;
  accessType?: 'none' | 'subscriber' | 'courtesy';
  accessExpiresAt?: string | null;
  completedLessonIds: string[];
  lastLessonId?: string;
  customPlan?: QuizPlanResult | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  bannerUrl?: string;
  order: number;
  published: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  order: number;
  published: boolean;
}

export type LessonLevel = 'iniciante' | 'intermediário' | 'avançado';
export type LessonFormat = 'aula rápida' | 'aula completa' | 'sequência guiada' | 'programa por dias';
export type LessonEquipment = 'sem equipamento' | 'com acessórios';
export type LessonStatus = 'rascunho' | 'publicado';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  durationMinutes: number;
  level: LessonLevel;
  format: LessonFormat;
  equipment: LessonEquipment;
  materials: string;
  thumbnailUrl: string;
  videoUrl: string;
  order: number;
  status: LessonStatus;
  tags: string[];
  viewsCount?: number;
  completionsCount?: number;
}

export type QuizQuestionType =
  | 'text'
  | 'date'
  | 'single'
  | 'multiple'
  | 'frequency'
  | 'duration';

export interface QuizOption {
  id: string;
  label: string;
  value: string;
  helperText?: string;
  iconName?: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  title: string;
  helperText?: string;
  imageUrl?: string;
  type: QuizQuestionType;
  required: boolean;
  options: QuizOption[];
  privacyNotice?: string;
}

export interface QuizAnswers {
  name?: string;
  birthDate?: string;
  mainGoal?: string;
  lastIdealWeight?: string;
  targetArea?: string;
  bodyType?: string;
  desiredBodyShape?: string;
  dailyRoutine?: string;
  energyLevels?: string;
  activityLevel?: string;
  sleepHours?: string;
  badHabits?: string[];
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  bmi?: number;
  desiredPace?: string;
  experience?: string;
  weeklyDays?: number;
  durationMinutes?: number;
  preferredFormat?: string;
  equipment?: string;
  physicalAdaptation?: string;
  sessionId?: string;
  email?: string;
  [key: string]: unknown;
}

export interface QuizPlanResult {
  id: string;
  userName: string;
  mainGoal: string;
  weeklyDays?: number;
  durationMinutes?: number;
  birthDate?: string;
  currentWeight?: number;
  targetWeight?: number;
  heightCm?: number;
  bmi?: number;
  bodyType?: string;
  desiredBodyShape?: string;
  targetArea?: string;
  dailyRoutine?: string;
  activityLevel?: string;
  targetDate?: string;
  experience?: string;
  consistencyForecast?: {
    monthlyHours: number;
    estimatedSessionsQuarter: number;
    disclaimer: string;
  };
  recommendedCategoryNames?: string[];
  recommendedLessonIds?: string[];
  scheduleWeek?: Array<{
    day: string;
    focus: string;
    lessonId?: string;
  }>;
  createdAt?: string;
  quizSessionId?: string;
}

export interface SiteSettings {
  platformName: string;
  logoText: string;
  logoUrl?: string;
  loginTitle: string;
  loginSubtitle: string;
  loginBannerUrl?: string;
  whatsappCommunityUrl: string;
  whatsappCommunityTitle: string;
  whatsappCommunitySubtitle: string;
  whatsappCommunityButtonText: string;
  libraryHeroTitle: string;
  libraryHeroSubtitle: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  changePercent?: number;
  isPositive?: boolean;
  tooltip?: string;
}

export interface FinancialMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  cancellations: number;
  mrr: number;
  collectedRevenue: number;
  churnRate: number;
  arpu: number;
  renewalRate: number;
  chartData: {
    date: string;
    revenue: number;
    activeUsers: number;
    newUsers: number;
    canceledUsers: number;
  }[];
}
