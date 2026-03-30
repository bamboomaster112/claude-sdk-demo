import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Cpu, Check, Loader2 } from 'lucide-react';

const MODELS = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', desc: 'Most capable, complex migrations' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', desc: 'Best balance of speed and quality' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: 'Fastest, simple migrations' },
];

interface ModelSelectorProps {
  token: string;
}

export default function ModelSelector({ token }: ModelSelectorProps) {
  const [activeModel, setActiveModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings(token).then((data: any) => {
      const model = typeof data.active_model === 'string'
        ? data.active_model.replace(/"/g, '')
        : 'claude-sonnet-4-6';
      setActiveModel(model);
    });
  }, [token]);

  const handleSelect = async (modelId: string) => {
    setLoading(true);
    setSaved(false);
    try {
      await api.setModel(token, modelId);
      setActiveModel(modelId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Cpu className="w-5 h-5" /> Model Control
      </h3>
      <div className="grid gap-3">
        {MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            disabled={loading}
            className={`flex items-center justify-between p-4 rounded-lg border transition-all text-left ${
              activeModel === model.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div>
              <div className="font-medium text-white">{model.name}</div>
              <div className="text-sm text-gray-400">{model.desc}</div>
            </div>
            {activeModel === model.id && (
              <div className="flex items-center gap-1 text-blue-400 text-sm">
                {saved ? <Check className="w-4 h-4" /> : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Active
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
