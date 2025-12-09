import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Imovel, StatusOcupacao } from '../types';
import { Plus, Search, Filter, Home, Edit, Eye, User, Briefcase, Trash2 } from 'lucide-react';

interface Props {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDetail: (id: string) => void;
}

const ImovelList: React.FC<Props> = ({ onAdd, onEdit, onDetail }) => {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusOcupacao>('ALL');

  useEffect(() => {
    setImoveis(db.getImoveis());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Garante que o clique não afete outros elementos
    e.preventDefault();

    if (window.confirm('Tem certeza que deseja excluir este imóvel permanentemente?')) {
      try {
        db.deleteImovel(id);
        // Força atualização da lista com nova referência
        setImoveis([...db.getImoveis()]);
      } catch (error: any) {
        alert(error.message || 'Erro ao excluir imóvel.');
      }
    }
  };

  const filtered = imoveis.filter(i => {
    const text = filterText.toLowerCase();

    // 1. Busca por campos diretos do Imóvel
    let matchesText = 
        i.endereco.toLowerCase().includes(text) ||
        i.localidade.toLowerCase().includes(text) ||
        i.unidadeConsumidora.includes(text);
    
    // 2. Se não encontrou e o imóvel está ocupado, busca pelo Nome ou Função do Ocupante
    if (!matchesText && i.statusOcupacao === StatusOcupacao.OCUPADO) {
        const occupations = db.getOcupacoesByImovel(i.id);
        const active = occupations.find(o => !o.dataFim);
        
        if (active) {
             const occupant = db.getOcupanteById(active.ocupanteId);
             if (occupant) {
                 matchesText = 
                    occupant.nome.toLowerCase().includes(text) ||
                    occupant.funcao.toLowerCase().includes(text);
             }
        }
    }

    const matchesStatus = statusFilter === 'ALL' || i.statusOcupacao === statusFilter;
    
    return matchesText && matchesStatus;
  });

  const parseAddress = (fullAddress: string) => {
    const parts = fullAddress.split(',');
    if (parts.length > 1) {
        const street = parts[0].trim();
        const number = parts.slice(1).join(',').trim();
        return { street, number };
    }
    return { street: fullAddress, number: 'S/N' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Meus Imóveis</h2>
        <button 
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Novo Imóvel
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input 
                type="text"
                placeholder="Buscar por morador, função, endereço ou UC..."
                className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-slate-500" />
            <select 
                className="border border-slate-300 rounded-md p-2 bg-white focus:ring-emerald-500 focus:border-emerald-500 w-full"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
            >
                <option value="ALL">Todos os Status</option>
                <option value={StatusOcupacao.OCUPADO}>Ocupados</option>
                <option value={StatusOcupacao.DESOCUPADO}>Desocupados</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Morador</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Imóvel/Endereço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nº</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Localidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">M²</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {filtered.map((imovel) => {
                    const { street, number } = parseAddress(imovel.endereco);
                    
                    let occupantName = <span className="text-slate-400">-</span>;
                    let occupantFunction = <span className="text-slate-400">-</span>;

                    if (imovel.statusOcupacao === StatusOcupacao.OCUPADO) {
                        const occupations = db.getOcupacoesByImovel(imovel.id);
                        const active = occupations.find(o => !o.dataFim);
                        
                        if (active) {
                             const occupant = db.getOcupanteById(active.ocupanteId);
                             occupantName = (
                                <div className="flex items-center">
                                    <User size={16} className="text-slate-400 mr-2" />
                                    <span className="font-medium text-slate-700">{occupant?.nome || 'Desconhecido'}</span>
                                </div>
                             );
                             occupantFunction = (
                                <div className="flex items-center text-slate-600 text-sm">
                                    <Briefcase size={14} className="text-slate-300 mr-2" />
                                    {occupant?.funcao || '-'}
                                </div>
                             );
                        } else {
                            occupantName = <span className="text-amber-500 text-xs italic">Ocupante pendente</span>;
                        }
                    }

                    return (
                        <tr key={imovel.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                {occupantName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {occupantFunction}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 overflow-hidden">
                                        {imovel.imagemUrl ? (
                                            <img src={imovel.imagemUrl} alt="Imóvel" className="h-full w-full object-cover" />
                                        ) : (
                                            <Home size={20} />
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-slate-900">{street}</div>
                                        <div className="text-sm text-slate-500">UC: {imovel.unidadeConsumidora}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                {number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{imovel.localidade}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{imovel.metroQuadrado} m²</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    imovel.statusOcupacao === StatusOcupacao.OCUPADO 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                    {imovel.statusOcupacao}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                    <button 
                                        onClick={() => onDetail(imovel.id)}
                                        className="text-emerald-600 hover:text-emerald-900 p-2 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="Detalhes"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => onEdit(imovel.id)}
                                        className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(imovel.id, e)}
                                        className="text-red-500 hover:text-red-800 p-2 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {filtered.length === 0 && (
                    <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                            Nenhum imóvel encontrado.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ImovelList;