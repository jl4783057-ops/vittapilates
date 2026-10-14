"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { Subcategory } from "@/types";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import {
  ListTree,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  ImageIcon,
} from "lucide-react";

export default function AdminSubcategoriesPage() {
  const { categories, subcategories, addSubcategory, updateSubcategory, deleteSubcategory, setSubcategories } = useApp();

  // Carregar subcategorias salvas no Supabase
  React.useEffect(() => {
    let isCancelled = false;
    async function fetchSubcategories() {
      try {
        const res = await fetch("/api/admin/subcategories");
        if (!res.ok) return;
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.subcategories) && data.subcategories.length > 0) {
          setSubcategories(data.subcategories);
        }
      } catch (err) {
        console.warn("Aviso ao carregar subcategorias no painel admin:", err);
      }
    }
    fetchSubcategories();
    return () => {
      isCancelled = true;
    };
  }, [setSubcategories]);

  const [filterCat, setFilterCat] = useState<string>("todas");
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: categories[0]?.id || "cat-1",
    description: "",
    imageUrl: "",
    order: 1,
    published: true,
  });

  const filtered = subcategories.filter((s) => {
    if (filterCat !== "todas" && s.categoryId !== filterCat) return false;
    return true;
  });

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      slug: "",
      categoryId: filterCat !== "todas" ? filterCat : categories[0]?.id || "cat-1",
      description: "",
      imageUrl: "",
      order: subcategories.length + 1,
      published: true,
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (sub: Subcategory) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      slug: sub.slug,
      categoryId: sub.categoryId,
      description: sub.description || "",
      imageUrl: sub.imageUrl || "",
      order: sub.order,
      published: sub.published,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      const newSub: Subcategory = {
        id: `sub-${Date.now()}`,
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, "-"),
        categoryId: formData.categoryId,
        description: formData.description,
        imageUrl: formData.imageUrl || undefined,
        order: Number(formData.order),
        published: formData.published,
      };
      addSubcategory(newSub);
      setIsCreating(false);
    } else if (editingSub) {
      updateSubcategory(editingSub.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        categoryId: formData.categoryId,
        description: formData.description,
        imageUrl: formData.imageUrl || undefined,
        order: Number(formData.order),
        published: formData.published,
      });
      setEditingSub(null);
    }
  };

  const togglePublish = (sub: Subcategory) => {
    updateSubcategory(sub.id, { published: !sub.published });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Gestão de Subcategorias
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Mapeamento dos focos específicos dentro de cada categoria principal com upload de imagem.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Subcategoria
        </button>
      </div>

      {/* Filtro por Categoria Mãe */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-[#827B77] font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
          Filtrar por Categoria:
        </span>
        <button
          onClick={() => setFilterCat("todas")}
          className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            filterCat === "todas"
              ? "bg-[#B77D82] text-white"
              : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE]"
          }`}
        >
          Todas ({subcategories.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              filterCat === c.id
                ? "bg-[#B77D82] text-white"
                : "bg-[#FFFFFF] text-[#827B77] border border-[#EADBCE] hover:text-[#292321]"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Tabela de Subcategorias */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#827B77] uppercase text-[10px] tracking-wider border-b border-[#EADBCE]">
              <tr>
                <th className="p-4">Subcategoria</th>
                <th className="p-4">Categoria Mãe</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Ordem</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {filtered.map((sub) => {
                const parentCat = categories.find((c) => c.id === sub.categoryId);
                return (
                  <tr key={sub.id} className="hover:bg-[#FAF7F2]/50 transition">
                    <td className="p-4 font-semibold text-[#292321]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F3EAE3] border border-[#EADBCE] shrink-0 flex items-center justify-center">
                          {sub.imageUrl ? (
                            <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-[#827B77]/60" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#292321]">{sub.name}</p>
                          {sub.description && (
                            <p className="text-[11px] text-[#827B77] line-clamp-1">{sub.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F7EEEE] text-[#B77D82] font-medium text-[11px]">
                        {parentCat?.name || "Sem categoria"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-[#827B77]">
                      {sub.slug}
                    </td>
                    <td className="p-4 font-semibold text-[#292321]">
                      #{sub.order}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => togglePublish(sub)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          sub.published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[#FAF7F2] text-[#827B77] border border-[#EADBCE]"
                        }`}
                      >
                        {sub.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {sub.published ? "Publicada" : "Rascunho"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(sub)}
                          className="p-1.5 rounded-lg border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir a subcategoria "${sub.name}"?`)) {
                              deleteSubcategory(sub.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-[#EADBCE] text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {(isCreating || editingSub) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-3xl border border-[#EADBCE] shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <h2 className="font-serif font-bold text-lg text-[#292321]">
                {isCreating ? "Criar Nova Subcategoria" : `Editar Subcategoria`}
              </h2>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingSub(null);
                }}
                className="p-1 rounded-lg text-[#827B77] hover:bg-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Categoria Mãe
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Nome da Subcategoria
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Alongamento e amplitude de movimento"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="alongamento-amplitude"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              {/* Imagem / Capa da Subcategoria */}
              <ImageUploadField
                label="Imagem / Capa da Subcategoria (Opcional)"
                helperText="Clique em 'Enviar imagem' para selecionar a capa da subcategoria do seu Mac ou Windows (JPG, PNG ou WebP até 5 MB)."
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                aspectRatio="wide"
              />

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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="rounded text-[#B77D82] focus:ring-[#B77D82]"
                    />
                    <span className="text-xs text-[#292321] font-medium">Publicada no site</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EADBCE]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSub(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
