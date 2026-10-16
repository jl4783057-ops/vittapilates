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
  AlertCircle,
  RefreshCw,
  Upload,
  CheckCircle2,
} from "lucide-react";

// Error Boundary para evitar tela branca em qualquer falha de renderização
class SubcategoriesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro capturado na tela de subcategorias:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-sm max-w-xl mx-auto my-8 space-y-4 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-lg text-[#292321]">
            Não foi possível carregar as subcategorias
          </h2>
          <p className="text-xs text-[#827B77] leading-relaxed">
            {this.state.error?.message || "Ocorreu uma inconsistência ao renderizar este registro."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C] transition cursor-pointer"
          >
            Recarregar componente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminSubcategoriesContent() {
  const { categories, setCategories, subcategories, setSubcategories } = useApp();

  const [filterCat, setFilterCat] = useState<string>("todas");
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Prévia de nova imagem selecionada (não substitui a atual até clicar em Salvar)
  const [newImagePreview, setNewImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: "cat-1",
    description: "",
    imageUrl: "",
    order: 1,
    published: true,
  });

  // Carregar categorias oficiais completas do Supabase
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

  // Carregar subcategorias salvas no Supabase
  const loadSubcategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subcategories");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.subcategories)) {
        setSubcategories(data.subcategories);
      }
    } catch (err) {
      console.warn("Aviso ao carregar subcategorias no painel admin:", err);
    }
  }, [setSubcategories]);

  React.useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, [loadCategories, loadSubcategories]);

  const filtered = (subcategories || []).filter((s) => {
    if (!s) return false;
    if (filterCat !== "todas" && s.categoryId !== filterCat) return false;
    return true;
  });

  const handleOpenCreate = () => {
    setModalError(null);
    setNewImagePreview("");
    const defaultCatId =
      filterCat !== "todas"
        ? filterCat
        : categories && categories[0]?.id
        ? categories[0].id
        : "cat-1";

    setFormData({
      name: "",
      slug: "",
      categoryId: defaultCatId,
      description: "",
      imageUrl: "",
      order: (subcategories?.length || 0) + 1,
      published: true,
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (sub: Subcategory) => {
    if (!sub) return;
    setModalError(null);
    setNewImagePreview("");
    setEditingSub(sub);

    // Tratamento estritamente defensivo para dados opcionais ou nulos
    setFormData({
      name: typeof sub.name === "string" ? sub.name : "",
      slug: typeof sub.slug === "string" ? sub.slug : "",
      categoryId: sub.categoryId || (categories?.[0]?.id || "cat-1"),
      description: typeof sub.description === "string" ? sub.description : "",
      imageUrl: typeof sub.imageUrl === "string" && sub.imageUrl !== "null" && sub.imageUrl !== "undefined" ? sub.imageUrl : "",
      order: typeof sub.order === "number" && Number.isFinite(sub.order) ? sub.order : 1,
      published: typeof sub.published === "boolean" ? sub.published : true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError("O nome da subcategoria é obrigatório.");
      return;
    }

    setIsSaving(true);
    setModalError(null);
    setToastMessage(null);

    setIsSaving(true);
    setModalError(null);
    setToastMessage(null);

    const slug = formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    // A nova imagem só substitui a imagem atual após clicar em Salvar
    const finalImageUrl = newImagePreview ? newImagePreview : formData.imageUrl;

    try {
      if (isCreating) {
        const newSub: Subcategory = {
          id: `sub-${Date.now()}`,
          name: formData.name.trim(),
          slug,
          categoryId: formData.categoryId,
          description: formData.description.trim() || undefined,
          imageUrl: finalImageUrl || undefined,
          order: Number(formData.order) || 1,
          published: formData.published,
        };

        const res = await fetch("/api/admin/subcategories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSub),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Erro ao salvar nova subcategoria no Supabase.");
        }

        setIsCreating(false);
        setNewImagePreview("");
        setToastMessage({ type: "success", text: `Subcategoria "${newSub.name}" criada com sucesso no Supabase!` });
      } else if (editingSub) {
        const updatedSub: Subcategory = {
          ...editingSub,
          name: formData.name.trim(),
          slug,
          categoryId: formData.categoryId,
          description: formData.description.trim() || undefined,
          imageUrl: finalImageUrl || undefined,
          order: Number(formData.order) || 1,
          published: formData.published,
        };

        const res = await fetch("/api/admin/subcategories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSub),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Erro ao atualizar subcategoria no Supabase.");
        }

        setEditingSub(null);
        setNewImagePreview("");
        setToastMessage({ type: "success", text: `Subcategoria "${updatedSub.name}" atualizada com sucesso no Supabase!` });
      }

      await loadSubcategories();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Falha ao salvar subcategoria:", err);
      setModalError(err instanceof Error ? err.message : "Erro ao salvar subcategoria.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSub = async (sub: Subcategory) => {
    if (!confirm(`Tem certeza que deseja excluir a subcategoria "${sub.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/subcategories?id=${encodeURIComponent(sub.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir subcategoria no banco.");
      }

      setToastMessage({ type: "success", text: `Subcategoria "${sub.name}" excluída com sucesso.` });
      await loadSubcategories();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao excluir subcategoria." });
    }
  };

  const togglePublish = async (sub: Subcategory) => {
    try {
      const updated = { ...sub, published: !sub.published };
      const res = await fetch("/api/admin/subcategories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await loadSubcategories();
      }
    } catch (err) {
      console.warn("Aviso ao alternar publicação da subcategoria:", err);
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
          Todas ({(subcategories || []).length})
        </button>
        {(categories || []).map((c) => (
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
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#B77D82] mx-auto flex items-center justify-center">
              <ListTree className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#292321]">
              {filterCat === "cat-comunidade"
                ? "Nenhuma subcategoria cadastrada para a categoria Comunidade."
                : "Nenhuma subcategoria encontrada para esta categoria."}
            </p>
            <p className="text-xs text-[#827B77]">
              {filterCat === "cat-comunidade"
                ? "A categoria Comunidade não possui divisões específicas por padrão."
                : "Você pode cadastrar uma nova subcategoria usando o botão acima."}
            </p>
          </div>
        ) : (
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
                  const parentCat = (categories || []).find((c) => c?.id === sub?.categoryId);
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
                            type="button"
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 rounded-lg border border-[#EADBCE] text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSub(sub)}
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
        )}
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
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSub(null);
                  setNewImagePreview("");
                }}
                className="p-1 rounded-lg text-[#827B77] hover:bg-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

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
                  {(categories || []).map((c) => (
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

              {/* Seção de Capa com Isolamento de Prévia e Preservação da Atual */}
              <div className="space-y-2 pt-1 border-t border-[#FAF7F2]">
                {/* 1. Imagem Atual (se existir) */}
                {formData.imageUrl && !newImagePreview && (
                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#EADBCE] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#292321] text-[11px] uppercase tracking-wider">
                        Capa atual cadastrada
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ativa no site
                      </span>
                    </div>
                    <div className="aspect-[16/8] max-h-36 rounded-xl overflow-hidden border border-[#EADBCE] bg-white">
                      <img src={formData.imageUrl} alt="Capa atual" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* 2. Prévia de Nova Capa Selecionada (Aguardando salvar) */}
                {newImagePreview && (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" /> Nova capa selecionada (prévia)
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewImagePreview("")}
                        className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                      >
                        Descartar e manter atual
                      </button>
                    </div>
                    <div className="aspect-[16/8] max-h-36 rounded-xl overflow-hidden border border-amber-300 bg-white">
                      <img src={newImagePreview} alt="Nova prévia" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Esta nova capa só substituirá a imagem atual quando você clicar em <strong>Salvar Subcategoria</strong>.
                    </p>
                  </div>
                )}

                {/* 3. Seletor de Nova Imagem */}
                <ImageUploadField
                  label={formData.imageUrl || newImagePreview ? "Alterar / Enviar Nova Imagem" : "Imagem / Capa da Subcategoria (Opcional)"}
                  helperText="Formatos aceitos: JPG, PNG, WebP ou GIF (máx. 5 MB). A seleção não altera o banco antes de salvar."
                  value={newImagePreview}
                  onChange={(url) => setNewImagePreview(url)}
                  aspectRatio="wide"
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
                    setNewImagePreview("");
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EADBCE] text-xs font-semibold text-[#827B77] hover:bg-[#FAF7F2] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-[#B77D82] hover:bg-[#A3676C] disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  {isSaving ? "Salvando no Supabase..." : "Salvar Subcategoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSubcategoriesPage() {
  return (
    <SubcategoriesErrorBoundary>
      <AdminSubcategoriesContent />
    </SubcategoriesErrorBoundary>
  );
}
