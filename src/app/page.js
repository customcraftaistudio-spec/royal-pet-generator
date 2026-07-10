"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Crown, Palette, Droplet, Download, Loader2, Info, ChevronRight, ArrowLeft, Coins, FileImage, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

// --- PROMPTS CONFIGURATION ---
const PROMPTS = {
  'Majestic Royal': [
    "An ultra-realistic 8k resolution photograph of the pet that the image being uploaded, sitting regally on a golden, carved baroque throne. The pet wears a deep crimson velvet royal cloak with intricate gold embroidery and a jewel-encrusted crown. The background is a detailed palace interior with tapestries and marble columns. Detailed fur texture, photorealistic lighting, colourful and high resolution.",
    "A magnificent, highly detailed photograph of a the pet that the image being uploaded, posing as a royal figure in a luxurious antique library. The pet wears a dark sapphire blue royal cape and a delicate diamond tiara. Background is filled with old books, flickering candlelight, and heavy drapery. Cinematic lighting, 8k resolution, photorealistic and detailed.",
    "A regal and colourful photograph of the pet that the image being uploaded, standing on a velvet cushion in a formal French palace garden. The pet wears a mini pearl necklace and a tiny feather-adorned crown. Background features a palace facade and manicured bushes under a bright blue sky. Rich colours, 8k realistic, highly detailed, perfect for print."
  ],
  'Artistic Picture': [
    "A powerful, monochrome close-up portrait of the pet's face that the image being uploaded, focusing sharply on its eyes. The photo uses high-contrast chiaroscuro lighting to highlight the intricate texture of the fur and iris. Minimalist dark background, extremely detailed, artistic black and white fine art photography style, perfect for printing.",
    "A vibrant, highly textured photograph of the pet that the image being uploaded, in the style of a Neo-Expressionist oil painting. Bold, colourful brushstrokes, layered paint textures, and abstracted forms, with the pet looking into the camera. Deep, rich colours and a palpable painterly feel. High-resolution art photo, colourful and detailed.",
    "A stunning, minimalist photograph of the pet that the image being uploaded, against a solid, deep terracotta backdrop. The pet is captured from a low angle with a natural pose, using soft, directional lighting to emphasize its shape and fur texture. 8k photorealistic, detailed and colourful, fine art studio style."
  ],
  'Watercolour Painting': [
    "A beautiful, soft watercolour painting of the pet that the image being uploaded, using delicate pastel colours and translucent washes. The pet is surrounded by splashes of pastel pink, blue, and yellow with subtle floral and leaf motifs. Painted on textured art paper, artistic and colourful, high resolution for printing.",
    "A vibrant and charming watercolour illustration of the pet that the image being uploaded, playful in a lush garden filled with wildflowers. The painting features clear, flowing brushstrokes, natural colour blending, and a gentle art style. Colourful and highly detailed, art print style.",
    "An elegant, minimalist watercolour portrait of a the pet that the image being uploaded with defined features against a subtle, layered wash of cool blue and green. The artwork emphasizes simplicity, light, and the fluidity of the watercolour medium. Colourful and highly detailed, artistic style for high-quality printing."
  ]
};

const PET_QUOTES = [
  "Time spent with cats is never wasted. ✨",
  "Dogs are not our whole life, but they make our lives whole. 🐶",
  "A meow massages the heart. 🐱",
  "Happiness is a warm puppy. 💖",
  "Pets leave paw prints on our hearts. 🐾",
  "The more people I meet, the more I love my dog. 👑"
];

const CONCEPT_PREVIEWS = {
  'Majestic Royal': 'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=400&q=80', 
  'Artistic Picture': 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80', 
  'Watercolour Painting': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80' 
};

// Convert Base64 ke Blob 
const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

export default function App() {
  const [etsyInvoice, setEtsyInvoice] = useState('');
  const [petImage, setPetImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [tokens, setTokens] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [toastMessage, setToastMessage] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ text: message, type });
    setTimeout(() => setToastMessage(null), 3000); // Dipercepat
  };

  const goToPage = (pageNumber) => {
    setIsLoading(true);
    const randomQuote = PET_QUOTES[Math.floor(Math.random() * PET_QUOTES.length)];
    setLoadingText(randomQuote);
    setError('');
    // SPEED BOOST: Kurangi waktu jeda pindah halaman dari 2000ms ke 300ms
    setTimeout(() => {
      setCurrentPage(pageNumber);
      setIsLoading(false);
    }, 300);
  };

  const handleInvoiceSubmit = async () => {
    if (!etsyInvoice.trim()) {
      setError('Please enter your Etsy Invoice Number.');
      return;
    }
    
    setIsLoading(true);
    setLoadingText("Verifying your invoice...");
    setError('');

    try {
      const response = await fetch('/api/verify-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber: etsyInvoice })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal memverifikasi invoice.');
      }

      setTokens(data.tokens);
      setLoadingText(PET_QUOTES[Math.floor(Math.random() * PET_QUOTES.length)]);
      
      // SPEED BOOST: Kurangi jeda dari 1000ms ke 300ms
      setTimeout(() => {
        setCurrentPage(2);
        setIsLoading(false);
      }, 300);

    } catch (err) {
      setIsLoading(false);
      setError(err.message);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Please keep the file size under 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // SPEED BOOST: Kompresi Gambar Otomatis (Auto Resize)
        // Mengecilkan foto agar pengiriman ke server Vercel jauh lebih cepat
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800; // Maksimal ukuran 800px (Cukup untuk dibaca AI Vision)
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Konversi ke JPEG dengan kualitas 80% (Menghemat memori drastis)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPetImage(compressedDataUrl);
          setError('');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStyle) {
      setError('Please select an art style first!');
      return;
    }
    if (tokens <= 0) {
      setError("Oops! You are out of generation tokens. Please top up.");
      return;
    }

    setTokens(prev => prev - 1);
    
    // Pindah layar ke halaman 4 (Loading Generation) secara instant
    setCurrentPage(4);
    setIsGenerating(true);
    setGeneratedImages([]);
    setError('');
    
    const promptsToRun = PROMPTS[selectedStyle];

    try {
      const base64Data = petImage.split(',')[1];
      const mimeType = petImage.split(';')[0].split(':')[1];

      // Request API langsung dieksekusi tanpa jeda buatan (setTimeout)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsToRun,
          base64Image: base64Data,
          mimeType: mimeType,
          etsyInvoice: etsyInvoice
        })
      });

      const data = await response.json();

      if (!response.ok) {
         throw new Error(data.message || 'Gagal generate gambar.');
      }

      if (data.images && data.images.length > 0) {
         setGeneratedImages(data.images);
      } else {
         throw new Error('Tidak ada gambar yang dihasilkan.');
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while painting. Please try again!");
      setTokens(prev => prev + 1); 
      setCurrentPage(3); 
    } finally {
      setIsGenerating(false);
    }
  };

  const executeDownload = (url, filename) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Download dimulai!", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal memulai download. Silakan coba lagi.", "error");
    }
  };

  // Standard Download
  const handleDownload = (imgUrl, index, format) => {
    showToast("Menyiapkan file standar...", "success");
    const base64Data = imgUrl.split(',')[1];
    const fileName = `RoyalPet_${selectedStyle.replace(/\s+/g, '')}_0${index + 1}`;

    setTimeout(() => {
      try {
        if (format === 'jpg') {
          const blob = b64toBlob(base64Data, 'image/jpeg');
          const blobUrl = URL.createObjectURL(blob);
          executeDownload(blobUrl, `${fileName}.jpg`);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } 
        else if (format === 'png') {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                executeDownload(blobUrl, `${fileName}.png`);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              }
            }, 'image/png');
          };
          img.src = imgUrl;
        } 
        else if (format === 'pdf') {
          if (window.jspdf && window.jspdf.jsPDF) {
            const img = new window.Image();
            img.onload = () => {
              const pdf = new window.jspdf.jsPDF({
                orientation: img.width > img.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [img.width, img.height]
              });
              pdf.addImage(imgUrl, 'JPEG', 0, 0, img.width, img.height);
              pdf.save(`${fileName}.pdf`);
              showToast("PDF berhasil dibuat dan diunduh!", "success");
            };
            img.src = imgUrl;
          } else {
            showToast("Sistem pembuat PDF sedang dimuat, coba klik lagi.", "error");
          }
        }
      } catch (err) {
        showToast("Terjadi kendala saat download.", "error");
      }
    }, 100); 
  };

  // Enhanced High-Res Download
  const handleEnhancedDownload = (imgUrl, index) => {
    showToast("Meningkatkan kualitas gambar (High-Res)...", "success");
    const fileName = `RoyalPet_Enhanced_${selectedStyle.replace(/\s+/g, '')}_0${index + 1}.png`;

    setTimeout(() => {
      try {
        const img = new window.Image();
        img.onload = () => {
          const scaleFactor = 3; 
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              executeDownload(blobUrl, fileName);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
          }, 'image/png', 1.0);
        };
        img.src = imgUrl;
      } catch (err) {
        showToast("Terjadi kendala saat proses enhancement.", "error");
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-fuchsia-900 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-16 h-16 text-pink-300 animate-spin mb-8" />
        <p className="text-white text-2xl font-medium max-w-md italic tracking-wide font-serif">
          "{loadingText}"
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-fuchsia-100 text-slate-800 font-sans pb-20 relative overflow-x-hidden">
      
      {/* --- TOAST NOTIFICATION --- */}
      {toastMessage && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border ${toastMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toastMessage.text}</span>
        </div>
      )}

      <header className="bg-white/60 backdrop-blur-md shadow-sm py-5 px-6 sticky top-0 z-40 flex justify-between items-center border-b border-pink-100">
        <h1 className="text-xl font-extrabold text-purple-900 tracking-tight flex items-center gap-2">
          <Crown className="text-pink-500 w-7 h-7" />
          <span className="hidden sm:inline">Royal Pet Generator</span>
          <span className="sm:hidden">Royal Pet</span>
        </h1>
        
        {currentPage > 1 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 rounded-full border border-purple-200 shadow-sm">
            <Coins className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-purple-800 text-sm">{tokens} Tokens</span>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-6 mt-8">
        
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {/* --- PAGE 1: INVOICE --- */}
        {currentPage === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8 mt-4">
              <h2 className="text-4xl font-extrabold text-purple-900 mb-3 font-serif">Hi there! 👋</h2>
              <p className="text-purple-700/80">
                Turn your furry best friend into a breathtaking, high-resolution masterpiece.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-purple-200/50 border border-white">
              <h3 className="font-bold text-xl text-purple-900 mb-2">Step 1: Verify Purchase</h3>
              <p className="text-sm text-purple-600 mb-6">Enter your Etsy Invoice Number to load your tokens.</p>
              
              <input 
                type="text" 
                placeholder="e.g. 1234567890" 
                value={etsyInvoice}
                onChange={(e) => setEtsyInvoice(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-purple-100 bg-white focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all mb-6 text-purple-900 font-medium"
              />
              
              <button 
                onClick={handleInvoiceSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-pink-300/50 hover:shadow-pink-300/80 hover:-translate-y-0.5 active:translate-y-0 transition-all flex justify-center items-center gap-2"
              >
                Let's Go! <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* --- PAGE 2: UPLOAD --- */}
        {currentPage === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button 
              onClick={() => setCurrentPage(1)} 
              className="flex items-center text-purple-600 font-medium mb-6 hover:text-purple-800 transition"
            >
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>

            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-purple-200/50 border border-white">
              <h3 className="font-bold text-2xl text-purple-900 mb-2">Step 2: Upload Photo</h3>
              
              <div className="bg-pink-50/80 text-pink-800 text-sm p-4 rounded-2xl flex gap-3 items-start mb-6 border border-pink-100">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-pink-500" />
                <p>For best results, use a clear, <strong>front-facing portrait</strong> of your pet. No blurry photos, please!</p>
              </div>
              
              <input 
                type="file" 
                accept="image/jpeg, image/png" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              
              {!petImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 bg-purple-50/50 hover:bg-pink-50/80 rounded-3xl p-10 text-center cursor-pointer transition-all relative overflow-hidden group"
                >
                  <div className="flex flex-col items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                      <Upload className="w-8 h-8 text-pink-500" />
                    </div>
                    <p className="font-bold text-xl text-purple-900">Tap to browse</p>
                    <p className="text-sm mt-2 text-purple-500 font-medium">JPG or PNG</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                  <div className="relative w-full aspect-square max-w-[240px] mx-auto rounded-3xl shadow-lg border-4 border-white overflow-hidden bg-purple-50">
                    <img 
                      src={petImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex w-full gap-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-purple-50 text-purple-700 font-bold py-4 rounded-2xl border-2 border-purple-200 hover:bg-purple-100 transition-all text-sm"
                    >
                      Change
                    </button>
                    <button 
                      onClick={() => goToPage(3)}
                      className="flex-[1.5] bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-300/50 hover:shadow-pink-300/80 transition-all flex justify-center items-center gap-2"
                    >
                      Next Step <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PAGE 3: CHOOSE CONCEPT --- */}
        {currentPage === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button 
              onClick={() => setCurrentPage(2)} 
              className="flex items-center text-purple-600 font-medium mb-6 hover:text-purple-800 transition"
            >
              <ArrowLeft className="w-5 h-5 mr-1" /> Back to Upload
            </button>

            <div className="mb-6">
              <h3 className="font-extrabold text-3xl text-purple-900 font-serif">Step 3: Choose Concept</h3>
              <p className="text-purple-600 mt-2 font-medium">Select the art style for your masterpiece.</p>
            </div>

            <div className="space-y-4 mb-8">
              {['Majestic Royal', 'Artistic Picture', 'Watercolour Painting'].map(style => (
                <div 
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`flex items-center p-4 rounded-3xl border-2 cursor-pointer transition-all ${
                    selectedStyle === style 
                    ? 'border-pink-500 bg-pink-50/80 shadow-md shadow-pink-200/50' 
                    : 'border-transparent bg-white/80 shadow-sm hover:border-purple-200'
                  }`}
                >
                  <img src={CONCEPT_PREVIEWS[style]} alt={style} className="w-24 h-24 rounded-2xl object-cover shadow-sm" />
                  <div className="ml-5">
                    <h4 className="font-bold text-xl text-purple-900 mb-1">{style}</h4>
                    <p className="text-sm text-purple-600 leading-tight">
                      {style === 'Majestic Royal' && 'Regal attire, grand palace background.'}
                      {style === 'Artistic Picture' && 'Monochrome & dramatic fine art style.'}
                      {style === 'Watercolour Painting' && 'Soft pastels & dreamy painterly feel.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={tokens <= 0 || !selectedStyle}
              className={`w-full font-bold text-lg py-5 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-3 ${
                selectedStyle && tokens > 0 
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-pink-300/80 hover:-translate-y-0.5' 
                : 'bg-purple-100 text-purple-400 cursor-not-allowed'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              Generate Masterpieces (1 Token)
            </button>
          </div>
        )}

        {/* --- PAGE 4: RESULTS --- */}
        {currentPage === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-purple-900 mb-2 font-serif">Your Masterpieces</h2>
              <p className="text-purple-600 text-sm bg-white/60 inline-block px-4 py-1.5 rounded-full border border-purple-100">
                Style: <strong>{selectedStyle}</strong>
              </p>
            </div>

            <div className="space-y-8">
              {[0, 1, 2].map((index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-200/40 overflow-hidden flex flex-col border border-white">
                  <div className="aspect-[4/5] bg-purple-50/50 relative group">
                    {generatedImages[index] ? (
                      <>
                        <img 
                          src={generatedImages[index]} 
                          alt={`Generated Art ${index + 1}`} 
                          className="w-full h-full object-cover animate-in fade-in duration-700"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-300">
                        {isGenerating && generatedImages.length === index ? (
                          <>
                            <Loader2 className="w-12 h-12 animate-spin mb-4 text-pink-500" />
                            <p className="text-sm font-bold text-purple-600">Painting variant {index + 1}...</p>
                          </>
                        ) : (
                          <ImageIcon className="w-16 h-16 opacity-30" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {generatedImages[index] && (
                    <div className="p-4 bg-white border-t border-purple-50">
                      
                      <button 
                        onClick={() => handleEnhancedDownload(generatedImages[index], index)}
                        className="w-full mb-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
                      >
                        <Sparkles className="w-5 h-5 text-pink-200" />
                        Enhance & Download High-Res
                      </button>

                      <p className="text-[10px] font-bold text-purple-400 mb-2 mt-4 text-center uppercase tracking-wider">Or Download Standard Size File:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => handleDownload(generatedImages[index], index, 'jpg')}
                          className="flex flex-col items-center justify-center py-2.5 bg-purple-50 hover:bg-pink-100 text-purple-700 rounded-xl transition-colors border border-purple-100 hover:shadow-sm"
                        >
                          <FileImage className="w-4 h-4 mb-1 text-purple-500" />
                          <span className="text-[11px] font-bold">JPG</span>
                        </button>
                        
                        <button 
                          onClick={() => handleDownload(generatedImages[index], index, 'png')}
                          className="flex flex-col items-center justify-center py-2.5 bg-purple-50 hover:bg-pink-100 text-purple-700 rounded-xl transition-colors border border-purple-100 hover:shadow-sm"
                        >
                          <ImageIcon className="w-4 h-4 mb-1 text-purple-500" />
                          <span className="text-[11px] font-bold">PNG</span>
                        </button>

                        <button 
                          onClick={() => handleDownload(generatedImages[index], index, 'pdf')}
                          className="flex flex-col items-center justify-center py-2.5 bg-purple-50 hover:bg-pink-100 text-purple-700 rounded-xl transition-colors border border-purple-100 hover:shadow-sm"
                        >
                          <FileText className="w-4 h-4 mb-1 text-purple-500" />
                          <span className="text-[11px] font-bold">PDF</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isGenerating && generatedImages.length === 3 && (
               <button 
                onClick={() => {
                  setGeneratedImages([]);
                  setPetImage(null);
                  setSelectedStyle('');
                  goToPage(2); 
                }}
                className="mt-10 mb-8 w-full bg-white text-purple-700 border-2 border-purple-200 font-bold py-5 rounded-2xl hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
              >
                Create Another Art
              </button>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
