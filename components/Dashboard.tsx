import React, { useMemo } from 'react';
import { db } from '../services/db';
import { StatusOcupacao, Imovel } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { formatCurrency } from '../utils';
import { Building2, Users, AlertCircle, TrendingUp, Wallet } from 'lucide-react';

const COLORS = ['#10b981', '#ef4444', '#f59e0b']; // Emerald (Ocupado), Red (Desocupado), Amber

const Dashboard: React.FC = () => {
  const imoveis = db.getImoveis();
  const ocupacoes = db.getOcupacoesByImovel; // Method reference, need logic below

  // Calculations
  const total = imoveis.length;
  const ocupados = imoveis.filter(i => i.statusOcupacao === StatusOcupacao.OCUPADO).length;
  const desocupados = total - ocupados;
  const taxaOcupacao = total > 0 ? (ocupados / total) * 100 : 0;

  // Calculo Total Desconto em Folha
  const totalDescontoFolha = useMemo(() => {
    return imoveis.reduce((acc, curr) => acc + (curr.descontoFolha || 0), 0);
  }, [imoveis]);

  // Data for Charts
  
  const dataOccupiedByM2 = useMemo(() => {
    const map = new Map<number, number>();
    imoveis.forEach(i => {
      if (i.statusOcupacao === StatusOcupacao.OCUPADO) {
        map.set(i.metroQuadrado, (map.get(i.metroQuadrado) || 0) + 1);
      }
    });
    // Ordenar por metragem (75, 109, 168)
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([name, value]) => ({ name: `${name}m²`, value }));
  }, [imoveis]);

  // Substituído: Distribuição por Status em vez de M2 Total
  const dataByStatus = [
    { name: StatusOcupacao.OCUPADO, value: ocupados },
    { name: StatusOcupacao.DESOCUPADO, value: desocupados },
  ];

  // Mocking monthly evolution (since we don't have a full history table populated for 12 months in seed)
  const dataEvolution = [
    { name: 'Jan', ocupacao: 60 },
    { name: 'Fev', ocupacao: 65 },
    { name: 'Mar', ocupacao: 62 },
    { name: 'Abr', ocupacao: 70 },
    { name: 'Mai', ocupacao: 75 },
    { name: 'Jun', ocupacao: 72 },
    { name: 'Jul', ocupacao: 78 },
    { name: 'Ago', ocupacao: 80 },
    { name: 'Set', ocupacao: 82 },
    { name: 'Out', ocupacao: 85 },
    { name: 'Nov', ocupacao: 80 },
    { name: 'Dez', ocupacao: taxaOcupacao },
  ];

  const avgCost = useMemo(() => {
    const renovated = imoveis.filter(i => i.custoUltimaReforma && i.custoUltimaReforma > 0);
    if (renovated.length === 0) return 0;
    const sum = renovated.reduce((acc, curr) => acc + (curr.custoUltimaReforma || 0), 0);
    return sum / renovated.length;
  }, [imoveis]);

  // Gauge Color Logic
  const getGaugeColor = (val: number) => {
    if (val >= 85) return 'text-emerald-500';
    if (val >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard Operacional</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Taxa de Ocupação</p>
            <p className={`text-3xl font-bold ${getGaugeColor(taxaOcupacao)}`}>{taxaOcupacao.toFixed(1)}%</p>
          </div>
          <div className={`p-3 rounded-full bg-slate-100 ${getGaugeColor(taxaOcupacao)}`}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Imóveis Ocupados</p>
            <p className="text-3xl font-bold text-slate-800">{ocupados}</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Imóveis Desocupados</p>
            <p className="text-3xl font-bold text-slate-800">{desocupados}</p>
          </div>
          <div className="p-3 rounded-full bg-slate-100 text-slate-600">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Desc. Folha</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalDescontoFolha)}</p>
          </div>
          <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Custo Médio Reforma</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(avgCost)}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Imóveis Ocupados por M²</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataOccupiedByM2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ocupados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Distribuição por Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 text-slate-700">Evolução Mensal da Taxa de Ocupação (%)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="ocupacao" stroke="#10b981" strokeWidth={3} dot={{r: 4}} name="Taxa %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;