import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, Loader2, Video, Images, FileArchive } from 'lucide-react';

function VideoToFrames() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  // Reemplazamos 'fps' por 'intervalMs' y 'frameLimit'
  const [intervalMs, setIntervalMs] = useState(100); 
  const [frameLimit, setFrameLimit] = useState(0); // 0 = sin límite
  const [frames, setFrames] = useState([]);
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef(null);

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    if (ffmpeg.loaded) {
        setLoaded(true);
        return;
    }

    ffmpeg.on('log', ({ message }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
      console.log(message);
    });

    try {
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
    } catch (error) {
        console.error("Failed to load ffmpeg:", error);
    }
  };

  useEffect(() => {
    load();
    return () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        frames.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, []);

  const onDrop = React.useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      frames.forEach(f => URL.revokeObjectURL(f.url));
      
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setFrames([]);
    }
  }, [videoUrl, frames]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm']
    },
    maxFiles: 1
  });

  const extractFrames = async () => {
    if (!loaded || !videoFile) return;
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;

    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

      // Calcular FPS basado en milisegundos
      // 1000ms = 1 fps
      // 500ms = 2 fps
      // 100ms = 10 fps
      const calculatedFps = 1000 / (intervalMs || 100);

      const outputPattern = 'frame_%04d.png';
      
      const args = [
        '-i', 'input.mp4',
        '-vf', `fps=${calculatedFps}`,
      ];

      if (frameLimit > 0) {
        args.push('-vframes', frameLimit.toString());
      }

      args.push(outputPattern);

      await ffmpeg.exec(args);

      // Leer archivos generados
      const files = await ffmpeg.listDir('.');
      // Filtrar y ordenar naturalmente por nombre para asegurar el orden correcto
      const frameFiles = files
        .filter(f => f.name.startsWith('frame_') && f.name.endsWith('.png'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const newFrames = [];
      for (const file of frameFiles) {
        const data = await ffmpeg.readFile(file.name);
        const blob = new Blob([data.buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        
        newFrames.push({ 
            originalName: file.name, 
            blob, 
            url 
        });
      }
      
      // Renombrar secuencialmente de menor a mayor (1.png, 2.png, ...)
      const enumeratedFrames = newFrames.map((frame, index) => ({
          ...frame,
          name: `${index + 1}.png`
      }));

      setFrames(enumeratedFrames);
      
      // Limpieza
      for (const file of frameFiles) {
          await ffmpeg.deleteFile(file.name);
      }
      await ffmpeg.deleteFile('input.mp4');

    } catch (error) {
      console.error("Error extracting frames:", error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadZip = async () => {
    if (frames.length === 0) return;
    const zip = new JSZip();
    // Asegurar ordenamiento numérico
    const sortedFrames = [...frames].sort((a, b) => parseInt(a.name) - parseInt(b.name));
    
    sortedFrames.forEach(frame => {
      zip.file(frame.name, frame.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, "frames.zip");
  };

  const clear = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setFrames([]);
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Extractor de Frames</h2>
        <p className="text-gray-600">Extrae imágenes de tu video cuadro por cuadro.</p>
        {!loaded && <p className="text-sm text-yellow-600 mt-2 flex justify-center items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Cargando motor de video...</p>}
      </div>

      {!videoFile ? (
        <div 
          {...getRootProps()} 
          className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-8
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-white shadow-sm'}`}
        >
          <input {...getInputProps()} />
          <Video className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-700">Arrastra tu video aquí</p>
          <p className="text-gray-500 mt-2">O haz clic para seleccionar (MP4, MOV, WebM)</p>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-semibold text-gray-700">Configuración</h3>
               <button onClick={clear} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm">Cambiar video</button>
             </div>

             <div className="flex flex-col md:flex-row gap-6 items-start">
               <video src={videoUrl} controls className="w-full md:w-1/2 rounded-lg bg-black aspect-video" />
               
               <div className="w-full md:w-1/2 space-y-4">
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo entre frames (milisegundos)</label>
                   <input 
                     type="number" 
                     min="1"
                     step="10" 
                     value={intervalMs} 
                     onChange={(e) => setIntervalMs(Math.max(1, parseInt(e.target.value) || 0))}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                   <p className="text-xs text-gray-500 mt-1">
                     Capturar una imagen cada {intervalMs} ms. ({(1000/intervalMs).toFixed(2)} FPS)
                   </p>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Límite de frames (Opcional)</label>
                   <input 
                     type="number" 
                     min="0"
                     step="1" 
                     value={frameLimit} 
                     onChange={(e) => setFrameLimit(Math.max(0, parseInt(e.target.value) || 0))}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                     placeholder="0 para sin límite"
                   />
                   <p className="text-xs text-gray-500 mt-1">
                     0 = Extraer todo el video. Pon un número para detenerte tras esa cantidad.
                   </p>
                 </div>

                 <button 
                   onClick={extractFrames}
                   disabled={processing || !loaded}
                   className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
                 >
                   {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Images className="w-5 h-5" />}
                   {processing ? 'Extrayendo...' : 'Extraer Frames'}
                 </button>
               </div>
             </div>
             
             <div className="mt-4 text-xs text-gray-400 font-mono text-center h-4">
                <span ref={messageRef}></span>
            </div>
           </div>

           {frames.length > 0 && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-semibold text-gray-700">Frames Extraídos ({frames.length})</h3>
                 <button 
                   onClick={downloadZip}
                   className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                 >
                   <FileArchive className="w-4 h-4" />
                   Descargar ZIP
                 </button>
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                 {frames.map((frame, idx) => (
                   <div key={idx} className="aspect-video bg-gray-100 rounded overflow-hidden relative group">
                     <img src={frame.url} alt={frame.name} className="w-full h-full object-cover" />
                     <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center truncate">
                        {frame.name}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default VideoToFrames;
