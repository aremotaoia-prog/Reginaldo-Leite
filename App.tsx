import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import { LayoutDashboard, Home, Users, Settings, LogOut, UploadCloud } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ImovelList from './components/ImovelList';
import ImovelForm from './components/ImovelForm';
import ImovelDetail from './components/ImovelDetail';
import OcupanteForm from './components/OcupanteForm';
import ImportData from './components/ImportData';

// Since we are mocking everything in a single file for the prompt, 
// we will handle "Routing" via state here.

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const navigateTo = (view: ViewState, id?: string) => {
    setCurrentView(view);
    setSelectedId(id);
  };

  useEffect(() => {
    if (currentView === 'DETALHE_IMOVEL' && !selectedId) {
      navigateTo('LISTA_IMOVEIS');
    }
  }, [currentView, selectedId]);

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'LISTA_IMOVEIS':
        return <ImovelList 
            onAdd={() => navigateTo('FORM_IMOVEL')} 
            onEdit={(id) => navigateTo('FORM_IMOVEL', id)}
            onDetail={(id) => navigateTo('DETALHE_IMOVEL', id)}
        />;
      case 'FORM_IMOVEL':
        return <ImovelForm 
            imovelId={selectedId}
            onCancel={() => navigateTo('LISTA_IMOVEIS')}
            onSave={() => navigateTo('LISTA_IMOVEIS')}
        />;
      case 'DETALHE_IMOVEL':
         if(!selectedId) return null;
         return <ImovelDetail imovelId={selectedId} onBack={() => navigateTo('LISTA_IMOVEIS')} />
      
      case 'FORM_OCUPANTE': 
         return <OcupanteForm 
            onCancel={() => navigateTo('LISTA_IMOVEIS')}
            onSave={() => navigateTo('LISTA_IMOVEIS')}
         />
      
      case 'IMPORTAR_DADOS':
         return <ImportData />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">Gestão de Imóveis</h1>
          <p className="text-slate-400 text-xs mt-1">Painel Administrativo</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => navigateTo('DASHBOARD')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'DASHBOARD' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigateTo('LISTA_IMOVEIS')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${['LISTA_IMOVEIS', 'FORM_IMOVEL', 'DETALHE_IMOVEL'].includes(currentView) ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Home size={20} />
            <span>Imóveis</span>
          </button>

          <button 
             onClick={() => navigateTo('FORM_OCUPANTE')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'FORM_OCUPANTE' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Users size={20} />
            <span>Novo Ocupante</span>
          </button>

          <button 
             onClick={() => navigateTo('IMPORTAR_DADOS')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'IMPORTAR_DADOS' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <UploadCloud size={20} />
            <span>Importação</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center space-x-3 px-4 py-2 text-slate-400 hover:text-white transition-colors">
            <Settings size={20} />
            <span>Configurações</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 md:hidden flex justify-between items-center">
             <h1 className="font-bold text-slate-800">Gestão Imóveis</h1>
             <button 
               onClick={() => navigateTo('IMPORTAR_DADOS')}
               className="text-slate-600 mr-2 md:hidden"
             >
                <UploadCloud size={20} />
             </button>
             <button className="text-slate-600"><Settings size={20} /></button>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;