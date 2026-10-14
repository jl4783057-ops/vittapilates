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

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
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
  logout: () => void;
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
  const [mounted, setMounted] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(INITIAL_SUBCATEGORIES);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(INITIAL_QUIZ_QUESTIONS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]); // Padrão Mariana Silveira (aluna)

  // Carregar dados salvos no navegador na montagem
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(`${STORAGE_KEY_PREFIX}settings`);
      if (savedSettings) setSiteSettings(JSON.parse(savedSettings));

      const savedCategories = localStorage.getItem(`${STORAGE_KEY_PREFIX}categories`);
      if (savedCategories) setCategories(JSON.parse(savedCategories));

      const savedSubcategories = localStorage.getItem(`${STORAGE_KEY_PREFIX}subcategories`);
      if (savedSubcategories) setSubcategories(JSON.parse(savedSubcategories));

      const savedLessons = localStorage.getItem(`${STORAGE_KEY_PREFIX}lessons`);
      if (savedLessons) setLessons(JSON.parse(savedLessons));

      const savedQuestions = localStorage.getItem(`${STORAGE_KEY_PREFIX}quiz_questions`);
      if (savedQuestions) setQuizQuestions(JSON.parse(savedQuestions));

      const savedUsers = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedCurrentUser = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user`);
      if (savedCurrentUser) {
        setCurrentUser(JSON.parse(savedCurrentUser));
      } else {
        // Aluna padrão ativa
        setCurrentUser(INITIAL_USERS[0]);
      }
    } catch (e) {
      console.warn("Aviso ao carregar dados do LocalStorage:", e);
    }
    setMounted(true);
  }, []);

  // Persistir alterações
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(siteSettings));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}subcategories`, JSON.stringify(subcategories));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}lessons`, JSON.stringify(lessons));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}quiz_questions`, JSON.stringify(quizQuestions));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
      if (currentUser) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
      }
    } catch (e) {
      console.warn("Erro ao salvar no LocalStorage:", e);
    }
  }, [mounted, siteSettings, categories, subcategories, lessons, quizQuestions, users, currentUser]);

  const updateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSiteSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const login = (email: string, role?: 'aluna' | 'admin'): boolean => {
    let found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      // Criar nova usuária caso não exista
      found = {
        id: `user-${Date.now()}`,
        name: email.split("@")[0].replace(".", " "),
        email: email,
        role: role || "aluna",
        createdAt: new Date().toISOString(),
        subscriptionStatus: "active",
        subscriptionPlan: "Mensal",
        completedLessonIds: [],
      };
      setUsers((prev) => [found!, ...prev]);
    } else if (role && found.role !== role) {
      found = { ...found, role };
      setUsers((prev) => prev.map((u) => (u.id === found!.id ? found! : u)));
    }
    setCurrentUser(found);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleLessonCompletion = (lessonId: string) => {
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

  const saveQuizPlan = (plan: QuizPlanResult) => {
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        name: plan.userName || currentUser.name,
        customPlan: plan,
      };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    }
  };

  const updateUserProfile = (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, ...data };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const addLesson = (lesson: Lesson) => {
    setLessons((prev) => [lesson, ...prev]);
  };

  const updateLesson = (lessonId: string, updatedFields: Partial<Lesson>) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...updatedFields } : l))
    );
  };

  const deleteLesson = (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  const addCategory = (category: Category) => {
    setCategories((prev) => [...prev, category]);
  };

  const updateCategory = (categoryId: string, fields: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...fields } : c))
    );
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSubcategories((prev) => prev.filter((s) => s.categoryId !== categoryId));
  };

  const addSubcategory = (subcategory: Subcategory) => {
    setSubcategories((prev) => [...prev, subcategory]);
  };

  const updateSubcategory = (subcategoryId: string, fields: Partial<Subcategory>) => {
    setSubcategories((prev) =>
      prev.map((s) => (s.id === subcategoryId ? { ...s, ...fields } : s))
    );
  };

  const deleteSubcategory = (subcategoryId: string) => {
    setSubcategories((prev) => prev.filter((s) => s.id !== subcategoryId));
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
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
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
