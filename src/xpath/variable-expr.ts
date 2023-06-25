export class VariableExpr {
    name: string;
    
    constructor(name) {
        this.name = name;
    }

    evaluate(ctx) {
        return ctx.getVariable(this.name);
    }
}
