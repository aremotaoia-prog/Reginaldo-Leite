import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Imovel, Ocupacao, Ocupante, StatusOcupacao } from '../types';
import { formatDate, formatCurrency } from '../utils';
import { ArrowLeft, UserPlus, UserMinus, Calendar, DollarSign, MapPin, Zap, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Props {
  imovelId: string;
  onBack: () => void;
}

const ImovelDetail: React.FC<Props> = ({ imovelId, onBack }) => {
  const [imovel, setImovel] = useState<Imovel | undefined>();
  const [historico, setHistorico] = useState<Ocupacao[]>([]);
  const [ocupantes, setOcupantes] = useState<Ocupante[]>([]);
  const [showAddOccupant, setShowAddOccupant] = useState(false);
  const [selectedOcupanteId, setSelectedOcupanteId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Load Data
  const loadData = () => {
    const i = db.getImovelById(imovelId);
    setImovel(i);
    if (i) {
        const h = db.getOcupacoesByImovel(imovelId);
        // Sort by most recent
        h.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
        setHistorico(h);
    }
    setOcupantes(db.getOcupantes());
  };

  useEffect(() => {
    loadData();
  }, [imovelId]);

  const handleDelete = () => {
    if (window.confirm('ATENÇÃO: Deseja realmente excluir este imóvel permanentemente?')) {
        try {
            db.deleteImovel(imovelId);
            onBack(); // Volta para a lista
        } catch (e: any) {
            alert(e.message);
        }
    }
  };

  const handleAddOccupancy = () => {
    if(!selectedOcupanteId) return alert('Selecione um ocupante');
    
    db.createOcupacao(imovelId, selectedOcupanteId, startDate);
    setShowAddOccupant(false);
    setSelectedOcupanteId('');
    loadData(); // Reload to see updates
  };

  const handleEndOccupancy = (ocupacaoId: string) => {
    if(window.confirm('Tem certeza que deseja encerrar esta ocupação hoje?')) {
        const today = new Date().toISOString().split('T')[0];
        db.endOcupacao(ocupacaoId, today);
        loadData();
    }
  };

  const getOcupanteName = (id: string) => {
    return ocupantes.find(o => o.id === id)?.nome || 'Desconhecido';
  };

  if (!imovel) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <button 
            onClick={onBack}
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
        >
            <ArrowLeft size={18} className="mr-2" /> Voltar para lista
        </button>
        
        <button 
            onClick={handleDelete}
            className="flex items-center text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md"
        >
            <Trash2 size={18} className="mr-2" /> Excluir Imóvel
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        
        {/* Banner Image if available */}
        {imovel.imagemUrl && (
            <div className="w-full h-64 rounded-t-lg overflow-hidden relative group">
                <img 
                    src={imovel.imagemUrl} 
                    alt={imovel.endereco}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60" />
            </div>
        )}

        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{imovel.endereco}</h1>
                    <div className="flex items-center text-slate-500 mt-1">
                        <MapPin size={16} className="mr-1" />
                        {imovel.localidade}
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center ${
                    imovel.statusOcupacao === StatusOcupacao.OCUPADO 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-800'
                }`}>
                    {imovel.statusOcupacao === StatusOcupacao.OCUPADO ? <CheckCircle size={16} className="mr-1"/> : <XCircle size={16} className="mr-1"/>}
                    {imovel.statusOcupacao}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                    <Zap className="text-amber-500 mr-3" size={24} />
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Unidade Consumidora</p>
                        <p className="text-lg font-medium">{imovel.unidadeConsumidora}</p>
                    </div>
                </div>
                <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                    <Calendar className="text-blue-500 mr-3" size={24} />
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Entrega</p>
                        <p className="text-lg font-medium">{formatDate(imovel.dataEntrega)}</p>
                    </div>
                </div>
                <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                    <DollarSign className="text-emerald-500 mr-3" size={24} />
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Última Reforma</p>
                        <p className="text-lg font-medium">
                            {imovel.custoUltimaReforma ? formatCurrency(imovel.custoUltimaReforma) : '-'}
                        </p>
                        <p className="text-xs text-slate-400">
                            {imovel.dataUltimaReforma ? formatDate(imovel.dataUltimaReforma) : 'Sem registro'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Action Area: Register Occupation */}
      {imovel.statusOcupacao === StatusOcupacao.DESOCUPADO && (
        <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6">
            {!showAddOccupant ? (
                <div className="flex justify-between items-center">
                    <div className="text-slate-700">Imóvel atualmente desocupado.</div>
                    <button 
                        onClick={() => setShowAddOccupant(true)}
                        className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        <UserPlus size={18} className="mr-2" />
                        Cadastrar Ocupação
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Nova Ocupação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Selecione o Ocupante</label>
                            <select 
                                className="w-full border rounded-md p-2 bg-white"
                                value={selectedOcupanteId}
                                onChange={e => setSelectedOcupanteId(e.target.value)}
                            >
                                <option value="">-- Selecione --</option>
                                {ocupantes.map(o => (
                                    <option key={o.id} value={o.id}>{o.nome} {o.cpf ? `(${o.cpf})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Data Início</label>
                            <input 
                                type="date"
                                className="w-full border rounded-md p-2"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end gap-2">
                             <button 
                                onClick={handleAddOccupancy}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                             >
                                Confirmar
                             </button>
                             <button 
                                onClick={() => setShowAddOccupant(false)}
                                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
                             >
                                Cancelar
                             </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">* Caso o ocupante não esteja na lista, cadastre-o na aba "Ocupantes" primeiro.</p>
                </div>
            )}
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Histórico de Ocupação</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full text-left">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="py-2 text-sm text-slate-500 font-medium">Ocupante</th>
                        <th className="py-2 text-sm text-slate-500 font-medium">Início</th>
                        <th className="py-2 text-sm text-slate-500 font-medium">Fim</th>
                        <th className="py-2 text-sm text-slate-500 font-medium">Status</th>
                        <th className="py-2 text-sm text-slate-500 font-medium text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {historico.length === 0 ? (
                        <tr><td colSpan={5} className="py-4 text-center text-slate-400">Nenhum histórico encontrado.</td></tr>
                    ) : (
                        historico.map(h => {
                            const active = !h.dataFim;
                            return (
                                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3">{getOcupanteName(h.ocupanteId)}</td>
                                    <td className="py-3">{formatDate(h.dataInicio)}</td>
                                    <td className="py-3">{h.dataFim ? formatDate(h.dataFim) : '-'}</td>
                                    <td className="py-3">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {active ? 'Ativo' : 'Finalizado'}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        {active && (
                                            <button 
                                                onClick={() => handleEndOccupancy(h.id)}
                                                className="text-red-600 hover:text-red-800 text-sm flex items-center justify-end w-full"
                                                title="Encerrar Ocupação"
                                            >
                                                <UserMinus size={16} className="mr-1" /> Encerrar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ImovelDetail;