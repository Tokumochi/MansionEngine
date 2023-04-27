import { is_same_type, Type, type_str_to_type } from "./typeManager";
import { Process } from "./processManager"

type Token = {kind: "KEYWORD", keyword: string} |
             {kind: "IDENT", ident: string} |
             {kind: "NUM", num: number}

type StoreKind = "STORE" | "ADDSTORE" | "SUBSTORE" | "PUSHSTORE"
type BinaryKind = "EQU" | "NEQ" | "ELT" | "EGT" | "LT" | "GT" | "ADD" | "SUB" | "MUL" | "DIV"
type PressedKind = "W" | "A" | "S" | "D"

type ExprInst = {kind: "LOAD", var_indexes: ExprInst[]} |
            {kind: StoreKind, var_indexes: ExprInst[], value: ExprInst} |
            {kind: BinaryKind, left: ExprInst, right: ExprInst} |
            {kind: "OBJ", pro_values: ExprInst[]} |
            {kind: "NUM", num: number} |
            {kind: "PRINT", value: ExprInst} |
            {kind: "DRAWCIRCLE", radius: ExprInst, x: ExprInst, y: ExprInst} |
            {kind: PressedKind}

export type StmtInst = {kind: "EXPR", expr: ExprInst} |
            {kind: "BLOCK", stmts: StmtInst[]} |
            {kind: "IF" | "WHILE", cond: ExprInst, if: StmtInst}

export const genProcessInst = (process: Process) => {
    const declared_vars: {name: string, type: Type}[] = [];

    const param_obj_type = type_str_to_type(process.params_str);
    if(param_obj_type === undefined) {
        console.log("can't compile params str");
        return;
    }
    if(param_obj_type.kind !== 'obj') {
        console.log("params str' kind is not obj");
        return;
    }
    const ret_obj_type = type_str_to_type(process.rets_str);
    if(ret_obj_type === undefined) {
        console.log("can't compile rets str");
        return;
    }
    if(ret_obj_type.kind !== 'obj') {
        console.log("rets str' kind is not obj");
        return;
    }
    for(const pro of param_obj_type.pros) declared_vars.push({name: pro[0], type: pro[1]});
    for(const pro of ret_obj_type.pros) declared_vars.push({name: pro[0], type: pro[1]});

    const tokens = Tokenize(process.code);
    if(tokens === undefined) return undefined;

    return Parse(tokens, declared_vars);
}

const Tokenize = (code: string) => {
    const tokens: Token[] = [];

    const keywords = ["if", "while", "__print__", "__draw_circle__", "__W__", "__A__", "__S__", "__D__", "==", "!=", "<=", ">=", "+=", "-=", "<", ">", "+", "-", "*", "/", "=", "(", ")", "{", "}", "[", "]", ":", ",", ".", "\n"];

    const is_num = (char: string) => ('0' <= char && char <= '9');
    const is_alpha = (char: string) => ('a' <= char && char <= 'z') || ('A' <= char && char <= 'Z');

    content: for(var i = 0; i < code.length; i++) {
        //space
        if(code.charAt(i) === ' ') continue;

        // keyword
        keyword: for(const keyword of keywords) {
            if(i + keyword.length > code.length) continue;
            for(var j = 0; j < keyword.length; j++) {
                if(code.charAt(i + j) !== keyword.charAt(j)) continue keyword;
            }
            tokens.push({kind: "KEYWORD", keyword: keyword});
            i += keyword.length - 1;
            continue content;
        }

        // identifier
        if(is_alpha(code.charAt(i))) {
            var ident = code.charAt(i);
            while(i + 1 < code.length && (is_alpha(code.charAt(i + 1)) || is_num(code.charAt(i + 1)))) {
                ident += code.charAt(++i);
            }
            tokens.push({kind: "IDENT", ident: ident});
            continue;
        }

        // number
        if(is_num(code.charAt(i))) {
            var num = code.charAt(i);
            while(is_num(code.charAt(i + 1)) && i + 1 < code.length) {
                num += code.charAt(++i);
            }
            tokens.push({kind: "NUM", num: parseInt(num)});
            continue;
        }

        return undefined;
    }

    tokens.push({kind: "KEYWORD", keyword: "}"});
    return tokens;
}

const Parse = (tokens: Token[], declared_vars: {name: string, type: Type}[]) => {
    var i = 0;

    const is_end = () => (tokens.length <= i);

    const is_keyword = (keyword: string) => {
        if(is_end()) return false;
        const token = tokens[i];
        if(token.kind === "KEYWORD") {
            if(token.keyword === keyword) {
                return true;
            }
        }
        return false;
    }

    const is_ident = () => {
        if(is_end()) return undefined;
        const token = tokens[i];
        if(token.kind === "IDENT") {
            return token.ident;
        }
        return undefined;
    }

    const is_num = () => {
        if(is_end()) return undefined;
        const token = tokens[i];
        if(token.kind === "NUM") {
            return token.num;
        }
        return undefined;
    }

    const declare_var = (var_name: string, type: Type) => {
        declared_vars.push({name: var_name, type: type});
        return declared_vars.length - 1;
    }

    const find_var = (var_name: string) => {
        for(const [index, declared_var] of declared_vars.entries()) {
            if(declared_var.name === var_name) return {index: index, type: declared_var.type};
        }
        return undefined;
    }

    const stmt = (): StmtInst | undefined => {
        // if | while statement
        if(is_keyword("if") || is_keyword("while")) {
            const kind = is_keyword("if") ? "IF" : "WHILE";
            i++;
            if(!is_keyword("(")) return undefined;
            i++;
            const cond = expr();
            if(cond === undefined) return undefined;
            if(!is_keyword(")")) return undefined;
            i++;
            const if_stmt = stmt();
            if(if_stmt === undefined) return undefined;
            return {kind: kind, cond: cond, if: if_stmt};
        }
        // block statement
        if(is_keyword("{")) {
            i++;
            return block();
        }
        // expr statement
        return expr_stmt();
    }

    const block = (): StmtInst | undefined => {
        const stmts: StmtInst[] = [];
        while(is_keyword("\n")) i++;
        while(!is_keyword("}")) {
            const inst = stmt();
            if(inst === undefined) return undefined;
            stmts.push(inst);
            while(is_keyword("\n")) i++;
        }
        i++;
        return {kind: "BLOCK", stmts: stmts};
    }

    const expr_stmt = (): StmtInst | undefined => {
        const expr_stmt = expr();
        if(expr_stmt !== undefined && (is_keyword("\n") || is_keyword("}"))) return {kind: "EXPR", expr: expr_stmt};
        return undefined;
    }

    const expr = (): ExprInst | undefined => {
        const inst_and_type = store();
        if(inst_and_type === undefined) return undefined;
        return inst_and_type[0];
    }

    const store = (): [ExprInst, Type] | undefined => {
        const var_name = is_ident();
        if(var_name === undefined) return equal();
        const found_var = find_var(var_name)
        if(found_var === undefined) {
            i++;
            if(!is_keyword("=")) return undefined;
            i++;
            const value = store();
            if(value === undefined) return undefined;
            return [{kind: "STORE", var_indexes: [{kind: "NUM", num: declare_var(var_name, value[1])}], value: value[0]}, value[1]];
        }

        const left = equal();
        if(left === undefined) return undefined;
        let store_kind: StoreKind | undefined = undefined;
        if(is_keyword("=")) store_kind = "STORE";
        else if(is_keyword("+=")) store_kind = "ADDSTORE";
        else if(is_keyword("-=")) store_kind = "SUBSTORE";

        if(store_kind === undefined) return left;
        i++;
        if(left[0].kind !== "LOAD") return undefined;
        const right = store();
        if(right === undefined) return undefined;

        if(store_kind === "STORE") {
            if(!is_same_type(left[1], right[1])) return undefined;
            return [{kind: "STORE", var_indexes: left[0].var_indexes, value: right[0]}, right[1]];
        }
        if(store_kind === "ADDSTORE") {
            if(left[1].kind === "array" && is_same_type(left[1].base_type, right[1]))
                return [{kind: "PUSHSTORE", var_indexes: left[0].var_indexes, value: right[0]}, right[1]]
        }

        if(left[1].kind === "number" && right[1].kind === "number")
            return [{kind: store_kind, var_indexes: left[0].var_indexes, value: right[0]}, right[1]]
        return undefined;
    }

    const equal = (): [ExprInst, Type] | undefined => {
        let left = add();
        if(left === undefined) return undefined;
        for(;;) {
            let equal_kind: BinaryKind | undefined = undefined;
            if(is_keyword("==")) equal_kind = "EQU";
            else if(is_keyword("!=")) equal_kind = "NEQ";
            else if(is_keyword("<=")) equal_kind = "ELT";
            else if(is_keyword(">=")) equal_kind = "EGT";
            else if(is_keyword("<")) equal_kind = "LT";
            else if(is_keyword(">")) equal_kind = "GT";

            if(equal_kind === undefined) break;
            i++;
            const right = add();
            if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
            left = [{kind: equal_kind, left: left[0], right: right[0]}, {kind: "number"}];
            continue;
        }
        return left;
    }

    const add = (): [ExprInst, Type] | undefined => {
        let left = mul();
        if(left === undefined) return undefined;
        for(;;) {
            let add_kind: BinaryKind | undefined = undefined;
            if(is_keyword("+")) add_kind = "ADD";
            else if(is_keyword("-")) add_kind = "SUB"

            if(add_kind === undefined) break;
            i++;
            const right = mul();
            if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
            left = [{kind: add_kind, left: left[0], right: right[0]}, {kind: "number"}];
            continue;
        }
        return left;
    }

    const mul = (): [ExprInst, Type] | undefined => {
        let left = primary();
        if(left === undefined) return undefined;
        for(;;) {
            let mul_kind: BinaryKind | undefined = undefined;
            if(is_keyword("*")) mul_kind = "MUL";
            else if(is_keyword("/")) mul_kind = "DIV";

            if(mul_kind === undefined) break;
            i++;
            const right = primary();
            if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
            left = [{kind: mul_kind, left: left[0], right: right[0]}, {kind: "number"}];
            continue;
        }
        return left;
    }
        
    const primary = (): [ExprInst, Type] | undefined => {
        if(is_keyword("__print__")) {
            i++;
            const args = func_args();
            if(args === undefined || args.length !== 1) return undefined;
            return [{kind: "PRINT", value: args[0][0]}, {kind: "obj", pros: []}];
        }

        if(is_keyword("__draw_circle__")) {
            i++;
            const args = func_args();
            if(args === undefined || args.length !== 3 || args[0][1].kind !== "number" || args[1][1].kind !== "number" || args[2][1].kind !== "number") return undefined;
            return [{kind: "DRAWCIRCLE", radius: args[0][0], x: args[1][0], y: args[2][0]}, {kind: "obj", pros: []}];
        }

        for(const pressed_kind of ["W", "A", "S", "D"] as PressedKind[]) {
            if(is_keyword("__" + pressed_kind + "__")) {
                i++;
                const args = func_args();
                if(args === undefined || args.length !== 0) return undefined;
                return [{kind: pressed_kind}, {kind: "number"}]
            }
        }

        if(is_keyword("(")) {
            i++;
            const inst = store();
            if(inst === undefined) return undefined;
            if(is_keyword(")")) {
                i++;
                return inst;
            }
            return undefined;
        }

        if(is_keyword("{")) {
            i++;
            const pros: Map<string, [ExprInst, Type]> = new Map();
            while(!is_keyword("}")) {
                const key_name = is_ident();
                if(key_name === undefined) return undefined;
                if(pros.has(key_name)) return undefined;
                i++;
                if(is_keyword(":")) {
                    i++;
                    const value = store();
                    if(value === undefined) return undefined;
                    if(is_keyword(",")) i++;
                    else if(!is_keyword("}")) return undefined;
                    pros.set(key_name, value);
                    continue;
                }
                return undefined;
            }
            i++;
            const pro_values: ExprInst[] = [];
            const pro_types: [string, Type][] = [];
            pros.forEach((value, key_name) => {
                pro_values.push(value[0]);
                pro_types.push([key_name, value[1]]);
            });
            return [{kind: "OBJ", pro_values: pro_values}, {kind: "obj", pros: pro_types}];
        }

        const var_name = is_ident();
        if(var_name !== undefined) {
            i++;
            const found_var = find_var(var_name);
            if(found_var === undefined) return undefined;

            const var_indexes: ExprInst[] = [{kind: "NUM", num: found_var.index}];
            let var_type = found_var.type;
            load: for(;;) {
                if(is_keyword(".")) {
                    if(var_type.kind !== 'obj') return undefined;
                    i++;
                    const pro_name = is_ident();
                    if(pro_name === undefined) return undefined;
                    i++;
                    for(const [index, pro] of var_type.pros.entries()) {
                        if(pro_name === pro[0]) {
                            var_indexes.push({kind: "NUM", num: index});
                            var_type = pro[1];
                            continue load;
                        }
                    }
                    return undefined;
                }
                if(is_keyword("[")) {
                    if(var_type.kind !== 'array') return undefined;
                    i++;
                    const array_index = store();
                    if(array_index === undefined || array_index[1].kind !== "number") return undefined;
                    var_indexes.push(array_index[0]);
                    var_type = array_index[1];
                    if(!is_keyword("]")) return undefined;
                    i++;
                    continue;
                }
                break;
            }
            return [{kind: "LOAD", var_indexes: var_indexes}, var_type];
        }

        const num = is_num();
        if(num !== undefined) {
            i++;
            return [{kind: "NUM", num: num}, {kind: "number"}];
        }
        
        return undefined;
    }
    
    const func_args = (): [ExprInst, Type][] | undefined => {
        if(is_keyword("(")) {
            i++;
            var is_first = true;
            const args: [ExprInst, Type][] = [];
            while(!is_keyword(")")) {
                if(is_first) is_first = false;
                else {
                    if(!is_keyword(",")) return undefined;
                    i++;
                }
                const arg = store();
                if(arg === undefined) return undefined;
                args.push(arg);
            }
            i++;
            return args;
        }
        return undefined;
    }

    const code_block = block();
    if(!is_end()) return undefined;
    return code_block;
}