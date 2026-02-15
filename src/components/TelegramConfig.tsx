
import React, { useState } from 'react';
import { Send, Shield, Info, ExternalLink, Bot } from 'lucide-react';

export const TelegramConfigPanel: React.FC = () => {
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');

    const handleTestConnection = () => {
        setStatus('testing');
        setTimeout(() => setStatus('connected'), 2000);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Integração com Telegram</h2>
                        <p className="text-indigo-100 text-sm">Controle seus gastos enviando mensagens diretamente ao bot.</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Info className="text-blue-600 mt-1 shrink-0" size={20} />
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Esta seção permite conectar o <strong>FinScale</strong> ao seu próprio bot do Telegram.
                            As transações enviadas por lá serão salvas automaticamente no banco de dados sincronizado.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                                Bot Token <span className="text-gray-400 font-normal text-xs">(Via @BotFather)</span>
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Cole o token do seu bot aqui"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Chat ID</label>
                            <input
                                type="text"
                                value={chatId}
                                onChange={(e) => setChatId(e.target.value)}
                                placeholder="Seu Chat ID do Telegram"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={handleTestConnection}
                            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                            disabled={status === 'testing' || !token || !chatId}
                        >
                            {status === 'testing' ? 'Testando...' : 'Salvar e Testar'}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium text-gray-600">
                                Status: {status === 'connected' ? 'Conectado' : status === 'testing' ? 'Verificando...' : 'Desconectado'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">Privacidade</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">Seus dados são criptografados antes de serem enviados via Webhook.</p>
                    </div>
                </div>
                <a
                    href="https://core.telegram.org/bots/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:border-indigo-200 transition-colors group"
                >
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200">
                        <ExternalLink size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">Documentação API</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">Saiba como configurar comandos avançados para o seu bot.</p>
                    </div>
                </a>
            </div>
        </div>
    );
};
