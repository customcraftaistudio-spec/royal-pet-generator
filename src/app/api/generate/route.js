import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompts, base64Image, mimeType, etsyInvoice } = body;

    // ==========================================
    // 1. CEK KUOTA DI SUPABASE
    // ==========================================
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('tokens')
        .eq('invoice_number', etsyInvoice)
        .single();

      if (userError || !user) {
        return NextResponse.json({ message: 'Oops! Invoice Number invalid or not found.' }, { status: 404 });
      }
      if (user.tokens <= 0) {
        return NextResponse.json({ message: 'Sorry, your tokens for this Invoice have run out!' }, { status: 403 });
      }

      await supabase.from('users').update({ tokens: user.tokens - 1 }).eq('invoice_number', etsyInvoice);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'Server Error: GEMINI_API_KEY is missing.' }, { status: 500 });
    }

    // ==========================================
    // 2. STEP 1: ANALISA FOTO (Gemini 3.5 / 3.1 Terbaru)
    // ==========================================
    const visionPayload = {
      contents: [{
        parts: [
          { text: "Analyze this pet. Describe its physical appearance in 1-2 short sentences. Include the animal type (cat/dog/etc), breed if recognizable, fur colors, patterns, and eye color. Do not describe the background, only the pet itself." },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }]
    };

    // Daftar model AI Google generasi ke-3 (Standar pengguna baru)
    const visionModels = [
      'gemini-3.5-flash', 
      'gemini-3.1-flash-lite', 
      'gemini-3.1-pro'
    ];
    
    let petDescription = "";
    let visionSuccess = false;
    let lastErrorDetail = "";

    // Sistem akan mencoba model generasi terbaru satu per satu
    for (const model of visionModels) {
      if (visionSuccess) break;
      
      const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      try {
        console.log(`Mencoba menganalisa foto dengan model terbaru: ${model}...`);
        const visionResponse = await fetch(visionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(visionPayload)
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          petDescription = visionData.candidates[0].content.parts[0].text;
          console.log(`🐾 BERHASIL! Ciri-ciri Pet dikenali oleh ${model}:`, petDescription);
          visionSuccess = true;
        } else {
          const errorText = await visionResponse.text();
          console.warn(`Model ${model} ditolak:`, errorText);
          lastErrorDetail = errorText; 
        }
      } catch (e) {
        console.warn(`Koneksi ke model ${model} error:`, e.message);
        lastErrorDetail = e.message;
      }
    }

    if (!visionSuccess) {
      throw new Error(`AI Vision Error: ${lastErrorDetail}`);
    }

    // ==========================================
    // 3. STEP 2: MELUKIS GAMBAR (Imagen 4.0 Terbaru)
    // ==========================================
    const generatedImages = [];
    const imagenModels = ['imagen-4.0-generate-001', 'imagen-3.0-generate-001']; // Coba v4.0 dulu, kalau gagal turun ke v3.0

    // Loop 3 kali untuk 3 variasi prompt
    for (let i = 0; i < prompts.length; i++) {
      
      const finalPrompt = prompts[i].replace("the pet that the image being uploaded", `a ${petDescription}`);
      console.log(`Membuat lukisan ke-${i+1} dengan prompt:`, finalPrompt);

      const imagenPayload = {
        instances: [{ prompt: finalPrompt }],
        parameters: { sampleCount: 1 }
      };

      let imageSuccess = false;
      let imgErrorDetail = "";

      for (const imgModel of imagenModels) {
        if (imageSuccess) break;

        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:predict?key=${apiKey}`;

        try {
          const result = await fetch(imagenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imagenPayload)
          });

          if (result.ok) {
            const data = await result.json();
            const outputBase64 = data.predictions?.[0]?.bytesBase64Encoded;
            if (outputBase64) {
              generatedImages.push(`data:image/jpeg;base64,${outputBase64}`);
              imageSuccess = true;
              console.log(`✅ Berhasil melukis menggunakan ${imgModel}`);
            }
          } else {
            imgErrorDetail = await result.text();
            console.warn(`Pelukis ${imgModel} gagal:`, imgErrorDetail);
          }
        } catch (e) {
          imgErrorDetail = e.message;
        }
      }

      if (!imageSuccess) {
        throw new Error(`Semua versi Pelukis AI menolak request. Detail: ${imgErrorDetail}`);
      }
      
      // Jeda 2 detik agar API Google tidak kepanasan
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 4. KEMBALIKAN GAMBAR KE FRONT END
    return NextResponse.json({ images: generatedImages }, { status: 200 });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error.' }, { status: 500 });
  }
}