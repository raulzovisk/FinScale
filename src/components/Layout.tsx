
import React from 'react';
import {
    LayoutDashboard,
    PlusCircle,
    BarChart3,
    Send,
    Clock,
    Settings,
    Wallet,
    LogOut,
    CreditCard
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Nova Transação', icon: PlusCircle },
        { id: 'cards', label: 'Cartões', icon: CreditCard },
        { id: 'recurrents', label: 'Recorrentes', icon: Clock },
        { id: 'analytics', label: 'Análises', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Wallet size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">FinScale</h1>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id
                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                    <h1 className="text-lg font-bold text-indigo-600">FinScale</h1>
                    <button className="p-2 text-gray-600">
                        <Settings size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>

                {/* Mobile Tab Bar */}
                <nav className="md:hidden bg-white border-t flex justify-around py-2 sticky bottom-0">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="text-[10px] mt-1">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </main>
        </div>
    );
};
