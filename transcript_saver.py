"""
Transcript Saver Module for Interview Agent Backend
====================================================

This module saves interview transcripts to the Next.js frontend API.
Add this to your interview agent backend to automatically save conversations.

Usage:
------
1. Import this module in your interview handler
2. Create a TranscriptSaver instance when interview starts
3. Call add_message() for each conversation turn
4. Call save_transcript() when interview ends

Example:
--------
from transcript_saver import TranscriptSaver

# When interview starts
transcript_saver = TranscriptSaver(
    invitation_id="uuid-here",
    room_id="room-123",
    candidate_email="candidate@example.com",
    candidate_name="John Doe",
    frontend_url="http://localhost:3001"
)

# During conversation
transcript_saver.add_message("agent", "Hello! Welcome to the interview.")
transcript_saver.add_message("candidate", "Thank you!")

# When interview ends
transcript_saver.save_transcript()
"""

import requests
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TranscriptSaver:
    """
    Saves interview transcripts to the Next.js frontend API
    """
    
    def __init__(
        self,
        invitation_id: str,
        room_id: str,
        candidate_email: str,
        candidate_name: str,
        frontend_url: str = "http://localhost:3001",
        company_id: Optional[str] = None,
        job_id: Optional[str] = None
    ):
        """
        Initialize the transcript saver
        
        Args:
            invitation_id: UUID of the interview invitation
            room_id: Room/session ID for the interview
            candidate_email: Email of the candidate
            candidate_name: Name of the candidate
            frontend_url: Base URL of the Next.js frontend (default: http://localhost:3001)
            company_id: Optional company UUID
            job_id: Optional job posting UUID
        """
        self.invitation_id = invitation_id
        self.room_id = room_id
        self.candidate_email = candidate_email
        self.candidate_name = candidate_name
        self.company_id = company_id
        self.job_id = job_id
        self.frontend_url = frontend_url.rstrip('/')
        
        # Store messages
        self.messages: List[Dict] = []
        
        # Track timing
        self.started_at = datetime.now().isoformat()
        self.ended_at: Optional[str] = None
        
        logger.info(f"📝 TranscriptSaver initialized for room: {room_id}")
    
    def add_message(self, speaker: str, text: str, timestamp: Optional[str] = None):
        """
        Add a message to the transcript
        
        Args:
            speaker: 'agent' or 'candidate'
            text: The message text
            timestamp: Optional ISO format timestamp (defaults to now)
        """
        if not text or not text.strip():
            logger.warning("⚠️ Attempted to add empty message, skipping")
            return
        
        message = {
            "speaker": speaker,
            "text": text.strip(),
            "timestamp": timestamp or datetime.now().isoformat()
        }
        
        self.messages.append(message)
        logger.debug(f"💬 Added message from {speaker}: {text[:50]}...")
    
    def save_transcript(self, auto_save: bool = False) -> bool:
        """
        Save the transcript to the frontend API
        
        Args:
            auto_save: If True, this is an auto-save (periodic backup)
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.messages:
            logger.warning("⚠️ No messages to save")
            return False
        
        # Set end time if not auto-save
        if not auto_save:
            self.ended_at = datetime.now().isoformat()
        
        # Prepare payload
        payload = {
            "invitation_id": self.invitation_id,
            "room_id": self.room_id,
            "transcript": self.messages,
            "started_at": self.started_at,
            "ended_at": self.ended_at or datetime.now().isoformat(),
            "candidate_email": self.candidate_email,
            "candidate_name": self.candidate_name
        }
        
        # Add optional fields
        if self.company_id:
            payload["company_id"] = self.company_id
        if self.job_id:
            payload["job_id"] = self.job_id
        
        # API endpoint
        url = f"{self.frontend_url}/api/interview-transcript"
        
        try:
            logger.info(f"💾 Saving transcript to {url}...")
            logger.info(f"📊 Messages: {len(self.messages)}, Room: {self.room_id}")
            
            response = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    logger.info("✅ Transcript saved successfully!")
                    return True
                else:
                    logger.error(f"❌ API returned success=false: {result}")
                    return False
            else:
                logger.error(f"❌ Failed to save transcript: HTTP {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error("❌ Timeout while saving transcript")
            return False
        except requests.exceptions.ConnectionError:
            logger.error("❌ Could not connect to frontend API")
            logger.error(f"Make sure frontend is running at {self.frontend_url}")
            return False
        except Exception as e:
            logger.error(f"❌ Error saving transcript: {e}")
            return False
    
    def get_message_count(self) -> int:
        """Get the number of messages in the transcript"""
        return len(self.messages)
    
    def get_duration_seconds(self) -> Optional[int]:
        """Calculate interview duration in seconds"""
        if not self.ended_at:
            return None
        
        try:
            start = datetime.fromisoformat(self.started_at)
            end = datetime.fromisoformat(self.ended_at)
            return int((end - start).total_seconds())
        except Exception as e:
            logger.error(f"Error calculating duration: {e}")
            return None


# Example usage function
def example_usage():
    """
    Example of how to use TranscriptSaver in your interview agent
    """
    
    # Initialize when interview starts
    saver = TranscriptSaver(
        invitation_id="550e8400-e29b-41d4-a716-446655440000",
        room_id="interview-room-123",
        candidate_email="john@example.com",
        candidate_name="John Doe",
        frontend_url="http://localhost:3001"
    )
    
    # Add messages during conversation
    saver.add_message("agent", "Hello! Welcome to the interview. How are you today?")
    saver.add_message("candidate", "I'm doing great, thank you!")
    saver.add_message("agent", "Excellent! Let's begin with your background.")
    saver.add_message("candidate", "Sure, I have 5 years of experience in software development...")
    
    # Save when interview ends
    success = saver.save_transcript()
    
    if success:
        print(f"✅ Saved {saver.get_message_count()} messages")
        print(f"⏱️ Duration: {saver.get_duration_seconds()} seconds")
    else:
        print("❌ Failed to save transcript")


if __name__ == "__main__":
    # Run example
    example_usage()
