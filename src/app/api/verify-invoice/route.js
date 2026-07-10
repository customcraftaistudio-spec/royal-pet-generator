import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const { invoiceNumber } = body;

    // Pastikan kunci supabase ada
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
       return NextResponse.json({ message: 'Error server: Database Key need to be set up.' }, { status: 500 });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Cari invoice di database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tokens')
      .eq('invoice_number', invoiceNumber)
      .single();

    // Jika tidak ketemu
    if (userError || !user) {
      return NextResponse.json({ message: 'Oops! Invoice Number invalid or not found.' }, { status: 404 });
    }
    
    // Jika token habis
    if (user.tokens <= 0) {
      return NextResponse.json({ message: 'Sorry, your token on this Invoice are run out.' }, { status: 403 });
    }

    // Jika sukses, kembalikan jumlah token yang tersisa
    return NextResponse.json({ tokens: user.tokens }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Verification Failure.' }, { status: 500 });
  }
}