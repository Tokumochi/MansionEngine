import { is_same_type, Type, type_str_to_type } from "./typeManager";
import { Process } from "./processManager"

type Token = {kind: "KEYWORD", keyword: string} |
             {kind: "IDENT", ident: string} |
             {kind: "NUM", num: number}
export type Inst = {kind: "LOAD", var_indexes: Inst[]} |
            {kind: "STORE", var_indexes: Inst[], value: Inst} |
            {kind: "ADD", left: Inst, right: Inst} |
            {kind: "SUB", left: Inst, right: Inst} |
            {kind: "MUL", left: Inst, right: Inst} |
            {kind: "DIV", left: Inst, right: Inst} |
            {kind: "NUM", num: number} |
            {kind: "PRINT", value: Inst} |
            {kind: "DRAWCIRCLE", radius: Inst, x: Inst, y: Inst} |
            {kind: "BLOCK", insts: Inst[]}

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

    const keywords = ["_print", "_draw_circle", "+", "-", "*", "/", "=", "(", ")", "[", "]", ",", ".", "\n"];

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

    const stmt = (): Inst | undefined => {
        var insts: Inst[] = [];
        while(!is_end()) {
            const inst = expr();
            if(inst === undefined) return undefined;
            insts.push(inst);
        }
        return {kind: "BLOCK", insts: insts};
    }

    const expr = (): Inst | undefined => {
        const inst_and_type = assign();
        if(inst_and_type === undefined) return undefined;
        if(is_keyword("\n")) {
            i++;
            while(is_keyword("\n")) i++;
            return inst_and_type[0];
        }
        if(is_end()) {
            return inst_and_type[0];
        }
        return undefined;
    }

    const assign = (): [Inst, Type] | undefined => {
        const var_name = is_ident();
        if(var_name === undefined) return add();
        const found_var = find_var(var_name)
        if(found_var === undefined) {
            i++;
            if(!is_keyword("=")) return undefined;
            i++;
            const value = add();
            if(value === undefined) return undefined;
            return [{kind: "STORE", var_indexes: [{kind: "NUM", num: declare_var(var_name, value[1])}], value: value[0]}, value[1]];
        }
        const left = add();
        if(is_keyword("=")) {
            if(left === undefined || left[0].kind !== "LOAD") return undefined;
            i++;
            const value = add();
            if(value === undefined || !is_same_type(left[1], value[1])) return undefined;
            return [{kind: "STORE", var_indexes: left[0].var_indexes, value: value[0]}, value[1]];
        }
        return left;
    }

    const add = (): [Inst, Type] | undefined => {
        const single_left = mul();
        if(single_left === undefined) return undefined;
        var left = single_left;
        for(;;) {
            if(is_keyword("+")) {
                i++;
                const right = mul();
                if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
                left = [{kind: "ADD", left: left[0], right: right[0]}, {kind: "number"}];
                continue;
            }
            if(is_keyword("-")) {
                i++;
                const right = mul();
                if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
                left = [{kind: "SUB", left: left[0], right: right[0]}, {kind: "number"}];
                continue;
            }
            break;
        }
        return left;
    }

    const mul = (): [Inst, Type] | undefined => {
        const single_left = primary();
        if(single_left === undefined) return undefined;
        var left = single_left;
        for(;;) {
            if(is_keyword("*")) {
                i++;
                const right = primary();
                if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
                left = [{kind: "MUL", left: left[0], right: right[0]}, {kind: "number"}];
                continue;
            }
            if(is_keyword("/")) {
                i++;
                const right = primary();
                if(right === undefined || left[1].kind !== "number" || right[1].kind !== "number") return undefined;
                left = [{kind: "DIV", left: left[0], right: right[0]}, {kind: "number"}];
                continue;
            }
            break;
        }
        return left;
    }
        
    const primary = (): [Inst, Type] | undefined => {
        if(is_keyword("_print")) {
            i++;
            const args = func_args();
            if(args === undefined || args.length !== 1) return undefined;
            if(args !== undefined && args.length === 1) return [{kind: "PRINT", value: args[0][0]}, {kind: "obj", pros: []}];
            return undefined;
        }

        if(is_keyword("_draw_circle")) {
            i++;
            const args = func_args();
            if(args === undefined || args.length !== 3 || args[0][1].kind !== "number" || args[1][1].kind !== "number" || args[2][1].kind !== "number") return undefined;
            if(args !== undefined && args.length === 3) return [{kind: "DRAWCIRCLE", radius: args[0][0], x: args[1][0], y: args[2][0]}, {kind: "obj", pros: []}];
            return undefined;
        }

        if(is_keyword("(")) {
            i++;
            const inst = assign();
            if(inst === undefined) return undefined;
            if(is_keyword(")")) {
                i++;
                return inst;
            }
            return undefined;
        }

        const var_name = is_ident();
        if(var_name !== undefined) {
            i++;
            const found_var = find_var(var_name);
            if(found_var === undefined) return undefined;

            const var_indexes: Inst[] = [{kind: "NUM", num: found_var.index}];
            let var_type = found_var.type;
            load: for(;;) {
                if(is_keyword(".")) {
                    if(var_type.kind !== 'obj') return undefined;
                    i++;
                    const pro_name = is_ident();
                    if(pro_name === undefined) return undefined;
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
                    const array_index = assign();
                    if(array_index === undefined || array_index[1].kind !== "number") return undefined;
                    var_indexes.push(array_index[0]);
                    var_type = array_index[1];
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
    
    const func_args = (): [Inst, Type][] | undefined => {
        if(is_keyword("(")) {
            i++;
            var is_first = true;
            var args: [Inst, Type][] = [];
            while(!is_keyword(")")) {
                if(is_first) is_first = false;
                else {
                    if(!is_keyword(",")) return undefined;
                    i++;
                }
                const arg = assign();
                if(arg === undefined) return undefined;
                args.push(arg);
            }
            i++;
            return args;
        }
        return undefined;
    }

    return stmt();
}