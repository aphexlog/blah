import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { VoiceData } from '../types';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class VoiceService {
  private azureSpeechKey: string;
  private azureSpeechRegion: string;

  constructor() {
    this.azureSpeechKey = process.env.AZURE_SPEECH_KEY || '';
    this.azureSpeechRegion = process.env.AZURE_SPEECH_REGION || 'eastus';
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options: {
      fieldId?: string;
      submissionId?: string;
      language: string;
      context?: any;
      userId: string;
    }
  ): Promise<VoiceData> {
    try {
      const transcription = await this.performSpeechToText(audioBuffer, mimeType, options.language);
      
      // Save voice data to database
      const voiceData = await prisma.voiceData.create({
        data: {
          submissionId: options.submissionId,
          fieldId: options.fieldId,
          audioUrl: await this.saveAudioFile(audioBuffer, mimeType),
          transcription: transcription.text,
          confidence: transcription.confidence,
          language: options.language,
          userId: options.userId,
          metadata: {
            context: options.context,
            processingTime: transcription.processingTime
          }
        }
      });

      // If this is for a specific field, process the transcription for that field type
      if (options.fieldId) {
        const processedValue = await this.processTranscriptionForField(
          transcription.text,
          options.fieldId,
          options.context
        );
        
        voiceData.processedValue = processedValue;
      }

      return voiceData as VoiceData;
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      throw createError('Failed to transcribe audio', 500);
    }
  }

  async processStreamingAudio(
    audioChunk: string,
    sessionId: string,
    options: {
      isLast: boolean;
      language: string;
      userId: string;
    }
  ): Promise<any> {
    try {
      // In a real implementation, this would use WebSocket connections
      // with Azure Speech Services or similar for real-time processing
      
      const audioBuffer = Buffer.from(audioChunk, 'base64');
      
      // For now, process the chunk as a complete audio segment
      const result = await this.performSpeechToText(audioBuffer, 'audio/webm', options.language);
      
      return {
        sessionId,
        partialTranscription: result.text,
        confidence: result.confidence,
        isComplete: options.isLast
      };
    } catch (error) {
      logger.error('Streaming audio processing failed:', error);
      throw createError('Failed to process audio stream', 500);
    }
  }

  async synthesizeSpeech(
    text: string,
    options: {
      language: string;
      voice: string;
      speed: number;
    }
  ): Promise<string> {
    try {
      const ssml = this.buildSSML(text, options);
      
      const response = await axios.post(
        `https://${this.azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          responseType: 'arraybuffer'
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const audioUrl = await this.saveAudioFile(audioBuffer, 'audio/mp3');
      
      return audioUrl;
    } catch (error) {
      logger.error('Speech synthesis failed:', error);
      throw createError('Failed to synthesize speech', 500);
    }
  }

  async processVoiceCommand(
    audioBuffer: Buffer,
    mimeType: string,
    options: {
      context?: any;
      userId: string;
    }
  ): Promise<any> {
    try {
      const transcription = await this.performSpeechToText(audioBuffer, mimeType, 'en-US');
      
      // Parse the command using natural language processing
      const command = await this.parseVoiceCommand(transcription.text, options.context);
      
      return {
        transcription: transcription.text,
        command,
        confidence: transcription.confidence
      };
    } catch (error) {
      logger.error('Voice command processing failed:', error);
      throw createError('Failed to process voice command', 500);
    }
  }

  async getVoiceData(id: string, organizationId: string): Promise<VoiceData | null> {
    try {
      const voiceData = await prisma.voiceData.findFirst({
        where: {
          id,
          // Add organization check through submission or form relationship
          submission: {
            form: {
              organizationId
            }
          }
        }
      });

      return voiceData as VoiceData;
    } catch (error) {
      logger.error('Failed to get voice data:', error);
      return null;
    }
  }

  async getSupportedVoices(): Promise<any> {
    try {
      const response = await axios.get(
        `https://${this.azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get supported voices:', error);
      
      // Return default voices if API call fails
      return this.getDefaultVoices();
    }
  }

  async updateUserVoiceSettings(userId: string, settings: any): Promise<any> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...settings
          }
        }
      });

      return user.preferences;
    } catch (error) {
      logger.error('Failed to update voice settings:', error);
      throw createError('Failed to update settings', 500);
    }
  }

  async processVoiceFieldInput(
    audioBuffer: Buffer,
    mimeType: string,
    options: {
      fieldId: string;
      fieldType: string;
      submissionId?: string;
      language: string;
      userId: string;
    }
  ): Promise<any> {
    try {
      const transcription = await this.performSpeechToText(audioBuffer, mimeType, options.language);
      
      // Process the transcription based on field type
      const processedValue = await this.processTranscriptionForField(
        transcription.text,
        options.fieldId,
        { fieldType: options.fieldType }
      );

      // Save the voice input
      const voiceData = await prisma.voiceData.create({
        data: {
          submissionId: options.submissionId,
          fieldId: options.fieldId,
          audioUrl: await this.saveAudioFile(audioBuffer, mimeType),
          transcription: transcription.text,
          confidence: transcription.confidence,
          language: options.language,
          userId: options.userId,
          processedValue
        }
      });

      return {
        voiceDataId: voiceData.id,
        transcription: transcription.text,
        processedValue,
        confidence: transcription.confidence
      };
    } catch (error) {
      logger.error('Voice field input processing failed:', error);
      throw createError('Failed to process voice input', 500);
    }
  }

  private async performSpeechToText(
    audioBuffer: Buffer,
    mimeType: string,
    language: string
  ): Promise<{ text: string; confidence: number; processingTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `https://${this.azureSpeechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
        audioBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey,
            'Content-Type': mimeType,
          },
          params: {
            language: language,
            format: 'detailed'
          }
        }
      );

      const processingTime = Date.now() - startTime;
      
      if (response.data.RecognitionStatus === 'Success') {
        const bestResult = response.data.NBest?.[0];
        return {
          text: bestResult?.Display || response.data.DisplayText || '',
          confidence: bestResult?.Confidence || 0,
          processingTime
        };
      } else {
        throw new Error(`Speech recognition failed: ${response.data.RecognitionStatus}`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        throw createError('Invalid Azure Speech API credentials', 401);
      }
      throw error;
    }
  }

  private async saveAudioFile(audioBuffer: Buffer, mimeType: string): Promise<string> {
    // In a real implementation, this would save to cloud storage (Azure Blob, AWS S3, etc.)
    // For now, return a placeholder URL
    const fileId = Date.now().toString();
    const extension = mimeType.split('/')[1];
    
    // Simulate saving to storage
    logger.info(`Saving audio file: ${fileId}.${extension} (${audioBuffer.length} bytes)`);
    
    return `/api/voice/audio/${fileId}.${extension}`;
  }

  private buildSSML(text: string, options: { language: string; voice: string; speed: number }): string {
    return `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${options.language}">
        <voice name="${options.voice}">
          <prosody rate="${options.speed}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;
  }

  private async parseVoiceCommand(text: string, context?: any): Promise<any> {
    // Simple command parsing - in a real implementation, this would use NLP
    const lowerText = text.toLowerCase();
    
    const commands: any = {
      navigation: [],
      form: [],
      data: []
    };

    // Navigation commands
    if (lowerText.includes('go to') || lowerText.includes('navigate to')) {
      commands.navigation.push({
        action: 'navigate',
        target: this.extractNavigationTarget(lowerText)
      });
    }

    // Form commands
    if (lowerText.includes('save') || lowerText.includes('submit')) {
      commands.form.push({
        action: lowerText.includes('save') ? 'save' : 'submit'
      });
    }

    if (lowerText.includes('clear') || lowerText.includes('reset')) {
      commands.form.push({
        action: 'clear',
        target: this.extractFieldTarget(lowerText)
      });
    }

    // Data commands
    if (lowerText.includes('fill') || lowerText.includes('enter')) {
      commands.data.push({
        action: 'fillField',
        field: this.extractFieldTarget(lowerText),
        value: this.extractValue(lowerText)
      });
    }

    return commands;
  }

  private extractNavigationTarget(text: string): string {
    // Extract navigation target from text
    const targets = ['dashboard', 'forms', 'data', 'settings', 'reports'];
    for (const target of targets) {
      if (text.includes(target)) {
        return target;
      }
    }
    return 'dashboard';
  }

  private extractFieldTarget(text: string): string {
    // Extract field reference from text
    const fieldPattern = /(?:field|input|box)\s+(\w+)/i;
    const match = text.match(fieldPattern);
    return match ? match[1] : 'all';
  }

  private extractValue(text: string): string {
    // Extract value to be entered
    const valuePattern = /(?:with|as|to)\s+"([^"]+)"/i;
    const match = text.match(valuePattern);
    return match ? match[1] : '';
  }

  private async processTranscriptionForField(
    transcription: string,
    fieldId: string,
    context?: any
  ): Promise<any> {
    const fieldType = context?.fieldType;
    
    switch (fieldType) {
      case 'DATE':
        return this.parseDate(transcription);
      case 'TIME':
        return this.parseTime(transcription);
      case 'NUMBER':
        return this.parseNumber(transcription);
      case 'EMAIL':
        return this.parseEmail(transcription);
      case 'PHONE':
        return this.parsePhoneNumber(transcription);
      case 'SELECT':
      case 'RADIO':
        return this.parseOption(transcription, context?.options);
      default:
        return transcription;
    }
  }

  private parseDate(text: string): string {
    // Simple date parsing - in production, use a proper date parsing library
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = text.match(datePattern);
    
    if (match) {
      return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    }
    
    return text;
  }

  private parseTime(text: string): string {
    const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
    const match = text.match(timePattern);
    
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3]?.toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return text;
  }

  private parseNumber(text: string): number | string {
    const numberPattern = /\d+(?:\.\d+)?/;
    const match = text.match(numberPattern);
    
    if (match) {
      return parseFloat(match[0]);
    }
    
    return text;
  }

  private parseEmail(text: string): string {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailPattern);
    
    return match ? match[0] : text;
  }

  private parsePhoneNumber(text: string): string {
    // Remove common spoken patterns
    let cleaned = text
      .replace(/\s+/g, '')
      .replace(/dash/gi, '-')
      .replace(/dot/gi, '.')
      .replace(/at/gi, '@');
    
    const phonePattern = /[\d\-\.\(\)\+\s]+/;
    const match = cleaned.match(phonePattern);
    
    return match ? match[0] : text;
  }

  private parseOption(text: string, options?: any[]): string {
    if (!options) return text;
    
    const lowerText = text.toLowerCase();
    
    // Find the best matching option
    let bestMatch = '';
    let bestScore = 0;
    
    for (const option of options) {
      const optionText = option.label.toLowerCase();
      const score = this.calculateSimilarity(lowerText, optionText);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option.value;
      }
    }
    
    return bestScore > 0.5 ? bestMatch : text;
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple similarity calculation - in production, use proper string matching
    const common = Math.max(a.length, b.length);
    const distance = this.levenshteinDistance(a, b);
    return 1 - (distance / common);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private getDefaultVoices(): any[] {
    return [
      {
        Name: 'Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)',
        ShortName: 'en-US-JennyNeural',
        Gender: 'Female',
        Locale: 'en-US'
      },
      {
        Name: 'Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)',
        ShortName: 'en-US-GuyNeural',
        Gender: 'Male',
        Locale: 'en-US'
      }
    ];
  }
}