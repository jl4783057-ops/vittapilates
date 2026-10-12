"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { Category } from "@/types";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowUpDown,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const { categories, setCategories, addCategory, updateCategory, deleteCategory } = useApp();

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    bannerUrl: "",
    order: 1,
    published: true,
  });

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      bannerUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1000&q=80",
      order: categories.length + 1,
      published: true,
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      bannerUrl: cat.bannerUrl || "",
      order: cat.order,
      published: cat.published,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, "-"),
        description: formData.description.trim(),
        bannerUrl: formData.bannerUrl,
        order: Number(formData.order),
        published: formData.published,
      };
      addCategory(newCat);
      setIsCreating(false);
    } else if (editingCat) {
      updateCategory(editingCat.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        bannerUrl: formData.bannerUrl,
        order: Number(formData.order),
        published: formData.published,
      });
      setEditingCat(null);
    }
  };

  const togglePublish = (cat: Category) => {
    updateCategory(cat.id, { published: !cat.published });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Categorias
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Controle das 8 categorias principais do catálogo, banners e ordenação.
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
          .map((cat) => (
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
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#827B77]">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#292321]">
                    Ordem: #{cat.order}
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

              <div className="p-4 pt-2 border-t border-[#FAF7F2] flex items-center justify-between">
                <button
                  onClick={() => togglePublish(cat)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                    cat.published
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-[#FAF7F2] text-[#827B77] border border-[#EADBCE]"
                  }`}
                >
                  {cat.published ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Publicada
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Oculta
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 rounded-xl text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition"
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
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                className="text-[#827B77] hover:text-[#292321]"
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

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  URL da Imagem / Banner
                </label>
                <input
                  type="url"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="catPublished"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="rounded border-[#EADBCE] text-[#B77D82]"
                  />
                  <label htmlFor="catPublished" className="text-xs font-semibold text-[#292321]">
                    Publicado
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
