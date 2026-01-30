/**
 * XSLT 3.0 Accumulator Support
 * 
 * Accumulators provide a declarative way to compute values during template processing.
 * They are declared at the stylesheet level and updated as the processor traverses nodes.
 */

import { XNode } from '../dom';

/**
 * Represents a single accumulator rule within an xsl:accumulator declaration
 */
export interface AccumulatorRule {
    /**
     * Pattern expression (e.g., "order", "item[@type='special']")
     */
    match: string;
    
    /**
     * XPath expression to compute the new value
     * Can use $value (current accumulated value) and regular XPath functions
     */
    select: string;
    
    /**
     * Phase: 'start' (before processing), 'end' (after processing), or omitted (both)
     * Defaults to processing the node itself (implicitly 'end' equivalent)
     */
    phase?: 'start' | 'end';
}

/**
 * Represents an xsl:accumulator declaration from the stylesheet
 */
export interface AccumulatorDefinition {
    /**
     * Accumulator name (must be QName)
     */
    name: string;
    
    /**
     * XPath expression for initial value (e.g., "0", "[]", "''" )
     * Defaults to empty sequence
     */
    initialValue: string;
    
    /**
     * Type annotation (e.g., "xs:decimal", "xs:integer", "xs:string*")
     * Defaults to "xs:anyAtomicType*"
     */
    as: string;
    
    /**
     * Rules for updating the accumulator value
     */
    rules: AccumulatorRule[];
    
    /**
     * Whether this accumulator is streaming-safe
     * Defaults to false
     */
    streamable?: boolean;
}

/**
 * Current state of an accumulator during processing
 */
export interface AccumulatorState {
    /**
     * The current accumulated value
     */
    currentValue: any;
    
    /**
     * Stack of values for nested element processing
     */
    valueStack: any[];
}

/**
 * Registry of accumulators defined in the stylesheet
 */
export class AccumulatorRegistry {
    private accumulators: Map<string, AccumulatorDefinition> = new Map();
    private accumulatorStates: Map<string, AccumulatorState> = new Map();
    
    /**
     * Register an accumulator definition
     */
    registerAccumulator(definition: AccumulatorDefinition): void {
        this.accumulators.set(definition.name, definition);
        // Initialize state with initial value (will be evaluated later with proper context)
        this.accumulatorStates.set(definition.name, {
            currentValue: null,
            valueStack: []
        });
    }
    
    /**
     * Get an accumulator definition by name
     */
    getAccumulator(name: string): AccumulatorDefinition | undefined {
        return this.accumulators.get(name);
    }
    
    /**
     * Get all registered accumulators
     */
    getAllAccumulators(): AccumulatorDefinition[] {
        return Array.from(this.accumulators.values());
    }
    
    /**
     * Get current state of an accumulator
     */
    getAccumulatorState(name: string): AccumulatorState | undefined {
        return this.accumulatorStates.get(name);
    }
    
    /**
     * Update accumulator state
     */
    setAccumulatorState(name: string, state: AccumulatorState): void {
        this.accumulatorStates.set(name, state);
    }
    
    /**
     * Clear all accumulators
     */
    clear(): void {
        this.accumulators.clear();
        this.accumulatorStates.clear();
    }
}
