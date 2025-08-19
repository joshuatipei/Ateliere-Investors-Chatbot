import { createClient } from '@supabase/supabase-js';
import { assertIndexerEnv } from '../lib/env';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = assertIndexerEnv();

// Supabase client for reading source tables
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Common interface for source documents
export interface SourceDocument {
  source_table: string;
  source_id: string;
  title: string | null;
  content: string;
}

// Table mappers for different source tables
export const TABLE_MAPPERS = {
  // Internal data table
  internal_data: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('internal_data')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch internal_data: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'internal_data',
        source_id: row.id?.toString() || 'unknown',
        title: row.title || row.name || null,
        content: row.content || row.description || row.notes || ''
      };
    }
  },

  // Press releases
  press_release: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('press_release')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch press_release: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'press_release',
        source_id: row.id?.toString() || 'unknown',
        title: row.title || row.headline || null,
        content: row.content || row.body || row.text || ''
      };
    }
  },

  // Board members
  board_members: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch board_members: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'board_members',
        source_id: row.id?.toString() || 'unknown',
        title: row.name || row.title || null,
        content: row.bio || row.background || row.experience || row.description || ''
      };
    }
  },

  // Partnerships
  partnerships: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch partnerships: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'partnerships',
        source_id: row.id?.toString() || 'unknown',
        title: row.name || row.partner_name || row.title || null,
        content: row.description || row.details || row.overview || ''
      };
    }
  },

  // Financial reports
  financial_reports: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch financial_reports: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'financial_reports',
        source_id: row.id?.toString() || 'unknown',
        title: row.title || row.report_name || row.period || null,
        content: row.content || row.summary || row.analysis || row.details || ''
      };
    }
  },

  // Company news
  company_news: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('company_news')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch company_news: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'company_news',
        source_id: row.id?.toString() || 'unknown',
        title: row.title || row.headline || row.news_title || null,
        content: row.content || row.body || row.article || row.summary || ''
      };
    }
  },

  // Product info
  product_info: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('product_info')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch product_info: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'product_info',
        source_id: row.id?.toString() || 'unknown',
        title: row.name || row.product_name || row.title || null,
        content: row.description || row.overview || row.features || row.details || ''
      };
    }
  },

  // Executive team
  executive_team: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('executive_team')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch executive_team: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'executive_team',
        source_id: row.id?.toString() || 'unknown',
        title: row.name || row.title || row.role || null,
        content: row.bio || row.background || row.experience || row.description || ''
      };
    }
  },

  // Investor relations
  investor_relations: {
    async fetchRows(limit: number, offset: number): Promise<any[]> {
      const { data, error } = await supabase
        .from('investor_relations')
        .select('*')
        .range(offset, offset + limit - 1);
      
      if (error) throw new Error(`Failed to fetch investor_relations: ${error.message}`);
      return data || [];
    },
    
    transformRow(row: any): SourceDocument {
      return {
        source_table: 'investor_relations',
        source_id: row.id?.toString() || 'unknown',
        title: row.title || row.topic || row.subject || null,
        content: row.content || row.details || row.information || row.overview || ''
      };
    }
  }
};

// Generic function to fetch rows from any table
export async function fetchTableRows(
  tableName: string,
  limit: number,
  offset: number
): Promise<any[]> {
  const mapper = TABLE_MAPPERS[tableName as keyof typeof TABLE_MAPPERS];
  if (!mapper) {
    throw new Error(`No mapper found for table: ${tableName}`);
  }
  
  return mapper.fetchRows(limit, offset);
}

// Generic function to transform a row to a source document
export function transformRowToDocument(
  tableName: string,
  row: any
): SourceDocument {
  const mapper = TABLE_MAPPERS[tableName as keyof typeof TABLE_MAPPERS];
  if (!mapper) {
    throw new Error(`No mapper found for table: ${tableName}`);
  }
  
  return mapper.transformRow(row);
}

// Get statistics about available tables
export async function getTableStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  for (const tableName of Object.keys(TABLE_MAPPERS)) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.warn(`Warning: Could not count rows in ${tableName}: ${error.message}`);
        stats[tableName] = 0;
      } else {
        stats[tableName] = count || 0;
      }
    } catch (error) {
      console.warn(`Warning: Error counting rows in ${tableName}:`, error);
      stats[tableName] = 0;
    }
  }
  
  return stats;
}

// Validate that tables exist and are accessible
export async function validateTables(tableNames: string[]): Promise<string[]> {
  const validTables: string[] = [];
  
  for (const tableName of tableNames) {
    if (TABLE_MAPPERS[tableName as keyof typeof TABLE_MAPPERS]) {
      try {
        // Try to fetch a single row to verify access
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.warn(`Warning: Table ${tableName} exists but not accessible: ${error.message}`);
        } else {
          validTables.push(tableName);
        }
      } catch (error) {
        console.warn(`Warning: Error validating table ${tableName}:`, error);
      }
    } else {
      console.warn(`Warning: No mapper found for table: ${tableName}`);
    }
  }
  
  return validTables;
}
