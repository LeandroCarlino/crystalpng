import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';
import { Upload, Download, Trash2, Grid as GridIcon, Settings, RefreshCw, X, Images } from 'lucide-react';

function SpriteSheetMaker() {
  const [images, setImages] = useState([]);
  const [columns, setColumns] = useState(0); // 0 = auto
  const [padding, setPadding] = useState(0);
  const [generatedSheet, setGeneratedSheet] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to load image
  const loadImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ file, img, name: file.name, width: img.width, height: img.height, id: Math.random().toString(36).substr(2, 9) });
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = async (acceptedFiles) => {
    // Sort files by name naturally
    const sortedFiles = acceptedFiles.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const newImages = await Promise.all(sortedFiles.map(loadImage));
    setImages(prev => [...prev, ...newImages]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp']
    }
  });

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const generateSpriteSheet = () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    setTimeout(() => {
        // Calculate dimensions
        // Strategy: Uniform Grid based on Max Dimensions to support animation strips safely
        let maxWidth = 0;
        let maxHeight = 0;

        images.forEach(({ img }) => {
            if (img.width > maxWidth) maxWidth = img.width;
            if (img.height > maxHeight) maxHeight = img.height;
        });

        const count = images.length;
        let cols = columns > 0 ? columns : Math.ceil(Math.sqrt(count));
        // If cols is set but less than 1 (shouldn't happen due to input min), fallback
        if (cols < 1) cols = 1;
        
        const rows = Math.ceil(count / cols);

        // Canvas size
        // Width = (cols * maxWidth) + ((cols - 1) * padding)
        // Height = (rows * maxHeight) + ((rows - 1) * padding)
        // But let's simplify padding logic: padding around each cell or just between? 
        // Let's do padding between images.
        // x = col * (maxWidth + padding)
        // y = row * (maxHeight + padding)
        
        const finalWidth = (cols * maxWidth) + ((cols - 1) * padding);
        const finalHeight = (rows * maxHeight) + ((rows - 1) * padding);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, finalWidth);
        canvas.height = Math.max(1, finalHeight);
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        images.forEach(({ img }, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const x = col * (maxWidth + padding);
            const y = row * (maxHeight + padding);

            // Center image in cell if smaller than max dimensions?
            // Usually spritesheets align top-left or center. Let's center for aesthetics or keep top-left.
            // Animation strips usually expect consistent alignment. Top-Left is safer standard.
            // But if images are different sizes, centering might be better visually.
            // Let's do Center alignment within the cell to be safe for diverse assets.
            const xOffset = (maxWidth - img.width) / 2;
            const yOffset = (maxHeight - img.height) / 2;

            ctx.drawImage(img, x + xOffset, y + yOffset);
        });

        canvas.toBlob((blob) => {
            if (generatedSheet) URL.revokeObjectURL(generatedSheet);
            const url = URL.createObjectURL(blob);
            setGeneratedSheet(url);
            setIsGenerating(false);
        }, 'image/png');

    }, 100); // Small delay to allow UI to show processing state if needed
  };

  const clearAll = () => {
    setImages([]);
    if (generatedSheet) URL.revokeObjectURL(generatedSheet);
    setGeneratedSheet(null);
  };

  const downloadSheet = () => {
    if (generatedSheet) {
      saveAs(generatedSheet, 'spritesheet.png');
    }
  };

  return (
    <div className="w-full">
       <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Creador de SpriteSheets</h2>
        <p className="text-gray-600">Combina múltiples imágenes en una sola hoja de sprites organizada.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
           {/* Dropzone */}
           <div 
            {...getRootProps()} 
            className={`border-3 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-white shadow-sm'}`}
          >
            <input {...getInputProps()} />
            <Images className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Añadir imágenes</p>
            <p className="text-xs text-gray-400 mt-1">Arrastra o haz clic</p>
          </div>

          {/* Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Settings className="w-4 h-4"/> Configuración
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Columnas</label>
                    <input 
                        type="number" 
                        min="0" 
                        value={columns} 
                        onChange={(e) => setColumns(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Auto"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">0 = Auto (Cuadrado)</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Espaciado (px)</label>
                    <input 
                        type="number" 
                        min="0" 
                        value={padding} 
                        onChange={(e) => setPadding(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={generateSpriteSheet}
                disabled={images.length === 0 || isGenerating}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <GridIcon className="w-4 h-4"/>}
                Generar
              </button>
              <button 
                onClick={clearAll}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Limpiar todo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Image List */}
          {images.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[400px]">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">IMÁGENES ({images.length})</span>
                    <span className="text-[10px] text-gray-400">Orden de carga</span>
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                    {images.map((img, i) => (
                        <div key={img.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group text-sm">
                            <span className="text-gray-400 w-5 text-center text-xs font-mono">{i+1}</span>
                            <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-200">
                                <img src={img.img.src} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="truncate flex-1 text-gray-700 text-xs" title={img.name}>{img.name}</span>
                            <button 
                                onClick={() => removeImage(i)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        {/* Right Column: Preview (8 cols) */}
        <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full min-h-[500px] overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Vista Previa</h3>
                    {generatedSheet && (
                        <button 
                            onClick={downloadSheet}
                            className="bg-green-600 text-white px-4 py-1.5 rounded-lg shadow hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Descargar PNG
                        </button>
                    )}
                </div>
                
                <div className="flex-1 bg-gray-100 relative overflow-auto flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                    {generatedSheet ? (
                        <img 
                            src={generatedSheet} 
                            alt="SpriteSheet Preview" 
                            className="max-w-full max-h-full object-contain shadow-2xl border border-gray-300 bg-white" 
                            style={{imageRendering: 'pixelated'}} // Important for pixel art
                        />
                    ) : (
                        <div className="text-center text-gray-400">
                            <GridIcon className="w-20 h-20 mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-medium">No hay vista previa</p>
                            <p className="text-sm">Añade imágenes y pulsa Generar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default SpriteSheetMaker;
