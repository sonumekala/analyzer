import { apiRequest, queryClient } from "./queryClient";
import type { AnalysisReport, AIConfig } from "@shared/schema";

// Interface for file upload response
interface CobolFileResponse {
  id: number;
  filename: string;
  fileSize: number;
  uploadedAt: string;
  content: string;
}

// Interface for analysis history response
interface AnalysisHistoryItem {
  id: number;
  fileId: number;
  createdAt: string;
  modelUsed: string;
  processingTime: number;
  tokensUsed: number;
}

/**
 * Upload a COBOL file
 */
export async function uploadCobolFile(file: File): Promise<CobolFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/files", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  return response.json();
}

/**
 * Upload a COBOL file from a directory
 */
export async function uploadCobolDirectory(file: File): Promise<CobolFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("isDirectory", "true");
  
  const response = await fetch("/api/files/directory", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  return response.json();
}

/**
 * Get all COBOL files
 */
export async function getAllCobolFiles(): Promise<CobolFileResponse[]> {
  return apiRequest<CobolFileResponse[]>("/api/files");
}

/**
 * Get a specific COBOL file
 */
export async function getCobolFile(id: number): Promise<CobolFileResponse> {
  return apiRequest(`/api/files/${id}`);
}

/**
 * Delete a COBOL file
 */
export async function deleteCobolFile(id: number): Promise<void> {
  await apiRequest(`/api/files/${id}`, {
    method: 'DELETE'
  });
  // Invalidate the files cache
  queryClient.invalidateQueries({ queryKey: ['/api/files'] });
}

/**
 * Delete all COBOL files
 */
export async function deleteAllCobolFiles(): Promise<void> {
  await apiRequest('/api/files', {
    method: 'DELETE'
  });
  // Invalidate the files cache
  queryClient.invalidateQueries({ queryKey: ['/api/files'] });
}

/**
 * Run analysis on a COBOL file
 */
export async function analyzeCobolFile(id: number, config: AIConfig): Promise<AnalysisReport> {
  return apiRequest(`/api/files/${id}/analyze`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

/**
 * Get or create analysis for a COBOL file
 */
export async function getOrCreateAnalysis(id: number, config: AIConfig): Promise<AnalysisReport> {
  return apiRequest(`/api/files/${id}/analysis`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

/**
 * Get analysis history for a COBOL file
 */
export async function getAnalysisHistory(id: number): Promise<AnalysisHistoryItem[]> {
  return apiRequest(`/api/files/${id}/analysis`);
}

/**
 * Export analysis as JSON
 */
export async function exportAnalysisAsJSON(id: number): Promise<void> {
  const response = await fetch(`/api/files/${id}/export/json`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const data = await response.json();
  const filename = `cobol-analysis-${id}-${new Date().toISOString().slice(0, 10)}.json`;
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Export analysis as Markdown
 */
export async function exportAnalysisAsMarkdown(id: number): Promise<void> {
  const response = await fetch(`/api/files/${id}/export/markdown`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const text = await response.text();
  const filename = `cobol-analysis-${id}-${new Date().toISOString().slice(0, 10)}.md`;
  
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Export analysis as PDF
 */
export async function exportAnalysisAsPDF(id: number): Promise<void> {
  const response = await fetch(`/api/files/${id}/export/pdf`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const blob = await response.blob();
  const filename = `cobol-analysis-${id}-${new Date().toISOString().slice(0, 10)}.pdf`;
  
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Analyze relationships across all COBOL files in the project
 */
export async function analyzeProjectRelationships(config: AIConfig): Promise<AnalysisReport> {
  return apiRequest('/api/project/analyze', {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

/**
 * Get the latest project-wide analysis
 */
export async function getLatestProjectAnalysis(): Promise<AnalysisReport> {
  return apiRequest('/api/project/analysis');
}

/**
 * Export project analysis as JSON
 */
export async function exportProjectAnalysisAsJSON(): Promise<void> {
  const response = await fetch('/api/project/export/json', {
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const data = await response.json();
  const filename = `cobol-project-analysis-${new Date().toISOString().slice(0, 10)}.json`;
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Export project analysis as Markdown
 */
export async function exportProjectAnalysisAsMarkdown(): Promise<void> {
  const response = await fetch('/api/project/export/markdown', {
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  
  const text = await response.text();
  const filename = `cobol-project-analysis-${new Date().toISOString().slice(0, 10)}.md`;
  
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
