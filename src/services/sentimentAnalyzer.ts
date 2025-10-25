/**
 * Sentiment Analyzer Service
 * Enhanced sentiment detection with scoring and emotional intelligence
 */

import type { UserSentiment } from '../types/personality';

export interface SentimentAnalysis {
  sentiment: UserSentiment;
  score: number; // 0-100, how strong the sentiment is
  primaryEmotions: string[];
  shouldSupportMode: boolean; // Should we switch to support mode?
}

/**
 * Perform detailed sentiment analysis on user message
 */
export function analyzeSentiment(message: string): SentimentAnalysis {
  const msg = message.toLowerCase();
  let score = 50; // Neutral baseline
  const emotions: string[] = [];
  
  // Analyze frustration
  const frustrationScore = calculateFrustrationScore(msg);
  if (frustrationScore > 0) {
    score = Math.max(score, frustrationScore);
    emotions.push('frustrated');
  }
  
  // Analyze stress
  const stressScore = calculateStressScore(msg);
  if (stressScore > 0) {
    score = Math.max(score, stressScore);
    emotions.push('stressed');
  }
  
  // Analyze confusion
  const confusionScore = calculateConfusionScore(msg);
  if (confusionScore > 0) {
    score = Math.max(score, confusionScore);
    emotions.push('confused');
  }
  
  // Analyze excitement
  const excitementScore = calculateExcitementScore(msg);
  if (excitementScore > 0) {
    score = Math.min(score, 100 - excitementScore);
    emotions.push('excited');
  }
  
  // Analyze happiness
  const happinessScore = calculateHappinessScore(msg);
  if (happinessScore > 0) {
    score = Math.min(score, 100 - happinessScore);
    emotions.push('happy');
  }
  
  // Determine primary sentiment
  let sentiment: UserSentiment = 'neutral';
  
  if (frustrationScore > 60) sentiment = 'frustrated';
  else if (stressScore > 60) sentiment = 'stressed';
  else if (confusionScore > 50) sentiment = 'confused';
  else if (excitementScore > 70) sentiment = 'excited';
  else if (happinessScore > 60) sentiment = 'happy';
  else if (msg.includes('worked') || msg.includes('success') || msg.includes('fixed')) sentiment = 'accomplished';
  
  // Should we activate support mode?
  const shouldSupportMode = frustrationScore > 50 || stressScore > 50 || confusionScore > 60;
  
  return {
    sentiment,
    score,
    primaryEmotions: emotions.slice(0, 3),
    shouldSupportMode
  };
}

/**
 * Calculate frustration score (0-100)
 */
function calculateFrustrationScore(message: string): number {
  let score = 0;
  
  // Strong frustration words
  const strongWords = ['frustrated', 'annoying', 'giving up', 'impossible', 'terrible'];
  strongWords.forEach(word => {
    if (message.includes(word)) score += 30;
  });
  
  // Medium frustration words
  const mediumWords = ['stuck', 'broken', 'won\'t work', 'doesn\'t work', 'not working', 'failed'];
  mediumWords.forEach(word => {
    if (message.includes(word)) score += 20;
  });
  
  // Mild frustration words
  const mildWords = ['error', 'bug', 'issue', 'problem', 'wrong', 'incorrect'];
  mildWords.forEach(word => {
    if (message.includes(word)) score += 10;
  });
  
  // Multiple exclamation marks indicate frustration
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount > 1) score += exclamationCount * 15;
  
  // All caps words
  const words = message.split(' ');
  const capsWords = words.filter(w => w === w.toUpperCase() && w.length > 2);
  if (capsWords.length > 0) score += capsWords.length * 10;
  
  return Math.min(100, score);
}

/**
 * Calculate stress score (0-100)
 */
function calculateStressScore(message: string): number {
  let score = 0;
  
  const stressWords = [
    { word: 'urgent', weight: 25 },
    { word: 'asap', weight: 30 },
    { word: 'deadline', weight: 25 },
    { word: 'hurry', weight: 20 },
    { word: 'quickly', weight: 15 },
    { word: 'fast', weight: 15 },
    { word: 'stressed', weight: 30 },
    { word: 'overwhelmed', weight: 30 },
    { word: 'panic', weight: 35 },
    { word: 'worried', weight: 20 },
    { word: 'anxious', weight: 25 }
  ];
  
  stressWords.forEach(({ word, weight }) => {
    if (message.includes(word)) score += weight;
  });
  
  return Math.min(100, score);
}

/**
 * Calculate confusion score (0-100)
 */
function calculateConfusionScore(message: string): number {
  let score = 0;
  
  const confusionWords = [
    { word: 'confused', weight: 30 },
    { word: 'don\'t understand', weight: 35 },
    { word: 'unclear', weight: 25 },
    { word: 'not sure', weight: 20 },
    { word: 'don\'t get it', weight: 30 },
    { word: 'lost', weight: 25 },
    { word: 'complicated', weight: 20 }
  ];
  
  confusionWords.forEach(({ word, weight }) => {
    if (message.includes(word)) score += weight;
  });
  
  // Multiple question marks
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount > 1) score += questionCount * 10;
  
  return Math.min(100, score);
}

/**
 * Calculate excitement score (0-100)
 */
function calculateExcitementScore(message: string): number {
  let score = 0;
  
  const excitedWords = [
    { word: 'excited', weight: 30 },
    { word: 'awesome', weight: 25 },
    { word: 'amazing', weight: 25 },
    { word: 'love', weight: 20 },
    { word: 'fantastic', weight: 25 },
    { word: 'wonderful', weight: 25 },
    { word: 'perfect', weight: 20 },
    { word: 'excellent', weight: 20 },
    { word: 'yay', weight: 30 },
    { word: 'wow', weight: 25 },
    { word: 'cool', weight: 15 }
  ];
  
  excitedWords.forEach(({ word, weight }) => {
    if (message.includes(word)) score += weight;
  });
  
  // Exclamation marks (positive context)
  const exclamationCount = (message.match(/!/g) || []).length;
  const hasPositiveWords = excitedWords.some(({ word }) => message.includes(word));
  if (hasPositiveWords && exclamationCount > 0) {
    score += exclamationCount * 15;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate happiness score (0-100)
 */
function calculateHappinessScore(message: string): number {
  let score = 0;
  
  const happyWords = [
    { word: 'happy', weight: 30 },
    { word: 'glad', weight: 25 },
    { word: 'thanks', weight: 20 },
    { word: 'thank you', weight: 25 },
    { word: 'appreciate', weight: 20 },
    { word: 'good', weight: 15 },
    { word: 'nice', weight: 15 },
    { word: 'pleased', weight: 20 }
  ];
  
  happyWords.forEach(({ word, weight }) => {
    if (message.includes(word)) score += weight;
  });
  
  // Positive emojis
  const positiveEmojis = ['😊', '😄', '🎉', '😀', '🙂', '👍'];
  positiveEmojis.forEach(emoji => {
    if (message.includes(emoji)) score += 20;
  });
  
  return Math.min(100, score);
}

/**
 * Quick sentiment check for simple use cases
 */
export function isNegativeSentiment(message: string): boolean {
  const analysis = analyzeSentiment(message);
  return analysis.shouldSupportMode;
}

/**
 * Quick sentiment check for positive emotions
 */
export function isPositiveSentiment(message: string): boolean {
  const analysis = analyzeSentiment(message);
  return analysis.sentiment === 'happy' || 
         analysis.sentiment === 'excited' || 
         analysis.sentiment === 'accomplished';
}
