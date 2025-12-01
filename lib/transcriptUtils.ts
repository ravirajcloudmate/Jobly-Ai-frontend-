/**
 * Utility functions for managing interview transcripts
 */

export interface TranscriptMessage {
  speaker: string;
  text: string;
  timestamp: Date | string;
}

export interface SaveTranscriptParams {
  invitation_id: string;
  room_id: string;
  company_id?: string;
  job_id?: string;
  transcript: TranscriptMessage[];
  started_at?: string;
  ended_at?: string;
  candidate_email?: string;
  candidate_name?: string;
}

/**
 * Save or update interview transcript to the database
 */
export async function saveTranscript(params: SaveTranscriptParams): Promise<boolean> {
  try {
    console.log('💾 Saving interview transcript...', {
      invitation_id: params.invitation_id,
      room_id: params.room_id,
      messageCount: params.transcript.length
    });

    // Format messages to ensure consistent structure
    const formattedTranscript = formatTranscriptMessages(params.transcript);

    const response = await fetch('/api/interview-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invitation_id: params.invitation_id,
        room_id: params.room_id,
        company_id: params.company_id,
        job_id: params.job_id,
        transcript: formattedTranscript,
        started_at: params.started_at,
        ended_at: params.ended_at || new Date().toISOString(),
        candidate_email: params.candidate_email,
        candidate_name: params.candidate_name,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to save transcript:', errorData);
      return false;
    }

    const result = await response.json();
    if (result.success) {
      console.log('✅ Transcript saved successfully');
      return true;
    } else {
      console.error('❌ Transcript save failed:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving transcript:', error);
    return false;
  }
}

/**
 * Format transcript messages to ensure consistent structure
 */
export function formatTranscriptMessages(messages: TranscriptMessage[]): any[] {
  return messages.map((msg) => ({
    speaker: msg.speaker || 'unknown',
    text: msg.text || '',
    timestamp: msg.timestamp instanceof Date 
      ? msg.timestamp.toISOString() 
      : msg.timestamp || new Date().toISOString(),
  }));
}

/**
 * Auto-save transcript periodically during interview
 * Returns a cleanup function to stop auto-saving
 */
export function startAutoSaveTranscript(
  getTranscriptData: () => SaveTranscriptParams,
  intervalMs: number = 30000 // Default: 30 seconds
): () => void {
  console.log('🔄 Starting auto-save for transcript (interval:', intervalMs, 'ms)');
  
  const intervalId = setInterval(async () => {
    const data = getTranscriptData();
    if (data.transcript && data.transcript.length > 0) {
      await saveTranscript(data);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    console.log('⏹️ Stopping auto-save for transcript');
    clearInterval(intervalId);
  };
}
