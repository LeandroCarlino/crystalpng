import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, Trash2, Loader2, CheckCircle2, Image as ImageIcon, FileArchive } from 'lucide-react';

function App() {
  const [images, setImages] = useState([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  const processImage = async (id, file) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'processing' } : img
    ));

    try {
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          // Optional: handle progress
          console.log(`Processing ${key}: ${current}/${total}`);
        }
      });
      
      const resultUrl = URL.createObjectURL(blob);
      
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'done', result: blob, resultPreview: resultUrl } : img
      ));
    } catch (error) {
      console.error("Error removing background:", error);
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, status: 'error' } : img
      ));
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: URL.createObjectURL(file),
      status: 'pending', // pending, processing, done, error
      result: null,
      name: file.name.replace(/\.[^/.]+$/, "") + "_no_bg.png"
    }));

    setImages(prev => [...prev, ...newImages]);

    // Automatically start processing
    newImages.forEach(img => processImage(img.id, img.file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    }
  });

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      if (img?.resultPreview) URL.revokeObjectURL(img.resultPreview);
      return prev.filter(i => i.id !== id);
    });
  };

  const downloadSingle = (img) => {
    if (!img.result) return;
    saveAs(img.result, img.name);
  };

  const downloadAll = async () => {
    const doneImages = images.filter(img => img.status === 'done');
    if (doneImages.length === 0) return;

    setIsProcessingAll(true);
    const zip = new JSZip();
    
    doneImages.forEach(img => {
      zip.file(img.name, img.result);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, "transparent_images.zip");
    setIsProcessingAll(false);
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
      if (img.resultPreview) URL.revokeObjectURL(img.resultPreview);
    });
    setImages([]);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-2 flex items-center justify-center gap-2">
          <ImageIcon className="w-10 h-10" /> CrystalPng
        </h1>
        <p className="text-gray-600">Elimina el fondo de tus PNGs automáticamente con IA en tu navegador.</p>
      </header>

      <div 
        {...getRootProps()} 
        className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-8
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-white shadow-sm'}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <p className="text-xl font-medium text-gray-700">Arrastra tus imágenes aquí</p>
        <p className="text-gray-500 mt-2">O haz clic para seleccionar archivos (PNG, JPG, WebP)</p>
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-700">Imágenes ({images.length})</h2>
            <div className="flex gap-2">
              <button 
                onClick={downloadAll}
                disabled={!images.some(img => img.status === 'done') || isProcessingAll}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                Descargar todo (.zip)
              </button>
              <button 
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
                <div className="relative aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-gray-100 flex items-center justify-center p-2">
                  <img 
                    src={img.status === 'done' ? img.resultPreview : img.preview} 
                    alt="Preview" 
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${img.status === 'processing' ? 'opacity-50' : 'opacity-100'}`}
                  />
                  
                  {img.status === 'processing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[2px]">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      <span className="mt-2 text-sm font-semibold text-indigo-700">Procesando...</span>
                    </div>
                  )}

                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-3 flex items-center justify-between border-t border-gray-50">
                  <div className="truncate flex-1 pr-2">
                    <p className="text-sm font-medium text-gray-700 truncate" title={img.name}>{img.file.name}</p>
                    {img.status === 'done' && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completado</p>}
                    {img.status === 'error' && <p className="text-xs text-red-600">Error al procesar</p>}
                  </div>
                  
                  {img.status === 'done' && (
                    <button 
                      onClick={() => downloadSingle(img)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Descargar"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>Procesamiento 100% local. Tus imágenes nunca salen de tu dispositivo.</p>
        <p className="mt-1">Impulsado por @imgly/background-removal</p>
      </footer>
    </div>
  );
}

export default App;
