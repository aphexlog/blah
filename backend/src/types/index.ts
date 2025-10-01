// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  RESEARCHER = 'RESEARCHER',
  DATA_COLLECTOR = 'DATA_COLLECTOR',
  VIEWER = 'VIEWER'
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  formSubmissions: boolean;
  dataValidation: boolean;
  systemUpdates: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  voiceInput: boolean;
  keyboardNavigation: boolean;
}

// Form Types
export interface Form {
  id: string;
  name: string;
  description: string;
  version: number;
  status: FormStatus;
  schema: FormSchema;
  validationRules: ValidationRule[];
  conditionalLogic: ConditionalLogic[];
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum FormStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface FormSchema {
  fields: FormField[];
  sections: FormSection[];
  layout: LayoutConfig;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  validation: FieldValidation;
  options?: FieldOption[];
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  metadata: FieldMetadata;
}

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  TIME = 'TIME',
  DATETIME = 'DATETIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  TEXTAREA = 'TEXTAREA',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SIGNATURE = 'SIGNATURE',
  LOCATION = 'LOCATION',
  VOICE = 'VOICE'
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  customRules?: string[];
}

export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldMetadata {
  aiValidation: boolean;
  voiceEnabled: boolean;
  multiLanguage: boolean;
  sensitive: boolean;
  analytics: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fieldIds: string[];
  order: number;
  collapsible: boolean;
  conditions?: ConditionalLogic[];
}

export interface LayoutConfig {
  columns: number;
  responsive: boolean;
  theme: string;
  customCss?: string;
}

// Validation and Logic Types
export interface ValidationRule {
  id: string;
  fieldId: string;
  type: ValidationType;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  aiPowered: boolean;
}

export enum ValidationType {
  REQUIRED = 'REQUIRED',
  FORMAT = 'FORMAT',
  RANGE = 'RANGE',
  CUSTOM = 'CUSTOM',
  AI_VALIDATION = 'AI_VALIDATION',
  CROSS_FIELD = 'CROSS_FIELD'
}

export interface ConditionalLogic {
  id: string;
  condition: LogicCondition;
  actions: LogicAction[];
}

export interface LogicCondition {
  field: string;
  operator: LogicOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
  nested?: LogicCondition[];
}

export enum LogicOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY'
}

export interface LogicAction {
  type: ActionType;
  target: string;
  value?: any;
}

export enum ActionType {
  SHOW = 'SHOW',
  HIDE = 'HIDE',
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
  SET_VALUE = 'SET_VALUE',
  SET_REQUIRED = 'SET_REQUIRED',
  SET_OPTIONAL = 'SET_OPTIONAL'
}

// Data and Submission Types
export interface DataSubmission {
  id: string;
  formId: string;
  submittedBy: string;
  data: Record<string, any>;
  status: SubmissionStatus;
  validationResults: ValidationResult[];
  aiInsights: AIInsight[];
  attachments: Attachment[];
  geoLocation?: GeoLocation;
  submittedAt: Date;
  lastModified: Date;
  version: number;
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export interface ValidationResult {
  fieldId: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  source: 'system' | 'ai' | 'user';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// AI and Voice Types
export interface AIInsight {
  id: string;
  type: InsightType;
  content: string;
  confidence: number;
  source: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum InsightType {
  DATA_QUALITY = 'DATA_QUALITY',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
  PATTERN_RECOGNITION = 'PATTERN_RECOGNITION',
  SUMMARY = 'SUMMARY',
  RECOMMENDATION = 'RECOMMENDATION',
  PREDICTION = 'PREDICTION'
}

export interface VoiceData {
  id: string;
  submissionId: string;
  fieldId: string;
  audioUrl: string;
  transcription: string;
  confidence: number;
  language: string;
  processedAt: Date;
}

// Sync and Offline Types
export interface SyncData {
  id: string;
  userId: string;
  deviceId: string;
  formId: string;
  data: Record<string, any>;
  action: SyncAction;
  timestamp: Date;
  synced: boolean;
  conflicts?: SyncConflict[];
}

export enum SyncAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export interface SyncConflict {
  field: string;
  serverValue: any;
  clientValue: any;
  resolution: ConflictResolution;
}

export enum ConflictResolution {
  SERVER_WINS = 'SERVER_WINS',
  CLIENT_WINS = 'CLIENT_WINS',
  MERGE = 'MERGE',
  MANUAL = 'MANUAL'
}

// Utility Types
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}