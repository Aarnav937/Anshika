import Dexie, { Table } from 'dexie';
import { 
  DocumentComparison, 
  ComparisonFilter, 
  ComparisonStats
} from '../../types/document';
import { createDocumentError } from '../../utils/fileValidation';

// IndexedDB database for comparison storage
class ComparisonDatabase extends Dexie {
  comparisons!: Table<DocumentComparison>;

  constructor() {
    super('DocumentComparisonsDB');
    this.version(1).stores({
      comparisons: 'id, document1Id, document2Id, createdAt, status, comparisonType, *relationshipType'
    });
  }
}

const db = new ComparisonDatabase();

/**
 * Save comparison result to IndexedDB
 */
export async function saveComparison(comparison: DocumentComparison): Promise<void> {
  try {
    await db.comparisons.put(comparison);
    console.log(`✅ Comparison saved: ${comparison.id}`);
  } catch (error) {
    console.error('❌ Failed to save comparison:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to save comparison to local storage',
      error
    );
  }
}

/**
 * Get comparison by ID
 */
export async function getComparison(id: string): Promise<DocumentComparison | null> {
  try {
    const comparison = await db.comparisons.get(id);
    return comparison || null;
  } catch (error) {
    console.error('❌ Failed to retrieve comparison:', error);
    return null;
  }
}

/**
 * Get all comparisons with optional filtering
 */
export async function getComparisons(filter?: ComparisonFilter): Promise<DocumentComparison[]> {
  try {
    let query = db.comparisons.orderBy('createdAt').reverse();

    if (filter) {
      // Apply filters
      if (filter.status?.length) {
        query = query.filter(comp => filter.status!.includes(comp.status));
      }
      
      if (filter.comparisonType?.length) {
        query = query.filter(comp => filter.comparisonType!.includes(comp.comparisonType));
      }
      
      if (filter.dateRange) {
        const { start, end } = filter.dateRange;
        query = query.filter(comp => 
          comp.createdAt >= start && comp.createdAt <= end
        );
      }
      
      if (filter.similarityRange) {
        const { min, max } = filter.similarityRange;
        query = query.filter(comp => 
          comp.metrics.overallScore >= min && comp.metrics.overallScore <= max
        );
      }
      
      if (filter.documentIds?.length) {
        query = query.filter(comp => 
          filter.documentIds!.includes(comp.document1Id) ||
          filter.documentIds!.includes(comp.document2Id)
        );
      }
    }

    return await query.toArray();
  } catch (error) {
    console.error('❌ Failed to retrieve comparisons:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to retrieve comparisons from local storage',
      error
    );
  }
}

/**
 * Delete comparison by ID
 */
export async function deleteComparison(id: string): Promise<void> {
  try {
    await db.comparisons.delete(id);
    console.log(`🗑️ Comparison deleted: ${id}`);
  } catch (error) {
    console.error('❌ Failed to delete comparison:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to delete comparison from local storage',
      error
    );
  }
}

/**
 * Clear all comparison history
 */
export async function clearAllComparisons(): Promise<void> {
  try {
    await db.comparisons.clear();
    console.log('🧹 All comparisons cleared');
  } catch (error) {
    console.error('❌ Failed to clear comparisons:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to clear comparison history',
      error
    );
  }
}

/**
 * Get comparison statistics
 */
export async function getComparisonStats(): Promise<ComparisonStats> {
  try {
    const allComparisons = await db.comparisons.toArray();
    const completed = allComparisons.filter(comp => comp.status === 'completed');
    
    if (completed.length === 0) {
      return {
        totalComparisons: 0,
        completedComparisons: 0,
        averageSimilarity: 0,
        mostSimilarPair: {
          doc1Name: '',
          doc2Name: '',
          similarity: 0
        },
        commonPatterns: []
      };
    }

    const totalSimilarity = completed.reduce((sum, comp) => sum + comp.metrics.overallScore, 0);
    const averageSimilarity = totalSimilarity / completed.length;
    
    // Find most similar pair
    const mostSimilar = completed.reduce((max, comp) => 
      comp.metrics.overallScore > max.metrics.overallScore ? comp : max
    );

    // Extract common patterns (simplified)
    const relationshipTypes = completed.map(comp => comp.relationshipType);
    const relationshipCounts = relationshipTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonPatterns = Object.entries(relationshipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${type} documents (${count} instances)`);

    return {
      totalComparisons: allComparisons.length,
      completedComparisons: completed.length,
      averageSimilarity: Math.round(averageSimilarity),
      mostSimilarPair: {
        doc1Name: `Document ${mostSimilar.document1Id.slice(-8)}`,
        doc2Name: `Document ${mostSimilar.document2Id.slice(-8)}`,
        similarity: mostSimilar.metrics.overallScore
      },
      commonPatterns
    };
  } catch (error) {
    console.error('❌ Failed to calculate comparison stats:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to calculate comparison statistics',
      error
    );
  }
}

/**
 * Get comparisons involving a specific document
 */
export async function getDocumentComparisons(documentId: string): Promise<DocumentComparison[]> {
  try {
    return await db.comparisons
      .filter(comp => 
        comp.document1Id === documentId || comp.document2Id === documentId
      )
      .reverse()
      .sortBy('createdAt');
  } catch (error) {
    console.error('❌ Failed to get document comparisons:', error);
    return [];
  }
}

/**
 * Check if comparison already exists between two documents
 */
export async function comparisonExists(doc1Id: string, doc2Id: string): Promise<DocumentComparison | null> {
  try {
    const existing = await db.comparisons
      .filter(comp => 
        (comp.document1Id === doc1Id && comp.document2Id === doc2Id) ||
        (comp.document1Id === doc2Id && comp.document2Id === doc1Id)
      )
      .first();
    
    return existing || null;
  } catch (error) {
    console.error('❌ Failed to check existing comparison:', error);
    return null;
  }
}

/**
 * Export comparison data for backup/sharing
 */
export async function exportComparisons(): Promise<DocumentComparison[]> {
  try {
    return await db.comparisons.orderBy('createdAt').toArray();
  } catch (error) {
    console.error('❌ Failed to export comparisons:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to export comparison data',
      error
    );
  }
}

/**
 * Import comparison data from backup
 */
export async function importComparisons(comparisons: DocumentComparison[]): Promise<number> {
  try {
    let imported = 0;
    for (const comparison of comparisons) {
      try {
        await db.comparisons.put(comparison);
        imported++;
      } catch (error) {
        console.warn(`⚠️ Failed to import comparison ${comparison.id}:`, error);
      }
    }
    console.log(`📥 Imported ${imported} comparisons`);
    return imported;
  } catch (error) {
    console.error('❌ Failed to import comparisons:', error);
    throw createDocumentError(
      'STORAGE_ERROR',
      'Failed to import comparison data',
      error
    );
  }
}

// Initialize database connection
db.open().catch(error => {
  console.error('❌ Failed to open comparison database:', error);
});

export default db;