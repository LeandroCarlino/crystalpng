import React, { useState } from 'react';
import BackgroundRemover from './components/BackgroundRemover';
import VideoLooper from './components/VideoLooper';
import VideoToFrames from './components/VideoToFrames';
import SpriteSheetMaker from './components/SpriteSheetMaker';
import { Image as ImageIcon, Video, Images, Grid } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('bg-remover');

  const tabs = [
    { id: 'bg-remover', label: 'Eliminar Fondo', icon: ImageIcon, component: BackgroundRemover },
    { id: 'video-looper', label: 'Loop de Video', icon: Video, component: VideoLooper },
    { id: 'video-frames', label: 'Extraer Frames', icon: Images, component: VideoToFrames },
    { id: 'spritesheet', label: 'SpriteSheet', icon: Grid, component: SpriteSheetMaker },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || BackgroundRemover;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2 flex items-center justify-center gap-2">
            <ImageIcon className="w-10 h-10" /> CrystalPng
          </h1>
          <p className="text-gray-600">Herramientas multimedia impulsadas por IA en tu navegador.</p>
        </header>

        <div className="mb-8 flex justify-center overflow-x-auto">
          <div className="inline-flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 gap-1 whitespace-nowrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 min-h-[500px]">
          <ActiveComponent />
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Procesamiento 100% local. Tus archivos nunca salen de tu dispositivo.</p>
          <p className="mt-1">Impulsado por @imgly y ffmpeg.wasm</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
