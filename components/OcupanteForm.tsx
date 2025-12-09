import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Ocupante, EstadoCivil } from '../types';
import { generateId, validateCPF, formatCPF } from '../utils';

interface Props {
  ocupanteId?: string;
  onCancel: () => void;
  onSave: () => void;
  onSuccess?: (ocupante: Ocupante) => void; // Callback para retornar o objeto criado
}

const OcupanteForm: React.FC<Props> = ({ ocupanteId, onCancel, onSave, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Ocupante>>({
    estadoCivil: EstadoCivil.SOLTEIRO,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ocupanteId) {
      const data = db.getOcupanteById(ocupanteId);
      if (data) setFormData(data);
    }
  }, [ocupanteId]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatCPF(raw);
      setFormData({...formData, cpf: formatted});
  }

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numbers
      const val = e.target.value.replace(/\D/g, '');
      setFormData({...formData, matricula: val});
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome) newErrors.nome = "Nome obrigatório";
    if (!formData.funcao) newErrors.funcao = "Função obrigatória";
    
    // CPF Check (Optional)
    if (formData.cpf && formData.cpf.trim().length > 0) {
        if (!validateCPF(formData.cpf)) {
            newErrors.cpf = "CPF inválido";
        } else {
            // Check duplication (Robust check: strip non-digits)
            const currentId = formData.id || ocupanteId;
            const cleanInputCPF = formData.cpf.replace(/\D/g, '');
            
            const all = db.getOcupantes();
            const exists = all.find(o => {
                const dbCPF = o.cpf.replace(/\D/g, '');
                return dbCPF === cleanInputCPF && o.id !== currentId && cleanInputCPF !== '';
            });

            if (exists) newErrors.cpf = "Este CPF já está cadastrado para outro ocupante.";
        }
    }

    // Validação de Matrícula (Optional)
    if (formData.matricula && formData.matricula.trim().length > 0) {
        if (formData.matricula.length !== 8) {
            newErrors.matricula = "A matrícula deve conter exatamente 8 dígitos.";
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const toSave = {
        ...formData,
        cpf: formData.cpf || '', // Ensure empty string if undefined
        matricula: formData.matricula || '',
        id: formData.id || generateId()
    } as Ocupante;

    const savedOcupante = db.saveOcupante(toSave);
    
    if (onSuccess) {
      onSuccess(savedOcupante);
    } else {
      onSave();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-xl mx-auto border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">
        {ocupanteId ? 'Editar Ocupante' : 'Novo Ocupante'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome Completo</label>
          <input 
            type="text" 
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
            value={formData.nome || ''}
            onChange={e => setFormData({...formData, nome: e.target.value})}
          />
          {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">CPF <span className="text-slate-400 font-normal text-xs">(Opcional)</span></label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                value={formData.cpf || ''}
                onChange={handleCpfChange}
                maxLength={14}
                placeholder="000.000.000-00"
              />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Matrícula <span className="text-slate-400 font-normal text-xs">(Opcional)</span></label>
              <input 
                type="text" 
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                value={formData.matricula || ''}
                onChange={handleMatriculaChange}
                maxLength={8}
                placeholder="00000000"
              />
              {errors.matricula && <p className="text-red-500 text-xs mt-1">{errors.matricula}</p>}
              <p className="text-xs text-slate-400 mt-1">Informe os 8 dígitos da matrícula (caso possua).</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-slate-700">Função</label>
            <input 
                type="text" 
                placeholder="Ex: Morador, Síndico"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                value={formData.funcao || ''}
                onChange={e => setFormData({...formData, funcao: e.target.value})}
            />
            {errors.funcao && <p className="text-red-500 text-xs mt-1">{errors.funcao}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contrato</label>
              <input 
                type="text" 
                placeholder="Ex: CT-2023/001"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                value={formData.contrato || ''}
                onChange={e => setFormData({...formData, contrato: e.target.value})}
              />
              <p className="text-xs text-slate-400 mt-1">Opcional. Identificador do contrato.</p>
            </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700">Estado Civil</label>
           <select 
               className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 bg-white"
               value={formData.estadoCivil}
               onChange={e => setFormData({...formData, estadoCivil: e.target.value as EstadoCivil})}
           >
               {Object.values(EstadoCivil).map(ec => (
                   <option key={ec} value={ec}>{ec}</option>
               ))}
           </select>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OcupanteForm;