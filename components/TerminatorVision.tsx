
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzePerson } from '../services/geminiService';
import type { AnalysisData, DetectedObject } from '../types';

// Declare global variables from browser scripts
declare var cocoSsd: any;
declare var tf: any;

const StatusText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-30 text-center">
    {children}
  </div>
);

// --- New T-800 HUD Components ---

const AnalysisMatrix: React.FC<{ data: AnalysisData | null; isLoading: boolean }> = ({ data, isLoading }) => {
    const displayData = data ? Object.entries(data).slice(0, 6) : [];

    return (
        <div className="absolute top-12 right-12 text-red-500 font-mono text-lg tracking-wider w-64 z-50">
            <div className="border border-red-500 p-2 bg-black bg-opacity-20">
                <p>ANALYSIS: {isLoading ? '...': 'MATCH:'}</p>
                {isLoading && <p className="animate-pulse">SCANNING...</p>}
                {!isLoading && data && (
                     <div className="grid grid-cols-3 gap-x-4">
                        {displayData.map(([key]) => <div key={key}>{key.split('_')[0]}</div>)}
                        {displayData.map(([key, value]) => <div key={`${key}-val`} className="col-span-2 text-white">{value}</div>)}
                    </div>
                )}
            </div>
            <div className="absolute top-full right-0 w-20 h-20 border-l border-b border-red-500"></div>
        </div>
    );
};

const TargetingReticle: React.FC<{ box: [number, number, number, number] }> = ({ box }) => {
    const [x, y, width, height] = box;
    // Target the upper center of the box, moved higher to better approximate the face
    const cx = x + width / 2;
    const cy = y + height / 8; // Aim higher than the previous quarter-down position

    const style = {
        transform: `translate(${cx}px, ${cy}px)`,
        transition: 'transform 0.1s linear',
    };

    return (
        <div className="absolute top-0 left-0 text-red-500 z-50" style={style}>
            <svg width="200" height="200" viewBox="-100 -100 200 200" className="opacity-80 animate-pulse">
                {/* Outer ring */}
                <circle cx="0" cy="0" r="70" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="15 10" />
                <circle cx="0" cy="0" r="65" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                
                {/* Inner target */}
                <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M -15 0 L 15 0 M 0 -15 L 0 15" stroke="currentColor" strokeWidth="2" />

                {/* Markers */}
                <path d="M -80 0 L -60 0 M 80 0 L 60 0 M 0 -80 L 0 -60 M 0 80 L 0 60" stroke="currentColor" strokeWidth="4" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-10 bg-yellow-400 text-black px-1 text-xs font-bold">
                x2 MAG
            </div>
        </div>
    );
};


const HudOverlay: React.FC<{ 
    person: DetectedObject | null; 
    analysisData: AnalysisData | null;
    isAnalyzing: boolean;
}> = ({ person, analysisData, isAnalyzing }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {/* Main frame */}
        <div className="absolute inset-4 border-2 border-red-500 border-opacity-60"></div>
        <div className="absolute inset-4 border-8 border-black"></div>

        {/* Top Bar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-red-500 font-mono text-xl tracking-widest">
            T-800 Vision Version 1.0
        </div>
        <div className="absolute top-14 left-1/2 -translate-x-1/2 text-center text-red-400">
             <svg width="100" height="20" viewBox="0 0 100 20">
                <path d="M 0 10 L 10 15 L 20 5 L 30 15 L 40 10 L 50 12 L 60 8 L 70 15 L 80 5 L 90 10 L 100 10" fill="none" stroke="#F87171" strokeWidth="2" >
                     <animate attributeName="d"
                        values="M 0 10 L 10 15 L 20 5 L 30 15 L 40 10 L 50 12 L 60 8 L 70 15 L 80 5 L 90 10 L 100 10;
                                M 0 12 L 10 8 L 20 15 L 30 5 L 40 10 L 50 15 L 60 10 L 70 5 L 80 12 L 90 8 L 100 12;
                                M 0 10 L 10 15 L 20 5 L 30 15 L 40 10 L 50 12 L 60 8 L 70 15 L 80 5 L 90 10 L 100 10"
                        dur="1s" repeatCount="indefinite" />
                </path>
            </svg>
            <p className="text-xs">&gt; HUMAN HEART</p>
        </div>


        {/* Left Bar */}
        <div className="absolute top-16 left-12 text-red-500 font-mono text-lg">
            <p>100%</p>
            <div className="space-y-2 mt-16">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-16 h-3 bg-red-600 opacity-80"></div>
                ))}
            </div>
            <p className="mt-2">0%</p>
        </div>
        
        {/* Right side Analysis */}
        <AnalysisMatrix data={analysisData} isLoading={isAnalyzing} />

        {/* Central Reticle */}
        {person && <TargetingReticle box={person.bbox} />}
    </div>
);


const TerminatorVision: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modelRef = useRef<any>(null);
    const detectionFrameRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const analysisStateRef = useRef<'IDLE' | 'ANALYZING' | 'DISPLAYING'>('IDLE');

    const [status, setStatus] = useState<string>('INITIALIZING...');
    const [permissionError, setPermissionError] = useState<boolean>(false);
    const [person, setPerson] = useState<DetectedObject | null>(null);
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    
    const cropPerson = (bbox: [number, number, number, number]): string => {
        const [x, y, width, height] = bbox;
        if (!videoRef.current || !canvasRef.current) return '';

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        
        ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
        return canvas.toDataURL('image/png').split(',')[1];
    };

    const handleAnalysis = useCallback(async (detectedPerson: DetectedObject) => {
        analysisStateRef.current = 'ANALYZING';
        setIsAnalyzing(true);
        const base64Image = cropPerson(detectedPerson.bbox);
        
        if (base64Image) {
            const data = await analyzePerson(base64Image);
            setAnalysisData(data);
            setIsAnalyzing(false);
            analysisStateRef.current = 'DISPLAYING';

            analysisTimerRef.current = setTimeout(() => {
                setAnalysisData(null);
                analysisStateRef.current = 'IDLE';
                analysisTimerRef.current = null;
            }, 10000); // Display for 10 seconds
        } else {
             // If cropping fails, reset state to allow another try.
            setIsAnalyzing(false);
            analysisStateRef.current = 'IDLE';
        }
    }, []);

    const detectFrame = useCallback(async () => {
        if (!videoRef.current || !modelRef.current || videoRef.current.paused || videoRef.current.ended) {
            detectionFrameRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        const model = modelRef.current;
        const predictions: DetectedObject[] = await model.detect(videoRef.current);
        const detectedPerson = predictions.find(p => p.class === 'person' && p.score > 0.6);

        if (detectedPerson) {
            setPerson(detectedPerson);
            if (analysisStateRef.current === 'IDLE') {
                handleAnalysis(detectedPerson);
            }
        } else {
            setPerson(null);
        }

        detectionFrameRef.current = requestAnimationFrame(detectFrame);
    }, [handleAnalysis]);


    const setupCameraAndModel = useCallback(async () => {
        // Reset state for retry
        setPermissionError(false);
        setStatus('INITIALIZING...');
        
        try {
             setStatus('LOADING AI MODEL...');
            await tf.setBackend('webgl');
            modelRef.current = await cocoSsd.load();

            setStatus('ACCESSING WEBCAM...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setStatus('');
                    detectionFrameRef.current = requestAnimationFrame(detectFrame);
                };
            }
        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                 if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    setStatus("WEBCAM PERMISSION DENIED");
                    setPermissionError(true);
                } else {
                    setStatus(`ERROR: ${err.message}`);
                }
            } else {
                setStatus("AN UNKNOWN ERROR OCCURRED");
            }
        }
    }, [detectFrame]);

    useEffect(() => {
        setupCameraAndModel();

        return () => {
            cancelAnimationFrame(detectionFrameRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            if (analysisTimerRef.current) {
                clearTimeout(analysisTimerRef.current);
            }
        };
    }, [setupCameraAndModel]);


    return (
        <div ref={containerRef} className="w-full max-w-4xl mx-auto aspect-video relative flex items-center justify-center border-2 border-red-900 shadow-lg shadow-red-500/20 bg-black">
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ filter: 'grayscale(50%) brightness(0.7) contrast(1.2)' }}
                autoPlay
                playsInline
                muted
            />
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <HudOverlay
                    person={person}
                    analysisData={analysisData}
                    isAnalyzing={isAnalyzing}
                />
                
                {status && (
                    <StatusText>
                        <p className="text-2xl text-red-500 font-bold tracking-widest animate-pulse">{status}</p>
                        {permissionError && (
                            <div className="mt-4">
                                <p className="text-lg font-normal mb-4 text-red-400">Please grant camera access in your browser settings and try again.</p>
                                <button
                                    onClick={setupCameraAndModel}
                                    className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 border border-red-500 rounded"
                                    aria-label="Retry camera initialization"
                                >
                                    Retry Initialization
                                </button>
                            </div>
                        )}
                    </StatusText>
                )}
                {!status && !person && (
                    <StatusText>
                        <p className="text-2xl text-red-500 font-bold tracking-widest animate-pulse">ACQUIRING TARGET...</p>
                    </StatusText>
                )}
            </div>
        </div>
    );
};

export default TerminatorVision;
