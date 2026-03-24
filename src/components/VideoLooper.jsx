import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Download, Loader2, Play, Pause, Repeat, Trash2, Video } from 'lucide-react';

function VideoLooper() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    // Check if already loaded
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
      if (processedVideoUrl) URL.revokeObjectURL(processedVideoUrl);
    };
  }, []);

  const onDrop = React.useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (processedVideoUrl) URL.revokeObjectURL(processedVideoUrl);
      
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setProcessedVideoUrl(null);
      setStartTime(0);
      setEndTime(0);
    }
  }, [videoUrl, processedVideoUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.webm']
    },
    maxFiles: 1
  });

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setEndTime(videoRef.current.duration);
    }
  };

  const processVideo = async () => {
    if (!loaded || !videoFile) return;
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;

    try {
      const inputName = 'input.mp4';
      const segmentName = 'segment.mp4';
      const reversedName = 'reversed.mp4';
      const outputName = 'output.mp4';

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // 1. Cut the segment (re-encode for precision)
      // We use -c:v libx264 -preset fast -crf 22 to ensure good quality and speed
      // We also ensure audio is handled (or removed if silent)
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        segmentName
      ]);

      // 2. Reverse the segment
      await ffmpeg.exec([
        '-i', segmentName,
        '-vf', 'reverse',
        '-af', 'areverse',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        reversedName
      ]);

      // 3. Concat segment + reversed
      const listContent = `file '${segmentName}'\nfile '${reversedName}'`;
      await ffmpeg.writeFile('list.txt', listContent);

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c', 'copy',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      setProcessedVideoUrl(url);
    } catch (error) {
      console.error("Error processing video:", error);
    } finally {
      setProcessing(false);
    }
  };

  const clearVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (processedVideoUrl) URL.revokeObjectURL(processedVideoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setProcessedVideoUrl(null);
    setStartTime(0);
    setEndTime(0);
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Video Loop Maker</h2>
        <p className="text-gray-600">Crea loops estilo "ping-pong" (ida y vuelta) de tus videos.</p>
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
              <h3 className="font-semibold text-gray-700">Editor</h3>
              <button onClick={clearVideo} className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm">
                <Trash2 className="w-4 h-4" /> Cambiar video
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Original</h4>
                <video 
                    ref={videoRef}
                    src={videoUrl} 
                    controls 
                    className="w-full rounded-lg bg-black aspect-video"
                    onLoadedMetadata={handleLoadedMetadata}
                />
                
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Inicio (segundos)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max={duration} 
                      step="0.1" 
                      value={startTime} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val < endTime) setStartTime(val);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>{startTime.toFixed(1)}s</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Fin (segundos)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max={duration} 
                      step="0.1" 
                      value={endTime} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > startTime) setEndTime(val);
                      }}
                      className="w-full"
                    />
                     <div className="flex justify-between text-sm text-gray-600">
                        <span>{endTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Resultado (Loop)</h4>
                {processedVideoUrl ? (
                  <video src={processedVideoUrl} controls autoPlay loop className="w-full rounded-lg bg-black aspect-video" />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200 border-dashed">
                     <p>El resultado aparecerá aquí</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={processVideo}
                disabled={processing || !loaded}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Repeat className="w-5 h-5" />}
                Generar Loop
              </button>
              
              {processedVideoUrl && (
                <a 
                  href={processedVideoUrl} 
                  download="looped_video.mp4"
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Descargar
                </a>
              )}
            </div>
            
            <div className="mt-4 text-xs text-gray-400 font-mono text-center h-4">
                <span ref={messageRef}></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoLooper;
