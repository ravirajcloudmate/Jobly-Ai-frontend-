import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";



export const dynamic = "force-dynamic";



const supabase = createClient(

  process.env.NEXT_PUBLIC_SUPABASE_URL!,

  process.env.SUPABASE_SERVICE_ROLE_KEY!   // server-side only

);



export async function POST(req: Request) {

  try {

    const { interview_id, room_id, transcript } = await req.json();



    // Validate

    if (!interview_id || !room_id || !transcript) {

      return NextResponse.json(

        { success: false, message: "Missing required fields" },

        { status: 400 }

      );

    }



    const { data, error } = await supabase

      .from("interview_transcripts")

      .insert({

        interview_id,

        room_id,

        transcript_json: transcript,

      })

      .select()

      .single();



    if (error) {

      console.log("❌ Supabase error:", error);

      return NextResponse.json(

        { success: false, message: "Failed to save transcript", error: error.message },

        { status: 500 }

      );

    }



    return NextResponse.json({ success: true, data });



  } catch (err) {

    console.log("SERVER ERROR:", err);

    return NextResponse.json(

      { success: false, message: "Server crashed", error: err },

      { status: 500 }

    );

  }

}

