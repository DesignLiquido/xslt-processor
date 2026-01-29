/**
 * Key configuration for merge operation.
 */
export interface MergeKeyInterface {
    /** XPath expression to extract key value */
    select: string;
    
    /** Sort order (ascending/descending) */
    order: 'ascending' | 'descending';
}
