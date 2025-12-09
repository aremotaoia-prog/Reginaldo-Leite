import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Imovel, StatusOcupacao, MetroQuadrado, Ocupante } from '../types';
import { generateId } from '../utils';
import { Info, UserPlus, X, AlertCircle, DollarSign, Wallet, Image as ImageIcon } from 'lucide-react';
import OcupanteForm from './OcupanteForm';

interface Props {
  imovelId?: string;
  onCancel: () => void;
  onSave: () => void;
}

const ImovelForm: React.FC<Props> = ({ imovelId, onCancel, onSave }) => {
  const [formData, setFormData] = useState<Partial<Imovel>>({
    metroQuadrado: 75,
    statusOcupacao: StatusOcupacao.DESOCUPADO,
    dataEntrega: new Date().toISOString().split('T')[0],
  });

  // Novos estados para tratar Endereço separadamente
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');

  // State for Integrated Occupant Flow
  const [ocupantesList, setOcupantesList] = useState<Ocupante[]>([]);
  const [selectedOcupanteId, setSelectedOcupanteId] = useState<string>('');
  const [showOcupanteModal, setShowOcupanteModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load existing occupants for dropdown
    setOcupantesList(db.getOcupantes());

    if (imovelId) {
      const data = db.getImovelById(imovelId);
      if (data) {
        setFormData(data);
        
        // Parse existing address (Format: "Street, Number")
        if (data.endereco) {
            const parts = data.endereco.split(',');
            setLogradouro(parts[0].trim());
            if (parts.length > 1) {
                setNumero(parts.slice(1).join(',').trim());
            }
        }

        // Try to find active occupation to pre-fill dropdown
        const activeOcc = db.getOcupacoesByImovel(imovelId).find(o => !o.dataFim);
        if (activeOcc) {
          setSelectedOcupanteId(activeOcc.ocupanteId);
        }
      }
    } else {
        // Reset fields for new entry
        setLogradouro('');
        setNumero('');
    }
  }, [imovelId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Validação de Endereço (agora separado)
    if (!logradouro.trim()) newErrors.logradouro = "Logradouro obrigatório";
    if (!numero.trim()) newErrors.numero = "Número obrigatório";

    if (!formData.localidade) newErrors.localidade = "Localidade obrigatória";
    
    // Validação Unidade Consumidora (Aprimorada)
    const uc = (formData.unidadeConsumidora || '').trim();
    
    if (!uc) {
      newErrors.unidadeConsumidora = "Unidade Consumidora obrigatória";
    } else {
      // 1. Check Length (10 to 20)
      if (uc.length < 10 || uc.length > 20) {
        newErrors.unidadeConsumidora = "A UC deve ter entre 10 e 20 caracteres.";
      } 
      // 2. Check Alphanumeric (No special chars)
      else if (!/^[a-zA-Z0-9]+$/.test(uc)) {
        newErrors.unidadeConsumidora = "A UC deve conter apenas letras e números (sem espaços ou símbolos).";
      } 
      // 3. Check Uniqueness
      else {
        const allImoveis = db.getImoveis();
        // Compare lowercase to ensure uniqueness regardless of case
        const duplicate = allImoveis.find(i => 
            i.unidadeConsumidora.toLowerCase() === uc.toLowerCase() && 
            i.id !== imovelId 
        );
        if (duplicate) {
             newErrors.unidadeConsumidora = "Esta Unidade Consumidora já está cadastrada em outro imóvel.";
        }
      }
    }

    if (!formData.dataEntrega) newErrors.dataEntrega = "Data de entrega obrigatória";
    
    // Reno Logic: Validação de Reforma
    if (formData.dataUltimaReforma) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.dataUltimaReforma > today) {
        newErrors.dataUltimaReforma = "Data não pode ser futura";
      }
      
      // Validação Condicional: Custo é obrigatório se Data existir
      if (formData.custoUltimaReforma === undefined || formData.custoUltimaReforma === null || isNaN(formData.custoUltimaReforma)) {
        newErrors.custoUltimaReforma = "Informe o custo da reforma";
      } else if (formData.custoUltimaReforma < 0) {
        newErrors.custoUltimaReforma = "O valor não pode ser negativo";
      }
    }

    if (formData.descontoFolha !== undefined && formData.descontoFolha < 0) {
      newErrors.descontoFolha = "O valor do desconto não pode ser negativo";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Combine Address
    const finalEndereco = `${logradouro.trim()}, ${numero.trim()}`;

    // 1. Save Imovel
    const toSave = {
        ...formData,
        endereco: finalEndereco,
        // Ensure UC is trimmed when saved
        unidadeConsumidora: formData.unidadeConsumidora?.trim(),
        imagemUrl: formData.imagemUrl?.trim(),
        id: formData.id || generateId()
    } as Imovel;

    const savedImovel = db.saveImovel(toSave);

    // 2. Handle Occupation Linking (Integrated Flow)
    if (toSave.statusOcupacao === StatusOcupacao.OCUPADO && selectedOcupanteId) {
      // Check if there is already an active occupation for this imovel
      const existingOccs = db.getOcupacoesByImovel(savedImovel.id);
      const hasActive = existingOccs.some(o => !o.dataFim && o.ocupanteId === selectedOcupanteId);
      
      if (!hasActive) {
         // Close any previous active occupation if different occupant (simplified logic)
         existingOccs.forEach(o => {
            if (!o.dataFim) db.endOcupacao(o.id, new Date().toISOString().split('T')[0]);
         });
         
         // Create new
         db.createOcupacao(savedImovel.id, selectedOcupanteId, toSave.dataEntrega || new Date().toISOString().split('T')[0]);
      }
    } else if (toSave.statusOcupacao === StatusOcupacao.DESOCUPADO) {
        // If user changed to Desocupado, ensure active occupations are closed
        const existingOccs = db.getOcupacoesByImovel(savedImovel.id);
        existingOccs.forEach(o => {
            if (!o.dataFim) db.endOcupacao(o.id, new Date().toISOString().split('T')[0]);
        });
    }

    onSave();
  };

  const handleNewOcupanteSuccess = (newOcupante: Ocupante) => {
    // Refresh list and select the new one
    setOcupantesList(db.getOcupantes());
    setSelectedOcupanteId(newOcupante.id);
    setShowOcupanteModal(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto relative">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">
        {imovelId ? 'Editar Imóvel' : 'Novo Imóvel'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Address (Split into Logradouro and Numero) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-9">
            <label className="block text-sm font-medium text-slate-700">Logradouro</label>
            <input 
              type="text" 
              placeholder="Rua, Avenida, Alameda..."
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
              value={logradouro}
              onChange={e => setLogradouro(e.target.value)}
            />
            {errors.logradouro && <p className="text-red-500 text-xs mt-1">{errors.logradouro}</p>}
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Número</label>
            <input 
              type="text" 
              placeholder="Nº"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
              value={numero}
              onChange={e => setNumero(e.target.value)}
            />
            {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Localidade</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
              value={formData.localidade || ''}
              onChange={e => setFormData({...formData, localidade: e.target.value})}
            />
            {errors.localidade && <p className="text-red-500 text-xs mt-1">{errors.localidade}</p>}
          </div>

            <div>
            <label className="block text-sm font-medium text-slate-700">Unidade Consumidora</label>
            <input 
              type="text" 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
              value={formData.unidadeConsumidora || ''}
              onChange={e => setFormData({...formData, unidadeConsumidora: e.target.value})}
              maxLength={20}
              placeholder="Ex: 1234567890 (apenas números e letras)"
            />
            {errors.unidadeConsumidora && <p className="text-red-500 text-xs mt-1">{errors.unidadeConsumidora}</p>}
            <p className="text-xs text-slate-400 mt-1">Deve conter de 10 a 20 caracteres alfanuméricos.</p>
          </div>
        </div>

        {/* Row 2: Image URL Field */}
        <div>
            <label className="block text-sm font-medium text-slate-700 flex items-center">
                <ImageIcon size={16} className="mr-1 text-slate-500" />
                URL da Imagem <span className="text-xs text-slate-400 ml-1 font-normal">(Opcional)</span>
            </label>
            <div className="flex gap-4 items-start mt-1">
                <div className="flex-1">
                    <input 
                        type="text" 
                        placeholder="https://exemplo.com/foto-fachada.jpg"
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                        value={formData.imagemUrl || ''}
                        onChange={e => setFormData({...formData, imagemUrl: e.target.value})}
                    />
                    <p className="text-xs text-slate-400 mt-1">Insira um link direto para a imagem (JPG, PNG).</p>
                </div>
                
                {formData.imagemUrl && (
                    <div className="h-14 w-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-sm">
                        <img 
                            src={formData.imagemUrl} 
                            alt="Preview" 
                            className="h-full w-full object-cover"
                            onError={(e) => {(e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro'}}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Row 3: Main Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Metragem (M²)</label>
            <select 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 bg-white"
              value={formData.metroQuadrado}
              onChange={e => setFormData({...formData, metroQuadrado: Number(e.target.value) as MetroQuadrado})}
            >
              <option value={75}>75 m²</option>
              <option value={109}>109 m²</option>
              <option value={168}>168 m²</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Status Inicial</label>
            <select 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 bg-white"
              value={formData.statusOcupacao}
              onChange={e => setFormData({...formData, statusOcupacao: e.target.value as StatusOcupacao})}
            >
              <option value={StatusOcupacao.DESOCUPADO}>Desocupado</option>
              <option value={StatusOcupacao.OCUPADO}>Ocupado</option>
            </select>
          </div>
        </div>

        {/* Row 4: Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Data Entrega</label>
            <input 
              type="date" 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
              value={formData.dataEntrega || ''}
              onChange={e => setFormData({...formData, dataEntrega: e.target.value})}
            />
            {errors.dataEntrega && <p className="text-red-500 text-xs mt-1">{errors.dataEntrega}</p>}
          </div>
        </div>

        {/* Nova Seção: Dados Financeiros & Reforma */}
        <div className="border-t border-slate-200 pt-6 mt-6 bg-slate-50 p-4 rounded-md">
            <div className="flex items-center gap-2 mb-4">
                <Wallet className="text-emerald-600" size={20}/>
                <h3 className="text-md font-bold text-slate-800">Dados Financeiros & Reforma</h3>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Desconto em Folha */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Desconto em Folha</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-500 sm:text-sm">R$</span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-full rounded-md border-slate-300 pl-10 focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                        placeholder="0,00"
                        value={formData.descontoFolha !== undefined ? formData.descontoFolha : ''}
                        onChange={e => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            setFormData({...formData, descontoFolha: val});
                        }}
                    />
                </div>
                {errors.descontoFolha && <p className="text-red-500 text-xs mt-1">{errors.descontoFolha}</p>}
                <p className="text-xs text-slate-400 mt-1">Valor mensal debitado.</p>
             </div>

             {/* Campos de Reforma */}
             <div>
                <label className="block text-sm font-medium text-slate-700">Data Última Reforma</label>
                <input 
                  type="date" 
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                  value={formData.dataUltimaReforma || ''}
                  onChange={e => setFormData({...formData, dataUltimaReforma: e.target.value})}
                />
                {errors.dataUltimaReforma && <p className="text-red-500 text-xs mt-1">{errors.dataUltimaReforma}</p>}
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700">Custo da Reforma</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-500 sm:text-sm">R$</span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-full rounded-md border-slate-300 pl-10 focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                        placeholder="0,00"
                        value={formData.custoUltimaReforma !== undefined ? formData.custoUltimaReforma : ''}
                        onChange={e => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            setFormData({...formData, custoUltimaReforma: val});
                        }}
                    />
                </div>
                {errors.custoUltimaReforma && <p className="text-red-500 text-xs mt-1">{errors.custoUltimaReforma}</p>}
             </div>
          </div>
        </div>
        
        {/* Integrated Occupancy Section */}
        {formData.statusOcupacao === StatusOcupacao.OCUPADO && (
            <div className="mt-6 animate-fade-in space-y-4">
                
                {/* Requested Warning Message */}
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md shadow-sm flex items-start">
                    <AlertCircle className="text-amber-500 mr-3 flex-shrink-0" size={24} />
                    <div>
                        <h4 className="text-sm font-bold text-amber-800">Atenção: Imóvel Ocupado</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            Você definiu o status como <strong>Ocupado</strong>. Por favor, vincule um ocupante abaixo 
                            ou acesse a <strong>Tela de Detalhes</strong> após salvar este registro para regularizar a ocupação.
                        </p>
                    </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 shadow-sm">
                      <h4 className="text-sm font-semibold text-emerald-800 mb-3">Vincular Ocupante Agora (Composição)</h4>
                      
                      <div className="flex flex-col md:flex-row gap-3">
                         <select 
                            className="flex-1 rounded-md border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm p-2 bg-white"
                            value={selectedOcupanteId}
                            onChange={(e) => setSelectedOcupanteId(e.target.value)}
                         >
                            <option value="">-- Selecione o Ocupante --</option>
                            {ocupantesList.map(occ => (
                                <option key={occ.id} value={occ.id}>
                                    {occ.nome} {occ.cpf ? `(CPF: ${occ.cpf})` : ''}
                                </option>
                            ))}
                         </select>

                         <button
                           type="button"
                           onClick={() => setShowOcupanteModal(true)}
                           className="bg-emerald-600 text-white px-3 py-2 rounded-md text-sm hover:bg-emerald-700 flex items-center justify-center whitespace-nowrap"
                         >
                            <UserPlus size={16} className="mr-1" /> Novo Ocupante
                         </button>
                      </div>
                      {!selectedOcupanteId && (
                         <div className="flex items-center mt-2 text-emerald-600 text-xs opacity-80">
                            <Info size={14} className="mr-1" />
                            <span>Vínculo opcional nesta etapa.</span>
                         </div>
                      )}
                </div>
            </div>
        )}

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

        {/* New Ocupante Modal */}
        {showOcupanteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl relative max-h-[90vh] overflow-auto">
                    <button 
                       onClick={() => setShowOcupanteModal(false)}
                       className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                    <div className="p-2">
                        <OcupanteForm 
                            onCancel={() => setShowOcupanteModal(false)}
                            onSave={() => {}} // Handled by onSuccess
                            onSuccess={handleNewOcupanteSuccess}
                        />
                    </div>
                </div>
            </div>
        )}
      </form>
    </div>
  );
};

export default ImovelForm;