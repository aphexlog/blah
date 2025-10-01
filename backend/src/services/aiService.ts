import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { AIInsight, InsightType, ValidationResult, ValidationError } from '../types';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class AIService {
  async validateFieldData(
    fieldType: string,
    value: any,
    context?: any
  ): Promise<ValidationResult> {
    try {
      const prompt = this.buildValidationPrompt(fieldType, value, context);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data validator for electronic data capture systems. Analyze the provided data and return validation results in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      const result = JSON.parse(aiResponse);
      
      return {
        fieldId: context?.fieldId || 'unknown',
        isValid: result.isValid,
        errors: result.errors || [],
        warnings: result.warnings || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      logger.error('AI validation failed:', error);
      
      // Fallback to basic validation
      return this.fallbackValidation(fieldType, value);
    }
  }

  async generateSuggestions(
    fieldType: string,
    partialValue: string,
    context?: any
  ): Promise<string[]> {
    try {
      const prompt = this.buildSuggestionPrompt(fieldType, partialValue, context);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent autocomplete system for data entry. Provide relevant suggestions based on the field type and partial input.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        return [];
      }

      const suggestions = JSON.parse(aiResponse);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      logger.error('AI suggestion generation failed:', error);
      return [];
    }
  }

  async detectAnomalies(
    formId: string,
    submissionData: Record<string, any>,
    organizationId: string
  ): Promise<any[]> {
    try {
      // Get historical data for comparison
      const historicalData = await prisma.dataSubmission.findMany({
        where: {
          formId,
          status: 'VALIDATED'
        },
        select: {
          data: true
        },
        take: 100,
        orderBy: {
          submittedAt: 'desc'
        }
      });

      if (historicalData.length < 10) {
        return []; // Not enough data for anomaly detection
      }

      const prompt = this.buildAnomalyDetectionPrompt(submissionData, historicalData);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data analyst specializing in anomaly detection. Analyze the provided data submission against historical patterns and identify potential anomalies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        return [];
      }

      const anomalies = JSON.parse(aiResponse);
      return Array.isArray(anomalies) ? anomalies : [];
    } catch (error) {
      logger.error('Anomaly detection failed:', error);
      return [];
    }
  }

  async generateDataSummary(
    formId: string,
    organizationId: string,
    options?: { timeRange?: any; filters?: any }
  ): Promise<any> {
    try {
      // Get form structure
      const form = await prisma.form.findFirst({
        where: { id: formId, organizationId },
        include: {
          submissions: {
            where: {
              status: 'VALIDATED',
              ...(options?.timeRange && {
                submittedAt: {
                  gte: options.timeRange.start,
                  lte: options.timeRange.end
                }
              })
            },
            select: {
              data: true,
              submittedAt: true
            }
          }
        }
      });

      if (!form || !form.submissions.length) {
        return { summary: 'No data available for analysis' };
      }

      const prompt = this.buildSummaryPrompt(form, form.submissions);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst expert. Generate comprehensive insights and summaries from the provided form data. Focus on patterns, trends, and key findings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      logger.error('Summary generation failed:', error);
      throw createError('Failed to generate summary', 500);
    }
  }

  async processNaturalLanguageQuery(
    query: string,
    organizationId: string,
    context?: any
  ): Promise<any> {
    try {
      const prompt = `
        Natural language query: "${query}"
        Context: ${JSON.stringify(context)}
        
        Please interpret this query and provide:
        1. The intent of the query
        2. Suggested data filters or search parameters
        3. Recommended visualization type if applicable
        4. SQL-like query structure if data retrieval is needed
        
        Return response in JSON format.
      `;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent query interpreter for data analysis systems. Convert natural language queries into structured data requests.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 600
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(aiResponse);
    } catch (error) {
      logger.error('Natural language query processing failed:', error);
      throw createError('Failed to process query', 500);
    }
  }

  async getInsights(
    type: string,
    id: string,
    organizationId: string
  ): Promise<AIInsight[]> {
    try {
      const insights = await prisma.aIInsight.findMany({
        where: {
          [type === 'form' ? 'formId' : 'submissionId']: id,
          organizationId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      return insights as AIInsight[];
    } catch (error) {
      logger.error('Failed to get insights:', error);
      return [];
    }
  }

  async trainCustomModel(
    formId: string,
    modelType: string,
    organizationId: string,
    trainingConfig?: any
  ): Promise<any> {
    try {
      // Create training job record
      const trainingJob = await prisma.trainingJob.create({
        data: {
          formId,
          modelType,
          organizationId,
          status: 'QUEUED',
          config: trainingConfig || {},
          startedAt: new Date()
        }
      });

      // In a real implementation, this would trigger a background job
      // For now, simulate the training process
      setTimeout(async () => {
        await this.simulateModelTraining(trainingJob.id);
      }, 1000);

      return {
        jobId: trainingJob.id,
        status: 'QUEUED',
        estimatedCompletionTime: new Date(Date.now() + 300000) // 5 minutes
      };
    } catch (error) {
      logger.error('Failed to start model training:', error);
      throw createError('Failed to start training', 500);
    }
  }

  async getTrainingStatus(jobId: string, organizationId: string): Promise<any> {
    try {
      const job = await prisma.trainingJob.findFirst({
        where: { id: jobId, organizationId }
      });

      if (!job) {
        throw createError('Training job not found', 404);
      }

      return {
        jobId: job.id,
        status: job.status,
        progress: job.progress || 0,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      };
    } catch (error) {
      logger.error('Failed to get training status:', error);
      throw error;
    }
  }

  private buildValidationPrompt(fieldType: string, value: any, context?: any): string {
    return `
      Field Type: ${fieldType}
      Value: ${JSON.stringify(value)}
      Context: ${JSON.stringify(context)}
      
      Validate this data entry and return a JSON response with:
      {
        "isValid": boolean,
        "errors": [{"code": "string", "message": "string", "severity": "error|warning"}],
        "warnings": [{"code": "string", "message": "string", "suggestion": "string"}],
        "suggestions": ["string"]
      }
      
      Consider data type, format, business rules, and context-specific validation.
    `;
  }

  private buildSuggestionPrompt(fieldType: string, partialValue: string, context?: any): string {
    return `
      Field Type: ${fieldType}
      Partial Input: "${partialValue}"
      Context: ${JSON.stringify(context)}
      
      Generate 5 relevant autocomplete suggestions as a JSON array of strings.
      Consider the field type, existing input, and context to provide meaningful suggestions.
    `;
  }

  private buildAnomalyDetectionPrompt(submissionData: any, historicalData: any[]): string {
    return `
      Current Submission: ${JSON.stringify(submissionData)}
      
      Historical Data (last 100 submissions):
      ${JSON.stringify(historicalData.slice(0, 10))} // Sample for context
      
      Analyze the current submission against historical patterns and identify anomalies.
      Return a JSON array of anomalies with:
      [
        {
          "field": "string",
          "type": "outlier|pattern|format|missing",
          "severity": "low|medium|high",
          "description": "string",
          "confidence": 0.0-1.0
        }
      ]
    `;
  }

  private buildSummaryPrompt(form: any, submissions: any[]): string {
    return `
      Form Schema: ${JSON.stringify(form.schema)}
      Form Name: ${form.name}
      
      Submission Data (${submissions.length} submissions):
      ${JSON.stringify(submissions.slice(0, 20))} // Sample for analysis
      
      Generate a comprehensive data summary including:
      {
        "overview": "string",
        "keyFindings": ["string"],
        "statistics": {},
        "trends": ["string"],
        "recommendations": ["string"],
        "dataQuality": {
          "completeness": "percentage",
          "consistency": "percentage",
          "issues": ["string"]
        }
      }
    `;
  }

  private fallbackValidation(fieldType: string, value: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Basic validation based on field type
    switch (fieldType) {
      case 'EMAIL':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
            severity: 'error',
            source: 'system'
          });
        }
        break;
      case 'PHONE':
        if (!/^\+?[\d\s\-\(\)]+$/.test(value)) {
          errors.push({
            code: 'INVALID_PHONE',
            message: 'Invalid phone number format',
            severity: 'error',
            source: 'system'
          });
        }
        break;
      case 'NUMBER':
        if (isNaN(Number(value))) {
          errors.push({
            code: 'INVALID_NUMBER',
            message: 'Value must be a number',
            severity: 'error',
            source: 'system'
          });
        }
        break;
    }

    return {
      fieldId: 'unknown',
      isValid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  private async simulateModelTraining(jobId: string): Promise<void> {
    try {
      // Simulate training progress
      const progressSteps = [10, 25, 50, 75, 90, 100];
      
      for (const progress of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        await prisma.trainingJob.update({
          where: { id: jobId },
          data: {
            progress,
            status: progress === 100 ? 'COMPLETED' : 'TRAINING'
          }
        });
      }

      await prisma.trainingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    } catch (error) {
      await prisma.trainingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date()
        }
      });
    }
  }
}