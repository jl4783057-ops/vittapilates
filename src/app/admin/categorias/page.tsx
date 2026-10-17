"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { Category, PublicationStatus } from "@/types";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import {
  PublicationStatusSelector,
  PublicationStatusSegmented,
  PublicationStatusBadge,
} from "@/components/admin/PublicationStatusSelector";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const { categories, setCategories, addCategory, updateCategory, deleteCategory } = useApp();

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    bannerUrl: "",
    order: 1,
    status: "available" as PublicationStatus,
  });

  // Carregar categorias salvas no Supabase
  const loadCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn("Aviso ao carregar categorias no painel admin:", err);
    }
  }, [setCategories]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      bannerUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1000&q=80",
      order: categories.length + 1,
      status: "available",
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    const resolvedStatus: PublicationStatus =
      cat.status === "available" || cat.status === "updating" || cat.status === "hidden"
        ? cat.status
        : cat.published === false
        ? "hidden"
        : "available";

    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      bannerUrl: cat.bannerUrl || "",
      order: cat.order,
      status: resolvedStatus,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage(null);

    const status = formData.status;
    const published = status !== "hidden";

    try {
      if (isCreating) {
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          name: formData.name.trim(),
          slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, "-"),
          description: formData.description.trim(),
          bannerUrl: formData.bannerUrl,
          order: Number(formData.order),
          published,
          status,
        };

        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCat),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erro ao salvar nova categoria no Supabase.");
        }

        addCategory(newCat);
        setIsCreating(false);
        setToastMessage({ type: "success", text: `Categoria "${newCat.name}" criada com sucesso no Supabase!` });
      } else if (editingCat) {
        const updatedCat: Category = {
          ...editingCat,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim(),
          bannerUrl: formData.bannerUrl,
          order: Number(formData.order),
          published,
          status,
        };

        const res = await fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCat),
        });

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(resData.error || "Erro ao atualizar categoria no Supabase.");
        }

        const finalCat: Category = resData.category || updatedCat;
        updateCategory(editingCat.id, finalCat);
        setEditingCat(null);

        if (resData.needsMigration) {
          setToastMessage({
            type: "success",
            text: `Categoria "${finalCat.name}" salva! Para ativar o estado "Em atualização", aplique a migração 005 no Supabase.`,
          });
        } else {
          setToastMessage({
            type: "success",
            text: `Categoria "${finalCat.name}" salva com sucesso!`,
          });
        }
      }

      await loadCategories();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Falha ao salvar categoria:", err);
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar categoria." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (cat: Category, newStatus: PublicationStatus) => {
    const updated: Category = {
      ...cat,
      status: newStatus,
      published: newStatus !== "hidden",
    };

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || "Erro ao atualizar estado da categoria no Supabase.");
      }

      const finalCat: Category = resData.category || updated;
      updateCategory(cat.id, finalCat);
      const statusLabels: Record<PublicationStatus, string> = {
        available: "Disponível para alunas",
        updating: "Em atualização (banner cinza e aviso)",
        hidden: "Oculta (removida da área da aluna)",
      };

      if (resData.needsMigration) {
        setToastMessage({
          type: "success",
          text: `Estado alterado para "${statusLabels[newStatus]}". Aplique a migração 005 no Supabase para persistir 3 estados.`,
        });
      } else {
        setToastMessage({
          type: "success",
          text: `Categoria "${cat.name}" agora está: ${statusLabels[newStatus]}!`,
        });
      }
      await loadCategories();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      setToastMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao alterar estado de publicação.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#827B77] hover:text-[#292321]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Categorias
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle de publicação em 3 estados (Disponível, Em atualização e Oculta), banners e ordenação com persistência no Supabase.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {/* Grid de Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories
          .sort((a, b) => a.order - b.order)
          .map((cat) => {
            const currentStatus: PublicationStatus =
              cat.status === "available" || cat.status === "updating" || cat.status === "hidden"
                ? cat.status
                : cat.published === false
                ? "hidden"
                : "available";

            return (
              <div
                key={cat.id}
                className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#B77D82]/50 transition group"
              >
                <div>
                  <div className="relative h-36 w-full bg-[#F3EAE3] overflow-hidden">
                    {cat.bannerUrl ? (
                      <img
                        src={cat.bannerUrl}
                        alt={cat.name}
                        className={`w-full h-full object-cover transition duration-300 ${
                          currentStatus === "updating"
                            ? "grayscale contrast-90 opacity-75"
                            : currentStatus === "hidden"
                            ? "opacity-50"
                            : "group-hover:scale-102"
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#827B77]">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#292321]">
                          #{cat.order}
                        </span>
                        {cat.slug === "comunidade" && (
                          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Comunidade
                          </span>
                        )}
                      </div>
                      <PublicationStatusBadge status={currentStatus} size="xs" />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-serif font-bold text-base leading-tight">
                        {cat.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-[#827B77] line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                    <p className="text-[10px] text-[#827B77] font-mono">
                      Slug: /{cat.slug}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-[#FAF7F2] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#827B77]">
                      Estado:
                    </span>
                    <PublicationStatusSegmented
                      currentStatus={currentStatus}
                      onChange={(newStatus) => handleQuickStatusChange(cat, newStatus)}
                      size="xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#FAF7F2]">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 rounded-xl text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`)) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal de Criação / Edição de Categoria */}
      {(isCreating || editingCat) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-md w-full space-y-4 shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <h3 className="font-serif font-bold text-lg text-[#292321]">
                {isCreating ? "Nova Categoria" : "Editar Categoria"}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingCat(null);
                }}
                className="text-[#827B77] hover:text-[#292321] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pilates para Iniciantes"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Slug (URL amigável)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="pilates-iniciantes"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <ImageUploadField
                label="Imagem / Banner da Categoria"
                helperText="Clique em 'Enviar imagem' para selecionar a capa da categoria do seu computador (JPG, PNG ou WebP até 5 MB)."
                value={formData.bannerUrl}
                onChange={(url) => setFormData({ ...formData, bannerUrl: url })}
                aspectRatio="banner"
              />

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              {/* Seletor Explícito dos 3 Estados */}
              <div className="p-3.5 rounded-2xl border border-[#EADBCE] bg-white">
                <PublicationStatusSelector
                  value={formData.status}
                  onChange={(newStatus) => setFormData({ ...formData, status: newStatus })}
                  label="Estado de Publicação da Categoria"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingCat(null);
                  }}
                  className="px-4 py-2.5 rounded-full border border-[#EADBCE] text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] disabled:opacity-60 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? "Salvando no Supabase..." : "Salvar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
