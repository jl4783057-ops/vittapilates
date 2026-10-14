"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  Category,
  Subcategory,
  Lesson,
  QuizQuestion,
  SiteSettings,
  QuizPlanResult,
} from "@/types";
import {
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_LESSONS,
  INITIAL_QUIZ_QUESTIONS,
  INITIAL_USERS,
} from "@/lib/data/initial-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthLoading: boolean;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  subcategories: Subcategory[];
  setSubcategories: React.Dispatch<React.SetStateAction<Subcategory[]>>;
  lessons: Lesson[];
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  quizQuestions: QuizQuestion[];
  setQuizQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  // Ações de negócio
  login: (email: string, role?: 'aluna' | 'admin') => boolean;
  logout: () => Promise<void>;
  toggleLessonCompletion: (lessonId: string) => void;
  saveQuizPlan: (plan: QuizPlanResult) => void;
  updateUserProfile: (data: Partial<User>) => void;
  addLesson: (lesson: Lesson) => void;
  updateLesson: (lessonId: string, lesson: Partial<Lesson>) => void;
  deleteLesson: (lessonId: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (categoryId: string, category: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;
  addSubcategory: (subcategory: Subcategory) => void;
  updateSubcategory: (subcategoryId: string, subcategory: Partial<Subcategory>) => void;
  deleteSubcategory: (subcategoryId: string) => void;
  updateQuizQuestion: (questionId: string, question: Partial<QuizQuestion>) => void;
  addQuizQuestion: (question: QuizQuestion) => void;
  deleteQuizQuestion: (questionId: string) => void;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "pilates_em_casa_v1_";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Source of truth is Supabase (via /api/catalog); never seed from localStorage.
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SETTINGS);

  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}categories`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_CATEGORIES;
  });

  const [subcategories, setSubcategories] = useState<Subcategory[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}subcategories`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_SUBCATEGORIES;
  });

  const [lessons, setLessons] = useState<Lesson[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}lessons`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_LESSONS;
  });

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}quiz_questions`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_QUIZ_QUESTIONS;
  });

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Função auxiliar para mapear perfil do Supabase para o formato User
  const syncProfileForAuthUser = async (userId: string, userEmail: string): Promise<User | null> => {
    if (!supabase) return null;
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        console.warn("Perfil não encontrado no Supabase para", userId, error);
        return null;
      }

      const mappedUser: User = {
        id: profile.id,
        name: profile.name || userEmail.split("@")[0].replace(".", " "),
        email: profile.email || userEmail,
        role: profile.role || "aluna",
        avatarUrl: profile.avatar_url || undefined,
        phone: profile.phone || undefined,
        createdAt: profile.created_at || new Date().toISOString(),
        subscriptionStatus: profile.subscription_status || "inactive",
        subscriptionPlan: profile.subscription_plan || "Mensal",
        subscriptionRenewalDate: profile.subscription_renewal_date || undefined,
        accessType: profile.access_type || "none",
        accessExpiresAt: profile.access_expires_at || null,
        completedLessonIds: profile.completed_lesson_ids || [],
        lastLessonId: profile.last_lesson_id || undefined,
        customPlan: profile.custom_plan || null,
      };

      return mappedUser;
    } catch (err) {
      console.error("Erro ao sincronizar perfil do Supabase:", err);
      return null;
    }
  };

  const isInitialMount = React.useRef(true);

  // Limpeza de chaves legadas e carregamento dos dados compartilhados do Supabase
  useEffect(() => {
    let isCancelled = false;
    try {
      // Remove legacy copies of profiles from browser storage. Authenticated session
      // tokens are managed separately by Supabase Auth.
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}settings`);
    } catch (e) {
      console.warn("Aviso ao limpar resíduos do LocalStorage:", e);
    }

    // Carrega dados compartilhados do banco via API unificada
    async function loadSharedCatalog() {
      try {
        const res = await fetch("/api/catalog");
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data.configured) {
          if (data.siteSettings) setSiteSettings(data.siteSettings);
          if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories);
          if (Array.isArray(data.subcategories) && data.subcategories.length > 0) setSubcategories(data.subcategories);
          if (Array.isArray(data.lessons) && data.lessons.length > 0) setLessons(data.lessons);
        }
      } catch (err) {
        console.warn("Aviso ao buscar catálogo compartilhado do Supabase:", err);
      }
    }

    loadSharedCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Monitorar e sincronizar autenticação da Supabase
  useEffect(() => {
    let isCancelled = false;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (!isCancelled) {
            setCurrentUser(null);
            setIsAuthLoading(false);
          }
          return;
        }

        const userProfile = await syncProfileForAuthUser(session.user.id, session.user.email || "");
        if (!isCancelled) {
          setCurrentUser(userProfile);
          setIsAuthLoading(false);

          try {
            const lessonsRes = await fetch("/api/aluna/lessons");
            if (lessonsRes.ok) {
              const lessonsJson = await lessonsRes.json();
              if (Array.isArray(lessonsJson.lessons) && lessonsJson.lessons.length > 0) {
                setLessons(lessonsJson.lessons);
              }
            }
          } catch {
            // Silencioso
          }
        }
      } catch (err) {
        console.error("Erro ao verificar sessão Supabase:", err);
        if (!isCancelled) {
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_OUT" || !session?.user) {
            setCurrentUser(null);
            setLessons([]);
            setIsAuthLoading(false);
            try {
              localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
              localStorage.removeItem(`${STORAGE_KEY_PREFIX}lessons`);
            } catch (e) {}
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            setIsAuthLoading(true);
            const userProfile = await syncProfileForAuthUser(session.user.id, session.user.email || "");
            setCurrentUser(userProfile);
            setIsAuthLoading(false);

            // Se for aluna com sessão ativa, busca suas aulas liberadas com segurança via rota protegida
            try {
              const lessonsRes = await fetch("/api/aluna/lessons");
              if (lessonsRes.ok) {
                const lessonsJson = await lessonsRes.json();
                if (Array.isArray(lessonsJson.lessons) && lessonsJson.lessons.length > 0) {
                  setLessons(lessonsJson.lessons);
                }
              }
            } catch {
              // Silencioso
            }
          }
        }
      );

      return () => {
        isCancelled = true;
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Persistir alterações
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}subcategories`, JSON.stringify(subcategories));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}lessons`, JSON.stringify(lessons));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}quiz_questions`, JSON.stringify(quizQuestions));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
    } catch (e) {
      console.warn("Erro ao salvar no LocalStorage:", e);
    }
  }, [categories, subcategories, lessons, quizQuestions]);

  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    // Local state only: persistence is done (and confirmed) by the caller via /api/admin/settings.
    setSiteSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const login = (email: string, role?: 'aluna' | 'admin'): boolean => {
    // Mantido apenas para compatibilidade legada se chamado sem Supabase
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Erro ao deslogar da Supabase:", err);
    } finally {
      setCurrentUser(null);
      try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
      } catch (e) {}
    }
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!currentUser) return;
    const isCompleted = currentUser.completedLessonIds.includes(lessonId);
    const updatedIds = isCompleted
      ? currentUser.completedLessonIds.filter((id) => id !== lessonId)
      : [...currentUser.completedLessonIds, lessonId];

    const updatedUser: User = {
      ...currentUser,
      completedLessonIds: updatedIds,
      lastLessonId: lessonId,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    if (isSupabaseConfigured && supabase && currentUser.id) {
      try {
        await supabase
          .from("profiles")
          .update({
            completed_lesson_ids: updatedIds,
            last_lesson_id: lessonId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);
      } catch (e) {
        console.warn("Erro ao atualizar progresso no Supabase:", e);
      }
    }

    // Incrementar contagem de conclusões da aula
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
              ...l,
              completionsCount: Math.max(
                0,
                (l.completionsCount || 0) + (isCompleted ? -1 : 1)
              ),
            }
          : l
      )
    );
  };

  const saveQuizPlan = async (plan: QuizPlanResult) => {
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        name: plan.userName || currentUser.name,
        customPlan: plan,
      };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      if (isSupabaseConfigured && supabase && currentUser.id) {
        try {
          await supabase
            .from("profiles")
            .update({
              custom_plan: plan,
              name: plan.userName || currentUser.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentUser.id);
        } catch (e) {
          console.warn("Erro ao salvar plano no Supabase:", e);
        }
      }
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, ...data };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    if (isSupabaseConfigured && supabase && currentUser.id) {
      try {
        const updatePayload: {
          updated_at: string;
          name?: string;
          avatar_url?: string;
          phone?: string;
        } = {
          updated_at: new Date().toISOString(),
        };
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.avatarUrl !== undefined) updatePayload.avatar_url = data.avatarUrl;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", currentUser.id);
      } catch (e) {
        console.warn("Erro ao salvar perfil no Supabase:", e);
      }
    }
  };

  const addLesson = (lesson: Lesson) => {
    setLessons((prev) => [lesson, ...prev]);
    fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lesson),
    }).catch(() => {});
  };

  const updateLesson = (lessonId: string, updatedFields: Partial<Lesson>) => {
    setLessons((prev) => {
      const updated = prev.map((l) => (l.id === lessonId ? { ...l, ...updatedFields } : l));
      const target = updated.find((l) => l.id === lessonId);
      if (target) {
        fetch("/api/admin/lessons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target),
        }).catch(() => {});
      }
      return updated;
    });
  };

  const deleteLesson = (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    fetch(`/api/admin/lessons?id=${encodeURIComponent(lessonId)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const addCategory = (category: Category) => {
    setCategories((prev) => [...prev, category]);
    fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    }).catch(() => {});
  };

  const updateCategory = (categoryId: string, fields: Partial<Category>) => {
    setCategories((prev) => {
      const updated = prev.map((c) => (c.id === categoryId ? { ...c, ...fields } : c));
      const target = updated.find((c) => c.id === categoryId);
      if (target) {
        fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target),
        }).catch(() => {});
      }
      return updated;
    });
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSubcategories((prev) => prev.filter((s) => s.categoryId !== categoryId));
    fetch(`/api/admin/categories?id=${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const addSubcategory = (subcategory: Subcategory) => {
    setSubcategories((prev) => [...prev, subcategory]);
    fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subcategory),
    }).catch(() => {});
  };

  const updateSubcategory = (subcategoryId: string, fields: Partial<Subcategory>) => {
    setSubcategories((prev) => {
      const updated = prev.map((s) => (s.id === subcategoryId ? { ...s, ...fields } : s));
      const target = updated.find((s) => s.id === subcategoryId);
      if (target) {
        fetch("/api/admin/subcategories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target),
        }).catch(() => {});
      }
      return updated;
    });
  };

  const deleteSubcategory = (subcategoryId: string) => {
    setSubcategories((prev) => prev.filter((s) => s.id !== subcategoryId));
    fetch(`/api/admin/subcategories?id=${encodeURIComponent(subcategoryId)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const updateQuizQuestion = (questionId: string, fields: Partial<QuizQuestion>) => {
    setQuizQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...fields } : q))
    );
  };

  const addQuizQuestion = (question: QuizQuestion) => {
    setQuizQuestions((prev) => [...prev, question]);
  };

  const deleteQuizQuestion = (questionId: string) => {
    setQuizQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const resetToDefaults = () => {
    setSiteSettings(INITIAL_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setSubcategories(INITIAL_SUBCATEGORIES);
    setLessons(INITIAL_LESSONS);
    setQuizQuestions(INITIAL_QUIZ_QUESTIONS);
    setUsers(INITIAL_USERS);
    setCurrentUser(null);
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) localStorage.removeItem(key);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthLoading,
        users,
        setUsers,
        categories,
        setCategories,
        subcategories,
        setSubcategories,
        lessons,
        setLessons,
        quizQuestions,
        setQuizQuestions,
        siteSettings,
        updateSiteSettings,
        login,
        logout,
        toggleLessonCompletion,
        saveQuizPlan,
        updateUserProfile,
        addLesson,
        updateLesson,
        deleteLesson,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        updateQuizQuestion,
        addQuizQuestion,
        deleteQuizQuestion,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser utilizado dentro de um AppProvider");
  }
  return context;
}
