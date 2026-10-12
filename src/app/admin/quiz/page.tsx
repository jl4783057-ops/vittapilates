"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/store/context";
import { QuizQuestion, QuizOption, QuizQuestionType } from "@/types";
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Smartphone,
  Eye,
  Save,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminQuizEditorPage() {
  const { quizQuestions, setQuizQuestions, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion } = useApp();

  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState<{
    title: string;
    helperText: string;
    type: QuizQuestionType;
    required: boolean;
    privacyNotice: string;
    options: QuizOption[];
  }>({
    title: "",
    helperText: "",
    type: "single",
    required: true,
    privacyNotice: "",
    options: [
      { id: "opt-1", label: "Opção 1", value: "opcao_1" },
      { id: "opt-2", label: "Opção 2", value: "opcao_2" },
    ],
  });

  const handleOpenCreate = () => {
    setFormData({
      title: "",
      helperText: "",
      type: "single",
      required: true,
      privacyNotice: "",
      options: [
        { id: `opt-1`, label: "Opção A", value: "opcao_a" },
        { id: `opt-2`, label: "Opção B", value: "opcao_b" },
      ],
    });
    setIsCreating(true);
  };

  const handleOpenEdit = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setFormData({
      title: q.title,
      helperText: q.helperText || "",
      type: q.type,
      required: q.required,
      privacyNotice: q.privacyNotice || "",
      options: q.options || [],
    });
  };

  const handleAddOption = () => {
    const nextIdx = formData.options.length + 1;
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { id: `opt-${Date.now()}`, label: `Nova Opção ${nextIdx}`, value: `opcao_${nextIdx}` },
      ],
    });
  };

  const handleUpdateOption = (index: number, label: string) => {
    const updated = [...formData.options];
    updated[index] = {
      ...updated[index],
      label,
      value: label.toLowerCase().replace(/\s+/g, "_"),
    };
    setFormData({ ...formData, options: updated });
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      const newQ: QuizQuestion = {
        id: `q-${Date.now()}`,
        order: quizQuestions.length + 1,
        title: formData.title.trim(),
        helperText: formData.helperText.trim(),
        type: formData.type,
        required: formData.required,
        privacyNotice: formData.privacyNotice.trim(),
        options: formData.options,
      };
      addQuizQuestion(newQ);
      setIsCreating(false);
      setSuccessMsg("Pergunta criada com sucesso!");
    } else if (editingQuestion) {
      updateQuizQuestion(editingQuestion.id, {
        title: formData.title.trim(),
        helperText: formData.helperText.trim(),
        type: formData.type,
        required: formData.required,
        privacyNotice: formData.privacyNotice.trim(),
        options: formData.options,
      });
      setEditingQuestion(null);
      setSuccessMsg("Pergunta atualizada com sucesso!");
    }
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EADBCE]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#292321]">
            Editor do Quiz Personalizado
          </h1>
          <p className="text-xs sm:text-sm text-[#827B77] mt-1">
            Configure etapas, enunciados, opções, tipos de campo e teste a pré-visualização em smartphone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPreviewStep(0);
              setShowMobilePreview(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#B77D82] text-[#B77D82] hover:bg-[#F7EEEE] text-xs font-semibold transition"
          >
            <Smartphone className="w-4 h-4" />
            Pré-visualizar no Celular
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B77D82] hover:bg-[#A3676C] text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Nova Pergunta
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Lista de Perguntas Configuradas */}
      <div className="space-y-3">
        {quizQuestions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EADBCE] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#B77D82]/50 transition"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#F3EAE3] text-[#B77D82] font-semibold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B77D82] bg-[#F7EEEE] px-2 py-0.5 rounded-full">
                    Tipo: {q.type}
                  </span>
                  {q.required && (
                    <span className="text-[10px] font-semibold text-rose-600">
                      Obrigatória
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-sm text-[#292321]">
                  {q.title}
                </h3>
                {q.helperText && (
                  <p className="text-xs text-[#827B77] line-clamp-1">
                    {q.helperText}
                  </p>
                )}
                {q.options && q.options.length > 0 && (
                  <p className="text-[11px] text-[#827B77]">
                    Opções: {q.options.map((o) => o.label).join(" • ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => handleOpenEdit(q)}
                className="p-2 rounded-xl text-[#827B77] hover:text-[#292321] hover:bg-[#FAF7F2] transition"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Excluir a pergunta "${q.title}"?`)) {
                    deleteQuizQuestion(q.id);
                  }
                }}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação / Edição de Pergunta */}
      {(isCreating || editingQuestion) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#EADBCE] p-6 max-w-lg w-full space-y-4 shadow-xl animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EADBCE]">
              <h3 className="font-serif font-bold text-lg text-[#292321]">
                {isCreating ? "Nova Etapa do Quiz" : "Editar Etapa"}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingQuestion(null);
                }}
                className="text-[#827B77] hover:text-[#292321]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Enunciado da Pergunta
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Quanto tempo você tem para praticar?"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                  Texto Auxiliar / Orientação
                </label>
                <input
                  type="text"
                  value={formData.helperText}
                  onChange={(e) => setFormData({ ...formData, helperText: e.target.value })}
                  placeholder="Ex: Não se preocupe, temos aulas rápidas a partir de 5 min"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Tipo de Resposta
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as QuizQuestionType })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  >
                    <option value="single">Escolha Única</option>
                    <option value="multiple">Múltipla Escolha</option>
                    <option value="text">Texto Curto (Nome)</option>
                    <option value="date">Data (Nascimento)</option>
                    <option value="frequency">Frequência (Dias/Semana)</option>
                    <option value="duration">Duração (Minutos)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="qRequired"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="rounded border-[#EADBCE] text-[#B77D82]"
                  />
                  <label htmlFor="qRequired" className="text-xs font-semibold text-[#292321]">
                    Obrigatória
                  </label>
                </div>
              </div>

              {formData.type === "date" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#827B77] block">
                    Aviso de Privacidade / Exclusividade
                  </label>
                  <input
                    type="text"
                    value={formData.privacyNotice}
                    onChange={(e) => setFormData({ ...formData, privacyNotice: e.target.value })}
                    placeholder="Seus dados estão protegidos pela Política de Privacidade."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                  />
                </div>
              )}

              {/* Opções para seleção */}
              {["single", "multiple", "frequency", "duration"].includes(formData.type) && (
                <div className="space-y-2 pt-1 border-t border-[#FAF7F2]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-[#827B77]">
                      Opções de Escolha
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-[#B77D82] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Opção
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.options.map((opt, i) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => handleUpdateOption(i, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] text-xs text-[#292321]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#B77D82] text-white text-xs font-semibold hover:bg-[#A3676C]"
              >
                Salvar Etapa do Quiz
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização Mobile (Item 15) */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] w-full max-w-[360px] h-[640px] rounded-[40px] border-8 border-[#292321] shadow-2xl flex flex-col justify-between overflow-hidden relative">
            {/* Barra superior de smartphone */}
            <div className="bg-[#292321] text-white text-[10px] px-6 py-2 flex items-center justify-between">
              <span>9:41</span>
              <div className="w-16 h-3 bg-white/20 rounded-full mx-auto" />
              <span>100%</span>
            </div>

            {/* Conteúdo do Quiz Simulado */}
            <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] text-[#827B77]">
                  <span>Etapa {previewStep + 1} de {quizQuestions.length}</span>
                  <span className="font-semibold text-[#B77D82]">Preview</span>
                </div>

                <div className="w-full h-1.5 bg-[#EADBCE] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B77D82]"
                    style={{ width: `${((previewStep + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-base text-[#292321]">
                    {quizQuestions[previewStep]?.title}
                  </h4>
                  <p className="text-[11px] text-[#827B77]">
                    {quizQuestions[previewStep]?.helperText}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {quizQuestions[previewStep]?.options?.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-3 rounded-xl border border-[#EADBCE] bg-white text-xs font-medium text-[#292321] flex justify-between"
                    >
                      <span>{opt.label}</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-[#EADBCE]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões do Preview */}
              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (previewStep < quizQuestions.length - 1) {
                      setPreviewStep((prev) => prev + 1);
                    } else {
                      setPreviewStep(0);
                    }
                  }}
                  className="w-full py-2.5 rounded-full bg-[#B77D82] text-white text-xs font-semibold"
                >
                  {previewStep < quizQuestions.length - 1 ? "Próxima Pergunta →" : "Reiniciar Preview"}
                </button>
              </div>
            </div>

            {/* Fechar Preview */}
            <button
              onClick={() => setShowMobilePreview(false)}
              className="absolute top-2 right-2 text-white/80 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
